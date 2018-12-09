import * as fs from "fs"
import * as mkdirp from "mkdirp"
import * as rimraf from "rimraf"
import * as paths from "./paths"
import svg from "./svg"

const extensions: {
  readonly [extension: string]: (
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
    packageName: string,
    fileName: string,
    onError: (error: any) => void,
    onSuccess: (generated: {
      [path: string]: {
        readonly code: string
        readonly data: string
      }
    }) => void
  ) => void
} = {
  svg
}

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
  packageName: string,
  fileName: string,
  fileExtension: string,
  onError: (error: any) => void,
  onDone: () => void
): void {
  performCreation(oldState, newState, buildName, gameName, packageName, fileName, fileExtension, error => {
    onError(error)
    onDone()
  }, onDone)
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
  packageName: string,
  fileName: string,
  fileExtension: string,
  onError: (error: any) => void,
  onDone: () => void
): void {
  performDeletion(buildName, gameName, packageName, fileName, fileExtension, error => {
    onError(error)
    onDone()
  }, () => performCreation(oldState, newState, buildName, gameName, packageName, fileName, fileExtension, error => {
    onError(error)
    onDone()
  }, onDone))
}

export function deleted(
  buildName: string,
  gameName: string,
  packageName: string,
  fileName: string,
  fileExtension: string,
  onError: (error: any) => void,
  onDone: () => void
): void {
  performDeletion(buildName, gameName, packageName, fileName, fileExtension, error => {
    onError(error)
    onDone()
  }, onDone)
}

function performDeletion(
  buildName: string,
  gameName: string,
  packageName: string,
  fileName: string,
  fileExtension: string,
  onError: (error: any) => void,
  onSuccess: () => void
): void {
  console.log(`Deleting "${paths.tempBuildGamePackageFile(buildName, gameName, packageName, fileName, fileExtension)}"...`)
  rimraf(paths.tempBuildGamePackageFile(buildName, gameName, packageName, fileName, fileExtension), error => {
    if (error) {
      onError(error)
    } else {
      onSuccess()
    }
  })
}

function performCreation(
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
  packageName: string,
  fileName: string,
  fileExtension: string,
  onError: (error: any) => void,
  onSuccess: () => void
): void {
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
                onSuccess()
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
