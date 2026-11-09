# MCP Fast Boot

`@local/dsh-mcp-fastboot` is a Host-only DSH bundle that removes the two
biggest startup costs of stdio MCP servers:

1. **The 2026-07-28 protocol probe.** DSH's `@deepseek-ai/dsh-mcp-client`
   creates every MCP `Client` with `versionNegotiation: { mode: 'auto' }`.
   For a stdio transport the SDK probes the server with `server/discover` on a
   **short-lived sibling process** before starting the real one. With
   `npx -y mcp-remote …` that means npm is launched twice per server, and
   legacy proxies that cannot answer the probe pay a timeout before falling
   back to `initialize`.
2. **npm's launch overhead.** When a stdio server is launched as
   `npx|npm|pnpm|bunx … mcp-remote <url>`, the plugin rewrites it to
   `node ~/.npm/_npx/…/mcp-remote/dist/proxy.js <url>` using the newest cached
   copy. No registry work, no npm wrapper process.

Both rewrites are best-effort. If the SDK internals change, the connection
still runs exactly as before; the plugin becomes a no-op rather than breaking
MCP.

## Effect

Measured on this machine with four configured servers (Notion + two Cloudflare
endpoints over `mcp-remote`, one direct HTTP endpoint):

| | Host ready |
|---|---|
| before | 7.6–10.4 s |
| after | 5.4–5.7 s |
| no MCP entries at all | 1.6 s |

The remaining time is the remote servers' own OAuth discovery and `tools/list`.
The plugin does not change what the model sees: the hop from DSH to
`mcp-remote` speaks the 2025-era handshake that `mcp-remote` implements; the
proxy still negotiates with the remote server on its own.

## Configuration

No config. The bundle patch inserts one entry:

```yaml
- insert:
    - id: mcp-fastboot
      name: '@local/dsh-mcp-fastboot'
```

Environment switches:

| Variable | Effect |
|---|---|
| `DSH_MCP_FASTBOOT_LEGACY=0` | Keep `mode: 'auto'` for stdio servers. |
| `DSH_MCP_FASTBOOT_NPX=0` | Keep the original `npx` command. |
| `DSH_MCP_REMOTE_PROXY=/path/to/proxy.js` | Use a specific mcp-remote entry point. |

## Installation notes

This is a **linked local bundle** (`link:/Users/chen/dev/DSH-fastboot/dsh-mcp-fastboot`),
not a published package. `lib/index.js` imports `@modelcontextprotocol/client`
through `node_modules/@modelcontextprotocol/client`, a symlink into the running
DSH installation. That symlink is what makes the patch reach the *same* module
instance the Host's mcp-client uses; a separate npm copy would be invisible to
it.

After a DSH upgrade, refresh the link:

```sh
node /Users/chen/dev/DSH-fastboot/dsh-mcp-fastboot/scripts/link-sdk.mjs
```

A stale link makes the plugin entry fail to import (DSH logs
"1 entry did not activate") and MCP returns to the old, slower path — it does
not break MCP itself.

## Caveats

- The plugin patches `Client.prototype.connect` on the shared
  `@modelcontextprotocol/client` instance and rewrites
  `StdioClientTransport._serverParams`. It was written against DSH
  0.2.2-rc.1 / MCP SDK 2.2.0.
- It only optimises **stdio** servers. Streamable-HTTP servers keep their
  normal negotiation.
- Restart the Host after installation; the speed-up applies to the next boot,
  not to connections that are already open.
