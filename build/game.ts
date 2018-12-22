import * as util from "util"
import * as fs from "fs"
import * as mkdirp from "mkdirp"
import * as rimraf from "rimraf"
import * as types from "./types"
import * as paths from "./paths"
import generateHtml from "./generateHtml"
import * as _package from "./_package"

const fsReadFile = util.promisify(fs.readFile)
const mkdirpPromisified = util.promisify(mkdirp)
const rimrafPromisified = util.promisify(rimraf)

export async function created(
  oldState: types.state,
  newState: types.state,
  buildName: types.buildName,
  gameName: string,
  audioFormats: types.audioFormat[]
): Promise<void> {
  console.log(`Creating "${paths.tempBuildGame(buildName, gameName)}"...`)
  await mkdirpPromisified(paths.tempBuildGame(buildName, gameName))

  console.log(`Creating "${paths.distBuildGame(buildName, gameName)}"...`)
  await mkdirpPromisified(paths.distBuildGame(buildName, gameName))

  await updated(oldState, newState, buildName, gameName, audioFormats)
}

export async function updated(
  oldState: types.state,
  newState: types.state,
  buildName: types.buildName,
  gameName: string,
  audioFormats: types.audioFormat[]
): Promise<void> {
  console.log(`Updating game "${gameName}"...`)

  if (!Object.prototype.hasOwnProperty.call(newState.paths, paths.srcGameMetadata(gameName))) {
    throw new Error(`Game "${gameName}" does not appear to have a "metadata.json" file`)
  } else if (!Object.prototype.hasOwnProperty.call(newState.paths, paths.srcGameIcon(gameName))) {
    throw new Error(`Game "${gameName}" does not appear to have an "icon.svg" file`)
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
    const data = await fsReadFile(paths.srcGameMetadata(gameName), { encoding: `utf8` })
    console.log(`Parsing...`)
    let metadata: {
      name: string
      readonly description: string
      readonly developer: {
        readonly name: string
        readonly url: string
      }
      readonly width: number
      readonly height: number
    } = JSON.parse(data)

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

    for (const packageName of createdPackages) {
      await _package.created(oldState, newState, buildName, gameName, packageName, audioFormats)
    }

    for (const packageName of updatedPackages) {
      await _package.updated(oldState, newState, buildName, gameName, packageName, audioFormats)
    }

    for (const packageName of deletedPackages) {
      await _package.deleted(buildName, gameName, packageName, audioFormats)
    }

    await generateHtml(
      createdOrModifiedFiles,
      buildName,
      gameName,
      metadata
    )
  }
}

export async function deleted(
  buildName: types.buildName,
  gameName: string
): Promise<void> {
  console.log(`Deleting "${paths.tempBuildGame(buildName, gameName)}"...`)
  await rimrafPromisified(paths.tempBuildGame(buildName, gameName))

  console.log(`Deleting "${paths.distBuildGame(buildName, gameName)}"...`)
  await rimrafPromisified(paths.distBuildGame(buildName, gameName))
}

function packageNames(
  state: types.state,
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
