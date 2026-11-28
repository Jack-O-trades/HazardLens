const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { IS_WIN, ROOT_DIR, findPython } = require('./python-env')

const aiDir = path.join(ROOT_DIR, 'hazardlens-ai')
const { python } = findPython({ requireModules: ['uvicorn', 'fastapi'] })

if (!python) {
  console.error('[python-ai] Error: No Python interpreter with uvicorn/fastapi found. Run `npm run setup` first.')
  process.exit(1)
}

const result = spawnSync(
  python.cmd,
  [...python.baseArgs, '-m', 'uvicorn', 'app:app', '--reload', '--port', '8000'],
  { cwd: aiDir, stdio: 'inherit' }
)

process.exit(result.status ?? 1)
