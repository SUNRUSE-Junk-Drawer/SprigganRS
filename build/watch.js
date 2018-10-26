import * as path from "path"
import * as chokidar from "chokidar"
import mkdirp from "mkdirp"
import newExpress from "express"
import * as express from "express"
import run from "./run"

const distPath = path.join(`dist`, `watch`)
console.log(`Creating "${distPath}" if it does not exist...`)
mkdirp(distPath, error => {
  if (error) {
    throw error
  }

  console.log(`Starting web server on port 5000...`)

  newExpress()
    .use(express.static(distPath))
    .listen(5000, () => {
      console.log(`Watching for files...`)

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
    })
})
