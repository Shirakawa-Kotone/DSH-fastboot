/**
 * Tests for the Creation-mode `reboot_dsh` tool.
 *
 * The tool is exercised with fake Host services: the point here is the guard
 * (Creation mode only, no other running session), the durable follow-up it
 * registers before shutting down, and its rollback when the restart fails.
 * The real restart mechanics are covered by reboot.test.mjs and the staging
 * end-to-end run.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  CREATION_MODE_PRESET,
  DEFAULT_FOLLOW_UP_PROMPT,
  DEFAULT_FOLLOW_UP_SECONDS,
  MAX_FOLLOW_UP_SECONDS,
  MIN_FOLLOW_UP_SECONDS,
  createRebootTool,
  isCreationMode,
  presetOf
} from '../lib/tool.js'

/** One fake live Agent. */
function fakeAgent(id, preset = CREATION_MODE_PRESET, status = 'idle') {
  return { session: { id }, status, ctx: { preset }, preset }
}

/** A fake `agentPresets` service that reads the preset carried by the fake ctx. */
const agentPresets = {
  composedPreset: (ctx) => ctx.preset,
  presetForSession: () => undefined
}

/** A fake `agents` registry over a mutable list. */
function agentsRegistry(list, roots) {
  return { list: () => list, roots: () => roots ?? list }
}

/** A fake Schedule service that records its calls. */
function scheduleService() {
  const created = []
  const edited = []
  return {
    created,
    edited,
    create: async (request, actorSessionId) => {
      created.push({ request, actorSessionId })
      return { id: `task-${String(created.length)}` }
    },
    edit: async (request, actorSessionId) => {
      edited.push({ request, actorSessionId })
      return { deleted: true }
    }
  }
}

/** Build one tool plus all fakes it was given. */
function harness({ otherAgents = [], reboot } = {}) {
  const current = fakeAgent('session-current')
  const agents = agentsRegistry([current, ...otherAgents])
  const schedule = scheduleService()
  const restarts = []
  const tool = createRebootTool(
    { agents, agentPresets, schedule, webServer: { port: 3199, host: '127.0.0.1' }, webApp: {} },
    {
      scheduleReboot: async (options) => {
        restarts.push(options)
        if (reboot !== undefined) return reboot(options)
        return { kind: 'scheduled', workerPid: 4242, delayMs: 700 }
      }
    }
  )
  const exec = { agent: current, signal: new AbortController().signal, callId: 'call-1' }
  return { tool, current, schedule, restarts, exec }
}

test('preset detection recognises Creation mode and tolerates broken lookups', () => {
  assert.equal(presetOf(agentPresets, fakeAgent('a')), CREATION_MODE_PRESET)
  assert.equal(isCreationMode(agentPresets, fakeAgent('a')), true)
  assert.equal(isCreationMode(agentPresets, fakeAgent('b', 'standard')), false)
  assert.equal(isCreationMode(undefined, fakeAgent('c')), false)
  assert.equal(isCreationMode({ composedPreset: () => { throw new Error('boom') } }, fakeAgent('d')), false)
})

test('a Creation-mode session schedules a durable follow-up and restarts', async () => {
  const { tool, current, schedule, restarts, exec } = harness()
  const result = await tool.execute({}, exec)
  assert.equal(result.ok, true)
  assert.equal(result.action, 'scheduled')
  assert.equal(result.hostPid, process.pid)
  assert.equal(result.workerPid, 4242)
  assert.equal(result.delayMs, 700)
  assert.equal(result.followUpTaskId, 'task-1')
  assert.equal(result.followUpSeconds, DEFAULT_FOLLOW_UP_SECONDS)
  assert.match(result.command.join(' '), /--port 3199/u)
  assert.match(result.command.join(' '), /--no-open/u)

  assert.equal(schedule.created.length, 1)
  const { request, actorSessionId } = schedule.created[0]
  assert.equal(request.title, 'DSH restart follow-up')
  assert.equal(request.prompt, DEFAULT_FOLLOW_UP_PROMPT)
  assert.deepEqual(request.timing, { kind: 'after', after_seconds: DEFAULT_FOLLOW_UP_SECONDS })
  assert.deepEqual(request.target, { kind: 'session', sessionId: current.session.id })
  assert.equal(actorSessionId, current.session.id)
  assert.equal(restarts.length, 1)
  assert.equal(restarts[0].actualPort, 3199)
  assert.equal(restarts[0].web, true)
})

test('another running session makes the tool refuse without restarting', async () => {
  const { tool, schedule, restarts, exec } = harness({
    otherAgents: [fakeAgent('session-other', CREATION_MODE_PRESET, 'running')]
  })
  const result = await tool.execute({}, exec)
  assert.equal(result.ok, false)
  assert.equal(result.action, 'refused')
  assert.deepEqual(result.runningSessions, ['session-other'])
  assert.match(result.error, /1 other session is still running/u)
  assert.match(result.error, /\/reboot manually/u)
  assert.equal(schedule.created.length, 0)
  assert.equal(restarts.length, 0)
})

test('idle sessions do not block the restart', async () => {
  const { tool, exec } = harness({ otherAgents: [fakeAgent('session-idle', 'standard', 'idle')] })
  const result = await tool.execute({}, exec)
  assert.equal(result.ok, true)
  assert.equal(result.action, 'scheduled')
})

test('dry-run reports the plan without scheduling or restarting', async () => {
  const { tool, schedule, restarts, exec } = harness()
  const result = await tool.execute({ dryRun: true }, exec)
  assert.equal(result.ok, true)
  assert.equal(result.action, 'dry-run')
  assert.equal(schedule.created.length, 0)
  assert.equal(restarts.length, 0)
  assert.match(result.command.join(' '), /--port 3199/u)
})

test('custom continuation and bounded follow-up delay', async () => {
  const { tool, schedule, exec } = harness()
  await tool.execute({ continueWith: 'Run the integration test again.', followUpSeconds: 1 }, exec)
  assert.equal(schedule.created[0].request.prompt, 'Run the integration test again.')
  assert.equal(schedule.created[0].request.timing.after_seconds, MIN_FOLLOW_UP_SECONDS)

  const second = harness()
  await second.tool.execute({ followUpSeconds: 9_999 }, second.exec)
  assert.equal(second.schedule.created[0].request.timing.after_seconds, MAX_FOLLOW_UP_SECONDS)
})

test('a failed restart withdraws the follow-up task', async () => {
  const { tool, schedule, exec } = harness({
    reboot: async () => {
      throw new Error('helper did not start')
    }
  })
  const result = await tool.execute({}, exec)
  assert.equal(result.ok, false)
  assert.match(result.error, /helper did not start/u)
  assert.deepEqual(schedule.edited, [{ request: { id: 'task-1', action: 'delete' }, actorSessionId: 'session-current' }])
})

test('a delegated child agent cannot restart the Host', async () => {
  const current = fakeAgent('session-child')
  const parent = fakeAgent('session-parent')
  const agents = agentsRegistry([current, parent], [parent])
  const schedule = scheduleService()
  const tool = createRebootTool(
    { agents, agentPresets, schedule, webServer: { port: 3199, host: '127.0.0.1' }, webApp: {} },
    { scheduleReboot: async () => ({ kind: 'scheduled', workerPid: 1, delayMs: 700 }) }
  )
  const result = await tool.execute({}, { agent: current, signal: new AbortController().signal, callId: 'call-child' })
  assert.equal(result.ok, false)
  assert.equal(result.action, 'refused')
  assert.match(result.error, /top-level session/u)
  assert.equal(schedule.created.length, 0)
})

test('non-Creation-mode agents are refused even if the tool is reached', async () => {
  const { tool, schedule, restarts, exec } = harness()
  exec.agent = fakeAgent('session-standard', 'standard')
  const result = await tool.execute({}, exec)
  assert.equal(result.ok, false)
  assert.match(result.error, /only available in Creation mode/u)
  assert.equal(schedule.created.length, 0)
  assert.equal(restarts.length, 0)
})

test('invalid arguments fail softly with an explanation', async () => {
  const { tool, exec } = harness()
  const result = await tool.execute({ continueWith: 42 }, exec)
  assert.equal(result.ok, false)
  assert.match(result.error, /continueWith must be a string/u)
})

test('an already-pending restart is reported, not duplicated', async () => {
  const { tool, exec } = harness({ reboot: async () => ({ kind: 'already-scheduled', workerPid: 1, delayMs: 700 }) })
  const result = await tool.execute({}, exec)
  assert.equal(result.ok, true)
  assert.equal(result.action, 'already-scheduled')
})
