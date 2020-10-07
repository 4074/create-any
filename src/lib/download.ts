/* eslint-disable no-console */
import axios from 'axios'
import spawn from 'cross-spawn'
import tmp from 'tmp'
import fs from 'fs-extra'
import path from 'path'
import tar from 'tar'
import chalk from 'chalk'

function getNpmConfig(name: string): string {
  return spawn.sync('npm', ['config', 'get', name]).output.join('').trim()
}

function copyFiles(
  src: string,
  dist: string,
  filter?: (filename: string, filepath: string) => boolean
) {
  const ignoreFiles = ['node_modules']

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
        if (fs.existsSync(distFilepath)) {
          console.log(chalk.yellow(`File conflict ${filepath}, skiped.`))
          continue
        }
        fs.copyFileSync(srcFilepath, distFilepath)
      }
    }
  }
}

async function downloadNpmPackage(name: string) {
  const registry = getNpmConfig('registry') || 'https://registry.npmjs.org/'
  const url = `${registry}${name}`

  const resp = await axios.get(url)
  const fileUrl = resp.data.versions[resp.data['dist-tags'].latest].dist.tarball

  const tmpobj = tmp.dirSync({ unsafeCleanup: true })

  const fileResp = await axios({
    method: 'get',
    url: fileUrl,
    responseType: 'arraybuffer'
  })

  const filePath = path.join(tmpobj.name, fileUrl.split('/').pop())
  fs.writeFileSync(filePath, fileResp.data)

  tar.x({
    cwd: tmpobj.name,
    file: filePath,
    sync: true
  })

  copyFiles(
    path.join(tmpobj.name, 'package'),
    process.cwd(),
    (filename) => !/map$/.test(filename)
  )

  tmpobj.removeCallback()
}

function downloadGithubRepo(name: string) {
  // TODO
  console.log(name)
}

function downloadLocal(filepath: string) {
  copyFiles(path.resolve(process.cwd(), filepath), process.cwd())
}

export default async function download(name: string) {
  console.log(chalk.green(`Downloading package ${name}`))
  const arr = name.split(':')

  let type = 'npm'
  let finalName = name
  if (arr.length > 1) {
    type = arr.shift()
    finalName = arr.join(':')
  }

  switch (type) {
    case 'npm': {
      downloadNpmPackage(finalName)
      break
    }
    case 'github': {
      downloadGithubRepo(finalName)
      break
    }
    case 'file': {
      downloadLocal(finalName)
      break
    }
    default: {
      console.warn('No avilable type')
    }
  }
}
