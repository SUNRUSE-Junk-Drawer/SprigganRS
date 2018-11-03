import * as fs from "fs"
import mkdirp from "mkdirp"
import rimraf from "rimraf"
import * as paths from "./paths"
import generateHtml from "./generateHtml"
import * as _package from "./_package"

export function created(oldState, newState, buildName, gameName, onError, onDone) {
  newState.games[gameName] = {
    packages: {}
  }

  console.log(`Creating "${paths.tempBuildGame(buildName, gameName)}"...`)
  mkdirp(paths.tempBuildGame(buildName, gameName), error => {
    if (error) {
      onError(error)
      onDone()
    } else {
      console.log(`Creating "${paths.distBuildGame(buildName, gameName)}"...`)
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

        const oldPackageNames = packageNames(oldState, gameName)
        const newPackageNames = packageNames(newState, gameName)

        let remaining = new Set([...oldPackageNames, ...newPackageNames]).size

        if (remaining) {
          Array
            .from(newPackageNames)
            .filter(packageName => !oldPackageNames.has(packageName))
            .forEach(packageName => _package.created(oldState, newState, buildName, gameName, packageName, onError, onPackageDone))

          Array
            .from(newPackageNames)
            .filter(packageName => oldPackageNames.has(packageName))
            .forEach(packageName => _package.updated(oldState, newState, buildName, gameName, packageName, onError, onPackageDone))

          Array
            .from(oldPackageNames)
            .filter(packageName => !newPackageNames.has(packageName))
            .forEach(packageName => _package.deleted(buildName, gameName, packageName, onError, onPackageDone))

          function onPackageDone() {
            remaining--
            if (!remaining) {
              onAllPackagesDone()
            }
          }
        } else {
          onAllPackagesDone()
        }

        function onAllPackagesDone() {
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
      }
    })
  }
}

export function deleted(buildName, gameName, onError, onDone) {
  console.log(`Deleting "${paths.tempBuildGame(buildName, gameName)}"...`)
  rimraf(paths.tempBuildGame(buildName, gameName), error => {
    if (error) {
      onError(error)
      onDone()
    } else {
      console.log(`Deleting "${paths.distBuildGame(buildName, gameName)}"...`)
      rimraf(paths.distBuildGame(buildName, gameName), error => {
        if (error) {
          onError(error)
          onDone()
        } else {
          onDone()
        }
      })
    }
  })
}

function packageNames(state, gameName) {
  return new Set(
    Object
      .keys(state.paths)
      .filter(path => paths.isSrcGame(path) == gameName)
      .map(paths.isSrcGamePackage)
      .filter(packageName => packageName)
  )
}
