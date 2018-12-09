import * as fs from "fs"
import * as mkdirp from "mkdirp"
import * as rimraf from "rimraf"
import * as paths from "./paths"
import * as file from "./file"

export function created(
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
  packageName: string,
  onError: (error: any) => void,
  onDone: () => void
): void {
  console.log(`Creating "${paths.tempBuildGamePackage(buildName, gameName, packageName)}"...`)
  mkdirp(paths.tempBuildGamePackage(buildName, gameName, packageName), err => {
    if (err) {
      onError(err)
      onDone()
      return
    }
    updated(oldState, newState, buildName, gameName, packageName, onError, onDone)
  })
}

export function updated(
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
  packageName: string,
  onError: (error: any) => void,
  onDone: () => void
): void {
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

  createdFiles.forEach(fileName => file.created(oldState, newState, buildName, gameName, packageName, paths.extractSrcGamePackageFileName(fileName), paths.extractSrcGamePackageFileExtension(fileName), onError, onFileDone))
  updatedFiles.forEach(fileName => file.updated(oldState, newState, buildName, gameName, packageName, paths.extractSrcGamePackageFileName(fileName), paths.extractSrcGamePackageFileExtension(fileName), onError, onFileDone))
  deletedFiles.forEach(fileName => file.deleted(buildName, gameName, packageName, paths.extractSrcGamePackageFileName(fileName), paths.extractSrcGamePackageFileExtension(fileName), onError, onFileDone))
  let remaining = createdFiles.length + updatedFiles.length + deletedFiles.length

  function onFileDone() {
    remaining--

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

    if (!remaining) {
      console.log(`Collecting files in package "${packageName}"...`)

      let collected = 0
      let concatenatedData = ``

      newFileNames.forEach(fileName => fs.readFile(
        paths.tempBuildGamePackageFileCache(buildName, gameName, packageName, paths.extractSrcGamePackageFileName(fileName), paths.extractSrcGamePackageFileExtension(fileName)),
        { encoding: `utf8` },
        (err, data) => {
          if (err) {
            onError(err)
            onCollected()
          } else {
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
                  let failed = false
                  const newPointer = pointer.children[keys[0]]
                  switch (newPointer.type) {
                    case `directory`:
                      if (keys.length > 1) {
                        pointer = newPointer
                      } else {
                        onError(`"${key}" is the name of both a piece of content and an object containing content in package "${packageName}"`)
                      }
                      break
                    case `file`:
                      if (keys.length > 1) {
                        onError(`"${key}" is the name of both an object containing content and a piece of content in package "${packageName}"`)
                        failed = true
                      } else {
                        onError(`"${key}" is the name of two pieces of content in package "${packageName}"`)
                      }
                      break
                  }
                  if (failed) {
                    break
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
            onCollected()
          }
        }
      ))

      function onCollected() {
        collected++

        if (collected < newFileNames.size) {
          console.log(`Collecting files in package "${packageName}"... (${collected}/${newFileNames.size})`)
        } else {
          console.log(`Deleting "${paths.tempBuildGamePackageCode(buildName, gameName, packageName)}"...`)
          rimraf(paths.tempBuildGamePackageCode(buildName, gameName, packageName), err => {
            if (err) {
              onError(err)
              onDone()
            } else {
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
              fs.writeFile(
                paths.distBuildGamePackage(buildName, gameName, packageName),
                `${JSON.stringify(recurseData(root))}\n${concatenatedData}`,
                err => {
                  if (err) {
                    onError(err)
                    onDone()
                  } else {
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

                    fs.writeFile(
                      paths.tempBuildGamePackageCode(buildName, gameName, packageName),
                      `type ${packageName} = ${recurseCode(root, 0)}`,
                      err => {
                        if (err) {
                          onError(err)
                          onDone()
                        } else {
                          onDone()
                        }
                      }
                    )
                  }
                }
              )
            }
          })
        }
      }
    }
  }
}

export function deleted(
  buildName: string,
  gameName: string,
  packageName: string,
  onError: (error: any) => void,
  onDone: () => void
): void {
  console.log(`Deleting "${paths.tempBuildGamePackage(buildName, gameName, packageName)}"...`)
  rimraf(paths.tempBuildGamePackage(buildName, gameName, packageName), error => {
    if (error) {
      onError(error)
      onDone()
      return
    }
    console.log(`Deleting "${paths.distBuildGamePackage(buildName, gameName, packageName)}"...`)
    rimraf(paths.distBuildGamePackage(buildName, gameName, packageName), error => {
      if (error) {
        onError(error)
        onDone()
        return
      }
      onDone()
    })
  })
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
