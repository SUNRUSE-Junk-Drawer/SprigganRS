import * as util from "util"
import * as fs from "fs"
import * as mkdirp from "mkdirp"
import * as rimraf from "rimraf"
import * as types from "./types"
import * as paths from "./paths"
import svg from "./svg"
import wav from "./wav"

const fsWriteFile = util.promisify(fs.writeFile)
const mkdirpPromisified = util.promisify(mkdirp)
const rimrafPromisified = util.promisify(rimraf)

const extensions: {
  readonly [extension: string]: (
    buildName: types.buildName,
    gameName: string,
    packageName: string,
    fileName: string,
    fileLocalization: null | string,
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
} = { svg, wav }

export async function created(
  buildName: types.buildName,
  gameName: string,
  packageName: string,
  fileName: string,
  fileLocalization: null | string,
  fileExtension: string,
  audioFormats: types.audioFormat[]
): Promise<void> {
  await performCreation(buildName, gameName, packageName, fileName, fileLocalization, fileExtension, audioFormats)
}

export async function updated(
  buildName: types.buildName,
  gameName: string,
  packageName: string,
  fileName: string,
  fileLocalization: null | string,
  fileExtension: string,
  audioFormats: types.audioFormat[]
): Promise<void> {
  await performDeletion(buildName, gameName, packageName, fileName, fileLocalization, fileExtension)
  await performCreation(buildName, gameName, packageName, fileName, fileLocalization, fileExtension, audioFormats)
}

export async function deleted(
  buildName: types.buildName,
  gameName: string,
  packageName: string,
  fileName: string,
  fileLocalization: null | string,
  fileExtension: string
): Promise<void> {
  await performDeletion(buildName, gameName, packageName, fileName, fileLocalization, fileExtension)
}

async function performDeletion(
  buildName: types.buildName,
  gameName: string,
  packageName: string,
  fileName: string,
  fileLocalization: null | string,
  fileExtension: string
): Promise<void> {
  console.log(`Deleting "${paths.tempBuildGamePackageFile(buildName, gameName, packageName, fileName, fileLocalization, fileExtension)}"...`)
  await rimrafPromisified(paths.tempBuildGamePackageFile(buildName, gameName, packageName, fileName, fileLocalization, fileExtension))
}

async function performCreation(
  buildName: types.buildName,
  gameName: string,
  packageName: string,
  fileName: string,
  fileLocalization: null | string,
  fileExtension: string,
  audioFormats: types.audioFormat[]
): Promise<void> {
  console.log(`Creating "${paths.tempBuildGamePackageFile(buildName, gameName, packageName, fileName, fileLocalization, fileExtension)}"...`)
  await mkdirpPromisified(paths.tempBuildGamePackageFile(buildName, gameName, packageName, fileName, fileLocalization, fileExtension))
  if (Object.prototype.hasOwnProperty.call(extensions, fileExtension)) {
    const generated = await extensions[fileExtension](buildName, gameName, packageName, fileName, fileLocalization, audioFormats)
    console.log(`Writing "${paths.tempBuildGamePackageFileCache(buildName, gameName, packageName, fileName, fileLocalization, fileExtension)}"...`)
    await fsWriteFile(
      paths.tempBuildGamePackageFileCache(buildName, gameName, packageName, fileName, fileLocalization, fileExtension),
      JSON.stringify(generated)
    )
  } else {
    console.warn(`Unknown file extension "${fileExtension}" for "${paths.srcGamePackageFile(gameName, packageName, fileName, fileLocalization, fileExtension)}".`)
    await fsWriteFile(
      paths.tempBuildGamePackageFileCache(buildName, gameName, packageName, fileName, fileLocalization, fileExtension),
      JSON.stringify({})
    )
  }
}
