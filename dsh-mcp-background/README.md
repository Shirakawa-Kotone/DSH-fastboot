# MCP Background Start

`@local/dsh-mcp-background` stops MCP server startup from gating the Host and
Web UI. It is generic: it keys off the shipped MCP client plugin's exported
name (`mcp-client`), so every MCP row in every profile benefits without editing
that profile's MCP configuration.

## Why

Cordis already mounts plugin entries concurrently. The remaining serial
barrier is inside `@deepseek-ai/dsh-mcp-client`: its `apply()` connects the
server, performs the first `tools/list`, and **awaits** that work. Cordis waits
for every plugin's `apply` before the app is ready, so one slow OAuth discovery,
`mcp-remote` handshake or remote `tools/list` delays the entire startup even
though it has nothing to do with serving the Web UI.

## What it does

At module evaluation the plugin patches
`Loader.prototype.unwrapExports`. When the loader imports the shipped
`mcp-client` package, the plugin object it receives is wrapped:

- the upstream `apply()` still runs — it registers effects, starts the
  connection, and registers tools when they arrive;
- the wrapper returns immediately instead of awaiting `connection.ready`.

Everything else stays upstream's: reconnect, tool sync, resources, system
prompt sections and disposal. The wrapper caches one stable object per imported
namespace, so HMR keeps working.

The bundle entry must be composed **before** the profile's `mcp-*` rows. Bundle
layers are applied before the profile's own patch layer, so the shipped patch
does that automatically.

## Effect

Measured with a staging copy of the real profile (same 4 MCP servers, same
0.2.2-rc.1 runtime), from process start to the `dsh web: http…` line:

| | Host ready | MCP tools ready |
|---|---|---|
| without | 5.96 s | 5.25 s (before URL) |
| with | **1.92 s** | ~5.5 s (in background) |

Three consecutive boots measured 1.91 / 1.91 / 1.92 s with no failed or
unhandled entries. The remaining ~1.9 s is the base plugin tree; MCP is no
longer on the critical path.

## Tradeoff

The UI opens before the MCP tools finish connecting. DSH rebuilds the model's
tool list on every step and emits a tool-addition record when MCP tools appear,
so a conversation that starts immediately picks them up on a later step. If a
first request needs an MCP tool the instant it is sent, wait a few seconds
until the MCP bridge finishes connecting (the MCP logs show `tools/list`
completing), or keep this bundle disabled for that profile.

## Configuration

None. Environment switches are not needed; disable the bundle to return to the
original blocking behavior.

## Caveats

- Patches the loader's `unwrapExports` once per process. It was written against
  DSH 0.2.2-rc.1; if the export name or method changes, it becomes a no-op
  rather than breaking MCP.
- Only the boot-time await is removed. A failed initial connection is logged
  by the wrapper instead of failing startup, which also makes
  `failOnStartupError` non-fatal for the initial attempt.
