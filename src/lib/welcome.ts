/* eslint-disable no-console */
import figlet from 'figlet'
import chalk from 'chalk'

export default function welcome() {
  console.log()
  console.log(
    chalk.hex('#60d6a7')(
      figlet.textSync('Create Any', {
        horizontalLayout: 'fitted'
      })
    )
  )
  console.log()
}
