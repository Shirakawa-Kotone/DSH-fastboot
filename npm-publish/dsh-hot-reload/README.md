# @shirakawa-kotone/dsh-hot-reload

`@shirakawa-kotone/dsh-hot-reload` adds in-place reloading and a full Host restart to DSH:

- the Agent tool **`reload_dsh`** reloads changed DSH services instead of
  restarting the whole Host;
- the Web UI command **`/reload`** does the same thing from the composer;
- the Web UI command **`/reboot`** restarts the whole Host — the same `dsh`
  invocation, on the same port — without leaving the GUI;
- the Agent tool **`reboot_dsh`** lets a Creation-mode (`cordis` preset) session
  restart the Host itself and continue its work afterwards.

## Why

A full `dsh web` restart boots every plugin, reconnects every MCP server and
reopens the profile. On this machine that costs several seconds even after the
MCP fast-boot patch. The HMR service already knows how to replace only the
modules that changed, but its file watcher defaults to the profile directory,
so a **linked** plugin under `~/dev/...` is outside the watch roots. Editing
such a plugin therefore normally means a full restart.

`reload_dsh action: "changed"` calls the HMR service's own
`reconcileProfile()`: it compares every loaded module below the profile and
its linked package roots with disk, evicts the changed modules, stops the
entries that run them, recomposes the profile, and starts those entries again
with the new code and configuration. Everything else keeps running.

Some changes cannot be applied in place — the CLI version, a profile manifest,
a module in DSH's own host graph. For those, `/reboot` restarts the process.

## Usage

As an Agent tool: ask the model to run `reload_dsh` (actions below).

As a human command in the Web UI composer:

- `/reload` — reload changed modules and restart only their entries.
- `/reload <entry-id> …` — restart the named entries without reloading code.
- `/reboot` — restart the whole Host now (web profiles only: the relaunch is
  detached, which only makes sense for a browser-facing Host).
- `/reboot --dry-run` — print the exact relaunch command, working directory and
  log file without restarting anything. Harmless; useful to confirm what a
  restart would run.
- `/reboot --open` — also let the new Host open a fresh browser tab (by
  default the relaunch passes `--no-open`: the page already reconnects by
  itself).

## What `/reboot` does

1. It computes the relaunch command from the running process itself:
   `process.execPath`, `process.execArgv`, the `dsh` entry script and the
   original application arguments. The web surface is always pinned to the port
   the Host actually bound — an explicit `--port 0`/`--port N` is rewritten and
   a port that came only from the composed config gets an explicit `--port`
   appended — so the page can rejoin the same origin. Web profiles also get
   `--no-open` unless you passed `--open`.
2. It spawns a detached helper (`lib/reboot-worker.js`) **before** touching the
   Host, and waits until the helper writes a readiness marker. If the helper
   cannot start (missing file, unwritable temp dir), the command fails and the
   Host stays up — a failed helper never takes the GUI down.
3. It answers the command, then asks this process for a graceful SIGTERM
   shutdown ~700 ms later. `profile-boot`'s bounded disposal runs: sessions
   are flushed, MCP children are reaped, the listener closes.
4. The helper waits for the old PID to disappear (SIGKILL after 20 s), then
   launches the same invocation again with its output appended to
   `$DSH_HOME/web.log`. It counts the new Host as back only when it accepts a
   TCP connection on the expected port — not after a blind timer. If the new
   Host exits early (for example while the old listener releases the port) or
   never listens, the helper stops it and retries, up to five times, so a
   reboot cannot strand the machine without a Host.
5. The browser page reconnects on its own: DSH's Web UI keeps a persistent
   signed auth cookie, so the same origin accepts it after the restart.
   MCP servers are restarted by the new Host's boot; with the fastboot bundle
   their connections run in the background, so the GUI is back before the MCP
   tools are.

`/reboot` never runs under a process manager that already restarts `dsh`: two
supervisors would race for the port. Run `dsh web` directly (a shell, `nohup`,
or a login item) when you want to use it.

### Creation mode: the `reboot_dsh` tool

Plugin development often needs a real restart, not an in-place reload. Sessions
in **Creation mode** (the `cordis` preset) therefore get an Agent tool,
`reboot_dsh`, with two safety rules the human command does not need:

- the tool is invisible in every other preset (`when` gates step admission, so
  ordinary sessions never see it);
- it is offered only to a **top-level session** — a delegated subagent must
  leave the restart to the session that owns it;
- it **refuses while any other live agent — another session or a subagent — is
  still running**. The restart would interrupt that work; the call returns the
  running session ids and reminds the model that the user can still run
  `/reboot` manually. Idle open sessions do not block.

The turn that calls the tool cannot survive the process restart, so before
shutting down the tool registers a one-shot Schedule task targeting its own
session: a follow-up prompt is delivered a few seconds after the new Host is
up, the session is resumed, and the agent continues where it stopped.

```
reboot_dsh {
  dryRun?: boolean            // report the plan, schedule nothing
  continueWith?: string       // instruction for the follow-up prompt
  followUpSeconds?: number    // default 12, minimum 5
}
```

If the restart cannot be started (helper failed, no entry script), the tool
withdraws the follow-up task and returns the error, so the session is not woken
with a false "restarted" message. A second call while a restart is already in
flight reports `already-scheduled` instead of creating a duplicate follow-up.

## Tool actions

| `action` | What it does |
|---|---|
| `changed` (default) | Reload modules that changed on disk and restart only their entries. Reports entries that still need a full restart (host modules). |
| `restart` | Dispose and re-create the entries named in `entries`, without reloading code. Useful for reconnecting `include:mcp-*` bridges. |
| `list` | List entries with ids, modules, states and disabled flags; `query` filters, `limit` caps at 200. |

Core entries (`loader`, `hmr`, `tools`, `webserver`, `agent-loop`) are refused
by `restart` unless `force: true`; restarting them can interrupt the current
session.

## Notes

- `changed` is a no-op (a few ms) when no watched file changed.
- It requires the `hmr` service, which profile boots provide. Headless/ACP
  profiles without HMR still get `list`, but `changed` reports that HMR is
  unavailable.
- A module that is part of DSH's own host graph, or a plugin no Loader entry
  starts, cannot be replaced safely; it is returned in `pending` with
  `restartRequired` and stays on the old code until a full restart.
- The tool reloads the services, not the browser page. Client-side bundle
  changes still need the normal client HMR/refresh path.
- `/reload` and `/reboot` are independent: `/reboot` needs the `commands` and
  `webServer` services but not HMR, so it still works when HMR is absent. In a
  headless/terminal profile the command is not registered at all.
- `reboot_dsh` additionally needs `agents`, `agentPresets` and `schedule`; a
  profile without them simply does not get the tool. The human `/reboot` is
  never gated by the running-session rule.
- Running an agent turn when `/reboot` executes aborts that turn (the Host
  shuts down); the session log is flushed before the process exits.

## Install

```text
plugin_manager install_bundle target: @shirakawa-kotone/dsh-hot-reload
```

or:

```sh
dsh plugin --profile web add @shirakawa-kotone/dsh-hot-reload
```

Select the bundle in the profile, then restart. No config is required. The
bundle patch inserts one entry:

```yaml
- insert:
    - id: hot-reload
      name: '@shirakawa-kotone/dsh-hot-reload'
```

## Tests

The test suite lives in the repository (`dsh-hot-reload/test/`, run with
`node --test test/`) and is not part of the published package. It covers
relaunch planning (argv preservation, port pinning, browser handoff), the
worker's wait/kill/relaunch/retry path with real child processes, the command
registration, and the Creation-mode tool's guards, follow-up registration and
rollback.
