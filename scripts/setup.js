const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { IS_WIN, ROOT_DIR, findPython } = require('./python-env')

const IF_MISSING = process.argv.includes('--if-missing')
const AI_MODULES = ['uvicorn', 'fastapi', 'pydantic', 'PIL', 'ultralytics', 'cv2', 'torch']

function run(cmd, args, cwd) {
  const result = IS_WIN && cmd.endsWith('.cmd')
    ? spawnSync('cmd.exe', ['/c', cmd, ...args], { cwd, stdio: 'inherit' })
    : spawnSync(cmd, args, { cwd, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function stampPath(dir) {
  return path.join(dir, 'node_modules', '.hl-setup-stamp')
}

function needsNpmInstall(dir) {
  if (!IF_MISSING) return true

  const nodeModulesDir = path.join(dir, 'node_modules')
  if (!fs.existsSync(nodeModulesDir)) return true

  const stamp = stampPath(dir)
  if (!fs.existsSync(stamp)) return true

  const stampMtime = fs.statSync(stamp).mtimeMs
  for (const manifest of ['package.json', 'package-lock.json']) {
    const filePath = path.join(dir, manifest)
    if (fs.existsSync(filePath) && fs.statSync(filePath).mtimeMs > stampMtime) {
      return true
    }
  }
  return false
}

function writeSetupStamp(dir) {
  const nodeModulesDir = path.join(dir, 'node_modules')
  if (fs.existsSync(nodeModulesDir)) {
    fs.writeFileSync(stampPath(dir), `${new Date().toISOString()}\n`)
  }
}

function main() {
  const nodeTargets = [
    { label: 'root', dir: ROOT_DIR },
    { label: 'frontend', dir: path.join(ROOT_DIR, 'frontend') },
    { label: 'backend', dir: path.join(ROOT_DIR, 'backend') },
  ]

  for (const target of nodeTargets) {
    if (!fs.existsSync(path.join(target.dir, 'package.json'))) continue
    if (needsNpmInstall(target.dir)) {
      console.log(`\n[setup] Installing ${target.label} Node dependencies...`)
      run(IS_WIN ? 'npm.cmd' : 'npm', ['install'], target.dir)
      writeSetupStamp(target.dir)
    }
  }

  const aiDir = path.join(ROOT_DIR, 'hazardlens-ai')
  const reqPath = path.join(aiDir, 'requirements.txt')
  if (fs.existsSync(reqPath)) {
    const { python, hasRequiredModules } = findPython({
      requireModules: IF_MISSING ? AI_MODULES : null,
    })

    if (!python) {
      console.error('\n[setup] Error: Python 3.10+ was not found in PATH. Please install Python and re-run.')
      process.exit(1)
    }

    if (!IF_MISSING || !hasRequiredModules) {
      console.log(`\n[setup] Installing hazardlens-ai Python dependencies via ${python.cmd} ${python.baseArgs.join(' ')}...`)
      run(python.cmd, [...python.baseArgs, '-m', 'pip', 'install', '-r', 'requirements.txt'], aiDir)
    }
  }

  if (!IF_MISSING) {
    console.log('\n[setup] All Node and Python dependencies are installed!')
  }
}

main()
