/* eslint-disable no-console */
import spawn from 'cross-spawn'
import fs from 'fs-extra'
import path from 'path'

export default function setup(): void {
  console.log('Setup project')
  const dir = process.cwd()

  const packageJsonPath = path.join(dir, 'package.json')
  if (!fs.existsSync(packageJsonPath)) return

  const packageJson = JSON.parse(
    fs.readFileSync(packageJsonPath).toString('utf-8')
  )

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

  fs.removeSync(packageJsonPath)
  spawn.sync('npm', ['init', '-y'])

  const packageJsonInit = JSON.parse(
    fs.readFileSync(packageJsonPath).toString('utf-8')
  )

  for (const key of packageJsonChangeKeys) {
    packageJson[key] = packageJsonInit[key]
  }

  const deps = Object.keys(packageJson.dependencies)
  const devDeps = Object.keys(packageJson.devDependencies)

  // Install latest dependencies and devDependencies
  packageJson.dependencies = {}
  packageJson.devDependencies = {}
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))

  if (deps.length) spawn.sync('npm', ['i', ...deps], { stdio: 'inherit' })
  if (devDeps.length)
    spawn.sync('npm', ['i', '-D', ...devDeps], { stdio: 'inherit' })
}
