# @shirakawa-kotone/dsh-fastboot

One-install fast-boot suite for DSH profiles:

- **MCP fast boot** — `@shirakawa-kotone/dsh-mcp-fastboot`:
  MCP connections start in the background instead of gating the Web UI, and
  stdio servers skip the `server/discover` probe and `npx` launch overhead.
- **Hot reload and reboot** — `@shirakawa-kotone/dsh-hot-reload`:
  the `reload_dsh` Agent tool and the `/reload` Web UI command reload changed
  services in place instead of restarting the Host; `/reboot` restarts the whole
  Host process from the GUI when an in-place reload cannot apply a change (new
  CLI version, profile manifest, host-graph module). Creation-mode (`cordis`
  preset) top-level sessions also get the `reboot_dsh` tool: it refuses while
  another session is running, then restarts and resumes the calling session
  through a durable follow-up prompt.

The lighter `dsh-mcp-background` package is intentionally **not** included: its
background-start behavior is already part of `dsh-mcp-fastboot`, and installing
both would wrap the MCP client twice.

## Install

```text
plugin_manager install_bundle target: @shirakawa-kotone/dsh-fastboot
```

or:

```sh
dsh plugin --profile web add @shirakawa-kotone/dsh-fastboot
```

Select the bundle in the profile, then restart. No config is required.

Do not also install/select `dsh-mcp-fastboot`, `dsh-mcp-background`, or
`dsh-hot-reload` as separate bundles; this meta bundle already inserts their
entries, and selecting the individual bundles would duplicate entry ids.

## Effect

Measured on DSH 0.2.2-rc.1 with four MCP servers: the `dsh web: http…` line
moves from ~5.96 s to ~1.9 s; MCP tools finish connecting in the background.
`/reload` then makes subsequent local plugin/config edits take ~100 ms instead
of a full restart, and `/reboot` relaunches the same `dsh` invocation on the
same port when a full restart is unavoidable — the page reconnects by itself
and MCP reconnects in the background.

## Composition

`cordis.patch.yml`:

```yaml
- insert:
    - id: mcp-fastboot
      name: '@shirakawa-kotone/dsh-mcp-fastboot'
    - id: hot-reload
      name: '@shirakawa-kotone/dsh-hot-reload'
```

Because this is a bundle layer, both entries are composed before the profile's
own `mcp-*` rows, which is what lets `dsh-mcp-fastboot`'s loader hook win the
race.

## Requirements

DSH `>=0.2.1-rc.5`, tested on `0.2.2-rc.1`. The underlying hooks fail soft: if
DSH internals change, MCP still runs and only the acceleration is lost.

## License

MIT
