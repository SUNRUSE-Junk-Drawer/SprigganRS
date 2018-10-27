import * as fs from "fs"
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

  if (!Object.prototype.hasOwnProperty.call(newState.paths, metadataPath(gameName))) {
    onError(`Game "${gameName}" does not appear to have a "metadata.json" file`)
    onDone()
  } else if (!Object.prototype.hasOwnProperty.call(newState.paths, iconPath(gameName))) {
    onError(`Game "${gameName}" does not appear to have an "icon.svg" file`)
    onDone()
  } else {
    writeIfNotPresent(
      path.join(tempPath(buildName, gameName), `tsconfig.json`),
      onSuccess => onSuccess(JSON.stringify({
        files: [
          `index.ts`
        ],
        compilerOptions: {
          allowJs: false,
          allowUnreachableCode: false,
          allowUnusedLabels: false,
          noEmitOnError: true,
          noImplicitAny: true,
          strictNullChecks: true,
          noImplicitReturns: true,
          noUnusedLocals: true,
          noFallthroughCasesInSwitch: true,
          noImplicitThis: true,
          outFile: "dist.js",
          target: "es3"
        }
      })), error => {
        onError(error)
        onDone()
      },
      onDone
    )
  }
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

function metadataPath(gameName) {
  return `src/games/${gameName}/metadata.json`
}

function iconPath(gameName) {
  return `src/games/${gameName}/icon.svg`
}

function tempPath(buildName, gameName) {
  return path.join(`temp`, buildName, gameName)
}

function distPath(buildName, gameName) {
  return path.join(`dist`, buildName, gameName)
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
