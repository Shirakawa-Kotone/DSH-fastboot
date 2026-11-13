/**
 * dsh-mcp-fastboot — generic DSH startup accelerator for MCP servers.
 *
 * Two costs are removed from the critical path:
 *
 * 1. `@deepseek-ai/dsh-mcp-client` awaits its first connection and `tools/list`
 *    inside `apply()`. Cordis waits for every plugin before the app is ready,
 *    so one slow OAuth discovery delays the whole Web UI. This package hooks
 *    `Loader.prototype.unwrapExports`, and returns a wrapper whose `apply`
 *    starts the upstream work in the background.
 *
 * 2. For stdio servers the MCP SDK probes `server/discover` on a short-lived
 *    sibling process before starting the real one. Every practical stdio
 *    bridge is a legacy 2025-era server, so the wrapper pins the shared SDK
 *    `Client.prototype.connect` to the legacy handshake for stdio transports,
 *    and rewrites `npx -y mcp-remote` to the cached mcp-remote entry point.
 *
 * No static SDK import and no node_modules symlink: the exact SDK instance the
 * Host's mcp-client uses is loaded at runtime from the running installation,
 * inside the wrapper, before the upstream connection starts. That also makes
 * the order race-free.
 */
import { existsSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const LOADER_MARK = Symbol.for('dsh.mcp-fastboot.loader-patched')
const CONNECT_MARK = Symbol.for('dsh.mcp-fastboot.connect-patched')
const FASTENED = Symbol.for('dsh.mcp-fastboot.stdio-fastened')
const wrappers = new WeakMap()

let sdkPromise
let loggedLegacy = false
let loggedNpx = false
let cachedProxy

/** Find the running DSH installation's node_modules directory. */
function locateInstallNodeModules() {
  const start = process.argv[1]
  if (start === undefined || start === '') return undefined
  let dir = dirname(start)
  for (let depth = 0; depth < 8; depth += 1) {
    if (existsSync(join(dir, '@deepseek-ai', 'dsh', 'package.json'))) return dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return undefined
}

/** Load the exact `@modelcontextprotocol/client` module the Host already uses. */
async function loadSdkClient() {
  const candidates = []
  const override = process.env.DSH_MCP_FASTBOOT_SDK
  if (override !== undefined && override !== '') candidates.push(override)
  const nodeModules = locateInstallNodeModules()
  if (nodeModules !== undefined) {
    candidates.push(join(nodeModules, '@modelcontextprotocol', 'client', 'dist', 'index.mjs'))
  }
  for (const candidate of candidates) {
    try {
      return await import(pathToFileURL(candidate).href)
    } catch {
      /* try the next resolution path */
    }
  }
  try {
    return await import('@modelcontextprotocol/client')
  } catch {
    return undefined
  }
}

/** Find the loader class the Host uses, for the unwrap hook. */
async function loadLoader() {
  const nodeModules = locateInstallNodeModules()
  const candidate = nodeModules === undefined
    ? undefined
    : join(nodeModules, '@deepseek-ai', 'cordis-plugin-loader', 'lib', 'index.js')
  if (candidate !== undefined) {
    try {
      return await import(pathToFileURL(candidate).href)
    } catch {
      /* fall through */
    }
  }
  return await import('@deepseek-ai/cordis-plugin-loader')
}

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

/** Rewrite `npx -y mcp-remote <url>` to `node <cached proxy> <url>` in place. */
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

/** Install the connect patch on the shared MCP SDK Client prototype. */
function installConnectPatch(Client, ctx) {
  if (Client === undefined) return
  const proto = Client.prototype
  if (proto[CONNECT_MARK] === true) return
  const original = proto.connect
  Object.defineProperty(proto, CONNECT_MARK, { value: true, configurable: true })
  proto.connect = function fastbootConnect(transport, options) {
    try {
      if (isStdioTransport(transport)) {
        if (fastenStdioParams(transport) && loggedNpx === false) {
          loggedNpx = true
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

/**
 * Wrap the shipped mcp-client plugin: load and patch the SDK first, then call
 * the upstream `apply` without awaiting it. Upstream has registered its effects
 * before its first await, so disposal and reconnect keep working.
 */
function wrapMcpPlugin(plugin) {
  const cached = wrappers.get(plugin)
  if (cached !== undefined) return cached
  const wrapped = {
    ...plugin,
    async apply(ctx, config) {
      try {
        const sdk = await (sdkPromise ??= loadSdkClient())
        installConnectPatch(sdk?.Client, ctx)
      } catch (error) {
        ctx.logger?.warn?.(`mcp-fastboot: could not patch the MCP SDK: ${error instanceof Error ? error.message : String(error)}`)
      }
      let pending
      try {
        pending = plugin.apply(ctx, config)
      } catch (error) {
        ctx.logger?.error?.(`mcp-fastboot: MCP client failed to start: ${String(error)}`)
        return
      }
      Promise.resolve(pending).catch((error) => {
        ctx.logger?.error?.(`mcp-fastboot: MCP client failed to start: ${String(error)}`)
      })
      // Deliberately no await: the connection continues in the background.
    }
  }
  wrappers.set(plugin, wrapped)
  return wrapped
}

async function installLoaderPatch() {
  const loaderModule = await loadLoader()
  const Loader = loaderModule.default ?? loaderModule.Loader
  if (Loader?.prototype?.[LOADER_MARK] === true) return
  const proto = Loader.prototype
  const original = proto.unwrapExports
  Object.defineProperty(proto, LOADER_MARK, { value: true, configurable: true })
  proto.unwrapExports = function fastbootUnwrap(exports) {
    const plugin = original.call(this, exports)
    try {
      if (plugin !== null
        && typeof plugin === 'object'
        && plugin.name === 'mcp-client'
        && typeof plugin.apply === 'function') {
        return wrapMcpPlugin(plugin)
      }
    } catch {
      /* an exotic namespace is not ours to wrap */
    }
    return plugin
  }
}

// Install at module evaluation: the entry is composed before the MCP rows.
await installLoaderPatch()

export const name = 'mcp-fastboot'

export function apply(ctx) {
  ctx.logger.debug?.('mcp-fastboot: MCP rows start in the background')
}
