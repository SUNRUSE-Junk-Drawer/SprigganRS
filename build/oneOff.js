import * as fs from "fs"
import * as paths from "./paths"
import run from "./run"

const allPaths = {}
recurse(
  `src`,
  () => run(
    allPaths,
    `oneOff`,
    error => { throw error },
    () => console.log(`Done.`)
  )
)

function recurse(directory, onSuccess) {
  fs.readdir(directory, (error, files) => {
    if (error) {
      throw error
    }
    let remaining = files.length
    files
      .map(file => paths.join(directory, file))
      .forEach(file => fs.stat(file, (error, stats) => {
        if (error) {
          throw error
        }
        if (stats.isFile()) {
          allPaths[file] = stats.mtime.getTime()
          fileDone()
        } else if (stats.isDirectory()) {
          recurse(file, fileDone)
        } else {
          console.warn(`Ignoring unexpected filesystem record "${file}"`)
          fileDone()
        }
      }))
    function fileDone() {
      remaining--
      if (!remaining) {
        onSuccess()
      }
    }
  })
}
