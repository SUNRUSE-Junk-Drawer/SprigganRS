import * as fs from "fs"
import * as mkdirp from "mkdirp"
import * as rimraf from "rimraf"
import * as paths from "./paths"
import generateHtml from "./generateHtml"
import * as _package from "./_package"

export function created(
  oldState: {
    readonly paths: {
      readonly [path: string]: number
    }
  },
  newState: {
    readonly paths: {
      readonly [path: string]: number
    }
  },
  buildName: string,
  gameName: string,
  onError: (error: any) => void,
  onDone: () => void
): void {
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

export function updated(
  oldState: {
    readonly paths: {
      readonly [path: string]: number
    }
  },
  newState: {
    readonly paths: {
      readonly [path: string]: number
    }
  },
  buildName: string,
  gameName: string,
  onError: (error: any) => void,
  onDone: () => void
) {
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
    const deletedFiles = new Set(
      Object
        .keys(oldState.paths)
        .filter(path => (/^src\/games\/([^\/]+)\/.*$/.exec(path) || [])[1] == gameName)
        .filter(path => !Object.prototype.hasOwnProperty.call(newState.paths, path))
    )
    const changedFiles = new Set([...createdOrModifiedFiles, ...deletedFiles])
    console.log(`Reading "${paths.srcGameMetadata(gameName)}"...`)
    fs.readFile(paths.srcGameMetadata(gameName), { encoding: `utf8` }, (error: any, data: string) => {
      if (error) {
        onError(error)
        onDone()
      } else {
        console.log(`Parsing...`)
        let possibleMetadata: null | {
          name: string
          readonly description: string
          readonly developer: {
            readonly name: string
            readonly url: string
          }
          readonly width: number
          readonly height: number
        }
        try {
          possibleMetadata = JSON.parse(data)
          if (!possibleMetadata) {
            throw new Error(`The metadata file contained "null".`)
          }
        } catch (error) {
          onError(error)
          onDone()
          return
        }
        const metadata = possibleMetadata
        if (buildName == `watch`) {
          metadata.name = `DEVELOPMENT BUILD - ${metadata.name}`
        }

        const oldPackageNames = packageNames(oldState, gameName)
        const newPackageNames = packageNames(newState, gameName)

        const createdPackages = Array
          .from(newPackageNames)
          .filter(packageName => !oldPackageNames.has(packageName))

        const updatedPackages = Array
          .from(newPackageNames)
          .filter(packageName => oldPackageNames.has(packageName))
          .filter(packageName => Array.from(changedFiles).map(paths.isSrcGamePackage).includes(packageName))

        const deletedPackages = Array
          .from(oldPackageNames)
          .filter(packageName => !newPackageNames.has(packageName))

        let remaining = createdPackages.length + updatedPackages.length + deletedPackages.length

        if (remaining) {
          createdPackages.forEach(packageName => _package.created(oldState, newState, buildName, gameName, packageName, onError, onPackageDone))
          updatedPackages.forEach(packageName => _package.updated(oldState, newState, buildName, gameName, packageName, onError, onPackageDone))
          deletedPackages.forEach(packageName => _package.deleted(buildName, gameName, packageName, onError, onPackageDone))

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
            (error: any): void => {
              onError(error)
              onDone()
            }, onDone
          )
        }
      }
    })
  }
}

export function deleted(
  buildName: string,
  gameName: string,
  onError: (error: any) => void,
  onDone: () => void): void {
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

function packageNames(
  state: {
    readonly paths: {
      readonly [path: string]: number
    }
  },
  gameName: string
): Set<string> {
  return new Set(
    Object
      .keys(state.paths)
      .filter(path => paths.isSrcGame(path) == gameName)
      .map(paths.isSrcGamePackage)
      .filter((packageName: null | string): packageName is string => !!packageName)
  )
}
