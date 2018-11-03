import * as fs from "fs"
import mkdirp from "mkdirp"
import rimraf from "rimraf"
import * as paths from "./paths"
import generateHtml from "./generateHtml"

export function created(oldState, newState, buildName, gameName, onError, onDone) {
  newState.games[gameName] = {
    packages: {}
  }
  performDeletion(buildName, gameName, error => {
    onError(error)
    onDone()
  }, afterDeletion)
  function afterDeletion() {
    console.log(`Recreating "${paths.tempBuildGame(buildName, gameName)}"...`)
    mkdirp(paths.tempBuildGame(buildName, gameName), error => {
      if (error) {
        onError(error)
        onDone()
      } else {
        console.log(`Recreating "${paths.distBuildGame(buildName, gameName)}"...`)
        mkdirp(paths.distBuildGame(buildName, gameName), error => {
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

  if (!Object.prototype.hasOwnProperty.call(newState.paths, paths.srcGameMetadata(gameName))) {
    onError(`Game "${gameName}" does not appear to have a "metadata.json" file`)
    onDone()
  } else if (!Object.prototype.hasOwnProperty.call(newState.paths, paths.srcGameIcon(gameName))) {
    onError(`Game "${gameName}" does not appear to have an "icon.svg" file`)
    onDone()
  } else {
    const createdOrModifiedFiles = new Set(
      Object
        .keys(newState.paths)
        .filter(path => (/^src\/games\/([^\/]+)\/.*$/.exec(path) || [])[1] == gameName)
        .filter(path =>
          !Object.prototype.hasOwnProperty.call(oldState.paths, path)
          || oldState.paths[path] != newState.paths[path])
    )
    console.log(`Reading "${paths.srcGameMetadata(gameName)}"...`)
    fs.readFile(paths.srcGameMetadata(gameName), (error, data) => {
      if (error) {
        onError(error)
        onDone()
      } else {
        console.log(`Parsing...`)
        let metadata
        try {
          metadata = JSON.parse(data)
        } catch (error) {
          onError(error)
          onDone()
          return
        }
        if (buildName == `watch`) {
          metadata.name = `DEVELOPMENT BUILD - ${metadata.name}`
        }
        generateHtml(
          createdOrModifiedFiles,
          buildName,
          gameName,
          metadata,
          error => {
            onError(error)
            onDone()
          }, onDone
        )
      }
    })
  }
}

export function deleted(buildName, gameName, onError, onDone) {
  performDeletion(buildName, gameName, error => {
    onError(error)
    onDone()
  }, onDone)
}

function performDeletion(buildName, gameName, onError, onSuccess) {
  console.log(`Deleting "${paths.tempBuildGame(buildName, gameName)}"...`)
  rimraf(paths.tempBuildGame(buildName, gameName), error => {
    if (error) {
      onError(error)
    } else {
      console.log(`Deleting "${paths.distBuildGame(buildName, gameName)}"...`)
      rimraf(paths.distBuildGame(buildName, gameName), error => {
        if (error) {
          onError(error)
        } else {
          onSuccess()
        }
      })
    }
  })
}

function writeIfNotPresent(path, contentFactory, onError, onSuccess) {
  console.log(`Checking whether "${path}" exists...`)
  fs.access(path, error => {
    if (error && error.code == `ENOENT`) {
      console.log(`It does not exist; generating...`)
      contentFactory(content => {
        console.log(`Writing...`)
        fs.writeFile(path, content, error => {
          if (error) {
            onError(error)
          } else {
            console.log(`Done.`)
            onSuccess()
          }
        })
      })
    } else if (error) {
      onError(error)
    } else {
      console.log(`It exists.  Continuing...`)
      onSuccess()
    }
  })
}
