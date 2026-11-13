# DSH Fastboot

Small [DeepSeek Harness](https://github.com/deepseek-ai) (DSH) bundles that make
the Host start faster, reload faster, restart from inside the GUI, and make MCP
startup stop gating the Web UI.

## Video

A 1:54, 1080P project intro is in [`video/`](video/README.md): it covers
the problem, the two mechanisms, and the measured result (8.14 s → 4.37 s,
then 2.22 s with background initialization). The rendered file is
`video/out/dsh-fastboot.mp4`; the shot list is
[`video/STORYBOARD.md`](video/STORYBOARD.md).

## Packages

| Package | What it fixes | Effect |
|---|---|---|
| **`@shirakawa-kotone/dsh-fastboot`** | Meta bundle: MCP fast boot + hot reload + `/reboot` in one install | Recommended for other machines |
| `@shirakawa-kotone/dsh-mcp-fastboot` | MCP connections gate startup; stdio servers pay a protocol probe and npm launch overhead | Host ready in ~1.9 s instead of ~6.0 s\* |
| `@shirakawa-kotone/dsh-mcp-background` | Lighter alternative: only removes the MCP boot wait | UI opens before MCP finishes |
| `@shirakawa-kotone/dsh-hot-reload` | DSH's watcher does not watch linked plugins, so edits need a full restart | `reload_dsh` / `/reload` reloads only changed entries in ~100 ms; `/reboot` restarts the whole Host from the GUI |

\* Measured by the author on one machine with four MCP servers; details
[below](#measurements).

The npm packages are published on the official registry under
[`@shirakawa-kotone`](https://www.npmjs.com/org/shirakawa-kotone). The
`@local/*` packages in this checkout are the development/link-installed
versions used on this machine; they are not published.

## Install

Recommended, using an Agent with the `plugin_manager` tool:

```text
plugin_manager install_bundle target: @shirakawa-kotone/dsh-fastboot
```

Or with the CLI, then select the bundle in the profile (Settings → Plugins):

```sh
dsh plugin --profile web add @shirakawa-kotone/dsh-fastboot
```

Restart DSH afterwards. No config is needed.

For an offline / repo-based install of the `@local` bundles:

```sh
cd DSH-fastboot
./install.sh              # profile "web"
./install.sh --profile tui
```

Do **not** select the meta bundle together with an individual bundle, and do not
install `dsh-mcp-background` alongside `dsh-mcp-fastboot`: the fastboot package
already includes background start, and the extra wrapper would run twice.

## What each part does

### MCP fast boot

`@deepseek-ai/dsh-mcp-client` connects and performs its first `tools/list`
inside `apply()`, and Cordis waits for every plugin before the app is ready.
The fastboot package hooks `Loader.prototype.unwrapExports`, starts that work in
the background, and patches the shared MCP SDK client before the upstream
connection begins:

- stdio servers use the legacy handshake, so the SDK does not spawn a
  short-lived `server/discover` probe process;
- `npx|npm|pnpm|bunx … mcp-remote <url>` is rewritten to
  `node ~/.npm/_npx/…/mcp-remote/dist/proxy.js <url>` using the newest cached
  copy;
- streamable-HTTP servers keep modern negotiation and only gain background
  start.

No static SDK import, no `node_modules` symlink, no install script: the exact
SDK instance the Host's mcp-client uses is resolved at runtime and patched
inside the wrapper, which also removes the startup race.

### Hot reload

The HMR service already knows how to replace only changed modules, but its
default watcher does not watch linked workspace packages. The hot-reload bundle
exposes the HMR service's `reconcileProfile()` as:

- the Agent tool `reload_dsh` (`changed` / `restart` / `list`);
- the Web UI command `/reload` (no argument = reload changed modules; arguments
  = restart the named entry ids).

### Full restart from the GUI

Some changes cannot be applied in place: a new CLI version, a profile manifest,
a module in DSH's own host graph. The hot-reload bundle therefore also registers
`/reboot`, which restarts the whole Host process:

- it rebuilds the exact `dsh` invocation from the running process (executable,
  Node flags, entry script, application arguments), always pins the web surface
  to the port the Host actually bound (an explicit `--port` is rewritten; a
  config-only port gets one appended), and passes `--no-open` so the new Host
  does not open a second tab (pass `/reboot --open` to allow that);
- it spawns a detached helper **before** shutting down, waits for the helper's
  readiness marker (a helper that cannot start aborts the reboot with the Host
  still up), answers the command, then SIGTERMs the Host ~700 ms later so
  `profile-boot`'s bounded disposal flushes sessions and reaps MCP children;
- the helper waits for the old PID to exit, then launches the same invocation,
  appending output to `$DSH_HOME/web.log`; it counts the new Host as back only
  when it accepts a TCP connection on the bound port, and retries if it exits
  early or never listens;
- the page reconnects by itself through DSH's persistent signed auth cookie.
  MCP servers restart with the new Host; with the fastboot bundle their
  connections run in the background, so the GUI is back before the MCP tools.

`/reboot` is registered only in profiles that mount the web server (a detached
relaunch of a terminal/ACP Host would be invisible). `/reboot --dry-run` prints
the relaunch command without doing anything. Do not use `/reboot` when another
supervisor (systemd, a shell loop) already restarts `dsh`: the two would race
for the port.

**Creation mode can restart too.** Sessions using the `cordis` preset (创造模式)
also get the Agent tool `reboot_dsh`, so a plugin-development session can apply
an unavoidable restart itself. It is gated twice: it is invisible in every
other preset, and it refuses while any *other* live agent — another session or
a subagent — is still running (idle open sessions do not block); only a
top-level session may call it. A refusal
returns the running session ids and reminds the model that the user can still
run `/reboot` manually. Because the calling turn dies with the process, the
tool first registers a one-shot Schedule task that delivers a follow-up prompt
to the same session a few seconds after the new Host is up, so the work
continues automatically; if the restart cannot start, the follow-up task is
withdrawn.

## Measurements

Staging copy of this profile on DSH 0.2.2-rc.1, four MCP servers (three
`mcp-remote` stdio servers, one streamable HTTP), from process start to the
`dsh web: http…` line:

| | Host ready | MCP tools ready |
|---|---|---|
| without acceleration | 5.96 s | 5.25 s (before URL) |
| with fastboot | **1.89–1.92 s** (three boots) | ~5.5 s (background) |

The remaining ~1.9 s is the base plugin tree. Further gains would require
deferring optional UI plugins per profile, which is no longer a generic,
side-effect-free change.

## Adding an MCP server

Adding a server stays the normal DSH flow: insert a
`name: '@deepseek-ai/dsh-mcp-client'` row in the profile's
`cordis.patch.yml`, then restart (externally, or from the GUI with `/reboot`)
or `/reload`. Both accelerators pick it up automatically. See [ADD-MCP.md](ADD-MCP.md) for stdio/HTTP examples.

## Caveats

- **Version-sensitive.** The hooks were written against DSH `0.2.2-rc.1` /
  MCP SDK `2.2.0` and touch `Loader.prototype.unwrapExports`,
  `Client.prototype.connect` and `StdioClientTransport._serverParams`. Upstream
  changes turn them into a no-op rather than a crash, but re-verify after a DSH
  upgrade.
- **MCP tools arrive shortly after the UI.** A first request sent before the
  connection finishes may not see the MCP tools; DSH rebuilds the tool list on
  later steps, so they appear there.
- **stdio only for the probe/npx patch.** Streamable-HTTP servers get
  background start only.
- **`/reboot` relaunches the same invocation.** It does not upgrade anything by
  itself: if the CLI on disk moved to another install directory and the running
  process was started from the old one, the restart uses the old path. Run the
  new `dsh` once to switch. It also assumes no other process manager owns the
  Host (otherwise the port races).
- **A failed initial MCP connection is logged**, not fatal, so
  `failOnStartupError` no longer aborts boot for the initial attempt.

## Repository layout

```
dsh-mcp-fastboot/       # local @local bundle (link-installed on this machine)
dsh-mcp-background/     # local lighter bundle
dsh-hot-reload/         # local hot-reload bundle
npm-publish/            # sources for the @shirakawa-kotone npm packages
ADD-MCP.md              # adding an MCP server
UPDATE-0.2.2.md         # DSH 0.2.1-rc.5 -> 0.2.2-rc.1 update notes
install.sh              # offline linked install for the @local bundles
```

## License

MIT
