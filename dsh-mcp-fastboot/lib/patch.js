/**
 * MCP fast-boot patches.
 *
 * The shipped `@deepseek-ai/dsh-mcp-client` creates every MCP `Client` with
 * `versionNegotiation: { mode: 'auto' }`. For stdio servers that is expensive:
 * the SDK spawns a *sibling* process with the same command and sends
 * `server/discover` before the real process starts. `npx -y mcp-remote ...`
 * therefore runs twice per server, and legacy proxies that never answer the
 * probe pay a probe timeout before falling back to `initialize`.
 *
 * Every stdio MCP bridge in practice is a legacy 2025-era server (mcp-remote
 * proxies included), so this patch pins stdio clients to `legacy` before the
 * connection starts: no probe, no sibling process, one spawn per server.
 *
 * It also rewrites a cached `npx -y mcp-remote` invocation to `node <proxy>`
 * so the connect does not pay npm's ~1.5s launch overhead. Both rewrites are
 * best-effort: if the internals move, the connection still runs as before.
 */
import { readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/** Marks a Client prototype that already carries the patch (per module instance). */
const PATCHED = Symbol.for('dsh.mcp-fastboot.connect-patched')
/** Marks a transport whose params were already rewritten. */
const FASTENED = Symbol.for('dsh.mcp-fastboot.stdio-fastened')

let cachedProxy
let loggedLegacy = false
let loggedFastPath = false

/** True for the SDK's own stdio transport (identified by its private params bag). */
function isStdioTransport(transport) {
  return transport !== null
    && typeof transport === 'object'
    && typeof transport._serverParams === 'object'
    && transport._serverParams !== null
}

/** Locate the newest cached mcp-remote entry point, if one exists. */
function findMcpRemoteProxy() {
  if (process.env.DSH_MCP_FASTBOOT_NPX === '0') return undefined
  const override = process.env.DSH_MCP_REMOTE_PROXY
  if (override !== undefined && override !== '') return override
  const root = join(homedir(), '.npm', '_npx')
  let best
  try {
    for (const entry of readdirSync(root)) {
      const candidate = join(root, entry, 'node_modules', 'mcp-remote', 'dist', 'proxy.js')
      try {
        const mtime = statSync(candidate).mtimeMs
        if (best === undefined || mtime > best.mtime) best = { path: candidate, mtime }
      } catch {
        /* not an mcp-remote npx cache directory */
      }
    }
  } catch {
    /* no npx cache: keep npm's launcher */
  }
  return best?.path
}

/**
 * Rewrite `npx -y mcp-remote <url>` to `node <cached proxy> <url>` in place.
 * Returns true when the transport now uses the direct launcher.
 */
function fastenStdioParams(transport) {
  if (transport[FASTENED] === true) return false
  const params = transport._serverParams
  if (params === undefined || typeof params !== 'object' || params === null) return false
  const command = String(params.command ?? '')
  if (!/(?:^|[\\/])(?:npx|npm|pnpm|bunx)$/.test(command)) return false
  const args = Array.isArray(params.args) ? params.args : []
  const at = args.indexOf('mcp-remote')
  if (at < 0) return false
  const proxy = cachedProxy ??= findMcpRemoteProxy()
  if (proxy === undefined) return false
  params.command = process.execPath
  params.args = [proxy, ...args.slice(at + 1)]
  transport[FASTENED] = true
  return true
}

/**
 * Install the connect patch on the shared MCP SDK Client prototype. Idempotent;
 * safe to call from module evaluation and from `apply`.
 *
 * @param Client - the loaded `@modelcontextprotocol/client` module, or undefined.
 * @param ctx - optional Cordis context used only for one-time diagnostics.
 */
export function installFastboot(Client, ctx) {
  if (Client === undefined) return
  const proto = Client.prototype
  if (proto[PATCHED] === true) return
  const original = proto.connect
  Object.defineProperty(proto, PATCHED, { value: true, configurable: true })
  proto.connect = function fastbootConnect(transport, options) {
    try {
      if (isStdioTransport(transport)) {
        if (fastenStdioParams(transport) && loggedFastPath === false) {
          loggedFastPath = true
          ctx?.logger?.debug?.('mcp-fastboot: using the cached mcp-remote entry point instead of npx')
        }
        if (process.env.DSH_MCP_FASTBOOT_LEGACY !== '0' && this._versionNegotiation?.mode === 'auto') {
          this.setVersionNegotiation({ mode: 'legacy' })
          if (loggedLegacy === false) {
            loggedLegacy = true
            ctx?.logger?.debug?.('mcp-fastboot: stdio MCP servers use the legacy handshake (no protocol probe)')
          }
        }
      }
    } catch (error) {
      ctx?.logger?.warn?.(`mcp-fastboot: stdio optimization skipped: ${error instanceof Error ? error.message : String(error)}`)
    }
    return original.call(this, transport, options)
  }
}

// hot-reload probe 1794160693
