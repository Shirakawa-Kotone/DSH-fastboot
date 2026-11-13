# npm packages

Published under the `@shirakawa-kotone` scope on the official npm registry.

| Package | What it is | Install? |
|---|---|---|
| **`@shirakawa-kotone/dsh-fastboot`** | Meta bundle: MCP fast boot + `/reload` hot reload + `/reboot` full restart + Creation-mode `reboot_dsh` in one install | **Recommended** |
| `@shirakawa-kotone/dsh-mcp-fastboot` | MCP background start + stdio probe/npx removal | Only if you do not want hot reload |
| `@shirakawa-kotone/dsh-mcp-background` | Lighter: background start only, no SDK patching | Optional alternative |
| `@shirakawa-kotone/dsh-hot-reload` | `reload_dsh` tool, `/reload` and `/reboot` commands, and the Creation-mode `reboot_dsh` tool | Only if you do not want MCP acceleration |

## Recommended install

With an Agent that has the `plugin_manager` tool:

```text
plugin_manager install_bundle target: @shirakawa-kotone/dsh-fastboot
```

Or install the dependency and select it in the profile (Settings → Plugins):

```sh
dsh plugin --profile web add @shirakawa-kotone/dsh-fastboot
```

Then restart DSH. No config is needed.

## Do not double-install

- `dsh-fastboot` already contains `dsh-mcp-fastboot` + `dsh-hot-reload`.
- `dsh-mcp-fastboot` already contains the background-start behavior; do not
  also install `dsh-mcp-background` (it would wrap the MCP client twice).
- The three individual packages remain available for users who want one
  capability only.

## Links

- https://www.npmjs.com/package/@shirakawa-kotone/dsh-fastboot
- https://www.npmjs.com/package/@shirakawa-kotone/dsh-mcp-fastboot
- https://www.npmjs.com/package/@shirakawa-kotone/dsh-mcp-background
- https://www.npmjs.com/package/@shirakawa-kotone/dsh-hot-reload
