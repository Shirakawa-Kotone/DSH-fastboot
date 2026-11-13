/**
 * dsh-hot-reload — reload changed DSH services in place instead of restarting
 * the whole Host, and restart the whole Host on request.
 *
 * The HMR service already owns the hard part: `reconcileProfile()` compares
 * every loaded module below the profile and its linked package roots with the
 * files on disk, evicts the changed modules, stops the entries that run them,
 * recomposes the profile, and starts those entries again with the new code and
 * configuration. The default watcher does not watch linked workspace packages,
 * which is why editing a local plugin normally needs a full DSH restart. This
 * plugin exposes the same reconciliation as an Agent tool.
 *
 * It also offers a lighter "restart these entries" action that disposes and
 * re-creates one or more entries without touching code or config (useful for
 * reconnecting an MCP bridge), and a compact entry listing.
 *
 * Since some changes (the CLI version, a profile manifest, an unloadable host
 * module) cannot be applied in place, it also registers `/reboot`: a full Host
 * relaunch driven from inside the GUI. See `reboot.js` for the mechanics.
 */

import { quoteCommand, scheduleReboot } from './reboot.js'
import { createRebootTool, isCreationMode } from './tool.js'


const STATE = {
  0: 'pending',
  1: 'loading',
  2: 'active',
  3: 'failed',
  4: 'disposed',
  5: 'unloading'
}

/** Core entries that must not be restarted casually. */
const PROTECTED = new Set(['loader', 'hmr', 'tools', 'webserver', 'agent-loop'])

/** Compact, model-facing entry description. */
function describeEntry(entry) {
  return {
    id: entry.id,
    name: entry.options.name,
    state: STATE[entry.fiber?.state] ?? String(entry.fiber?.state ?? 'inactive'),
    disabled: Boolean(entry.disabled),
    group: Boolean(entry.options.group)
  }
}

/** Snapshot fiber identities so the caller can report exactly what restarted. */
function fiberSnapshot(loader) {
  const snapshot = new Map()
  for (const entry of loader.entries()) snapshot.set(entry.id, entry.fiber?.uid ?? null)
  return snapshot
}

/** Entry ids whose fiber identity changed between two snapshots. */
function changedEntries(loader, before) {
  const restarted = []
  for (const entry of loader.entries()) {
    const uid = entry.fiber?.uid ?? null
    if (before.get(entry.id) !== uid) restarted.push(entry.id)
  }
  return restarted
}

/** Restart one entry in place: dispose its fiber, then import and mount it again. */
async function restartEntry(loader, id, force) {
  const entry = loader.resolve(id)
  if (entry === undefined) throw new Error(`unknown entry "${id}"`)
  if (entry.disabled) throw new Error(`entry "${entry.id}" is disabled`)
  if (entry.options.group) throw new Error(`entry "${entry.id}" is a group; restart its children instead`)
  const patchId = entry.options.id ?? id
  if (!force && PROTECTED.has(patchId)) {
    throw new Error(`entry "${entry.id}" is a core service; pass force: true to restart it anyway`)
  }
  if (entry.fiber !== undefined) await entry.fiber.dispose()
  await entry.init()
  return entry.id
}

/** Validate the tool arguments without pulling in the ToolRuntime helper package. */
function readArgs(args) {
  if (args === null || typeof args !== 'object') throw new Error('arguments must be an object')
  const action = args.action ?? 'changed'
  if (action !== 'changed' && action !== 'restart' && action !== 'list') {
    throw new Error('action must be "changed", "restart" or "list"')
  }
  if (args.entries !== undefined && !Array.isArray(args.entries)) {
    throw new Error('entries must be an array of entry ids')
  }
  if (args.query !== undefined && typeof args.query !== 'string') {
    throw new Error('query must be a string')
  }
  const limit = args.limit ?? 50
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
    throw new Error('limit must be an integer between 1 and 200')
  }
  return {
    action,
    entries: args.entries ?? [],
    query: args.query,
    limit,
    force: args.force === true
  }
}

const PARAMETERS = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: ['changed', 'restart', 'list'],
      description: 'changed: reload modules that changed on disk; restart: re-create the entries named in entries; list: show entries.'
    },
    entries: {
      type: 'array',
      items: { type: 'string' },
      description: 'Entry ids for action "restart", for example ["include:mcp-notion"].'
    },
    query: {
      type: 'string',
      description: 'Case-insensitive filter over entry id, module name and state for action "list".'
    },
    limit: {
      type: 'integer',
      minimum: 1,
      maximum: 200,
      description: 'Maximum entries returned by "list" (default 50).'
    },
    force: {
      type: 'boolean',
      description: 'Allow restarting a protected core entry such as webserver or tools. This can interrupt the current session.'
    }
  },
  additionalProperties: false
}

const OUTPUT = {
  schema: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      action: { type: 'string' },
      elapsedMs: { type: 'number' },
      restarted: { type: 'array', items: { type: 'string' } },
      pending: {
        type: 'array',
        items: {
          type: 'object',
          properties: { url: { type: 'string' }, reason: { type: 'string' } },
          required: ['url'],
          additionalProperties: false
        }
      },
      warnings: { type: 'array', items: { type: 'string' } },
      restartRequired: { type: 'string' },
      entries: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            state: { type: 'string' },
            disabled: { type: 'boolean' },
            group: { type: 'boolean' }
          },
          required: ['id', 'name', 'state', 'disabled', 'group'],
          additionalProperties: false
        }
      },
      error: { type: 'string' }
    },
    required: ['ok', 'action', 'elapsedMs'],
    additionalProperties: false
  },
  render(_args, value) {
    if (!value.ok) return [{ type: 'text', text: `reload failed: ${value.error ?? 'unknown error'}` }]
    if (value.action === 'list') {
      const lines = value.entries.map((entry) => `${entry.state.padEnd(8)} ${entry.id}${entry.disabled ? ' (disabled)' : ''}`)
      return [{ type: 'text', text: lines.length > 0 ? lines.join('\n') : 'no entries matched' }]
    }
    const parts = [`${value.action}: ${value.restarted.length} entr${value.restarted.length === 1 ? 'y' : 'ies'} restarted in ${value.elapsedMs} ms`]
    if (value.restarted.length > 0) parts.push(value.restarted.join(', '))
    if (value.pending.length > 0) parts.push(`needs full restart: ${value.pending.map((item) => item.url).join(', ')}`)
    if (value.restartRequired !== undefined) parts.push(`restart reason: ${value.restartRequired}`)
    if (value.warnings.length > 0) parts.push(`warnings: ${value.warnings.join('; ')}`)
    return [{ type: 'text', text: parts.join('\n') }]
  }
}

/** Reload modules that changed on disk and report what restarted. */
async function reloadChanged(ctx) {
  const hmr = ctx.get('hmr')
  if (hmr === undefined) throw new Error('the hmr service is not available in this profile')
  const loader = ctx.loader
  const before = fiberSnapshot(loader)
  const outcome = await hmr.runExclusive(() => hmr.reconcileProfile())
  await loader.await()
  return {
    restarted: changedEntries(loader, before),
    pending: outcome.pending ?? [],
    warnings: outcome.warnings ?? [],
    restartRequired: outcome.restartReason
  }
}

/** Restart the given entries and report the ids actually re-created. */
async function restartEntries(ctx, ids, force) {
  if (ids.length === 0) throw new Error('at least one entry id is required')
  const restarted = []
  for (const id of ids) restarted.push(await restartEntry(ctx.loader, id, force))
  await ctx.loader.await()
  return { restarted, pending: [], warnings: [] }
}

/** Build the tool bound to its registration context. */
function createTool(ctx) {
  return {
    name: 'reload_dsh',
    description: 'Reload changed DSH services in place instead of restarting the whole Host. '
      + 'Use "changed" after editing a linked plugin/bundle or its configuration: it evicts changed modules below the profile and its linked package roots, restarts only the affected entries, and reports entries that still need a full restart. '
      + 'Use "restart" to dispose and re-create specific entries without reloading code (for example an MCP bridge; entry ids are listed by "list"). '
      + 'Use "list" to find entry ids and states. Does nothing when no watched file changed.',
    parameters: PARAMETERS,
    output: OUTPUT,
    async execute(args) {
      const { action, entries, query, limit, force } = readArgs(args)
      const started = performance.now()
      const loader = ctx.loader
      const result = { ok: true, action, elapsedMs: 0, restarted: [], pending: [], warnings: [] }
      try {
        if (action === 'list') {
          const needle = query?.toLowerCase()
          const matches = []
          for (const entry of loader.entries()) {
            const info = describeEntry(entry)
            if (needle !== undefined && !`${info.id} ${info.name} ${info.state}`.toLowerCase().includes(needle)) continue
            matches.push(info)
            if (matches.length >= limit) break
          }
          result.entries = matches
        } else if (action === 'restart') {
          Object.assign(result, await restartEntries(ctx, entries, force))
        } else {
          const outcome = await reloadChanged(ctx)
          result.restarted = outcome.restarted
          result.pending = outcome.pending
          result.warnings = outcome.warnings
          if (outcome.restartRequired !== undefined) result.restartRequired = outcome.restartRequired
        }
      } catch (error) {
        result.ok = false
        result.error = error instanceof Error ? error.message : String(error)
        ctx.logger.warn?.(`hot-reload: ${result.error}`)
      }
      result.elapsedMs = Math.round(performance.now() - started)
      return result
    }
  }
}

export const name = 'hot-reload'
export const inject = ['tools']

const REBOOT_USAGE = 'Usage: /reboot [--dry-run] [--open]'

/**
 * Describe the relaunch plan for a human: what runs, from where, and where the
 * new Host's output goes.
 * @param {{ execPath: string, args: string[], cwd: string, logPath: string, command: string[] }} plan
 * @returns {string[]} display lines.
 */
function describePlan(plan) {
  return [
    `command: ${quoteCommand(plan.command)}`,
    `cwd: ${plan.cwd}`,
    `log: ${plan.logPath}`
  ]
}

/** Register /reload: no argument reloads changed modules; arguments restart entry ids. */
function registerCommand(inner) {
  inner.commands.register({
    definitionId: '@local/dsh-hot-reload',
    name: 'reload',
    description: 'Reload changed DSH services in place instead of restarting the Host',
    handler: async (invocation) => {
      const input = invocation.rawInput.trim()
      const started = performance.now()
      try {
        const outcome = input === ''
          ? await reloadChanged(inner)
          : await restartEntries(inner, input.split(/\s+/), false)
        const elapsed = Math.round(performance.now() - started)
        const ids = outcome.restarted.join(', ') || 'none'
        const pending = outcome.pending.length > 0
          ? `\nneeds full restart: ${outcome.pending.map((item) => item.url).join(', ')}\nrun /reboot to restart the whole Host`
          : ''
        const warning = outcome.warnings.length > 0 ? `\nwarnings: ${outcome.warnings.join('; ')}` : ''
        return { kind: 'success', text: `Reloaded ${outcome.restarted.length} entr${outcome.restarted.length === 1 ? 'y' : 'ies'} in ${elapsed} ms: ${ids}${pending}${warning}` }
      } catch (error) {
        return { kind: 'error', text: `reload failed: ${error instanceof Error ? error.message : String(error)}` }
      }
    }
  })
}

/**
 * Register /reboot: restart the whole Host; MCP servers reconnect in the
 * background. It is offered only where a web surface is mounted, because a
 * detached relaunch of a terminal/ACP process would be invisible.
 */
function registerRebootCommand(inner) {
  inner.commands.register({
    definitionId: '@local/dsh-hot-reload',
    name: 'reboot',
    description: 'Restart the whole DSH Host; MCP servers reconnect in the background',
    input: { hint: '--dry-run | --open' },
    handler: async (invocation) => {
      const words = invocation.rawInput.trim() === '' ? [] : invocation.rawInput.trim().split(/\s+/)
      if (words.includes('--help') || words.includes('-h')) return { kind: 'success', text: REBOOT_USAGE }
      const dryRun = words.includes('--dry-run') || words.includes('-n')
      const allowOpen = words.includes('--open')
      const unknown = words.filter((word) => !['--dry-run', '-n', '--open'].includes(word))
      if (unknown.length > 0) {
        return { kind: 'error', text: `unknown /reboot argument${unknown.length === 1 ? '' : 's'}: ${unknown.join(' ')}\n${REBOOT_USAGE}` }
      }
      try {
        // A Host started with `--port 0` (or a configured zero port) listens on
        // an OS-assigned port; pin the relaunch to the bound port so the page
        // can rejoin the same origin. `webApp` decides whether the web-only
        // flags (`--port`, `--no-open`) belong on the relaunch.
        const webServer = inner.get('webServer')
        if (webServer === undefined) {
          return { kind: 'error', text: 'reboot is unavailable in this profile (no web server); restart the Host manually instead' }
        }
        const actualPort = typeof webServer.port === 'number' ? webServer.port : undefined
        const outcome = await scheduleReboot({
          dryRun,
          allowOpen,
          actualPort,
          actualHost: typeof webServer.host === 'string' ? webServer.host : undefined,
          web: inner.get('webApp') !== undefined
        })
        const lines = describePlan(outcome.plan)
        if (outcome.kind === 'dry-run') {
          return { kind: 'success', text: [`reboot plan (not executed), pid ${process.pid}:`, ...lines].join('\n') }
        }
        if (outcome.kind === 'already-scheduled') {
          return {
            kind: 'success',
            text: `A reboot is already scheduled (helper pid ${String(outcome.workerPid)}); this Host exits in about ${String(outcome.delayMs)} ms.\n${lines[0]}`
          }
        }
        return {
          kind: 'success',
          text: [
            `Restarting DSH (pid ${process.pid}) in ${String(outcome.delayMs)} ms; helper pid ${String(outcome.workerPid)}.`,
            'The page reconnects on its own (a few seconds); MCP servers restart with the new Host and, with the fastboot bundle, reconnect in the background.',
            ...lines
          ].join('\n')
        }
      } catch (error) {
        return { kind: 'error', text: `reboot failed: ${error instanceof Error ? error.message : String(error)}` }
      }
    }
  })
}

export function apply(ctx) {
  ctx.inject(['hmr', 'loader'], (inner) => {
    inner.tools.register(createTool(inner))
  })
  ctx.inject(['commands', 'hmr', 'loader'], (inner) => {
    registerCommand(inner)
  })
  // /reboot needs the command registry and a bound web server: the relaunch is
  // only meaningful for a browser-facing Host, and the bound port is what the
  // relaunch must preserve. It works even when HMR is absent.
  ctx.inject(['commands', 'webServer'], (inner) => {
    registerRebootCommand(inner)
  })
  // `reboot_dsh` is the Creation-mode (cordis preset) counterpart: a session may
  // restart the Host itself when it is the only one running. The `when`
  // predicate keeps the tool out of ordinary sessions; the tool rechecks that
  // and refuses while another session is still running.
  ctx.inject(['tools', 'agents', 'agentPresets', 'schedule', 'webServer'], (inner) => {
    const services = {
      agents: inner.agents,
      agentPresets: inner.agentPresets,
      schedule: inner.schedule,
      webServer: inner.webServer,
      webApp: inner.get('webApp')
    }
    inner.tools.register(createRebootTool(services), {
      when: (activation) => isCreationMode(services.agentPresets, activation.agent)
    })
  })
}
