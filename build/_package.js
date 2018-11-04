import mkdirp from "mkdirp"
import rimraf from "rimraf"
import * as paths from "./paths"

export function created(oldState, newState, buildName, gameName, packageName, onError, onDone) {
  console.log(`Creating "${paths.tempBuildGamePackage(buildName, gameName, packageName)}"...`)
  mkdirp(paths.tempBuildGamePackage(buildName, gameName, packageName), err => {
    if (err) {
      onError(err)
      onDone()
      return
    }
    updated(oldState, newState, buildName, gameName, packageName, onError, onDone)
  })
}

export function updated(oldState, newState, buildName, gameName, packageName, onError, onDone) {
  console.log(`Updating package "${packageName}"...`)
  onDone()
}

export function deleted(buildName, gameName, packageName, onError, onDone) {
  console.log(`Deleting "${paths.tempBuildGamePackage(buildName, gameName, packageName)}...`)
  rimraf(paths.tempBuildGamePackage(buildName, gameName, packageName), error => {
    if (error) {
      onError(error)
      onDone()
      return
    }
    console.log(`Deleting "${paths.distBuildGamePackage(buildName, gameName, packageName)}...`)
    rimraf(paths.distBuildGamePackage(buildName, gameName, packageName), error => {
      if (error) {
        onError(error)
        onDone()
        return
      }
      onDone()
    })
  })
}
