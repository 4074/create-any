/* eslint-disable no-console */
import axios from 'axios'
import spawn from 'cross-spawn'
import tmp from 'tmp'
import fs from 'fs-extra'
import path from 'path'
import tar from 'tar'
import decompress from 'decompress'
import chalk from 'chalk'
import ora from 'ora'

const spinner = ora()

function getNpmConfig(name: string): string {
  return spawn.sync('npm', ['config', 'get', name]).output.join('').trim()
}

function copyFiles(
  src: string,
  dist: string,
  filter?: (filename: string, filepath: string) => boolean
) {
  const ignoreFiles = ['node_modules', '.git']
  const warn = []

  // BFS to copy all files
  const queue = ['']
  while (queue.length) {
    let count = queue.length
    while (count) {
      count -= 1
      const dir = queue.pop()
      const files = fs.readdirSync(path.join(src, dir))

      for (const file of files) {
        if (ignoreFiles.includes(file)) continue

        const filepath = path.join(dir, file)
        const srcFilepath = path.join(src, filepath)
        const stat = fs.statSync(srcFilepath)

        if (stat.isDirectory()) {
          queue.unshift(filepath)
          continue
        }

        if (filter && !filter(file, filepath)) continue
        fs.ensureDirSync(path.join(dist, dir))

        const distFilepath = path.join(dist, filepath)

        // Detect if the file exists. If exists, skipping.
        if (fs.existsSync(distFilepath)) {
          warn.push(`File conflict ${filepath}, skiped.`)
          continue
        }
        fs.copyFileSync(srcFilepath, distFilepath)
      }
    }
  }

  // Log conflict infos
  if (warn.length) {
    spinner.clear()
    console.log(chalk.yellow(warn.join('\n')))
    console.log()
  }
}

async function downloadFiles(url: string) {
  const tmpobj = tmp.dirSync({ unsafeCleanup: true })

  const fileResp = await axios({
    method: 'get',
    url,
    responseType: 'arraybuffer'
  })

  const filename = url.split('/').pop()
  const filepath = path.join(tmpobj.name, filename)
  fs.writeFileSync(filepath, fileResp.data)

  // Extract the tgz/zip file
  if (/\.tgz$/.test(filepath)) {
    tar.extract({
      cwd: tmpobj.name,
      file: filepath,
      sync: true
    })
  } else {
    await decompress(filepath, tmpobj.name)
  }

  fs.removeSync(filepath)

  // Copy files to the project folder
  const files = fs.readdirSync(tmpobj.name)
  copyFiles(
    files.length ? path.join(tmpobj.name, files[0]) : tmpobj.name,
    process.cwd()
  )

  tmpobj.removeCallback()
}

async function downloadNpmPackage(name: string) {
  const registry = getNpmConfig('registry') || 'https://registry.npmjs.org/'
  let fileUrl = ''

  // Get the download url.
  // Try prefix with `ca-template-` first.
  for (const prefix of ['ca-template-', '']) {
    const url = `${registry}${prefix}${name}`
    // eslint-disable-next-line no-await-in-loop
    const resp = await axios.get(url)
    if (!resp.data.error) {
      fileUrl = resp.data.versions[resp.data['dist-tags'].latest].dist.tarball
      break
    }
  }

  return downloadFiles(fileUrl)
}

async function downloadGithubRepo(name: string) {
  await downloadFiles(`https://github.com/${name}/archive/master.zip`)
}

function downloadLocal(filepath: string) {
  copyFiles(path.resolve(process.cwd(), filepath), process.cwd())
}

function ensureGitIgnore() {
  const dir = process.cwd()
  if (fs.existsSync(path.join(dir, '.gitignore'))) return
  fs.copyFileSync(
    path.resolve(__dirname, '../../gitignore.template'),
    path.resolve(dir, '.gitignore')
  )
}

export default async function download(name: string) {
  spinner.start(`Loading template ${chalk.green(name)}`)

  const arr = name.split(':')

  let type = 'npm'
  let finalName = name
  if (arr.length > 1) {
    type = arr.shift()
    finalName = arr.join(':')
  }

  try {
    switch (type) {
      case 'npm': {
        await downloadNpmPackage(finalName)
        break
      }
      case 'github': {
        await downloadGithubRepo(finalName)
        break
      }
      case 'file': {
        downloadLocal(finalName)
        break
      }
      default: {
        if (/^https?.*\.zip$/.test(name)) {
          await downloadFiles(name)
        } else {
          throw Error(`No avilable type from '${name}'`)
        }
      }
    }
    ensureGitIgnore()
  } catch (error) {
    spinner.fail()
    throw error
  }

  spinner.succeed()
}
