import * as util from "util"
import * as fs from "fs"
import * as mkdirp from "mkdirp"
import * as rimraf from "rimraf"
import * as paths from "./paths"
import * as file from "./file"

const fsReadFile = util.promisify(fs.readFile)
const fsWriteFile = util.promisify(fs.writeFile)
const mkdirpPromisified = util.promisify(mkdirp)
const rimrafPromisified = util.promisify(rimraf)

export async function created(
  oldState: {
    readonly paths: {
      readonly [path: string]: number
    }
  },
  newState: {
    readonly paths: {
      readonly [path: string]: number
    }
  },
  buildName: string,
  gameName: string,
  packageName: string
): Promise<void> {
  console.log(`Creating "${paths.tempBuildGamePackage(buildName, gameName, packageName)}"...`)
  await mkdirpPromisified(paths.tempBuildGamePackage(buildName, gameName, packageName))
  await updated(oldState, newState, buildName, gameName, packageName)
}

export async function updated(
  oldState: {
    readonly paths: {
      readonly [path: string]: number
    }
  },
  newState: {
    readonly paths: {
      readonly [path: string]: number
    }
  },
  buildName: string,
  gameName: string,
  packageName: string
): Promise<void> {
  console.log(`Updating package "${packageName}"...`)

  const oldFileNames = fileNames(oldState, gameName, packageName)
  const newFileNames = fileNames(newState, gameName, packageName)

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
    await file.created(oldState, newState, buildName, gameName, packageName, paths.extractSrcGamePackageFileName(fileName), paths.extractSrcGamePackageFileExtension(fileName))
  }

  for (const fileName of updatedFiles) {
    await file.updated(oldState, newState, buildName, gameName, packageName, paths.extractSrcGamePackageFileName(fileName), paths.extractSrcGamePackageFileExtension(fileName))
  }

  for (const fileName of deletedFiles) {
    await file.deleted(buildName, gameName, packageName, paths.extractSrcGamePackageFileName(fileName), paths.extractSrcGamePackageFileExtension(fileName))
  }

  type collectedDirectory = {
    readonly type: `directory`
    readonly children: {
      [name: string]: collected
    }
  }
  type collectedFile = {
    readonly type: `file`
    readonly code: string
    readonly data: [number, number]
  }
  type collected = collectedDirectory | collectedFile
  const root: collectedDirectory = {
    type: `directory`,
    children: {}
  }

  console.log(`Collecting files in package "${packageName}"...`)

  let collected = 0
  let concatenatedData = ``

  for (const fileName of newFileNames) {
    console.log(`Collecting files in package "${packageName}"... (${collected++}/${newFileNames.size})`)
    const data = await fsReadFile(
      paths.tempBuildGamePackageFileCache(buildName, gameName, packageName, paths.extractSrcGamePackageFileName(fileName), paths.extractSrcGamePackageFileExtension(fileName)),
      { encoding: `utf8` }
    )
    const parsed = JSON.parse(data)
    for (const key in parsed) {
      const keys = key.split(`/`)
      if (key.endsWith(`/`)) {
        keys.length -= 2
        keys.push(`/`)
      }

      let pointer: collectedDirectory = root
      while (true) {
        if (Object.prototype.hasOwnProperty.call(pointer, keys[0])) {
          const newPointer = pointer.children[keys[0]]
          switch (newPointer.type) {
            case `directory`:
              if (keys.length > 1) {
                pointer = newPointer
              } else {
                throw new Error(`"${key}" is the name of both a piece of content and an object containing content in package "${packageName}"`)
              }
              break
            case `file`:
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
            pointer.children[keys[0]] = {
              type: `file`,
              code: parsed[key].code,
              data: [concatenatedData.length, parsed[key].data.length]
            }
            concatenatedData += parsed[key].data
          }
        }
        keys.shift()
        if (!keys.length) {
          break
        }
      }
    }
  }

  console.log(`Deleting "${paths.tempBuildGamePackageCode(buildName, gameName, packageName)}"...`)
  await rimrafPromisified(paths.tempBuildGamePackageCode(buildName, gameName, packageName))
  console.log(`Writing "${paths.distBuildGamePackage(buildName, gameName, packageName)}"...`)
  interface recursedDataArray extends Array<recursedData> { }
  type recursedData = string | {
    readonly [key: string]: recursedData
  } | recursedDataArray
  function recurseData(
    pointer: collected
  ): recursedData {
    switch (pointer.type) {
      case `file`:
        return pointer.code
      case `directory`:
        const asArray = checkIfArray(pointer.children)
        if (asArray) {
          return asArray.map(recurseData)
        } else {
          const output: { [key: string]: recursedData } = {}
          for (const key in pointer.children) {
            output[key] = recurseData(pointer.children[key])
          }
          return output
        }
    }
  }
  await fsWriteFile(
    paths.distBuildGamePackage(buildName, gameName, packageName),
    `${JSON.stringify(recurseData(root))}\n${concatenatedData}`
  )
  console.log(`Writing "${paths.tempBuildGamePackageCode(buildName, gameName, packageName)}"...`)
  function recurseCode(
    pointer: collected,
    indents: number
  ): string {
    switch (pointer.type) {
      case `file`:
        return pointer.code
      case `directory`:
        const asArray = checkIfArray(pointer)
        if (asArray) {
          let output = `[`
          let first = true
          for (const key in pointer.children) {
            if (first) {
              first = false
            } else {
              output += `,`
            }
            output += `\n${`\t`.repeat(indents + 1)}${recurseCode(pointer.children[key], indents + 1)}`
          }
          output += `\n${`\t`.repeat(indents)}]`
          return output
        } else {
          let output = `{`
          let first = true
          for (const key in pointer.children) {
            if (first) {
              first = false
            } else {
              output += `,`
            }
            output += `\n${`\t`.repeat(indents + 1)}readonly ${JSON.stringify(key)}: ${recurseCode(pointer.children[key], indents + 1)}`
          }
          output += `\n${`\t`.repeat(indents)}}`
          return output
        }
    }
  }

  await fsWriteFile(
    paths.tempBuildGamePackageCode(buildName, gameName, packageName),
    `type ${packageName} = ${recurseCode(root, 0)}`
  )
}

export async function deleted(
  buildName: string,
  gameName: string,
  packageName: string
): Promise<void> {
  console.log(`Deleting "${paths.tempBuildGamePackage(buildName, gameName, packageName)}"...`)
  await rimrafPromisified(paths.tempBuildGamePackage(buildName, gameName, packageName))

  console.log(`Deleting "${paths.distBuildGamePackage(buildName, gameName, packageName)}"...`)
  await rimrafPromisified(paths.distBuildGamePackage(buildName, gameName, packageName))
}

function fileNames(
  state: {
    readonly paths: {
      readonly [path: string]: number
    }
  },
  gameName: string,
  packageName: string
): Set<string> {
  return new Set(
    Object
      .keys(state.paths)
      .filter(path => paths.isSrcGame(path) == gameName)
      .filter(path => paths.isSrcGamePackage(path) == packageName)
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
