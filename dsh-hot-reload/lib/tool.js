/**
 * The `reboot_dsh` Agent tool: a Creation-mode (`cordis` preset) session can
 * restart the whole Host itself, and the session picks up where it left off.
 *
 * Two safety rules separate it from the human `/reboot` command:
 *
 * - the tool exists only inside a Creation-mode session (`when` predicate), so
 *   ordinary tasks never see it;
 * - it refuses while any *other* live agent is running, so a restart cannot
 *   interrupt a second session that is still working. The human `/reboot`
 *   command stays available to the user in that situation.
 *
 * The turn that calls the tool cannot survive the restart, so before asking the
 * Host to shut down the tool registers a one-shot Schedule task that delivers a
 * follow-up prompt to this same Session after the restart. The new Host resumes
 * the Session and wakes its driver, which is what makes the work continue.
 */

import { DEFAULT_REBOOT_DELAY_MS, pendingReboot, planRelaunch, quoteCommand, scheduleReboot } from './reboot.js'

/** Model-facing tool name. */
export const REBOOT_TOOL_NAME = 'reboot_dsh'

/** Preset id of Creation mode in the Web bundle. */
export const CREATION_MODE_PRESET = 'cordis'

/** Seconds after the request before the follow-up prompt is due. */
export const DEFAULT_FOLLOW_UP_SECONDS = 12

/** Bounds accepted for `followUpSeconds`. */
export const MIN_FOLLOW_UP_SECONDS = 5
export const MAX_FOLLOW_UP_SECONDS = 300

/** Default continuation prompt delivered after the restart. */
export const DEFAULT_FOLLOW_UP_PROMPT =
  'The DSH Host was restarted as you requested; the new process is running. '
  + 'Continue the task you were doing before the restart, then summarize the result.'

/** Title of the one-shot follow-up task. */
const FOLLOW_UP_TITLE = 'DSH restart follow-up'

const PARAMETERS = {
  type: 'object',
  properties: {
    dryRun: {
      type: 'boolean',
      description: 'Only report the restart plan and the follow-up that would be scheduled; do not restart anything.'
    },
    continueWith: {
      type: 'string',
      description: 'Instruction delivered to this session after the restart (default: continue the previous task and summarize).'
    },
    followUpSeconds: {
      type: 'integer',
      minimum: MIN_FOLLOW_UP_SECONDS,
      maximum: MAX_FOLLOW_UP_SECONDS,
      description: 'Seconds after the request before the follow-up prompt is due (default 12, minimum 5).'
    }
  },
  additionalProperties: false
}

const OUTPUT = {
  schema: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      action: { type: 'string', enum: ['dry-run', 'scheduled', 'already-scheduled', 'refused'] },
      hostPid: { type: 'number' },
      workerPid: { type: 'number' },
      delayMs: { type: 'number' },
      followUpSeconds: { type: 'number' },
      followUpTaskId: { type: 'string' },
      command: { type: 'array', items: { type: 'string' } },
      logPath: { type: 'string' },
      runningSessions: { type: 'array', items: { type: 'string' } },
      error: { type: 'string' },
      elapsedMs: { type: 'number' }
    },
    required: ['ok', 'action'],
    additionalProperties: false
  },
  render(_args, value) {
    if (!value.ok) {
      if (value.action === 'refused') {
        return [{ type: 'text', text: `reboot refused: ${value.error ?? 'the Host was not restarted'}` }]
      }
      return [{ type: 'text', text: `reboot failed: ${value.error ?? 'unknown error'}` }]
    }
    if (value.action === 'dry-run') {
      return [{
        type: 'text',
        text: `reboot plan (not executed), pid ${String(value.hostPid)}: ${quoteCommand(value.command ?? [])}\nfollow-up: ${String(value.followUpSeconds)} s after the restart`
      }]
    }
    const parts = [`${value.action}: DSH restarts in ${String(value.delayMs)} ms (helper pid ${String(value.workerPid)}); this turn is interrupted.`]
    parts.push(`follow-up in ${String(value.followUpSeconds)} s resumes this session (task ${String(value.followUpTaskId)}).`)
    parts.push(`command: ${quoteCommand(value.command ?? [])}`)
    return [{ type: 'text', text: parts.join('\n') }]
  }
}

/** Read and validate the model-facing arguments without a schema helper dependency. */
function readArgs(args) {
  if (args === null || typeof args !== 'object') throw new Error('arguments must be an object')
  const dryRun = args.dryRun === true
  const continueWith = args.continueWith
  if (continueWith !== undefined && typeof continueWith !== 'string') throw new Error('continueWith must be a string')
  const seconds = args.followUpSeconds === undefined ? DEFAULT_FOLLOW_UP_SECONDS : args.followUpSeconds
  if (!Number.isInteger(seconds)) throw new Error('followUpSeconds must be an integer')
  return {
    dryRun,
    continueWith: typeof continueWith === 'string' && continueWith.trim() !== '' ? continueWith.trim() : undefined,
    followUpSeconds: Math.min(MAX_FOLLOW_UP_SECONDS, Math.max(MIN_FOLLOW_UP_SECONDS, seconds))
  }
}

/**
 * The preset id a live Agent runs, read from its composition first and its
 * Session's durable selection second. Never throws: a predicate that rejects
 * would fail step preparation for unrelated sessions.
 * @param {object | undefined} agentPresets - the registry service.
 * @param {object | undefined} agent - Agent from the activation/execution context.
 * @returns {string | undefined}
 */
export function presetOf(agentPresets, agent) {
  if (agentPresets === undefined || agent === undefined) return undefined
  try {
    return agentPresets.composedPreset(agent.ctx) ?? agentPresets.presetForSession(agent.session) ?? undefined
  } catch {
    return undefined
  }
}

/**
 * Whether this Agent belongs to Creation mode.
 * @param {object | undefined} agentPresets - the registry service.
 * @param {object | undefined} agent - Agent from the activation/execution context.
 * @returns {boolean}
 */
export function isCreationMode(agentPresets, agent) {
  return presetOf(agentPresets, agent) === CREATION_MODE_PRESET
}

/** Describe the live agents that would be interrupted by a restart. */
function runningSessions(agents, current) {
  let live = []
  try {
    live = agents.list()
  } catch {
    return []
  }
  return live
    .filter((agent) => agent !== undefined && agent.session.id !== current.session.id && agent.status === 'running')
    .map((agent) => String(agent.session.id))
}

/**
 * Build the tool bound to the Host services it uses.
 * @param {object} services - `{ agents, agentPresets, schedule, webServer, webApp }`.
 * @param {object} [options] - test seams: `scheduleReboot`.
 * @returns {object} the ToolDefinition.
 */
export function createRebootTool(services, options = {}) {
  const restart = options.scheduleReboot ?? scheduleReboot
  const { agents, agentPresets, schedule, webServer, webApp } = services

  return {
    name: REBOOT_TOOL_NAME,
    description: 'Restart the whole DSH Host process from a Creation-mode session (after installing or editing a plugin, when hot reload cannot apply the change). '
      + 'Only available in Creation mode (the cordis preset) and only when no OTHER session or subagent is still running — otherwise the call is refused and the user can restart manually with /reboot. '
      + 'The current turn cannot survive the restart: before shutting down, a one-shot Schedule task is created that delivers a follow-up prompt to this same session a few seconds after the new Host is up, so the work continues automatically. '
      + 'The relaunch reuses the exact dsh invocation and port; the Web page reconnects by itself and MCP servers reconnect in the background.',
    parameters: PARAMETERS,
    output: OUTPUT,
    async execute(args, exec) {
      const started = performance.now()
      const result = { ok: true, action: 'dry-run', hostPid: process.pid, elapsedMs: 0 }
      let followUpTaskId
      let followUpSeconds
      try {
        const agent = exec.agent
        if (agent === undefined) throw new Error(`${REBOOT_TOOL_NAME} requires an Agent context`)
        if (!isCreationMode(agentPresets, agent)) {
          throw new Error(`${REBOOT_TOOL_NAME} is only available in Creation mode (the "${CREATION_MODE_PRESET}" preset)`)
        }
        if (agents === undefined || schedule === undefined || webServer === undefined) {
          throw new Error(`${REBOOT_TOOL_NAME} is unavailable in this profile (agents, schedule or web server service missing)`)
        }

        // A restart is already in flight (another /reboot, or an earlier call in
        // this turn): do not enqueue a second follow-up prompt.
        const inFlight = pendingReboot()
        if (inFlight !== undefined) {
          const plan = planRelaunch({
            actualPort: typeof webServer.port === 'number' ? webServer.port : undefined,
            allowOpen: false,
            web: webApp !== undefined
          })
          return {
            ok: true,
            action: 'already-scheduled',
            hostPid: process.pid,
            workerPid: inFlight.workerPid,
            delayMs: inFlight.delayMs,
            command: [...plan.command],
            logPath: plan.logPath,
            elapsedMs: Math.round(performance.now() - started)
          }
        }

        // A delegated child (subagent) must not restart the Host on its own:
        // only the top-level session owns the process lifetime.
        let roots
        try {
          roots = agents.roots?.()
        } catch {
          roots = undefined
        }
        if (Array.isArray(roots) && !roots.some((candidate) => candidate.session.id === agent.session.id)) {
          return {
            ok: false,
            action: 'refused',
            hostPid: process.pid,
            error: 'only a top-level session can restart the Host; a subagent must leave the restart to its session',
            elapsedMs: Math.round(performance.now() - started)
          }
        }

        const running = runningSessions(agents, agent)
        if (running.length > 0) {
          return {
            ok: false,
            action: 'refused',
            hostPid: process.pid,
            runningSessions: running,
            error: `${String(running.length)} other session${running.length === 1 ? ' is' : 's are'} still running (${running.join(', ')}). `
              + 'A restart would interrupt them, so the Host was not restarted; wait until they are idle, or let the user run /reboot manually.',
            elapsedMs: Math.round(performance.now() - started)
          }
        }

        const { dryRun, continueWith, followUpSeconds: seconds } = readArgs(args)
        followUpSeconds = seconds
        const prompt = continueWith ?? DEFAULT_FOLLOW_UP_PROMPT
        const plan = planRelaunch({
          actualPort: typeof webServer.port === 'number' ? webServer.port : undefined,
          allowOpen: false,
          web: webApp !== undefined
        })
        result.command = [...plan.command]
        result.logPath = plan.logPath
        result.followUpSeconds = seconds

        if (dryRun) return result

        // Register the continuation BEFORE shutting down: the turn dies with the
        // process, and only a durable task can resume the session afterwards.
        const task = await schedule.create({
          title: FOLLOW_UP_TITLE,
          prompt,
          timing: { kind: 'after', after_seconds: seconds },
          target: { kind: 'session', sessionId: agent.session.id }
        }, agent.session.id, exec.signal)
        followUpTaskId = String(task.id)

        let outcome
        try {
          outcome = await restart({
            actualPort: typeof webServer.port === 'number' ? webServer.port : undefined,
            actualHost: typeof webServer.host === 'string' ? webServer.host : undefined,
            web: webApp !== undefined,
            delayMs: DEFAULT_REBOOT_DELAY_MS
          })
        } catch (error) {
          // The restart was refused or the helper could not start: withdraw the
          // follow-up so it cannot wake this session with a false "restarted".
          try {
            await schedule.edit({ id: task.id, action: 'delete' }, agent.session.id)
          } catch {
            // Best effort: a stray one-shot task is less harmful than hiding the failure.
          }
          throw error
        }

        result.action = outcome.kind === 'already-scheduled' ? 'already-scheduled' : 'scheduled'
        result.workerPid = outcome.workerPid
        result.delayMs = outcome.delayMs
        result.followUpTaskId = followUpTaskId
        result.followUpSeconds = seconds
        result.elapsedMs = Math.round(performance.now() - started)
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return {
          ok: false,
          action: 'refused',
          hostPid: process.pid,
          error: message,
          ...(followUpTaskId === undefined ? {} : { followUpTaskId }),
          elapsedMs: Math.round(performance.now() - started)
        }
      }
    }
  }
}
