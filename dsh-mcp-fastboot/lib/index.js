/**
 * mcp-fastboot — speed up Host startup when MCP servers use stdio.
 *
 * The plugin has no Config: it patches the shared MCP SDK Client prototype as
 * soon as its module is evaluated, so entries that load after this one skip
 * the 2026-07-28 `server/discover` probe and launch a cached mcp-remote
 * directly through Node.
 *
 * The SDK is imported from the local `node_modules/@modelcontextprotocol/client`
 * link that points into the running DSH installation. That link is what makes
 * the import resolve to the exact same module instance the Host's mcp-client
 * uses; patching a copied SDK would not affect it. `scripts/link-sdk.mjs`
 * refreshes the link after a DSH upgrade.
 */
import { Client } from '@modelcontextprotocol/client'
import { installFastboot } from './patch.js'

// Install while this module is evaluated: MCP entries start in parallel and
// must see the patched prototype before they create a client.
installFastboot(Client)

export const name = 'mcp-fastboot'

export function apply(ctx) {
  installFastboot(Client, ctx)
  ctx.logger.debug?.('mcp-fastboot: stdio MCP fast path active')
}
