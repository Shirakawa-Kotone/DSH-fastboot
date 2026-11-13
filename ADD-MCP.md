# Adding an MCP server

Once the fast-boot bundles are installed, adding an MCP server is **exactly the
normal DSH way**. No plugin-specific fields, no `inject` gate, no replacing the
client plugin.

## 1. Add a normal `dsh-mcp-client` row

In `~/.dsh/profiles/<profile>/cordis.patch.yml` (the profile's user layer),
insert one entry per server.

### stdio server

```yaml
- insert:
    - id: mcp-github
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: github
        transport: stdio
        command: npx
        args: ['-y', '@modelcontextprotocol/server-github']
        env:
          GITHUB_TOKEN: !!js process.env.GITHUB_TOKEN
```

### Streamable HTTP server

```yaml
- insert:
    - id: mcp-example
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: example
        transport: streamable-http
        url: https://example.com/mcp
        headers:
          Authorization: !!js '`Bearer ${process.env.EXAMPLE_TOKEN}`'
```

`serverName` must be unique in the profile and match
`[A-Za-z0-9_-]{1,32}`.

## 2. Activate it

- Restart DSH externally, **or**
- With the hot-reload bundle installed, run `/reboot` in the Web UI composer to
  restart the whole Host from inside the GUI, **or**
- run `/reload` (or `reload_dsh {"action":"changed"}`) after saving the file to
  reload only the entries whose modules changed. A newly inserted `mcp-*` row
  that `/reload` cannot apply is reported as needing a full restart; use
  `/reboot` then.

## 3. What happens automatically

| Plugin | Effect on the new server |
|---|---|
| `mcp-background` | Its connection runs in the background; the Web UI no longer waits for it. |
| `mcp-fastboot` | For **stdio** servers it skips the `server/discover` probe and runs a cached `mcp-remote` through Node instead of `npx`. |
| Streamable HTTP | Gets background start, but keeps the normal modern negotiation. |

Nothing else is required. The model sees the new `mcp__<serverName>__*` tools as
soon as the connection and `tools/list` finish.

## First-time setup on another computer

Fastest path: install the npm meta bundle with the Agent's `plugin_manager`:

```text
plugin_manager install_bundle target: @shirakawa-kotone/dsh-fastboot
```

or with the CLI:

```sh
dsh plugin --profile web add @shirakawa-kotone/dsh-fastboot
```

Then select the bundle in the profile and restart. If you want an offline /
repo-based install instead, use the installer:

```sh
git clone <this repo>   # or copy the directory
cd DSH-fastboot
./install.sh            # profile "web"; use --profile <name> for another
```

The installer:

1. links `dsh-mcp-fastboot` to the machine's `@modelcontextprotocol/client`
   (so its patch hits the same SDK instance the Host uses);
2. installs the three linked bundles into the profile;
3. enables them in `dsh.profile.bundles`.

Then restart DSH. Adding MCP servers afterward is the same two-step flow above.

## Notes

- `command: npx` is fine; `mcp-fastboot` resolves the newest cached
  `~/.npm/_npx/*/node_modules/mcp-remote` entry point. If no cache exists it
  falls back to `npx`, so prime the cache once with
  `npx -y mcp-remote --help` if you want the fastest first connection.
- After a DSH upgrade, rerun `./install.sh` (or at least
  `node dsh-mcp-fastboot/scripts/link-sdk.mjs` with the new `DSH_BIN`).
- If a profile defines MCP rows inside an **earlier bundle** instead of its
  user patch, make sure `@local/dsh-mcp-background` is listed before that
  bundle in `dsh.profile.bundles`; otherwise its loader hook loads too late for
  those rows. Rows added later (user patch or runtime reload) are fine.
