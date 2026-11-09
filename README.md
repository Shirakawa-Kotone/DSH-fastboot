# DSH Fastboot

Two small [DeepSeek Harness](https://github.com/deepseek-ai) (DSH) bundles that
make the Host start faster and reload faster:

| Bundle | What it fixes | Effect |
|---|---|---|
| [`dsh-mcp-fastboot`](dsh-mcp-fastboot/README.md) | Every stdio MCP server pays a protocol probe on a throwaway sibling process, plus npm's launch overhead. | Host ready in ~5.4 s instead of ~7.6–10.4 s\* |
| [`dsh-hot-reload`](dsh-hot-reload/README.md) | DSH's file watcher does not watch **linked** plugins, so editing one means a full Host restart. | `reload_dsh` / `/reload` restarts only the affected entries in ~100 ms |

\* Measured by the author on one machine; details [below](#measurements).

Both bundles are local, `private: true` packages. They are installed into a DSH
profile with `link:` so the Host loads them from this checkout — nothing here is
published to npm.

## Requirements

- DSH `0.2.2-rc.1` or a build close to it (the MCP patch reaches into
  `@modelcontextprotocol/client` internals; see [Caveats](#caveats)).
- A profile that boots the Web app (or any profile with the `loader`, `tools`
  and, for hot reload, `hmr` services).
- For `dsh-mcp-fastboot`: the MCP servers you want to speed up must use the
  **stdio** transport.

## Install

Install a bundle as a linked package and register it in the profile's bundle
list. The `plugin_manager` tool does both in one step:

```
plugin_manager → install_bundle  @local/dsh-mcp-fastboot   (spec: link:/abs/path/to/dsh-mcp-fastboot)
plugin_manager → install_bundle  @local/dsh-hot-reload     (spec: link:/abs/path/to/dsh-hot-reload)
```

Or do it by hand — add the dependency and the bundle entry to
`$DSH_HOME/profiles/<profile>/package.json`:

```jsonc
{
  "dependencies": {
    "@local/dsh-mcp-fastboot": "link:/abs/path/to/DSH-fastboot/dsh-mcp-fastboot",
    "@local/dsh-hot-reload": "link:/abs/path/to/DSH-fastboot/dsh-hot-reload"
  },
  "dsh": {
    "profile": {
      "bundles": ["@local/dsh-mcp-fastboot", "@local/dsh-hot-reload"]
    }
  }
}
```

then refresh the profile's packages:

```sh
dsh plugin --profile web add link:/abs/path/to/DSH-fastboot/dsh-mcp-fastboot
dsh plugin --profile web add link:/abs/path/to/DSH-fastboot/dsh-hot-reload
```

### One extra step for `dsh-mcp-fastboot`

The MCP patch only works if the plugin imports the **same module instance** the
Host's `mcp-client` uses. A normal npm dependency would be a separate copy, so
the bundle expects a symlink into the running DSH installation:

```sh
node /abs/path/to/DSH-fastboot/dsh-mcp-fastboot/scripts/link-sdk.mjs
```

The script finds the `dsh` binary on `PATH` (override with `DSH_BIN`), locates
its install's `node_modules`, and links
`dsh-mcp-fastboot/node_modules/@modelcontextprotocol/client` to it. Re-run it
after every DSH upgrade. A stale link makes the entry fail to import — DSH logs
`1 entry did not activate` and MCP falls back to the old, slower path; it does
not break MCP itself.

Restart the Host after installing either bundle: the speed-up applies to the
next boot, not to connections that are already open. `dsh-hot-reload` becomes
usable as soon as it is loaded.

## Usage

### `dsh-mcp-fastboot` — no configuration

Once loaded, it activates on the next Host start. Two environment switches
exist if something misbehaves:

| Variable | Effect |
|---|---|
| `DSH_MCP_FASTBOOT_LEGACY=0` | Keep `versionNegotiation: 'auto'` for stdio servers (no probe skip). |
| `DSH_MCP_FASTBOOT_NPX=0` | Keep the original `npx` command (no cached-proxy rewrite). |
| `DSH_MCP_REMOTE_PROXY=/path/to/proxy.js` | Use a specific `mcp-remote` entry point instead of the newest npx cache. |

### `dsh-hot-reload` — reload instead of restart

As an Agent tool:

| `reload_dsh` action | What it does |
|---|---|
| `changed` (default) | Evict modules that changed on disk below the profile and its linked package roots, restart only the entries that run them, report anything that still needs a full restart. |
| `restart` | Dispose and re-create the entries named in `entries` without reloading code — useful for reconnecting an `include:mcp-*` bridge. |
| `list` | Show entry ids, modules, states, disabled flags; `query` filters, `limit` caps at 200. |

As a command in the Web UI composer:

```
/reload                  # reload changed modules, restart only their entries
/reload include:mcp-notion   # restart the named entries
```

`changed` is a no-op (a few ms) when no watched file changed. It requires the
`hmr` service; headless profiles still get `list`, and `changed` reports that
HMR is unavailable. Core entries (`loader`, `hmr`, `tools`, `webserver`,
`agent-loop`) are refused by `restart` unless `force: true`.

## How it works

### Skipping the MCP protocol probe

`@deepseek-ai/dsh-mcp-client` creates every MCP `Client` with
`versionNegotiation: { mode: 'auto' }`. On a **stdio** transport the MCP SDK
first probes `server/discover` on a short-lived sibling process, then starts the
real server. For `npx -y mcp-remote …` rows that means npm is launched twice per
server, and `mcp-remote` (a 2025-era server) never answers the modern probe, so
the SDK waits out its probe window before falling back to `initialize`.

`dsh-mcp-fastboot` installs a wrapper on `Client.prototype.connect` while its
module is evaluated — before the MCP entries start — and for stdio transports:

1. pins the client to the legacy handshake (`setVersionNegotiation({ mode:
   'legacy' })`), so there is no probe and no sibling process;
2. rewrites `npx|npm|pnpm|bunx … mcp-remote <url>` to
   `node ~/.npm/_npx/…/mcp-remote/dist/proxy.js <url>`, using the newest cached
   copy, so npm's wrapper process disappears.

Both rewrites are best-effort and wrapped in `try/catch`: if the SDK internals
move, the connection still runs exactly as before and the plugin becomes a
no-op. Streamable-HTTP servers are left untouched and keep modern negotiation.

### Reloading in place

DSH's HMR service already implements the hard part: `reconcileProfile()`
compares every loaded module below the profile and its linked package roots
with disk, evicts the changed ones, stops the entries that run them,
recomposes the profile, and starts those entries again. Its file watcher,
however, defaults to the profile directory, so a linked plugin under `~/dev/…`
is outside the watch roots. `dsh-hot-reload` exposes the same reconciliation as
an Agent tool (`hmr.runExclusive(() => hmr.reconcileProfile())`) and reports
the entry ids whose fiber identity actually changed.

It does **not** replace a cold process start for Host modules (DSH's own
graph): those come back in `pending` with `restartRequired` and need a real
restart. Client-side bundle changes still need the normal browser HMR/refresh
path.

## Measurements

Author's machine, same profile, same temporary `DSH_HOME`, four configured
servers (Notion + two Cloudflare endpoints over `mcp-remote`, one direct HTTP
endpoint):

| | Host ready |
|---|---|
| before `dsh-mcp-fastboot` | 7.6 s / 10.4 s |
| after | 5.3 s / 5.4 s / 5.6 s |
| no MCP entries at all | 1.6 s |

MCP child processes start at ~1.5 s instead of ~4.7 s, and the log shows
`initialize` directly instead of a failed `server/discover` probe. The remaining
~3.5 s is `mcp-remote`'s own OAuth discovery + remote `tools/list`, which runs
in parallel across servers and is network-bound — not something a local plugin
can remove.

`dsh-hot-reload` was verified live: editing a linked plugin and calling
`reload_dsh {"action":"changed"}` restarted exactly `include:mcp-fastboot` in
~112 ms, with the entry active again afterwards.

## Project layout

```
.
├── dsh-mcp-fastboot/       # bundle: skip stdio MCP probe + npx overhead
│   ├── lib/patch.js        #   Client.prototype.connect wrapper
│   ├── lib/index.js        #   installs the patch at module evaluation
│   └── scripts/link-sdk.mjs#   relink the MCP SDK after a DSH upgrade
├── dsh-hot-reload/         # bundle: reload_dsh tool + /reload command
├── UPDATE-0.2.2.md         # dated notes for the 0.2.1-rc.5 → 0.2.2-rc.1 update
└── README.md
```

Each bundle has its own README with the full install and behaviour notes:
[`dsh-mcp-fastboot/README.md`](dsh-mcp-fastboot/README.md),
[`dsh-hot-reload/README.md`](dsh-hot-reload/README.md).

## Caveats

- **Version-sensitive.** The MCP patch was written against DSH `0.2.2-rc.1` /
  MCP SDK `2.2.0` and patches `Client.prototype.connect` and
  `StdioClientTransport._serverParams`. Upstream changes turn it into a no-op
  rather than a crash, but re-verify the speed-up after a DSH upgrade.
- **stdio only.** Streamable-HTTP MCP servers are untouched.
- **Not a package.** Both bundles are `private: true` and installed by `link:`;
  they are not on npm and are not meant to be installed that way.
- **Restart to benefit.** MCP connections opened before the plugin loaded keep
  the old path.

## License

No license file yet. Treat the code as all rights reserved until one is added.
