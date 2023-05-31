import { Console } from 'node:console'
import type { Environment } from '../../types'

export default ({
  name: 'node',
  async setup(global) {
    global.console.Console = Console
    return {
      teardown(global) {
        delete global.console.Console
      },
    }
  },
}) satisfies Environment
