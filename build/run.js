import * as fs from "fs"
import mkdirp from "mkdirp"
import rimraf from "rimraf"
import * as paths from "./paths"
import * as game from "./game"

const stateVersion = 6

export default (allPaths, buildName, onError, onDone) => {
  console.log(`Checking for existing build ("${paths.tempBuildState(buildName)}")...`)

  let oldState = {
    version: stateVersion,
    paths: {},
    games: {}
  }

  fs.readFile(paths.tempBuildState(buildName), { encoding: `utf8` }, (error, data) => {
    if (error && error.code != `ENOENT`) {
      onError(error)
      onDone()
      return
    }

    if (error) {
      console.log(`There is no existing build, or it was interrupted`)
      eraseExistingBuild()
    } else {
      console.log(`An existing build was found.  Deleting the state file to mark the build as started...`)
      fs.unlink(paths.tempBuildState(buildName), err => {
        if (err) {
          onError(err)
          onDone()
          return
        }

        const state = JSON.parse(data)
        if (state.version == stateVersion) {
          console.log(`Its version matches.`)
          oldState = state
          buildLoadedOrDeleted()
        } else {
          console.log(`Its version does not match.`)
          eraseExistingBuild()
        }
      })
    }

    function eraseExistingBuild() {
      console.log(`Erasing the "${paths.tempBuild(buildName)}" directory if it exists...`)
      rimraf(paths.tempBuild(buildName), error => {
        if (error) {
          onError(error)
          onDone()
          return
        }
        console.log(`Recreating...`)
        mkdirp(paths.tempBuild(buildName), error => {
          if (error) {
            onError(error)
            onDone()
            return
          }
          console.log(`Checking for a "${paths.distBuild(buildName)}" directory...`)
          fs.readdir(paths.distBuild(buildName), (error, files) => {
            if (error && error.code != `ENOENT`) {
              onError(error)
              onDone()
              return
            } else if (error) {
              console.log(`It does not exist.`)
              buildLoadedOrDeleted()
            } else if (!files.length) {
              console.log(`It exists, but is empty; ignoring.`)
              buildLoadedOrDeleted()
            } else {
              console.log(`It exists, and is not empty; deleting contents...`)
              let remaining = files.length
              files.forEach(file => rimraf(paths.join(paths.distBuild(buildName), file), () => {
                remaining--
                if (!remaining) {
                  buildLoadedOrDeleted()
                }
              }))
            }
          })
        })
      })
    }
  })

  function buildLoadedOrDeleted() {
    Object
      .keys(allPaths)
      .forEach(path => {
        const modified = allPaths[path]
        delete allPaths[path]
        allPaths[paths.join(path)] = modified
      })

    const newState = JSON.parse(JSON.stringify(oldState))
    newState.version = stateVersion
    newState.paths = allPaths

    const oldGameNames = gameNames(oldState)
    const newGameNames = gameNames(newState)

    let remaining = new Set([...oldGameNames, ...newGameNames]).size

    if (remaining) {
      Array
        .from(newGameNames)
        .filter(gameName => !oldGameNames.has(gameName))
        .forEach(gameName => game.created(oldState, newState, buildName, gameName, onError, onGameDone))

      Array
        .from(newGameNames)
        .filter(gameName => oldGameNames.has(gameName))
        .forEach(gameName => game.updated(oldState, newState, buildName, gameName, onError, onGameDone))

      Array
        .from(oldGameNames)
        .filter(gameName => !newGameNames.has(gameName))
        .forEach(gameName => game.deleted(buildName, gameName, onError, onGameDone))

      function onGameDone() {
        remaining--
        if (!remaining) {
          onAllGamesDone()
        }
      }
    } else {
      onAllGamesDone()
    }

    function onAllGamesDone() {
      console.log(`Writing "${paths.tempBuildState(buildName)}" to mark build done...`)
      fs.writeFile(paths.tempBuildState(buildName), JSON.stringify(newState), error => {
        if (error) {
          onError(error)
        }
        onDone()
      })
    }
  }
}

function gameNames(state) {
  return new Set(
    Object
      .keys(state.paths)
      .map(path => /^src\/games\/([^\/]+)\/.*$/i.exec(path))
      .filter(match => match)
      .map(match => match[1])
  )
}
