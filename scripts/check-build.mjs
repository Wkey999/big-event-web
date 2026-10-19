import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../dist')
const manifest = JSON.parse(readFileSync(resolve(root, '.vite/manifest.json'), 'utf8'))
const chunks = readdirSync(resolve(root, 'assets')).filter(name => name.endsWith('.js'))
let largest = 0
for (const name of chunks) {
  const size = statSync(resolve(root, 'assets', name)).size
  largest = Math.max(largest, size)
  assert.ok(size < 500_000, `${name} exceeds 500 kB: ${size}`)
}
function staticImports(entries) {
  const seen = new Set()
  function visit(key) {
    if (seen.has(key)) return
    assert.ok(manifest[key], `Missing build entry ${key}`)
    seen.add(key)
    for (const dependency of manifest[key].imports || []) visit(dependency)
  }
  entries.forEach(visit)
  return [...seen].map(key => manifest[key].file)
}
const home = staticImports(['index.html', 'src/views/layout/CommunityLayout.vue', 'src/views/HomeView.vue'])
const creator = staticImports(['src/views/article/ArticleManageView.vue'])
for (const file of [...home, ...creator]) {
  assert.doesNotMatch(file, /GamesView|ArticleRichEditor|editor-/, `${file} loads before opening its feature`)
}
assert.ok(manifest['src/views/GamesView.vue'].isDynamicEntry)
assert.ok(manifest['src/views/article/ArticleManageView.vue'].dynamicImports
  .some(key => manifest[key].file.includes('ArticleRichEditor')))
const html = readFileSync(resolve(root, 'index.html'), 'utf8')
assert.doesNotMatch(html, /\/games\/|og\.webp/)
console.log(`Build checks passed: ${chunks.length} JS chunks; largest ${(largest / 1000).toFixed(2)} kB; editor and games stay lazy.`)
