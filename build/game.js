import * as path from "path"
import mkdirp from "mkdirp"
import rimraf from "rimraf"

export function created(oldState, newState, buildName, gameName, onError, onDone) {
  performDeletion(buildName, gameName, error => {
    onError(error)
    onDone()
  }, afterDeletion)
  function afterDeletion() {
    console.log(`Recreating "${tempPath(buildName, gameName)}"...`)
    mkdirp(tempPath(buildName, gameName), error => {
      if (error) {
        onError(error)
        onDone()
      } else {
        console.log(`Recreating "${distPath(buildName, gameName)}"...`)
        mkdirp(distPath(buildName, gameName), error => {
          if (error) {
            onError(error)
            onDone()
          } else {
            updated(oldState, newState, buildName, gameName, onError, onDone)
          }
        })
      }
    })
  }
}

export function updated(oldState, newState, buildName, gameName, onError, onDone) {
  console.log(`Updating game "${gameName}"...`)
  onDone()
}

export function deleted(buildName, gameName, onError, onDone) {
  performDeletion(buildName, gameName, error => {
    onError(error)
    onDone()
  }, onDone)
}

function performDeletion(buildName, gameName, onError, onSuccess) {
  console.log(`Deleting "${tempPath(buildName, gameName)}"...`)
  rimraf(tempPath(buildName, gameName), error => {
    if (error) {
      onError(error)
    } else {
      console.log(`Deleting "${distPath(buildName, gameName)}"...`)
      rimraf(distPath(buildName, gameName), error => {
        if (error) {
          onError(error)
        } else {
          onSuccess()
        }
      })
    }
  })
}

function tempPath(buildName, gameName) {
  return path.join(`temp`, buildName, gameName)
}

function distPath(buildName, gameName) {
  return path.join(`dist`, buildName, gameName)
}
