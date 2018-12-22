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
    fileName: string,
    audioFormats: types.audioFormat[]
  ) => Promise<{
    [path: string]: {
      readonly type: `audio`
      readonly code: string
      readonly data: {
        readonly [format: string]: string
      }
    } | {
      readonly type: `nonAudio`
      readonly code: string
      readonly data: string
    }
  }>
} = { svg }

export async function created(
  oldState: types.state,
  newState: types.state,
  buildName: types.buildName,
  gameName: string,
  packageName: string,
  fileName: string,
  fileExtension: string,
  audioFormats: types.audioFormat[]
): Promise<void> {
  await performCreation(oldState, newState, buildName, gameName, packageName, fileName, fileExtension, audioFormats)
}

export async function updated(
  oldState: types.state,
  newState: types.state,
  buildName: types.buildName,
  gameName: string,
  packageName: string,
  fileName: string,
  fileExtension: string,
  audioFormats: types.audioFormat[]
): Promise<void> {
  await performDeletion(buildName, gameName, packageName, fileName, fileExtension)
  await performCreation(oldState, newState, buildName, gameName, packageName, fileName, fileExtension, audioFormats)
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
  fileExtension: string,
  audioFormats: types.audioFormat[]
): Promise<void> {
  console.log(`Creating "${paths.tempBuildGamePackageFile(buildName, gameName, packageName, fileName, fileExtension)}"...`)
  await mkdirpPromisified(paths.tempBuildGamePackageFile(buildName, gameName, packageName, fileName, fileExtension))
  if (Object.prototype.hasOwnProperty.call(extensions, fileExtension)) {
    const generated = await extensions[fileExtension](oldState, newState, buildName, gameName, packageName, fileName, audioFormats)
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
