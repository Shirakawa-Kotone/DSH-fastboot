/**
 * Tests for the `/reboot` relaunch mechanics.
 *
 * Run with: node --test test/
 *
 * The worker tests spawn real Node processes in a temp directory: one plays the
 * old Host (it never exits, so the worker has to reap it), one is the "new
 * Host" the worker launches. Nothing here touches the real DSH installation.
 */

import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  adjustRelaunchArgs,
  detectProfile,
  planRelaunch,
  quoteCommand,
  pendingReboot,
  resetPendingReboot,
  rewritePort,
  scheduleReboot,
  waitForWorkerReady
} from '../lib/reboot.js'

const WORKER = fileURLToPath(new URL('../lib/reboot-worker.js', import.meta.url))
const NODE = process.execPath

/** Temp root shared by the tests in this file. */
let root

before(async () => {
  root = await mkdtemp(join(tmpdir(), 'dsh-reboot-test-'))
})

after(async () => {
  resetPendingReboot()
  await rm(root, { recursive: true, force: true })
})

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Poll until `predicate` is true or the timeout elapses. */
async function waitUntil(predicate, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await predicate()) return
    await sleep(25)
  }
  throw new Error(`timed out waiting for ${label}`)
}

/** Whether a PID still exists. */
function alive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error.code === 'EPERM'
  }
}

/** Resolve at exit, or reject after `timeoutMs`. */
function waitForExit(child, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`process ${String(child.pid)} did not exit within ${String(timeoutMs)} ms`)), timeoutMs)
    child.once('exit', (code, signal) => {
      clearTimeout(timer)
      resolve({ code, signal })
    })
    child.once('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
  })
}

/** Reserve a port from the OS, then release it for the test Host to bind. */
async function freePort() {
  const { createServer } = await import('node:net')
  const server = createServer()
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const port = server.address().port
  await new Promise((resolve) => server.close(resolve))
  return port
}

/** Spawn a detached fake Host that idles until killed. */
function spawnIdleHost(scriptPath, extraArgs = []) {
  return spawn(NODE, [scriptPath, ...extraArgs], { stdio: 'ignore', detached: false })
}

test('detectProfile reads the launcher abbreviations', () => {
  assert.equal(detectProfile(['web', '--port', '3199']), 'web')
  assert.equal(detectProfile(['--profile', 'tui', '--resume', 'x']), 'tui')
  assert.equal(detectProfile(['--profile=acp']), 'acp')
  assert.equal(detectProfile(['--port', '3199']), undefined)
  assert.equal(detectProfile([]), undefined)
  assert.equal(detectProfile(['plugin', 'add', 'x']), undefined)
})

test('rewritePort pins an explicit --port to the bound port', () => {
  assert.deepEqual(rewritePort(['web', '--port', '0'], 3199), ['web', '--port', '3199'])
  assert.deepEqual(rewritePort(['web', '--port=0', '--no-open'], 3199), ['web', '--port=3199', '--no-open'])
  assert.deepEqual(rewritePort(['web'], 3199), ['web'])
  assert.deepEqual(rewritePort(['web', '--port', '3199'], undefined), ['web', '--port', '3199'])
})

test('adjustRelaunchArgs pins the port and appends --no-open for the web surface', () => {
  assert.deepEqual(adjustRelaunchArgs(['web', '--port', '0'], { actualPort: 3199 }), [
    'web',
    '--port',
    '3199',
    '--no-open'
  ])
  // No argv --port: the port can come from config, so it is appended.
  assert.deepEqual(adjustRelaunchArgs(['web'], { actualPort: 3199 }), ['web', '--port', '3199', '--no-open'])
  assert.deepEqual(adjustRelaunchArgs(['web', '--no-open'], { actualPort: 3199 }), [
    'web',
    '--no-open',
    '--port',
    '3199'
  ])
  assert.deepEqual(adjustRelaunchArgs(['web'], { actualPort: 3199, allowOpen: true }), ['web', '--port', '3199'])
  assert.deepEqual(adjustRelaunchArgs(['web', '--no-open'], { actualPort: 3199, allowOpen: true }), [
    'web',
    '--port',
    '3199'
  ])
  assert.deepEqual(adjustRelaunchArgs(['tui', '--resume', 'abc'], { actualPort: 3199 }), ['tui', '--resume', 'abc'])
  // Custom profile that serves the web surface is detected by the caller, not the name.
  assert.deepEqual(adjustRelaunchArgs(['myweb'], { actualPort: 3199, web: true }), [
    'myweb',
    '--port',
    '3199',
    '--no-open'
  ])
})

test('planRelaunch reproduces the exact invocation', async () => {
  const script = join(root, 'fake-dsh.js')
  await writeFile(script, '#!/usr/bin/env node\nsetInterval(() => {}, 1000)\n', 'utf8')
  const plan = planRelaunch({
    argv: [NODE, script, 'web', '--port', '0'],
    execArgv: ['--enable-source-maps'],
    execPath: NODE,
    cwd: root,
    actualPort: 3199,
    logPath: join(root, 'web.log')
  })
  assert.equal(plan.execPath, NODE)
  assert.deepEqual(plan.args, ['--enable-source-maps', script, 'web', '--port', '3199', '--no-open'])
  assert.equal(plan.cwd, root)
  assert.equal(plan.logPath, join(root, 'web.log'))
  assert.deepEqual(plan.command, [NODE, ...plan.args])
  assert.equal(quoteCommand(plan.command), `${NODE} --enable-source-maps ${script} web --port 3199 --no-open`)
})

test('planRelaunch refuses when the entry script is gone', () => {
  assert.throws(
    () => planRelaunch({ argv: [NODE, join(root, 'missing.js'), 'web'], execArgv: [], execPath: NODE }),
    /no longer exists|restart the Host manually/u
  )
})

test('scheduleReboot --dry-run plans without spawning a helper', async () => {
  resetPendingReboot()
  const outcome = await scheduleReboot({ dryRun: true, actualPort: 3199, actualHost: '127.0.0.1', web: true })
  assert.equal(outcome.kind, 'dry-run')
  const command = outcome.plan.command.join(' ')
  assert.match(command, /--port 3199/u)
  assert.match(command, /--no-open/u)
  assert.equal(pendingReboot(), undefined)
})

test('worker waits for the old Host, then waits until the new Host listens', async () => {
  const oldHost = join(root, 'old-host.mjs')
  const newHost = join(root, 'new-host.mjs')
  const newPidFile = join(root, 'new-host.pid')
  const readyPath = join(root, 'worker-ready-1')
  const logPath = join(root, 'reboot.log')
  const port = await freePort()
  await writeFile(oldHost, 'setInterval(() => {}, 1000)\n', 'utf8')
  await writeFile(
    newHost,
    `import { writeFileSync } from 'node:fs'\nimport { createServer } from 'node:net'\ncreateServer().listen(${JSON.stringify(port)}, '127.0.0.1', () => writeFileSync(${JSON.stringify(newPidFile)}, String(process.pid)))\n`,
    'utf8'
  )

  const old = spawnIdleHost(oldHost)
  await sleep(100)
  assert.equal(alive(old.pid), true)

  const worker = spawn(
    NODE,
    [
      WORKER,
      JSON.stringify({
        oldPid: old.pid,
        execPath: NODE,
        args: [newHost],
        cwd: root,
        logPath,
        readyPath,
        readyPort: port,
        readyHost: '127.0.0.1',
        readyTimeoutMs: 5_000,
        waitTimeoutMs: 2_000,
        settleMs: 50,
        verifyMs: 400,
        launchRetries: 1
      })
    ],
    { stdio: 'ignore' }
  )
  const workerExit = await waitForExit(worker, 15_000)
  assert.equal(workerExit.code, 0)

  assert.equal(existsSync(readyPath), true)
  await waitUntil(async () => existsSync(newPidFile), 5_000, 'the relaunched fake Host')
  await waitUntil(async () => !alive(old.pid), 2_000, 'the old fake Host to disappear')
  const newPid = Number(await readFile(newPidFile, 'utf8'))
  assert.equal(Number.isInteger(newPid) && newPid > 0, true)
  assert.notEqual(newPid, old.pid)
  assert.equal(alive(newPid), true)
  process.kill(newPid, 'SIGKILL')

  const log = await readFile(logPath, 'utf8')
  assert.match(log, /waiting for old Host pid/u)
  assert.match(log, /SIGKILL/u)
  assert.match(log, /launch attempt 1/u)
  assert.match(log, new RegExp(`new Host is listening on 127\\.0\\.0\\.1:${String(port)}; reboot complete`, 'u'))
  assert.match(log, /reboot complete/u)
})

test('worker retries when the new Host exits early', async () => {
  const oldHost = join(root, 'old-host-2.mjs')
  const newHost = join(root, 'new-host-2.mjs')
  const counterFile = join(root, 'attempts.txt')
  const startedFile = join(root, 'started-2.pid')
  const logPath = join(root, 'reboot-2.log')
  const port = await freePort()
  await writeFile(oldHost, 'setInterval(() => {}, 1000)\n', 'utf8')
  // First launch exits with an error (an occupied port does the same); the
  // second one listens and writes its PID.
  await writeFile(
    newHost,
    `import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
const counter = ${JSON.stringify(counterFile)}
const attempt = existsSync(counter) ? Number(readFileSync(counter, 'utf8')) + 1 : 1
writeFileSync(counter, String(attempt))
if (attempt === 1) process.exit(3)
createServer().listen(${JSON.stringify(port)}, '127.0.0.1', () => writeFileSync(${JSON.stringify(startedFile)}, String(process.pid)))
`,
    'utf8'
  )

  const old = spawnIdleHost(oldHost)
  await sleep(100)
  const worker = spawn(
    NODE,
    [
      WORKER,
      JSON.stringify({
        oldPid: old.pid,
        execPath: NODE,
        args: [newHost],
        cwd: root,
        logPath,
        readyPort: port,
        readyHost: '127.0.0.1',
        readyTimeoutMs: 5_000,
        waitTimeoutMs: 1_000,
        settleMs: 20,
        verifyMs: 300,
        launchRetries: 3
      })
    ],
    { stdio: 'ignore' }
  )
  const workerExit = await waitForExit(worker, 20_000)
  assert.equal(workerExit.code, 0)
  await waitUntil(async () => existsSync(startedFile), 5_000, 'the second launch')
  const startedPid = Number(await readFile(startedFile, 'utf8'))
  process.kill(startedPid, 'SIGKILL')
  const log = await readFile(logPath, 'utf8')
  assert.match(log, /launch attempt 1 failed: exited early \(3\)/u)
  assert.match(log, /launch attempt 2/u)
  assert.match(log, /reboot complete/u)
})

const invocation = (rawInput) => ({ rawInput, commandId: 'id', agent: {}, attachments: [], signal: new AbortController().signal })

function fakeApply(webServer) {
  const commands = []
  const tools = []
  const inner = {
    commands: { register: (definition) => { commands.push(definition); return () => {} } },
    tools: { register: (tool) => { tools.push(tool); return () => {} } },
    get: (name) => {
      if (name === 'webServer') return webServer
      if (name === 'webApp') return webServer === undefined ? undefined : {}
      return undefined
    }
  }
  const ctx = { inject: (services, callback) => callback(inner) }
  return { commands, tools, apply: async () => (await import('../lib/index.js')).apply(ctx) }
}

test('the plugin registers /reload and /reboot and exposes dry-run', async () => {
  const fake = fakeApply({ port: 3199, host: '127.0.0.1' })
  await fake.apply()

  assert.deepEqual(fake.tools.map((tool) => tool.name).sort(), ['reboot_dsh', 'reload_dsh'])
  assert.deepEqual(fake.commands.map((command) => command.name).sort(), ['reboot', 'reload'])

  const reboot = fake.commands.find((command) => command.name === 'reboot')
  const dryRun = await reboot.handler(invocation(' --dry-run'))
  assert.equal(dryRun.kind, 'success')
  assert.match(dryRun.text, /reboot plan \(not executed\)/u)
  assert.match(dryRun.text, /command: /u)
  // The dry-run plan pins the bound port and asks the web surface not to open a tab.
  assert.match(dryRun.text, /--port 3199/u)
  assert.match(dryRun.text, /--no-open/u)

  const help = await reboot.handler(invocation(' --help'))
  assert.equal(help.kind, 'success')
  assert.match(help.text, /Usage: \/reboot/u)

  const bad = await reboot.handler(invocation(' --nope'))
  assert.equal(bad.kind, 'error')
  assert.match(bad.text, /unknown \/reboot argument/u)
  resetPendingReboot()
})

test('/reboot is refused when no web server is mounted', async () => {
  const fake = fakeApply(undefined)
  await fake.apply()
  const reboot = fake.commands.find((command) => command.name === 'reboot')
  const result = await reboot.handler(invocation(''))
  assert.equal(result.kind, 'error')
  assert.match(result.text, /no web server/u)
})

test('waitForWorkerReady rejects a helper that exits before announcing itself', async () => {
  const child = spawn(NODE, ['-e', 'process.exit(2)'], { stdio: 'ignore' })
  await assert.rejects(waitForWorkerReady(child, join(root, 'ready-never-1'), 2_000), /exited before it was ready/u)
})

test('waitForWorkerReady resolves on the marker and rejects on timeout', async () => {
  const child = spawn(NODE, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' })
  await sleep(100)
  const readyPath = join(root, 'ready-late')
  const waiter = waitForWorkerReady(child, readyPath, 2_000)
  setTimeout(() => writeFileSync(readyPath, 'ok'), 150)
  await waiter
  assert.equal(existsSync(readyPath), false)
  await assert.rejects(waitForWorkerReady(child, join(root, 'ready-never-2'), 250), /did not become ready/u)
  child.kill('SIGKILL')
})

test('worker still relaunches when the working directory vanished', async () => {
  const oldHost = join(root, 'old-host-3.mjs')
  const newHost = join(root, 'new-host-3.mjs')
  const newPidFile = join(root, 'new-host-3.pid')
  const logPath = join(root, 'reboot-3.log')
  await writeFile(oldHost, 'setInterval(() => {}, 1000)\n', 'utf8')
  await writeFile(
    newHost,
    `import { writeFileSync } from 'node:fs'\nwriteFileSync(${JSON.stringify(newPidFile)}, String(process.pid))\nsetInterval(() => {}, 1000)\n`,
    'utf8'
  )

  const old = spawnIdleHost(oldHost)
  await sleep(100)
  const missingCwd = join(root, 'directory-that-does-not-exist')
  const worker = spawn(
    NODE,
    [
      WORKER,
      JSON.stringify({
        oldPid: old.pid,
        execPath: NODE,
        args: [newHost],
        cwd: missingCwd,
        logPath,
        waitTimeoutMs: 2_000,
        settleMs: 20,
        verifyMs: 400,
        launchRetries: 1
      })
    ],
    { stdio: 'ignore' }
  )
  const workerExit = await waitForExit(worker, 15_000)
  assert.equal(workerExit.code, 0)
  await waitUntil(async () => existsSync(newPidFile), 5_000, 'the relaunched Host')
  const newPid = Number(await readFile(newPidFile, 'utf8'))
  process.kill(newPid, 'SIGKILL')
  const log = await readFile(logPath, 'utf8')
  assert.match(log, /working directory .* is unavailable; using/u)
})
