import * as util from "util"
import * as fs from "fs"
import * as mkdirp from "mkdirp"
import * as rimraf from "rimraf"
import * as types from "./types"
import * as paths from "./paths"
import svg from "./svg"

const fsWriteFile = util.promisify(fs.writeFile)
const mkdirpPromisified = util.promisify(mkdirp)
const rimrafPromisified = util.promisify(rimraf)

const extensions: {
  readonly [extension: string]: (
    oldState: types.state,
    newState: types.state,
    buildName: types.buildName,
    gameName: string,
    packageName: string,
    fileName: string
  ) => Promise<{
    [path: string]: {
      readonly code: string
      readonly data: string
    }
  }>
} = {
  svg
}

export async function created(
  oldState: types.state,
  newState: types.state,
  buildName: types.buildName,
  gameName: string,
  packageName: string,
  fileName: string,
  fileExtension: string
): Promise<void> {
  await performCreation(oldState, newState, buildName, gameName, packageName, fileName, fileExtension)
}

export async function updated(
  oldState: types.state,
  newState: types.state,
  buildName: types.buildName,
  gameName: string,
  packageName: string,
  fileName: string,
  fileExtension: string
): Promise<void> {
  await performDeletion(buildName, gameName, packageName, fileName, fileExtension)
  await performCreation(oldState, newState, buildName, gameName, packageName, fileName, fileExtension)
}

export async function deleted(
  buildName: types.buildName,
  gameName: string,
  packageName: string,
  fileName: string,
  fileExtension: string
): Promise<void> {
  await performDeletion(buildName, gameName, packageName, fileName, fileExtension)
}

async function performDeletion(
  buildName: types.buildName,
  gameName: string,
  packageName: string,
  fileName: string,
  fileExtension: string
): Promise<void> {
  console.log(`Deleting "${paths.tempBuildGamePackageFile(buildName, gameName, packageName, fileName, fileExtension)}"...`)
  await rimrafPromisified(paths.tempBuildGamePackageFile(buildName, gameName, packageName, fileName, fileExtension))
}

async function performCreation(
  oldState: types.state,
  newState: types.state,
  buildName: types.buildName,
  gameName: string,
  packageName: string,
  fileName: string,
  fileExtension: string
): Promise<void> {
  console.log(`Creating "${paths.tempBuildGamePackageFile(buildName, gameName, packageName, fileName, fileExtension)}"...`)
  await mkdirpPromisified(paths.tempBuildGamePackageFile(buildName, gameName, packageName, fileName, fileExtension))
  if (Object.prototype.hasOwnProperty.call(extensions, fileExtension)) {
    const generated = await extensions[fileExtension](oldState, newState, buildName, gameName, packageName, fileName)
    console.log(`Writing "${paths.tempBuildGamePackageFileCache(buildName, gameName, packageName, fileName, fileExtension)}"...`)
    await fsWriteFile(
      paths.tempBuildGamePackageFileCache(buildName, gameName, packageName, fileName, fileExtension),
      JSON.stringify(generated)
    )
  } else {
    console.warn(`Unknown file extension "${fileExtension}" for "${paths.srcGamePackageFile(gameName, packageName, fileName, fileExtension)}".`)
    await fsWriteFile(
      paths.tempBuildGamePackageFileCache(buildName, gameName, packageName, fileName, fileExtension),
      JSON.stringify({})
    )
  }
}
