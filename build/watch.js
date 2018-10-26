import * as chokidar from "chokidar"
import run from "./run"

let running = false
let invalidated = false
let throttling = null
const paths = {}

chokidar
  .watch(`src`)
  .on(`add`, (path, stats) => handle(`add`, path, stats))
  .on(`change`, (path, stats) => handle(`change`, path, stats))
  .on(`unlink`, path => {
    console.log(`"unlink" of "${path}"`)
    delete paths[path]
    invalidate()
  })
  .on(`error`, error => { throw error })

function handle(event, path, stats) {
  console.log(`"${event}" of "${path}"`)
  if (!stats) {
    throw `No stats for "${event}" of "${path}"`
  }
  paths[path] = stats.mtime.getTime()
  invalidate()
}

function invalidate() {
  if (running) {
    console.log(`Waiting to restart...`)
    invalidated = true
    return
  }

  if (throttling == null) {
    console.log(`Throttling...`)
  } else {
    console.log(`Continuing to throttle...`)
    clearTimeout(throttling)
  }

  throttling = setTimeout(() => {
    console.log(`Starting...`)
    throttling = null
    invalidated = false
    run(
      JSON.parse(JSON.stringify(paths)),
      `watch`,
      error => console.error(`Failed; "${error}".`),
      () => {
        console.log(`Done.`)
        running = false
        if (invalidated) {
          invalidate()
        }
      }
    )
  }, 200)
}
