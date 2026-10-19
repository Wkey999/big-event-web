import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createRequire } from 'node:module'

// wangEditor 5.1.23's ESM entry bundles all dependencies into one 817 KB module.
// Restore its own published TypeScript entry from the MIT-licensed source map,
// keeping dependencies as imports so Rolldown can split them. Never patch node_modules.
export function prepareEditorEntry(root) {
  const require = createRequire(import.meta.url)
  const packagePath = require.resolve('@wangeditor/editor/package.json')
  const packageRoot = dirname(packagePath)
  const { version } = JSON.parse(readFileSync(packagePath, 'utf8'))
  if (version !== '5.1.23') throw new Error('Update the editor entry adapter before upgrading wangEditor.')
  const map = JSON.parse(readFileSync(resolve(packageRoot, 'dist/index.esm.js.map'), 'utf8'))
  const output = resolve(root, 'node_modules/.cache/big-event-editor')
  let count = 0
  for (let index = 0; index < map.sources.length; index++) {
    const source = map.sources[index]
    if (!source.startsWith('../src/') || !source.endsWith('.ts')) continue
    const relative = source.slice('../src/'.length)
    if (relative.includes('..')) throw new Error('Unexpected editor source path')
    const filename = resolve(output, relative)
    let content = map.sourcesContent[index]
    if (relative === 'index.ts') {
      content = content.replace("import './assets/index.less'", "import '@wangeditor/editor/dist/css/style.css'")
      // Upstream builds with type checking; Vite strips TS in isolation. Mark
      // these type-only re-exports explicitly to avoid runtime missing exports.
      content = content.replace(/^(\s*)(I[A-Z]\w*),\s*$/gm, '$1type $2,')
        .replace(/^(\s*)(Descendant|Location) as /gm, '$1type $2 as ')
    }
    mkdirSync(dirname(filename), { recursive: true })
    if (!existsSync(filename) || readFileSync(filename, 'utf8') !== content) writeFileSync(filename, content)
    count++
  }
  if (count !== 15) throw new Error('Published editor entry sources changed; review the adapter.')
  writeFileSync(resolve(output, 'LICENSE'), readFileSync(resolve(packageRoot, 'LICENSE')))
  return resolve(output, 'index.ts')
}
