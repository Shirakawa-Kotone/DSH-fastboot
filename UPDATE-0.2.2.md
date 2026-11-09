# DSH 0.2.1-rc.5 → 0.2.2-rc.1 update

Updated on 2026-11-09. The running Host was **not** restarted from inside the
session; restart it to activate the new version.

## Versions

| Component | Before | After |
|---|---|---|
| DSH CLI (`@deepseek-ai/dsh`) | 0.2.1-rc.5 | **0.2.2-rc.1** |
| Install dir | `~/.dsh-cli/v0.2.1-rc.5` | `~/.dsh-cli/v0.2.2-rc.1` |
| `@linxin666/dsh-web-all` | 0.4.13 | **0.4.16** |
| `dsh-better-sidebar` | 0.28.2 | **0.30.1** |
| `dsh-context` | 0.79.0 | **0.83.0** |
| `dsh-opencode-go` | 0.2.0 | **0.2.1** |
| `dshmarket` | 1.73.6 | **1.73.16** |
| `@vectorize-io/hindsight-coding-agents` | 0.8.4 | **0.8.6** |

The old CLI directory and the old profile `package.json` / `pnpm-lock.yaml` /
`cordis.patch.yml` remain for rollback.

## What was changed

1. Installed `@deepseek-ai/dsh@0.2.2-rc.1` into
   `~/.dsh-cli/v0.2.2-rc.1` and approved/re-ran the native install scripts
   (`node-pty`, `koffi`, `dsh-subprocess-local`, `protobufjs`).
2. Updated the profile's registry dependencies (same names as above); kept all
   `link:` packages. `@local/dsh-draw-things` now goes through the space-free
   symlink `DSH-fastboot/links/draw-things` because pnpm 11.24 cannot resolve a
   `link:` path containing spaces.
3. Repointed `~/.dsh/profiles/node_modules` (the parent hoist used by profile
   plugins for `@deepseek-ai/*` imports) from the stale 0.1.5-rc.2 packages to
   `/Users/chen/.dsh-cli/v0.2.2-rc.1/node_modules`. Without this, the new
   `dsh-opencode-go` resolved an old `dsh-llm` and failed to import.
4. Made the local MUD plugin 0.2.2-compatible:
   `~/dev/pkuxkx/agent-xkx/dsh-tool-mud/package.json` peer range is now
   `>=0.2.1-rc.5 <0.3.0`, and its `node_modules` link points to the new CLI.
   Backup: `package.json.bak-before-022`.
5. Relinked `dsh-mcp-fastboot/node_modules/@modelcontextprotocol/client` to the
   new CLI (`node dsh-mcp-fastboot/scripts/link-sdk.mjs`).
6. Removed the stale `web-ui-git-graph` override (that row no longer exists in
   `dsh-web-all@0.4.16`).
7. Updated `~/.zshrc` PATH and `~/.dsh/restart-web.sh` to use the new CLI.

## Verification

- `dsh --profile web --dump-config` with 0.2.2: exit 0, no warnings.
- Staging boot (`DSH_HOME=~/.dsh-stage-022`, updated profile, new CLI, port
  3199): no failed plugins, no compatibility warnings. `opencode-go` now loads.
- MCP logs show `initialize` directly (no `server/discover` probe), so
  `mcp-fastboot` still works on the new SDK.
- The updated Web UI rendered in Chromium with the full sidebar/skin/pet set.
  The staging home has no credentials, so the composer showed "请选择模型";
  the real host will use the real credential store.

## Restart

```sh
~/.dsh/restart-web.sh
```

or in a new terminal:

```sh
exec zsh
dsh web
```

Do **not** refresh the old GUI or call `/reload` before restarting: the live
process still runs 0.2.1 while the profile files on disk are 0.2.2.

## Rollback

```sh
# shell + restart script
cp ~/.zshrc.bak-before-022-20261109-032433 ~/.zshrc
cp ~/.dsh/restart-web.sh.bak-before-022-* ~/.dsh/restart-web.sh

# profile manifests
cd ~/.dsh/profiles/web
cp package.json.bak-before-022-20261109-032433 package.json
cp pnpm-lock.yaml.bak-before-022-20261109-032433 pnpm-lock.yaml
cp cordis.patch.yml.bak-before-022-20261109-032433 cordis.patch.yml
pnpm install --no-frozen-lockfile --config.minimum-release-age=0

# parent hoist back to the old CLI for the old host
ln -sfn ~/.dsh-cli/v0.2.1-rc.5/node_modules ~/.dsh/profiles/node_modules

# local MUD plugin
cd ~/dev/pkuxkx/agent-xkx/dsh-tool-mud
cp package.json.bak-before-022 package.json
ln -sfn ~/.dsh-cli/v0.2.1-rc.5/node_modules node_modules

# MCP patch SDK link
DSH_BIN=~/.dsh-cli/v0.2.1-rc.5/node_modules/.bin/dsh \
  node ~/dev/DSH-fastboot/dsh-mcp-fastboot/scripts/link-sdk.mjs

~/.dsh/restart-web.sh
```

Backups live beside the originals with the `20261109-032433` suffix.
