import * as util from "util"
import * as fs from "fs"
import * as mkdirp from "mkdirp"
import * as rimraf from "rimraf"
import * as types from "./types"
import * as paths from "./paths"
import * as file from "./file"

const fsReadFile = util.promisify(fs.readFile)
const fsWriteFile = util.promisify(fs.writeFile)
const mkdirpPromisified = util.promisify(mkdirp)
const rimrafPromisified = util.promisify(rimraf)

export async function created(
  oldState: types.state,
  newState: types.state,
  buildName: types.buildName,
  gameName: string,
  packageName: string,
  audioFormats: types.audioFormat[]
): Promise<void> {
  await updated(oldState, newState, buildName, gameName, packageName, audioFormats)
}

export async function updated(
  oldState: types.state,
  newState: types.state,
  buildName: types.buildName,
  gameName: string,
  packageName: string,
  audioFormats: types.audioFormat[]
): Promise<void> {
  console.log(`Updating package "${packageName}"...`)

  const oldFileNames = fileNames(oldState, gameName, packageName)
  const newFileNames = fileNames(newState, gameName, packageName)

  const oldLocalizationNames = Object.prototype.hasOwnProperty.call(oldState.games, gameName)
    ? oldState.games[gameName].metadata.localizations.map(localization => localization.name)
    : []
  const newLocalizationNames = newState.games[gameName].metadata.localizations.map(localization => localization.name)

  for (const localizationName of oldLocalizationNames) {
    if (!newLocalizationNames.includes(localizationName)) {
      console.log(`Deleting "${paths.tempBuildGamePackageLocalization(buildName, gameName, packageName, localizationName)}"...`)
      await rimrafPromisified(paths.tempBuildGamePackageLocalization(buildName, gameName, packageName, localizationName))
    }
  }

  for (const localizationName of newLocalizationNames) {
    if (!oldLocalizationNames.includes(localizationName)) {
      console.log(`Creating "${paths.tempBuildGameLocalizationPackage(buildName, gameName, localizationName, packageName)}"...`)
      await mkdirpPromisified(paths.tempBuildGameLocalizationPackage(buildName, gameName, localizationName, packageName))
    }
  }

  const createdFiles = Array
    .from(newFileNames)
    .filter(fileName => !oldFileNames.has(fileName))

  const updatedFiles = Array
    .from(newFileNames)
    .filter(fileName => oldFileNames.has(fileName))
    .filter(fileName => newState.paths[fileName] != oldState.paths[fileName])

  const deletedFiles = Array
    .from(oldFileNames)
    .filter(fileName => !newFileNames.has(fileName))

  for (const fileName of createdFiles) {
    await file.created(buildName, gameName, packageName, paths.extractSrcGamePackageFileName(fileName), paths.isSrcGamePackageFileLocalization(fileName), paths.extractSrcGamePackageFileExtension(fileName), audioFormats)
  }

  for (const fileName of updatedFiles) {
    await file.updated(buildName, gameName, packageName, paths.extractSrcGamePackageFileName(fileName), paths.isSrcGamePackageFileLocalization(fileName), paths.extractSrcGamePackageFileExtension(fileName), audioFormats)
  }

  for (const fileName of deletedFiles) {
    await file.deleted(buildName, gameName, packageName, paths.extractSrcGamePackageFileName(fileName), paths.isSrcGamePackageFileLocalization(fileName), paths.extractSrcGamePackageFileExtension(fileName))
  }

  for (const localization of newState.games[gameName].metadata.localizations) {
    type collectedDirectory = {
      readonly type: `directory`
      readonly children: {
        [name: string]: collected
      }
    }
    type collectedAudio = {
      readonly type: `audio`
      readonly path: string
      readonly code: string
      readonly data: {
        readonly [format in types.audioFormat]: string
      }
    }
    type collectedNonAudio = {
      readonly type: `nonAudio`
      readonly path: string
      readonly code: string
      readonly data: string
    }
    type collected = collectedDirectory | collectedAudio | collectedNonAudio
    const root: collectedDirectory = {
      type: `directory`,
      children: {}
    }

    console.log(`Collecting files in package "${packageName}" for localization "${localization.name}"...`)

    let collected = 0
    for (const fileName of newFileNames) {
      const fileNameLocalization = paths.isSrcGamePackageFileLocalization(fileName)
      if (fileNameLocalization != null && fileNameLocalization != localization.name) {
        continue
      }

      console.log(`Reading package "${packageName}" for localization "${localization.name}"... (${collected++}/${newFileNames.size})`)
      const data = await fsReadFile(
        paths.tempBuildGamePackageFileCache(buildName, gameName, packageName, paths.extractSrcGamePackageFileName(fileName), paths.isSrcGamePackageFileLocalization(fileName), paths.extractSrcGamePackageFileExtension(fileName)),
        { encoding: `utf8` }
      )
      const parsed: {
        [path: string]: {
          readonly type: `audio`
          readonly code: string
          readonly data: {
            readonly [format in types.audioFormat]: string
          }
        } | {
          readonly type: `nonAudio`
          readonly code: string
          readonly data: string
        }
      } = JSON.parse(data)

      for (const key in parsed) {
        const keys = key.split(`/`)
        if (key.endsWith(`/`)) {
          keys.length -= 2
          keys.push(`/`)
        }

        let pointer: collectedDirectory = root
        while (true) {
          if (Object.prototype.hasOwnProperty.call(pointer.children, keys[0])) {
            const newPointer = pointer.children[keys[0]]
            switch (newPointer.type) {
              case `directory`:
                if (keys.length > 1) {
                  pointer = newPointer
                } else {
                  throw new Error(`"${key}" is the name of both a piece of content and an object containing content in package "${packageName}"`)
                }
                break
              case `audio`:
              case `nonAudio`:
                if (keys.length > 1) {
                  throw new Error(`"${key}" is the name of both an object containing content and a piece of content in package "${packageName}"`)
                } else {
                  throw new Error(`"${key}" is the name of two pieces of content in package "${packageName}"`)
                }
            }
          } else {
            if (keys.length > 1) {
              const newDirectory: collectedDirectory = {
                type: `directory`,
                children: {}
              }
              pointer.children[keys[0]] = newDirectory
              pointer = newDirectory
            } else {
              const direct = parsed[key]
              switch (direct.type) {
                case `audio`:
                  pointer.children[keys[0]] = {
                    type: `audio`,
                    path: key,
                    code: direct.code,
                    data: direct.data
                  }
                  break
                case `nonAudio`:
                  pointer.children[keys[0]] = {
                    type: `nonAudio`,
                    path: key,
                    code: direct.code,
                    data: direct.data
                  }
                  break
              }
            }
          }
          keys.shift()
          if (!keys.length) {
            break
          }
        }
      }
    }

    console.log(`Deleting "${paths.tempBuildGameLocalizationPackageCode(buildName, gameName, localization.name, packageName)}"...`)
    await rimrafPromisified(paths.tempBuildGameLocalizationPackageCode(buildName, gameName, localization.name, packageName))
    for (const audioFormat of audioFormats) {
      console.log(`Audio format "${audioFormat}"...`)
      let concatenatedData = ``

      interface recursedDataArray extends Array<recursedData> { }
      type recursedData = [number, number] | {
        readonly [key: string]: recursedData
      } | recursedDataArray

      function recurseFiles(
        pointer: collected,
        indents: number
      ): {
        readonly data: recursedData
        readonly code: string
      } {
        switch (pointer.type) {
          case `directory`:
            const asArray = checkIfArray(pointer.children)
            if (asArray) {
              const mapped = asArray.map(item => recurseFiles(item, indents + 1))
              return {
                data: mapped.map(item => item.data),
                code: `[${mapped.map(item => `\n${`\t`.repeat(indents + 1)}${item.code}`).join(`,`)}\n${`\t`.repeat(indents)}]`
              }
            } else {
              const output: {
                readonly data: {
                  [key: string]: recursedData
                }
                code: string
              } = {
                data: {},
                code: `{`
              }
              let first = true
              for (const key in pointer.children) {
                const value = recurseFiles(pointer.children[key], indents + 1)
                output.data[key] = value.data
                if (first) {
                  first = false
                } else {
                  output.code += `,`
                }
                output.code += `\n${`\t`.repeat(indents + 1)}readonly ${JSON.stringify(key)}: ${value.code}`
              }
              output.code += `\n${`\t`.repeat(indents)}}`
              return output
            }
          case `audio`:
            return handle(pointer.data[audioFormat], pointer.code)
          case `nonAudio`:
            return handle(pointer.data, pointer.code)
        }
        function handle(data: string, code: string): {
          readonly data: recursedData
          readonly code: string
        } {
          const output: {
            readonly data: recursedData
            readonly code: string
          } = {
            data: [concatenatedData.length, data.length],
            code: code
          }
          concatenatedData += data
          return output
        }
      }

      const recursed = recurseFiles(root, 0)

      console.log(`Writing "${paths.distBuildGameLocalizationPackage(buildName, gameName, localization.name, packageName, audioFormat)}"...`)
      await fsWriteFile(
        paths.distBuildGameLocalizationPackage(buildName, gameName, localization.name, packageName, audioFormat),
        `${JSON.stringify(recursed.data)}\n${concatenatedData}`
      )
      console.log(`Writing "${paths.tempBuildGameLocalizationPackageCode(buildName, gameName, localization.name, packageName)}"...`)
      await fsWriteFile(
        paths.tempBuildGameLocalizationPackageCode(buildName, gameName, localization.name, packageName),
        `type ${packageName} = ${recursed.code}`
      )
    }
  }
}

export async function deleted(
  buildName: types.buildName,
  gameName: string,
  localizationNames: ReadonlyArray<string>,
  packageName: string,
  audioFormats: types.audioFormat[]
): Promise<void> {
  for (const localizationName of localizationNames) {
    console.log(`Deleting "${paths.tempBuildGameLocalizationPackage(buildName, gameName, localizationName, packageName)}"...`)
    await rimrafPromisified(paths.tempBuildGameLocalizationPackage(buildName, gameName, localizationName, packageName))

    for (const audioFormat of audioFormats) {
      console.log(`Deleting "${paths.distBuildGameLocalizationPackage(buildName, gameName, packageName, localizationName, audioFormat)}"...`)
      await rimrafPromisified(paths.distBuildGameLocalizationPackage(buildName, gameName, packageName, localizationName, audioFormat))
    }
  }
}

function fileNames(
  state: types.state,
  gameName: string,
  packageName: string
): Set<string> {
  return new Set(
    Object
      .keys(state.paths)
      .filter(path => paths.isSrcGame(path) == gameName)
      .filter(path => paths.isSrcGamePackage(path) == packageName)
      .filter(path => {
        const localizationName = paths.isSrcGamePackageFileLocalization(path)
        return localizationName == null || state.games[gameName].metadata.localizations
          .map(localization => localization.name)
          .includes(localizationName)
      })
  )
}

function checkIfArray<T>(object: { readonly [key: string]: T }): null | T[] {
  const output: T[] = []
  while (true) {
    if (!Object.prototype.hasOwnProperty.call(object, output.length)) {
      break
    }

    output.push(object[output.length])
  }

  if (output.length == Object.keys(object).length) {
    return output
  } else {
    return null
  }
}
