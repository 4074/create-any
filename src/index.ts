#!/usr/bin/env node

import { Command } from 'commander'
import download from './lib/download'

const program = new Command()

program
  .version('1.0.0')
  .description('Create a node ecosystem application with template')
  .option(
    '-t, --template <type>',
    'Add the specified type of cheese',
    'koa-autoboot'
  )

program.parse(process.argv)

download(program.template)

// console.log(program.args)
