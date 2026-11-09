# DSH Hot Reload

`@local/dsh-hot-reload` exposes an Agent tool, **`reload_dsh`**, that reloads
changed DSH services in place instead of restarting the whole Host.

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

## Usage

As an Agent tool: ask the model to run `reload_dsh` (actions below).

As a human command in the Web UI composer:

- `/reload` — reload changed modules and restart only their entries.
- `/reload <entry-id> …` — restart the named entries without reloading code.

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

## Install

The bundle is installed in profile `web` as a linked local package. Its patch
inserts one entry:

```yaml
- insert:
    - id: hot-reload
      name: '@local/dsh-hot-reload'
```
