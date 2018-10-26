import * as fs from "fs"
import * as path from "path"
import mkdirp from "mkdirp"
import rimraf from "rimraf"
import * as game from "./game"

export default (paths, buildName, onError, onDone) => {
  const tempPath = path.join(`temp`, buildName)
  const distPath = path.join(`dist`, buildName)
  const statePath = path.join(tempPath, `state.json`)
  console.log(`Checking for existing build ("${statePath}")...`)

  let oldState = {
    paths: {}
  }

  fs.readFile(statePath, { encoding: `utf8` }, (error, data) => {
    if (error && error.code != `ENOENT`) {
      onError(error)
      onDone()
      return
    }

    if (error) {
      console.log(`There is no existing build, or it was interrupted; erasing the "${tempPath}" directory if it exists...`)
      rimraf(tempPath, error => {
        if (error) {
          onError(error)
          onDone()
          return
        }
        console.log(`Recreating...`)
        mkdirp(tempPath, error => {
          if (error) {
            onError(error)
            onDone()
            return
          }
          console.log(`Checking for a "${distPath}" directory...`)
          fs.readdir(distPath, (error, files) => {
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
              files.forEach(file => rimraf(path.join(distPath, file), () => {
                remaining--
                if (!remaining) {
                  buildLoadedOrDeleted()
                }
              }))
            }
          })
        })
      })
    } else {
      console.log(`An existing build was found.`)
      oldState = JSON.parse(data)
      buildLoadedOrDeleted()
    }
  })

  function buildLoadedOrDeleted() {
    Object
      .keys(paths)
      .forEach(path => {
        const modified = paths[path]
        delete paths[path]
        paths[path.replace(/\\/g, `/`)] = modified
      })

    const newState = JSON.parse(JSON.stringify(oldState))
    newState.paths = paths

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
      console.log(`Writing "${statePath}" to mark build done...`)
      fs.writeFile(statePath, JSON.stringify(newState), error => {
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
