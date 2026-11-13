#!/usr/bin/env node
/**
 * Detached helper for the `/reboot` command.
 *
 * The old Host spawns this script and then exits; the script must therefore be
 * self-contained, survive its parent, and never assume the caller is still
 * alive. Its single job: wait until the old PID is gone, then launch the exact
 * same `dsh` invocation again until one instance is actually listening.
 *
 * Invocation: `node reboot-worker.js '<JSON config>'` where the config is
 * `{ oldPid, execPath, args, cwd, logPath, readyPath, readyHost, readyPort,
 * readyTimeoutMs, waitTimeoutMs, settleMs, verifyMs, launchRetries }` (see
 * `reboot.js`).
 *
 * The worker writes `readyPath` as soon as it is watching, so the Host only
 * shuts itself down after the helper is provably alive. A launched Host counts
 * as restarted only when it accepts a TCP connection on the expected port (or,
 * without a known port, stays alive for `verifyMs`); the startup line is not
 * parsed and no blind timer is trusted.
 *
 * All diagnostics are appended to the Host log (`$DSH_HOME/web.log`), because
 * this process has no terminal and its stdio is `/dev/null`.
 */

import { spawn } from 'node:child_process'
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, writeFileSync } from 'node:fs'
import { connect } from 'node:net'
import { homedir, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

/** Parsed launch configuration. */
const config = JSON.parse(process.argv[2] ?? '{}')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Append one timestamped line to the Host log, falling back to the temp dir. */
function log(line) {
  const entry = `[reboot ${new Date().toISOString()}] ${line}\n`
  for (const path of [config.logPath, join(tmpdir(), 'dsh-reboot.log')]) {
    if (typeof path !== 'string' || path === '') continue
    try {
      mkdirSync(dirname(path), { recursive: true })
      appendFileSync(path, entry)
      return
    } catch {
      // Try the next candidate; logging must never kill the worker.
    }
  }
}

/** Whether a PID still exists (zombies count as existing until reaped). */
function alive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error?.code === 'EPERM'
  }
}

/** Tell the parent Host that this helper is watching; without it the Host stays up. */
function announceReady() {
  if (typeof config.readyPath !== 'string' || config.readyPath === '') return
  try {
    writeFileSync(config.readyPath, String(process.pid))
  } catch (error) {
    log(`cannot write the readiness marker ${config.readyPath}: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

/** Wait for the old Host to disappear, escalating to SIGKILL after the deadline. */
async function waitForOldHost() {
  const { oldPid, waitTimeoutMs } = config
  log(`waiting for old Host pid ${String(oldPid)} to exit`)
  const deadline = Date.now() + waitTimeoutMs
  while (alive(oldPid) && Date.now() < deadline) await sleep(100)
  if (!alive(oldPid)) {
    log(`old Host pid ${String(oldPid)} exited`)
    return
  }
  log(`old Host pid ${String(oldPid)} did not exit within ${String(waitTimeoutMs)} ms; sending SIGKILL`)
  try {
    process.kill(oldPid, 'SIGKILL')
  } catch (error) {
    log(`SIGKILL failed: ${error instanceof Error ? error.message : String(error)}`)
  }
  await sleep(500)
}

/** Resolve true when a TCP connection to `host:port` is accepted. */
function canConnect(host, port) {
  return new Promise((resolve) => {
    let settled = false
    const finish = (value) => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(value)
    }
    const socket = connect({ host, port })
    socket.setTimeout(500, () => finish(false))
    socket.once('connect', () => finish(true))
    socket.once('error', () => finish(false))
  })
}

/** SIGTERM a launch that never became ready, then SIGKILL it after a grace period. */
async function stopChild(child) {
  try {
    child.kill('SIGTERM')
  } catch {
    return
  }
  const deadline = Date.now() + 2_000
  while ((child.exitCode === null && child.signalCode === null) && Date.now() < deadline) await sleep(100)
  if (child.exitCode === null && child.signalCode === null) {
    try {
      child.kill('SIGKILL')
    } catch {
      // Already gone.
    }
  }
}

/**
 * Start one Host instance and wait until it is genuinely back.
 * @param {number} attempt - 1-based launch attempt, for the log.
 * @returns {Promise<string | undefined>} undefined when the Host is up, else a failure reason.
 */
async function launchOnce(attempt) {
  let fd
  try {
    mkdirSync(dirname(config.logPath), { recursive: true })
    fd = openSync(config.logPath, 'a')
  } catch {
    fd = 'ignore'
  }

  // The working directory can disappear while the Host runs (a deleted
  // scratch directory). Falling back to $HOME still brings the GUI back;
  // failing the spawn would leave the machine without a Host.
  let cwd = config.cwd
  if (typeof cwd !== 'string' || cwd === '' || !existsSync(cwd)) {
    log(`working directory ${String(cwd)} is unavailable; using ${homedir()}`)
    cwd = homedir()
  }

  let child
  try {
    child = spawn(config.execPath, config.args, {
      cwd,
      env: process.env,
      detached: true,
      stdio: ['ignore', fd, fd]
    })
    child.unref()
  } finally {
    if (typeof fd === 'number') closeSync(fd)
  }
  log(`launch attempt ${String(attempt)}: pid ${String(child.pid)}: ${[config.execPath, ...config.args].join(' ')}`)

  let exited
  child.once('exit', (code, signal) => {
    exited = code ?? signal ?? 'exit'
  })
  child.once('error', (error) => {
    exited ??= `error: ${error.message}`
  })

  const port = Number.isInteger(config.readyPort) && config.readyPort > 0 ? config.readyPort : undefined
  const timeoutMs = Number.isFinite(config.readyTimeoutMs) && config.readyTimeoutMs > 0 ? config.readyTimeoutMs : 20_000
  if (port === undefined) {
    // No known listening port: keep the old liveness check. `/reboot` itself is
    // registered only for the web surface, so this is a defensive fallback.
    await sleep(Number.isFinite(config.verifyMs) && config.verifyMs > 0 ? config.verifyMs : 1_500)
    if (exited !== undefined) return `exited early (${String(exited)})`
    log('new Host stayed alive (no listening port was known)')
    return undefined
  }

  const host = typeof config.readyHost === 'string' && config.readyHost !== '' ? config.readyHost : '127.0.0.1'
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (exited !== undefined) return `exited early (${String(exited)})`
    if (await canConnect(host, port)) {
      log(`new Host is listening on ${host}:${String(port)}; reboot complete`)
      return undefined
    }
    await sleep(100)
  }
  if (exited !== undefined) return `exited early (${String(exited)})`
  log(`new Host pid ${String(child.pid)} did not listen on ${host}:${String(port)} within ${String(timeoutMs)} ms; stopping it`)
  await stopChild(child)
  return 'not listening'
}

/** Wait for the old Host, then relaunch until one instance survives and listens. */
async function main() {
  if (!Array.isArray(config.args)) throw new Error('reboot worker: args must be an array')
  if (typeof config.execPath !== 'string' || config.execPath === '') throw new Error('reboot worker: execPath is required')
  announceReady()
  await waitForOldHost()
  await sleep(Number.isFinite(config.settleMs) ? config.settleMs : 200)

  const retries = Number.isInteger(config.launchRetries) && config.launchRetries > 0 ? config.launchRetries : 1
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const failure = await launchOnce(attempt)
    if (failure === undefined) {
      log('reboot complete')
      process.exit(0)
    }
    log(`launch attempt ${String(attempt)} failed: ${failure}`)
    // Another launch right away usually races the old listener; give it a moment.
    await sleep(600)
  }
  log(`ERROR: the new Host failed to come up after ${String(retries)} attempt(s)`)
  process.exit(1)
}

process.on('uncaughtException', (error) => {
  log(`uncaught: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`)
  process.exit(1)
})
process.on('unhandledRejection', (error) => {
  log(`unhandled rejection: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`)
  process.exit(1)
})

main().catch((error) => {
  log(`fatal: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`)
  process.exit(1)
})
