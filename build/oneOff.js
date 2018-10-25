import * as fs from "fs"
import * as path from "path"
import run from "./run"

const paths = {}
recurse(
  `src`,
  () => run(
    paths,
    () => console.log(`Done.`),
    error => { throw error }
  )
)

function recurse(directory, onSuccess) {
  fs.readdir(directory, (error, files) => {
    if (error) {
      throw error
    }
    let remaining = files.length
    files
      .map(file => path.join(directory, file))
      .forEach(file => fs.stat(file, (error, stats) => {
        if (error) {
          throw error
        }
        if (stats.isFile()) {
          paths[file] = stats.mtime.getTime()
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
