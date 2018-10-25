import * as fs from "fs"
import * as path from "path"
import mkdirp from "mkdirp"
import rimraf from "rimraf"

export default (paths, tempPath, onError, onDone) => {
  const statePath = path.join(tempPath, `state.json`)
  console.log(`Checking for existing build ("${statePath}")...`)

  let state = {
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
          buildLoadedOrDeleted()
        })
      })
    } else {
      console.log(`An existing build was found.`)
      state = JSON.parse(data)
      buildLoadedOrDeleted()
    }
  })

  function buildLoadedOrDeleted() {
    normalizePaths(paths)

    const created = Object
      .keys(paths)
      .filter(path => !Object.prototype.hasOwnProperty.call(state.paths, path))

    console.log(`Created:`)
    created.forEach(path => console.log(`\t${path}`))

    const updated = Object
      .keys(paths)
      .filter(path => Object.prototype.hasOwnProperty.call(state.paths, path))
      .filter(path => paths[path] != state.paths[path])

    console.log(`Updated:`)
    updated.forEach(path => console.log(`\t${path}`))

    const deleted = Object
      .keys(state.paths)
      .filter(path => !Object.prototype.hasOwnProperty.call(paths, path))

    console.log(`Deleted:`)
    deleted.forEach(path => console.log(`\t${path}`))

    findGames(paths)

    state.paths = paths

    console.log(`Writing "${statePath}" to mark build done...`)
    fs.writeFile(statePath, JSON.stringify(state), error => {
      if (error) {
        onError(error)
      }
      onDone()
    })
  }
}

function normalizePaths(paths) {
  Object
    .keys(paths)
    .forEach(path => {
      const modified = paths[path]
      delete paths[path]
      paths[path.replace(/\\/g, `/`)] = modified
    })
}

function findGames(paths) {
  const byMetadata = new Set(
    Object
      .keys(paths)
      .map(path => /^src\/games\/([^\/]+)\/metadata\.json$/i.exec(path))
      .filter(match => match)
      .map(match => match[1])
  )

  const byOthers = new Set(
    Object
      .keys(paths)
      .map(path => /^src\/games\/([^\/]+)\/.*$/i.exec(path))
      .filter(match => match)
      .map(match => match[1])
      .filter(path => !byMetadata.has(path))
  )

  byOthers.forEach(game => console.warn(`Game "${game}" has no metadata.json file.`))

  return byMetadata
}
