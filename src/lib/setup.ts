/* eslint-disable no-console */
import spawn from 'cross-spawn'
import fs from 'fs-extra'
import path from 'path'
import ora from 'ora'

export default async function setup() {
  const dir = process.cwd()
  const packageJsonPath = path.join(dir, 'package.json')
  if (!fs.existsSync(packageJsonPath)) return

  const spinner = ora('Setting package.json').start()

  // Read package.json from template
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

  // Re-create package.json
  fs.removeSync(packageJsonPath)
  spawn.sync('npm', ['init', '-y'])
  const packageJsonInitial = JSON.parse(
    fs.readFileSync(packageJsonPath).toString('utf-8')
  )

  // Generate the final package.json
  for (const key of packageJsonChangeKeys) {
    packageJson[key] = packageJsonInitial[key]
  }
  const deps = Object.keys(packageJson.dependencies)
  const devDeps = Object.keys(packageJson.devDependencies)

  // Install latest dependencies and devDependencies
  packageJson.dependencies = {}
  packageJson.devDependencies = {}
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))

  spinner.succeed()
  console.log()

  if (deps.length) spawn.sync('npm', ['i', ...deps], { stdio: 'inherit' })
  if (devDeps.length)
    spawn.sync('npm', ['i', '-D', ...devDeps], { stdio: 'inherit' })
}
