import * as fs from "fs"
import mkdirp from "mkdirp"
import rimraf from "rimraf"
import * as paths from "./paths"
import * as file from "./file"

export function created(oldState, newState, buildName, gameName, packageName, onError, onDone) {
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

export function updated(oldState, newState, buildName, gameName, packageName, onError, onDone) {
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

    const allCode = {}
    const allData = {}

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
            onColected()
          } else {
            const parsed = JSON.parse(data)
            for (const key in parsed) {
              const keys = key.split(`/`)
              if (key.endsWith(`/`)) {
                keys.length -= 2
                keys.push(`/`)
              }
              let codePointer = allCode
              let dataPointer = allData
              while (true) {
                if (Object.prototype.hasOwnProperty.call(codePointer, keys[0])) {
                  let failed = false
                  switch (typeof codePointer[keys[0]]) {
                    case `object`:
                      if (keys.length > 1) {
                        codePointer = codePointer[keys[0]]
                        dataPointer = dataPointer[keys[0]]
                      } else {
                        onError(`"${key}" is the name of both a piece of content and an object containing content in package "${packageName}"`)
                      }
                      break
                    case `string`:
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
                    codePointer = codePointer[keys[0]] = {}
                    dataPointer = dataPointer[keys[0]] = {}
                  } else {
                    codePointer[keys[0]] = parsed[key].code
                    dataPointer[keys[0]] = [concatenatedData.length, parsed[key].data.length]
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
              fs.writeFile(
                paths.distBuildGamePackage(buildName, gameName, packageName),
                `${JSON.stringify(allData)}\n${concatenatedData}`,
                err => {
                  if (err) {
                    onError(err)
                    onDone()
                  } else {
                    console.log(`Writing "${paths.tempBuildGamePackageCode(buildName, gameName, packageName)}"...`)
                    function recurseCode(codePointer, indents) {
                      switch (typeof codePointer) {
                        case `string`:
                          return codePointer
                        case `object`:
                          const asArray = checkIfArray(codePointer)
                          if (asArray) {
                            let output = `[`
                            let first = true
                            for (const key in codePointer) {
                              if (first) {
                                first = false
                              } else {
                                output += `,`
                              }
                              output += `\n${`\t`.repeat(indents + 1)}${recurseCode(codePointer[key], indents + 1)}`
                            }
                            output += `\n${`\t`.repeat(indents)}]`
                            return output
                          } else {
                            let output = `{`
                            let first = true
                            for (const key in codePointer) {
                              if (first) {
                                first = false
                              } else {
                                output += `,`
                              }
                              output += `\n${`\t`.repeat(indents + 1)}readonly ${JSON.stringify(key)}: ${recurseCode(codePointer[key], indents + 1)}`
                            }
                            output += `\n${`\t`.repeat(indents)}}`
                            return output
                          }
                      }
                    }

                    fs.writeFile(
                      paths.tempBuildGamePackageCode(buildName, gameName, packageName),
                      `type ${packageName} = ${recurseCode(allCode)}`,
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

export function deleted(buildName, gameName, packageName, onError, onDone) {
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

function fileNames(state, gameName, packageName) {
  return new Set(
    Object
      .keys(state.paths)
      .filter(path => paths.isSrcGame(path) == gameName)
      .filter(path => paths.isSrcGamePackage(path) == packageName)
  )
}

function checkIfArray(object) {
  const output = []
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
