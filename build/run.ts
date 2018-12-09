import * as util from "util"
import * as fs from "fs"
import * as mkdirp from "mkdirp"
import * as rimraf from "rimraf"
import * as paths from "./paths"
import * as game from "./game"

const fsReadFile = util.promisify(fs.readFile)
const fsWriteFile = util.promisify(fs.writeFile)
const fsUnlink = util.promisify(fs.unlink)
const fsReaddir = util.promisify(fs.readdir)
const mkdirpPromisified = util.promisify(mkdirp)
const rimrafPromisified = util.promisify(rimraf)

const stateVersion = 8

export default async (
  allPaths: { [path: string]: number },
  buildName: string
): Promise<void> => {
  console.log(`Checking for existing build ("${paths.tempBuildState(buildName)}")...`)

  let oldState = {
    version: stateVersion,
    paths: {}
  }

  let data: string
  try {
    data = await fsReadFile(paths.tempBuildState(buildName), { encoding: `utf8` })
  } catch (e) {
    if (e.code != `ENOENT`) {
      throw e
    }
    console.log(`There is no existing build, or it was interrupted`)
    await eraseExistingBuild()
    return
  }
  console.log(`An existing build was found.  Deleting the state file to mark the build as started...`)
  await fsUnlink(paths.tempBuildState(buildName))
  const state = JSON.parse(data)
  if (state.version == stateVersion) {
    console.log(`Its version matches.`)
    oldState = state
    await buildLoadedOrDeleted()
  } else {
    console.log(`Its version does not match.`)
    await eraseExistingBuild()
  }

  async function eraseExistingBuild(): Promise<void> {
    console.log(`Erasing the "${paths.tempBuild(buildName)}" directory if it exists...`)
    await rimrafPromisified(paths.tempBuild(buildName))

    console.log(`Recreating...`)
    await mkdirpPromisified(paths.tempBuild(buildName))

    console.log(`Checking for a "${paths.distBuild(buildName)}" directory...`)
    let files: null | string[] = null
    try {
      files = await fsReaddir(paths.distBuild(buildName))
    } catch (e) {
      if (e.code != `ENOENT`) {
        throw e
      }
      console.log(`It does not exist.`)
      await buildLoadedOrDeleted()
      return
    }

    if (!files.length) {
      console.log(`It exists, but is empty; ignoring.`)
      await buildLoadedOrDeleted()
    } else {
      console.log(`It exists, and is not empty; deleting contents...`)
      for (const file of files) {
        await rimrafPromisified(paths.join(paths.distBuild(buildName), file))
      }
      await buildLoadedOrDeleted()
    }
  }

  async function buildLoadedOrDeleted(): Promise<void> {
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

    for (const gameName of Array
      .from(newGameNames)
      .filter(gameName => !oldGameNames.has(gameName))) {
      await game.created(oldState, newState, buildName, gameName)
    }

    for (const gameName of Array
      .from(newGameNames)
      .filter(gameName => oldGameNames.has(gameName))) {
      await game.updated(oldState, newState, buildName, gameName)
    }

    for (const gameName of Array
      .from(oldGameNames)
      .filter(gameName => !newGameNames.has(gameName))) {
      await game.deleted(buildName, gameName)
    }

    console.log(`Writing "${paths.tempBuildState(buildName)}" to mark build done...`)
    await fsWriteFile(paths.tempBuildState(buildName), JSON.stringify(newState))
  }
}

function gameNames(state: {
  readonly paths: {
    readonly [path: string]: number
  }
}): Set<string> {
  return new Set<string>(
    Object
      .keys(state.paths)
      .map(paths.isSrcGame)
      .filter((match: null | string): match is string => !!match)
  )
}
