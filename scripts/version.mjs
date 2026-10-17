#!/usr/bin/env node
/**
 * 版本号工具。
 *
 *   node scripts/version.mjs 1.2.3           改 package.json 版本并按约定提交
 *   node scripts/version.mjs --check 1.2.3   只校验，不一致则退出码 1（给 CI 用）
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SEMVER = /^\d+\.\d+\.\d+$/
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkgPath = resolve(root, 'package.json')

const [first, second] = process.argv.slice(2)
const checkOnly = first === '--check'
const target = checkOnly ? second : first

if (!target) {
  console.error('用法：node scripts/version.mjs <x.y.z> | --check <x.y.z>')
  process.exit(1)
}

if (!SEMVER.test(target)) {
  console.error(`版本号必须是三段式 x.y.z，且不带前缀 v：${target}`)
  process.exit(1)
}

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))

if (checkOnly) {
  if (pkg.version !== target) {
    console.error(`package.json 的 version 是 ${pkg.version}，与输入的 ${target} 不一致。`)
    console.error('请先执行下面两步，再重新触发发布：')
    console.error(`  node scripts/version.mjs ${target}`)
    console.error('  git push')
    process.exit(1)
  }
  console.log(`package.json 版本一致：${pkg.version}`)
  process.exit(0)
}

if (pkg.version === target) {
  console.log(`版本号已经是 ${target}，无需修改。`)
  process.exit(0)
}

const previous = pkg.version
pkg.version = target
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8')

execFileSync('git', ['add', 'package.json'], { cwd: root, stdio: 'inherit' })
execFileSync('git', ['commit', '-m', `chore(release): 版本号升至 ${target}`], {
  cwd: root,
  stdio: 'inherit'
})

console.log(`${previous} → ${target}，已提交。push 之后即可触发发布工作流。`)
