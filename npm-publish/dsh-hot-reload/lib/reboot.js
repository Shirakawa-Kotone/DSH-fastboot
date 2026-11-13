/**
 * Full-Host restart support behind the `/reboot` command.
 *
 * A DSH Host cannot re-exec itself: the new process has to bind the same port,
 * so it may only start after the old one has released it. This module therefore
 * splits the work in two:
 *
 * 1. The running Host computes an exact relaunch plan from its own
 *    `process.execPath` / `process.execArgv` / `process.argv`, spawns a tiny
 *    detached `reboot-worker.js` (which outlives it), answers the command, and
 *    finally asks for its own graceful shutdown with SIGTERM — the bounded
 *    disposal `profile-boot` installs flushes sessions and reaps MCP children.
 * 2. The worker waits for the old PID to disappear, then launches the same
 *    invocation again with its output appended to `$DSH_HOME/web.log`. It
 *    retries when the new Host exits early (for example while the old listener
 *    is still releasing the port), so a reboot cannot strand the machine
 *    without a Host.
 *
 * MCP servers are restarted by the new Host's own boot. The new Host is ready
 * before they reconnect because the fastboot bundle starts MCP work in the
 * background, so `/reboot` never makes the GUI wait for an MCP server.
 */

import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, unlinkSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The detached helper that outlives the old Host. */
const WORKER = fileURLToPath(new URL('./reboot-worker.js', import.meta.url))

/** Delay before this process asks for its own shutdown: lets the command reply flush. */
export const DEFAULT_REBOOT_DELAY_MS = 700

/** How long the worker waits for the old Host to exit before SIGKILL. */
export const DEFAULT_WAIT_TIMEOUT_MS = 20_000

/** Grace between the old Host's exit and the first launch attempt, for the listener to close. */
export const DEFAULT_SETTLE_MS = 200

/** How long a launched Host must stay alive before the worker calls it started (no known port). */
export const DEFAULT_VERIFY_MS = 1_500

/** How long the worker waits for the new Host to accept connections on the bound port. */
export const DEFAULT_READY_TIMEOUT_MS = 20_000

/** How long the parent waits for the detached worker to announce it is watching. */
export const DEFAULT_WORKER_READY_TIMEOUT_MS = 4_000

/** Launch attempts before the worker gives up. */
export const DEFAULT_LAUNCH_RETRIES = 5

/** Extra grace after SIGTERM in case the Host's own shutdown never finishes. */
const FORCE_EXIT_GRACE_MS = 8_000

/** Resolve the DSH home the same way dsh does: `$DSH_HOME`, else `~/.dsh`. */
function dshHome() {
  const override = process.env.DSH_HOME
  if (typeof override === 'string' && override.trim() !== '') return resolve(override.trim())
  return join(homedir(), '.dsh')
}

/** The log file the relaunched Host appends to. */
export function rebootLogPath() {
  return join(dshHome(), 'web.log')
}

/**
 * The profile this invocation boots, read from the raw app arguments the same
 * way the `dsh` launcher expands `dsh <name>` into `dsh --profile <name>`.
 * @param {string[]} args - arguments after the dsh entry script.
 * @returns {string | undefined} the profile name, or undefined when not found.
 */
export function detectProfile(args) {
  const first = args[0]
  if (first === '--profile') return args[1]
  if (typeof first === 'string' && first.startsWith('--profile=')) {
    return first.slice('--profile='.length)
  }
  if (typeof first === 'string' && !first.startsWith('-') && first !== 'plugin') return first
  return undefined
}

/**
 * Replace an explicit `--port` value with the port this Host actually bound.
 * A Host started with `--port 0` gets an OS-assigned port; relaunching the
 * literal `0` would move the GUI to a different port the page cannot rejoin.
 * @param {string[]} args - arguments after the dsh entry script.
 * @param {number | undefined} actualPort - the bound listening port, if any.
 * @returns {string[]} the arguments to relaunch with.
 */
export function rewritePort(args, actualPort) {
  if (!Number.isInteger(actualPort) || actualPort <= 0) return args
  let changed = false
  const out = args.map((arg, index) => {
    if (arg === '--port' && index + 1 < args.length) {
      changed = true
      return arg
    }
    if (index > 0 && args[index - 1] === '--port') {
      changed = true
      return String(actualPort)
    }
    if (arg.startsWith('--port=')) {
      changed = true
      return `--port=${String(actualPort)}`
    }
    return arg
  })
  return changed ? out : args
}

/** Whether the raw arguments already carry a `--port` value. */
function hasPortArgument(args) {
  return args.some((arg, index) => arg === '--port' || arg.startsWith('--port='))
}

/**
 * Decide the arguments the new Host starts with:
 *
 * - the web surface is pinned to the port the old Host actually bound. An
 *   explicit `--port` is rewritten; without one the flag is appended, because
 *   the port can also come from the composed config (`port: 0`, an override) —
 *   relaunching the config value could move the origin the page cannot rejoin;
 * - the web relaunch gets `--no-open` unless the caller asked for a fresh
 *   browser tab: the page already reconnects through its signed auth cookie,
 *   so a second tab is noise by default.
 *
 * @param {string[]} args - arguments after the dsh entry script.
 * @param {object} [options]
 * @param {number} [options.actualPort] - the port the current Host bound.
 * @param {boolean} [options.allowOpen] - keep the new Host's browser handoff on.
 * @param {boolean} [options.web] - whether this Host serves the web surface.
 *   Defaults to recognising the `web` profile name.
 * @returns {string[]} the adjusted arguments.
 */
export function adjustRelaunchArgs(args, options = {}) {
  const profile = detectProfile(args)
  const isWeb = options.web ?? (typeof profile === 'string' && profile.toLowerCase() === 'web')
  if (!isWeb) return args
  let out = [...rewritePort(args, options.actualPort)]
  if (!hasPortArgument(out) && Number.isInteger(options.actualPort) && options.actualPort > 0) {
    out = [...out, '--port', String(options.actualPort)]
  }
  if (options.allowOpen === true) out = out.filter((arg) => arg !== '--no-open')
  else if (!out.includes('--no-open')) out = [...out, '--no-open']
  return out
}

/**
 * Build the exact command that restarts this Host.
 * @param {object} [invocation]
 * @param {string[]} [invocation.argv] - the current `process.argv`.
 * @param {string[]} [invocation.execArgv] - the current `process.execArgv`.
 * @param {string} [invocation.execPath] - the current `process.execPath`.
 * @param {string} [invocation.cwd] - the current working directory.
 * @param {number} [invocation.actualPort] - the port the current Host bound.
 * @param {boolean} [invocation.allowOpen] - keep the browser handoff on.
 * @param {boolean} [invocation.web] - whether this Host serves the web surface.
 * @param {string} [invocation.logPath] - file the new Host appends its output to.
 * @returns {{ execPath: string, args: string[], cwd: string, logPath: string, command: string[] }}
 * @throws when the entry script cannot be recovered from `process.argv`.
 */
export function planRelaunch(invocation = {}) {
  const argv = invocation.argv ?? process.argv
  const execArgv = invocation.execArgv ?? process.execArgv
  const execPath = invocation.execPath ?? process.execPath
  const script = argv[1]
  if (typeof script !== 'string' || script === '') {
    throw new Error('cannot determine the DSH entry script from process.argv; restart the Host manually instead')
  }
  if (!existsSync(script)) {
    throw new Error(`the DSH entry script ${JSON.stringify(script)} no longer exists; restart the Host manually instead`)
  }
  const args = [
    ...execArgv,
    script,
    ...adjustRelaunchArgs(argv.slice(2), {
      actualPort: invocation.actualPort,
      allowOpen: invocation.allowOpen,
      web: invocation.web
    })
  ]
  return Object.freeze({
    execPath,
    args: Object.freeze(args),
    cwd: invocation.cwd ?? process.cwd(),
    logPath: invocation.logPath ?? rebootLogPath(),
    command: Object.freeze([execPath, ...args])
  })
}

/** Render one shell-ish command line for humans and logs. */
export function quoteCommand(command) {
  return command.map((part) => (/^[\w@%+=:,./-]+$/u.test(part) ? part : `'${part.replaceAll("'", `'\\''`)}'`)).join(' ')
}

/** Module-level guard so two `/reboot` invocations cannot spawn two workers. */
let pending = undefined

/** Wrap a spawn failure in the message the command shows. */
function spawnFailure(error) {
  return new Error(`could not start the reboot helper: ${error instanceof Error ? error.message : String(error)}`)
}

/** Poll interval for the worker readiness handshake. */
const READY_POLL_MS = 25

/**
 * Spawn the detached helper that waits for this PID and relaunches the Host.
 * @param {ReturnType<typeof planRelaunch>} plan - the relaunch command.
 * @param {object} [options]
 * @param {string} [options.readyPath] - file the worker writes once it is watching.
 * @param {number} [options.readyPort] - port the relaunched Host must listen on.
 * @param {string} [options.readyHost] - host to probe for readiness.
 * @returns {{ child: import('node:child_process').ChildProcess, workerPid: number | undefined }}
 */
export function spawnRebootWorker(plan, options = {}) {
  const config = {
    oldPid: process.pid,
    execPath: plan.execPath,
    args: plan.args,
    cwd: plan.cwd,
    logPath: plan.logPath,
    readyPath: options.readyPath,
    readyPort: options.readyPort,
    readyHost: options.readyHost,
    readyTimeoutMs: options.readyTimeoutMs ?? DEFAULT_READY_TIMEOUT_MS,
    waitTimeoutMs: options.waitTimeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS,
    settleMs: options.settleMs ?? DEFAULT_SETTLE_MS,
    verifyMs: options.verifyMs ?? DEFAULT_VERIFY_MS,
    launchRetries: options.launchRetries ?? DEFAULT_LAUNCH_RETRIES
  }
  try {
    const child = spawn(process.execPath, [WORKER, JSON.stringify(config)], {
      cwd: plan.cwd,
      env: process.env,
      detached: true,
      stdio: 'ignore'
    })
    child.unref()
    return { child, workerPid: child.pid }
  } catch (error) {
    throw spawnFailure(error)
  }
}

/**
 * Wait for the detached helper to announce that it is watching. Without this
 * handshake the Host could SIGTERM itself while the helper never started, and
 * nothing would bring it back.
 * @param {import('node:child_process').ChildProcess} child - the spawned helper.
 * @param {string} readyPath - the marker it writes.
 * @param {number} [timeoutMs]
 * @returns {Promise<void>}
 * @throws when the helper exits, errors, or never announces readiness.
 */
export function waitForWorkerReady(child, readyPath, timeoutMs = DEFAULT_WORKER_READY_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    let settled = false
    let poll
    const finish = (error) => {
      if (settled) return
      settled = true
      clearInterval(poll)
      child.removeListener('exit', onExit)
      child.removeListener('error', onError)
      try {
        unlinkSync(readyPath)
      } catch {
        // The marker is best-effort cleanup.
      }
      if (error === undefined) resolve()
      else reject(error)
    }
    const onExit = (code, signal) => finish(new Error(`the reboot helper exited before it was ready (${String(code ?? signal ?? 'exit')})`))
    const onError = (error) => finish(new Error(`the reboot helper failed to start: ${error instanceof Error ? error.message : String(error)}`))
    const deadline = Date.now() + timeoutMs
    child.once('exit', onExit)
    child.once('error', onError)
    poll = setInterval(() => {
      if (existsSync(readyPath)) finish()
      else if (Date.now() > deadline) finish(new Error('the reboot helper did not become ready in time; the Host was not restarted'))
    }, READY_POLL_MS)
  })
}

/**
 * Schedule a full-Host restart.
 *
 * With `dryRun` this only computes the plan. Otherwise it spawns the worker,
 * waits until the worker confirms it is watching, and only then asks the Host
 * for its own graceful shutdown after `delayMs`. Synchronous and early spawn
 * failures therefore leave the Host running and surface as a command error.
 *
 * @param {object} [options]
 * @param {boolean} [options.dryRun] - compute the plan without scheduling anything.
 * @param {boolean} [options.allowOpen] - let the new Host open a browser tab.
 * @param {boolean} [options.web] - whether this Host serves the web surface.
 * @param {number} [options.actualPort] - the port the current Host bound.
 * @param {string} [options.actualHost] - the host the current Host bound.
 * @param {number} [options.delayMs] - delay before SIGTERM (default 700 ms).
 * @param {string} [options.logPath] - file the new Host appends its output to.
 * @param {number} [options.workerReadyTimeoutMs]
 * @param {number} [options.readyTimeoutMs]
 * @param {number} [options.waitTimeoutMs]
 * @param {number} [options.settleMs]
 * @param {number} [options.verifyMs]
 * @param {number} [options.launchRetries]
 * @returns {Promise<{ kind: 'dry-run', plan: object }
 *   | { kind: 'already-scheduled', plan: object, workerPid: number | undefined, delayMs: number }
 *   | { kind: 'scheduled', plan: object, workerPid: number | undefined, delayMs: number }>}
 */
export async function scheduleReboot(options = {}) {
  const plan = planRelaunch({
    actualPort: options.actualPort,
    allowOpen: options.allowOpen,
    web: options.web,
    logPath: options.logPath
  })
  // A second `/reboot` (and even `--dry-run`) must report the restart already
  // in flight instead of pretending nothing is scheduled.
  if (pending !== undefined) return { kind: 'already-scheduled', plan, workerPid: pending.workerPid, delayMs: pending.delayMs }
  if (options.dryRun === true) return { kind: 'dry-run', plan }

  const readyPath = join(tmpdir(), `dsh-reboot-ready-${String(process.pid)}-${randomUUID()}`)
  const { child, workerPid } = spawnRebootWorker(plan, {
    readyPath,
    readyPort: options.actualPort,
    readyHost: options.actualHost,
    workerReadyTimeoutMs: options.workerReadyTimeoutMs,
    readyTimeoutMs: options.readyTimeoutMs,
    waitTimeoutMs: options.waitTimeoutMs,
    settleMs: options.settleMs,
    verifyMs: options.verifyMs,
    launchRetries: options.launchRetries
  })
  try {
    await waitForWorkerReady(child, readyPath, options.workerReadyTimeoutMs ?? DEFAULT_WORKER_READY_TIMEOUT_MS)
  } catch (error) {
    try {
      child.kill('SIGKILL')
    } catch {
      // Already gone.
    }
    throw spawnFailure(error)
  }

  const delayMs = options.delayMs ?? DEFAULT_REBOOT_DELAY_MS
  pending = { plan, workerPid, delayMs }
  let shuttingDown = false

  const shutdown = setTimeout(() => {
    shuttingDown = true
    try {
      // profile-boot handles SIGTERM with a bounded graceful disposal, then exits.
      process.kill(process.pid, 'SIGTERM')
    } catch {
      process.exit(0)
    }
  }, delayMs)
  shutdown.unref?.()
  const forceExit = setTimeout(() => process.exit(0), delayMs + FORCE_EXIT_GRACE_MS)
  forceExit.unref?.()

  // If the helper dies before the Host was asked to shut down, refuse to shut
  // down: staying up is recoverable, disappearing with no relaunch is not.
  child.once('exit', (code, signal) => {
    if (shuttingDown) return
    clearTimeout(shutdown)
    clearTimeout(forceExit)
    pending = undefined
    console.error(`hot-reload: the reboot helper exited unexpectedly (${String(code ?? signal ?? 'exit')}); the Host was not restarted`)
  })

  return { kind: 'scheduled', plan, workerPid, delayMs }
}

/** Test-only view of the pending guard. */
export function pendingReboot() {
  return pending
}

/** Test-only reset of the pending guard. */
export function resetPendingReboot() {
  pending = undefined
}
