#!/usr/bin/env node
/**
 * Refresh the local @modelcontextprotocol/client link after a DSH upgrade.
 *
 * The plugin must patch the exact SDK module instance the Host's mcp-client
 * imports. A local node_modules symlink into the running DSH installation is
 * what makes a *static* import in lib/index.js resolve to that instance and
 * win the startup race against the MCP entries.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, realpathSync, rmSync, symlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

function findDshBin() {
  if (process.env.DSH_BIN) return process.env.DSH_BIN
  try {
    const out = execFileSync('which', ['dsh'], { encoding: 'utf8' }).trim()
    if (out) return out
  } catch {}
  throw new Error('cannot find the dsh binary; set DSH_BIN=/path/to/dsh')
}

function findInstallNodeModules() {
  let dir = dirname(realpathSync(findDshBin()))
  for (let depth = 0; depth < 8; depth += 1) {
    if (existsSync(join(dir, '@deepseek-ai', 'dsh', 'package.json'))) return dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  throw new Error('cannot locate the DSH installation node_modules')
}

const nodeModules = findInstallNodeModules()
const target = join(nodeModules, '@modelcontextprotocol', 'client')
if (!existsSync(join(target, 'package.json'))) throw new Error(`SDK not found at ${target}`)
const linkDir = join(root, 'node_modules', '@modelcontextprotocol')
const link = join(linkDir, 'client')
mkdirSync(linkDir, { recursive: true })
rmSync(link, { force: true, recursive: true })
symlinkSync(target, link, 'dir')
console.log(`linked ${link} -> ${target}`)
