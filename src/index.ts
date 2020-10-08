#!/usr/bin/env node

import { Command } from 'commander'
import ora from 'ora'
import download from './lib/download'
import setup from './lib/setup'
import welcome from './lib/welcome'

const program = new Command()

program
  .version('1.0.0')
  .description('Create a node ecosystem application with template')
  .option(
    '-t, --template <type>',
    'Pass the template to the project creater',
    'koa-autoboot'
  )

program.parse(process.argv)

async function run() {
  welcome()
  try {
    await download(program.template)
    await setup()
  } catch (error) {
    ora(error.message).fail()
  }
}

run()
