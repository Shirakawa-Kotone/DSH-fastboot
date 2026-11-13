#!/usr/bin/env node
/**
 * Append bundle package names to a DSH profile's dsh.profile.bundles list.
 * Used by install.sh after `dsh plugin add` installed the linked packages.
 */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'

const [profileDir, ...names] = process.argv.slice(2)
if (profileDir === undefined || names.length === 0) {
  console.error('usage: enable-bundles.mjs <profile-dir> <bundle-name>...')
  process.exit(2)
}

const manifestPath = join(profileDir, 'package.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
manifest.dsh ??= {}
manifest.dsh.profile ??= {}
const bundles = manifest.dsh.profile.bundles ??= []
const added = []
for (const name of names) {
  if (!bundles.includes(name)) {
    bundles.push(name)
    added.push(name)
  }
}
if (added.length > 0) {
  copyFileSync(manifestPath, `${manifestPath}.bak-before-fastboot-${Date.now()}`)
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`enabled bundles: ${added.join(', ')}`)
} else {
  console.log('all bundles already enabled')
}
