# @shirakawa-kotone/dsh-mcp-fastboot

Generic startup accelerator for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
(DSH) profiles that use MCP servers.

It removes two costs from the boot critical path:

1. **MCP connections no longer gate the Web UI.** The shipped
   `@deepseek-ai/dsh-mcp-client` connects and lists tools inside `apply()`, and
   Cordis waits for every plugin before the app is ready. This package hooks
   the loader and starts that work in the background.
2. **Stdio servers skip the protocol probe and npm launch overhead.** The MCP
   SDK probes `server/discover` on a short-lived sibling process before starting
   the real one; practical stdio bridges (`mcp-remote`) are legacy 2025-era
   servers. For stdio transports the shared SDK client is pinned to the legacy
   handshake, and `npx … mcp-remote` is rewritten to the cached
   `node …/mcp-remote/dist/proxy.js`.

No profile/MCP configuration changes, no per-server fields, no static SDK
dependency, no `node_modules` symlink or install script. The exact SDK instance
the Host's mcp-client uses is resolved at runtime and patched before the
upstream connection starts, which also makes it race-free.

## Install

With an Agent that has the `plugin_manager` tool:

```text
install_bundle target: @shirakawa-kotone/dsh-mcp-fastboot
```

Or with the CLI, then select the bundle in the profile's
`dsh.profile.bundles` (Settings → Plugins also works):

```sh
dsh plugin --profile web add @shirakawa-kotone/dsh-mcp-fastboot
```

Then restart DSH. No config is required.

## Effect

Measured on DSH 0.2.2-rc.1 with four MCP servers (three `mcp-remote` stdio
servers, one streamable HTTP), from process start to the `dsh web: http…` line:

| | Host ready | MCP tools ready |
|---|---|---|
| without | 5.96 s | 5.25 s (before URL) |
| with | **1.89–1.92 s** | ~5.5 s (in background) |

The remaining time is the base plugin tree; MCP is no longer on the critical
path. `mcp-fastboot` alone is comparable in effect to combining
`dsh-mcp-background` with the stdio SDK patch.

## Tradeoff

The UI opens before MCP tools finish connecting. DSH rebuilds the model tool
list every step and records tool additions, so a conversation that starts
immediately picks the tools up on a later step. If a first request must have an
MCP tool the instant it is sent, wait until the MCP bridge logs `tools/list`
completing.

## Compatibility

- DSH `>=0.2.1-rc.5`, tested on `0.2.2-rc.1`; MCP SDK `2.2.0`.
- The loader/SDK hooks are version-sensitive but fail soft: if the internals
  change, MCP still runs normally, only the acceleration is lost.
- Streamable-HTTP servers get background start and keep modern negotiation;
  the legacy pin and npx rewrite apply to stdio only.
- A failed initial MCP connection is logged instead of failing startup, so
  `failOnStartupError` no longer aborts boot for the initial attempt.

## Environment switches

| Variable | Effect |
|---|---|
| `DSH_MCP_FASTBOOT_LEGACY=0` | Keep `mode: 'auto'` for stdio servers. |
| `DSH_MCP_FASTBOOT_NPX=0` | Keep the original `npx` command. |
| `DSH_MCP_REMOTE_PROXY=/path/proxy.js` | Use a specific mcp-remote entry point. |

## License

MIT
