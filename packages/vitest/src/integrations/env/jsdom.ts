import { importModule } from 'local-pkg'
import type { Environment } from '../../types'
import { populateGlobal } from './utils'

function catchWindowErrors(window: Window) {
  let userErrorListenerCount = 0
  function throwUnhandlerError(e: ErrorEvent) {
    if (userErrorListenerCount === 0 && e.error != null)
      process.emit('uncaughtException', e.error)
  }
  const addEventListener = window.addEventListener.bind(window)
  const removeEventListener = window.removeEventListener.bind(window)
  window.addEventListener('error', throwUnhandlerError)
  window.addEventListener = function (...args: Parameters<typeof addEventListener>) {
    if (args[0] === 'error')
      userErrorListenerCount++
    return addEventListener.apply(this, args)
  }
  window.removeEventListener = function (...args: Parameters<typeof removeEventListener>) {
    if (args[0] === 'error' && userErrorListenerCount)
      userErrorListenerCount--
    return removeEventListener.apply(this, args)
  }
  return function clearErrorHandlers() {
    window.removeEventListener('error', throwUnhandlerError)
  }
}

export default ({
  name: 'jsdom',
  async setup(global, { jsdom = {} }) {
    const {
      CookieJar,
      JSDOM,
      ResourceLoader,
      VirtualConsole,
    } = await importModule('jsdom') as typeof import('jsdom')
    const {
      html = '<!DOCTYPE html>',
      userAgent,
      url = 'http://localhost:3000',
      contentType = 'text/html',
      pretendToBeVisual = true,
      includeNodeLocations = false,
      runScripts = 'dangerously',
      resources,
      console = false,
      cookieJar = false,
      ...restOptions
    } = jsdom as any
    const dom = new JSDOM(
      html,
      {
        pretendToBeVisual,
        resources: resources ?? (userAgent ? new ResourceLoader({ userAgent }) : undefined),
        runScripts,
        url,
        virtualConsole: (console && global.console) ? new VirtualConsole().sendTo(global.console) : undefined,
        cookieJar: cookieJar ? new CookieJar() : undefined,
        includeNodeLocations,
        contentType,
        userAgent,
        ...restOptions,
      },
    )

    const { keys, originals } = populateGlobal(global, dom.window, { bindFunctions: true })

    const clearWindowErrors = catchWindowErrors(global)

    return {
      teardown(global) {
        clearWindowErrors()
        dom.window.close()
        keys.forEach(key => delete global[key])
        originals.forEach((v, k) => global[k] = v)
      },
    }
  },
}) satisfies Environment
