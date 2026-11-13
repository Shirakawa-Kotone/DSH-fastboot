# @shirakawa-kotone/dsh-mcp-background

A lighter alternative to
[`@shirakawa-kotone/dsh-mcp-fastboot`](https://www.npmjs.com/package/@shirakawa-kotone/dsh-mcp-fastboot):
it removes only the **boot-time wait** for MCP connections, without patching
the MCP SDK's protocol negotiation or launch command.

## What it does

The shipped `@deepseek-ai/dsh-mcp-client` connects and performs its first
`tools/list` inside `apply()`, and Cordis waits for every plugin before the app
is ready. This package hooks `Loader.prototype.unwrapExports` and wraps the
mcp-client plugin so its upstream `apply` starts in the background. Reconnect,
tool registration, resources, system prompt sections and disposal remain
upstream's.

It keys off the plugin's exported `name === 'mcp-client'`, so every MCP row in
any profile gets the behavior without configuration changes.

## Install

```text
plugin_manager install_bundle target: @shirakawa-kotone/dsh-mcp-background
```

or:

```sh
dsh plugin --profile web add @shirakawa-kotone/dsh-mcp-background
```

Select the bundle in the profile, then restart. Do **not** install this
together with `dsh-mcp-fastboot`; that package already includes background
start plus the stdio optimizations.

## Tradeoff

The UI opens before MCP tools finish connecting. DSH rebuilds the tool list
every step, so later steps see the tools; a first request that immediately
needs an MCP tool may not.

## Compatibility

DSH `>=0.2.1-rc.5`, tested on `0.2.2-rc.1`. The loader hook fails soft: if
`unwrapExports` or the exported name changes, MCP runs normally.

## License

MIT
