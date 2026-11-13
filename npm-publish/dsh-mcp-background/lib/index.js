/**
 * mcp-background — stop MCP server startup from gating the Host's boot.
 *
 * `@deepseek-ai/dsh-mcp-client` connects every configured server and performs
 * its first `tools/list` inside `apply()`, then awaits that work. Cordis waits
 * for every plugin's `apply` before the app is considered ready, so one slow
 * OAuth discovery or `mcp-remote` handshake delays the whole Web UI even though
 * it is unrelated to serving the page.
 *
 * This plugin patches `Loader.prototype.unwrapExports` once, at module
 * evaluation: when the loader imports the shipped mcp-client package, the
 * returned plugin object is wrapped so its `apply` starts the connection and
 * returns immediately. The connection, tool registration, reconnect logic and
 * disposal all stay upstream's; only the boot-time await is removed.
 *
 * Generic: it keys off the plugin's exported `name === 'mcp-client'`, so every
 * MCP row (stdio, streamable HTTP, any server) benefits without editing the
 * profile's MCP configuration.
 */
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

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

async function loadLoader() {
  const nodeModules = locateInstallNodeModules()
  const candidate = nodeModules === undefined
    ? undefined
    : join(nodeModules, '@deepseek-ai', 'cordis-plugin-loader', 'lib', 'index.js')
  if (candidate !== undefined) {
    try {
      return await import(pathToFileURL(candidate).href)
    } catch {
      /* fall through to bare resolution */
    }
  }
  return await import('@deepseek-ai/cordis-plugin-loader')
}

const loaderModule = await loadLoader()
const Loader = loaderModule.default ?? loaderModule.Loader
const MARK = Symbol.for('dsh.mcp-background.patched')
/** One stable wrapper per imported mcp-client namespace (keeps HMR identity). */
const wrappers = new WeakMap()

/**
 * Return a plugin object that starts the upstream `apply` and does not await
 * it. Upstream has already registered its effects before its first await, so
 * disposal still tears the connection down normally.
 */
function wrapMcpPlugin(plugin) {
  const cached = wrappers.get(plugin)
  if (cached !== undefined) return cached
  const wrapped = {
    ...plugin,
    async apply(ctx, config) {
      let pending
      try {
        pending = plugin.apply(ctx, config)
      } catch (error) {
        ctx.logger?.error?.(`mcp-background: MCP client failed to start: ${String(error)}`)
        return
      }
      Promise.resolve(pending).catch((error) => {
        ctx.logger?.error?.(`mcp-background: MCP client failed to start: ${String(error)}`)
      })
      // Deliberately no await: Cordis considers the MCP row active now.
    }
  }
  wrappers.set(plugin, wrapped)
  return wrapped
}

/** Install the unwrap hook once per process/module instance. */
function install() {
  if (Loader?.prototype?.[MARK] === true) return
  const proto = Loader.prototype
  const original = proto.unwrapExports
  Object.defineProperty(proto, MARK, { value: true, configurable: true })
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

// Patch at module evaluation: the entry is composed before the MCP rows.
install()

export const name = 'mcp-background'

export function apply(ctx) {
  install()
  ctx.logger.debug?.('mcp-background: MCP rows start in the background')
}
