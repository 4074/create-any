/* eslint-disable no-console */
import spawn from 'cross-spawn'
import fs from 'fs-extra'
import path from 'path'
import ora from 'ora'

function runNpmSetup(dir: string) {
  const packageJsonPath = path.join(dir, 'package.json')
  if (!fs.existsSync(packageJsonPath)) return

  const spinner = ora('Setting package.json').start()

  // Read package.json from template
  const packageJson = fs.readJSONSync(packageJsonPath)

  const packageJsonChangeKeys = [
    'name',
    'version',
    'description',
    'repository',
    'keywords',
    'author',
    'license',
    'bugs',
    'homepage'
  ]

  // Yarn first
  const hasYarn = !spawn.sync('yarn', ['-v']).error

  // Re-create package.json
  fs.removeSync(packageJsonPath)
  spawn.sync(hasYarn ? 'yarn' : 'npm', ['init', '-y'], { cwd: dir })
  const packageJsonInitial = fs.readJSONSync(packageJsonPath)

  // Generate the final package.json
  for (const key of packageJsonChangeKeys) {
    packageJson[key] = packageJsonInitial[key]
  }
  const deps = Object.keys(packageJson.dependencies || {})
  const devDeps = Object.keys(packageJson.devDependencies || {})

  // Install latest dependencies and devDependencies
  packageJson.dependencies = {}
  packageJson.devDependencies = {}
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))

  spinner.succeed()

  if (deps.length) {
    if (hasYarn) {
      spawn.sync('yarn', ['add', ...deps], { stdio: 'inherit', cwd: dir })
    } else {
      spawn.sync('npm', ['i', ...deps], { stdio: 'inherit', cwd: dir })
    }
  }

  if (devDeps.length) {
    if (hasYarn) {
      spawn.sync('yarn', ['add', '-D', ...devDeps], {
        stdio: 'inherit',
        cwd: dir
      })
    } else {
      spawn.sync('npm', ['i', '-D', ...devDeps], { stdio: 'inherit', cwd: dir })
    }
  }
}

export default async function setup() {
  const root = process.cwd()
  let options: { entry?: string[] } = {}

  // Support caconfig.json
  const configJsonPath = path.join(root, 'caconfig.json')
  if (fs.existsSync(configJsonPath)) {
    const configJson = fs.readJSONSync(configJsonPath)
    options = {
      ...options,
      ...configJson
    }
  }

  if (options.entry) {
    if (Array.isArray(options.entry)) {
      for (const e of options.entry) {
        runNpmSetup(path.join(root, e))
      }
    } else {
      // TODO: Display error message.
    }
  } else {
    runNpmSetup(root)
  }
}
