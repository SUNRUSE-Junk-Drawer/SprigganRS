import * as fs from "fs"
import mkdirp from "mkdirp"
import rimraf from "rimraf"
import * as paths from "./paths"
import svg from "./svg"

const extensions = {
  svg
}

export function created(oldState, newState, buildName, gameName, packageName, fileName, fileExtension, onError, onDone) {
  performCreation(oldState, newState, buildName, gameName, packageName, fileName, fileExtension, error => {
    onError(error)
    onDone()
  }, onDone)
}

export function updated(oldState, newState, buildName, gameName, packageName, fileName, fileExtension, onError, onDone) {
  performDeletion(buildName, gameName, packageName, fileName, fileExtension, error => {
    onError(error)
    onDone()
  }, () => performCreation(oldState, newState, buildName, gameName, packageName, fileName, fileExtension, error => {
    onError(error)
    onDone()
  }, onDone))
}

export function deleted(buildName, gameName, packageName, fileName, fileExtension, onError, onDone) {
  performDeletion(buildName, gameName, packageName, fileName, fileExtension, error => {
    onError(error)
    onDone()
  }, onDone)
}

function performDeletion(buildName, gameName, packageName, fileName, fileExtension, onError, onSuccess) {
  console.log(`Deleting "${paths.tempBuildGamePackageFile(buildName, gameName, packageName, fileName, fileExtension)}"...`)
  rimraf(paths.tempBuildGamePackageFile(buildName, gameName, packageName, fileName, fileExtension), error => {
    if (error) {
      onError(error)
    } else {
      onSuccess()
    }
  })
}

function performCreation(oldState, newState, buildName, gameName, packageName, fileName, fileExtension, onError, onSuccess) {
  console.log(`Creating "${paths.tempBuildGamePackageFile(buildName, gameName, packageName, fileName, fileExtension)}"...`)
  mkdirp(paths.tempBuildGamePackageFile(buildName, gameName, packageName, fileName, fileExtension), err => {
    if (err) {
      onError(err)
    } else {
      if (Object.prototype.hasOwnProperty.call(extensions, fileExtension)) {
        extensions[fileExtension](oldState, newState, buildName, gameName, packageName, fileName, onError, (generated) => {
          console.log(`Writing "${paths.tempBuildGamePackageFileCache(buildName, gameName, packageName, fileName, fileExtension)}"...`)
          fs.writeFile(
            paths.tempBuildGamePackageFileCache(buildName, gameName, packageName, fileName, fileExtension),
            JSON.stringify(generated),
            err => {
              if (err) {
                onError(err)
              } else {
                onSuccess(generated)
              }
            }
          )
        })
      } else {
        onError(`Unknown file extension "${fileExtension}" for "${paths.srcGamePackageFile(gameName, packageName, fileName, fileExtension)}".`)
      }
    }
  })
}
