import * as fs from "fs"
import * as chokidar from "chokidar"
import * as mkdirp from "mkdirp"
import * as express from "express"
import * as paths from "./paths"
import run from "./run"

console.log(`Creating "${paths.distBuild(`watch`)}" if it does not exist...`)
mkdirp(paths.distBuild(`watch`), error => {
  if (error) {
    throw error
  }

  console.log(`Starting web server on port 5000...`)

  express()
    .use(express.static(paths.distBuild(`watch`)))
    .listen(5000, () => {
      console.log(`Watching for files...`)

      let running = false
      let invalidated = false
      let throttling: null | NodeJS.Timer = null
      const allPaths: { [path: string]: number } = {}

      chokidar
        .watch(`src`)
        .on(`add`, (path, stats) => handle(`add`, path, stats))
        .on(`change`, (path, stats) => handle(`change`, path, stats))
        .on(`unlink`, path => {
          console.log(`"unlink" of "${path}"`)
          delete allPaths[path]
          invalidate()
        })
        .on(`error`, error => { throw error })

      function handle(event: string, path: string, stats: fs.Stats) {
        console.log(`"${event}" of "${path}"`)
        if (!stats) {
          throw `No stats for "${event}" of "${path}"`
        }
        allPaths[path] = stats.mtime.getTime()
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
          running = true
          run(
            JSON.parse(JSON.stringify(allPaths)),
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
