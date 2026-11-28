const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const IS_WIN = process.platform === 'win32'
const ROOT_DIR = path.resolve(__dirname, '..')

function venvPythonPath(venvDir) {
  return IS_WIN
    ? path.join(venvDir, 'Scripts', 'python.exe')
    : path.join(venvDir, 'bin', 'python')
}

function getPythonCandidates() {
  const candidates = []

  if (process.env.VIRTUAL_ENV) {
    const activePy = venvPythonPath(process.env.VIRTUAL_ENV)
    if (fs.existsSync(activePy)) {
      candidates.push({ cmd: activePy, baseArgs: [] })
    }
  }

  const localVenvs = [
    path.join(ROOT_DIR, 'hazardlens-ai', '.venv'),
    path.join(ROOT_DIR, 'hazardlens-ai', 'venv'),
    path.join(ROOT_DIR, 'ai_service', '.venv'),
    path.join(ROOT_DIR, 'ai_service', 'venv'),
  ]
  for (const dir of localVenvs) {
    const pyExe = venvPythonPath(dir)
    if (fs.existsSync(pyExe)) {
      candidates.push({ cmd: pyExe, baseArgs: [] })
    }
  }

  if (IS_WIN) {
    for (const ver of ['-3.14', '-3.13', '-3.12', '-3.11', '-3.10']) {
      candidates.push({ cmd: 'py', baseArgs: [ver] })
    }
    candidates.push({ cmd: 'python', baseArgs: [] })
    candidates.push({ cmd: 'python3', baseArgs: [] })
  } else {
    candidates.push({ cmd: 'python3', baseArgs: [] })
    candidates.push({ cmd: 'python', baseArgs: [] })
  }

  return candidates
}

function canRun(candidate, args) {
  const res = spawnSync(candidate.cmd, [...candidate.baseArgs, ...args], {
    stdio: 'ignore',
  })
  return !res.error && res.status === 0
}

function hasModules(candidate, modules) {
  return canRun(candidate, ['-c', `import ${modules.join(', ')}`])
}

/**
 * Find a working Python executable. When `requireModules` is supplied, prefer an
 * interpreter that already has those modules installed; otherwise return the
 * first working Python interpreter.
 */
function findPython({ requireModules = null } = {}) {
  const working = []
  for (const candidate of getPythonCandidates()) {
    if (canRun(candidate, ['--version'])) {
      if (requireModules && hasModules(candidate, requireModules)) {
        return { python: candidate, hasRequiredModules: true }
      }
      working.push(candidate)
    }
  }
  return {
    python: working[0] || null,
    hasRequiredModules: false,
  }
}

module.exports = {
  IS_WIN,
  ROOT_DIR,
  findPython,
  hasModules,
}
