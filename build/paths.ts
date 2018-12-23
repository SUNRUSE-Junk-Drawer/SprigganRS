import * as types from "./types"

export const join = (...fragments: string[]): string => fragments
  .map(fragment => fragment.split(`/`))
  .reduce((a, b) => a.concat(b))
  .map(fragment => fragment.split(`\\`))
  .reduce((a, b) => a.concat(b))
  .filter(fragment => fragment)
  .join(`/`)

const is = (regex: RegExp, path: string): null | string => {
  const match = regex.exec(path)
  if (match) {
    return match[1]
  } else {
    return null
  }
}

const extract = (regex: RegExp, path: string): string => {
  const extracted = is(regex, path)
  if (!extracted) {
    throw new Error(`Expected "${path}" to match "${regex}", but it did not.`)
  }
  return extracted
}

export const src = `src`
export const temp = `temp`
export const dist = `dist`
export const srcGame = (gameName: string): string => join(src, `games`, gameName)
export const isSrcGame = (path: string): null | string => is(/^src\/games\/([^\/\.]+)\/.+$/i, path)
export const srcGameFile = (gameName: string, fileName: string): string => join(srcGame(gameName), fileName)
export const srcGameMetadata = (gameName: string): string => srcGameFile(gameName, `metadata.json`)
export const srcGameIcon = (gameName: string): string => srcGameFile(gameName, `icon.svg`)
export const srcGameLocalization = (gameName: string, localizationName: string): string => join(srcGame(gameName), `localizations`, localizationName)
export const srcGameLocalizationFile = (gameName: string, localizationName: string, file: string): string => join(srcGameLocalization(gameName, localizationName), file)
export const srcGameLocalizationIcon = (gameName: string, localizationName: string): string => srcGameLocalizationFile(gameName, localizationName, `icon.svg`)
export const srcGameLocalizationFlag = (gameName: string, localizationName: string): string => srcGameLocalizationFile(gameName, localizationName, `flag.svg`)
export const srcGamePackageFile = (gameName: string, packageName: string, fileName: string, fileExtension: string): string => join(srcGame(gameName), `packages`, packageName, `${fileName}.${fileExtension}`)
export const isSrcGamePackage = (path: string): null | string => is(/^src\/games\/[^\/\.]+\/packages\/([^\/\.]+)\/[^\/\.]+\.[^\/\.]+$/i, path)
export const extractSrcGamePackageFileName = (path: string): string => extract(/^src\/games\/[^\/\.]+\/packages\/[^\/\.]+\/([^\/\.]+)\.[^\/\.]+$/i, path)
export const extractSrcGamePackageFileExtension = (path: string): string => extract(/^src\/games\/[^\/\.]+\/packages\/[^\/\.]+\/[^\/\.]+\.([^\/\.]+)$/i, path)
export const tempBuild = (buildName: types.buildName): string => join(temp, buildName)
export const tempBuildState = (buildName: types.buildName): string => join(tempBuild(buildName), `state.json`)
export const tempBuildGame = (buildName: types.buildName, gameName: string): string => join(tempBuild(buildName), `games`, gameName)
export const tempBuildGamePackage = (buildName: types.buildName, gameName: string, packageName: string): string => join(tempBuildGame(buildName, gameName), `packages`, packageName)
export const tempBuildGamePackageCode = (buildName: types.buildName, gameName: string, packageName: string): string => join(tempBuildGamePackage(buildName, gameName, packageName), `code.ts`)
export const tempBuildGamePackageFile = (buildName: types.buildName, gameName: string, packageName: string, fileName: string, fileExtension: string): string => join(tempBuildGame(buildName, gameName), `packages`, packageName, `files`, `${fileName}.${fileExtension}`)
export const tempBuildGamePackageFileCache = (buildName: types.buildName, gameName: string, packageName: string, fileName: string, fileExtension: string): string => join(tempBuildGamePackageFile(buildName, gameName, packageName, fileName, fileExtension), `cache.json`)
export const distBuild = (buildName: types.buildName): string => join(dist, buildName)
export const distBuildGame = (buildName: types.buildName, gameName: string): string => join(distBuild(buildName), gameName)
export const distBuildGameLocalization = (buildName: types.buildName, gameName: string, localizationName: string): string => join(distBuildGame(buildName, gameName), localizationName)
export const distBuildGameLocalizationFile = (buildName: types.buildName, gameName: string, localizationName: string, fileName: string): string => join(distBuildGameLocalization(buildName, gameName, localizationName), fileName)
export const distBuildGameLocalizationFlag = (buildName: types.buildName, gameName: string, localizationName: string): string => distBuildGameLocalizationFile(buildName, gameName, localizationName, `flag.svg`)
export const distBuildGameFile = (buildName: types.buildName, gameName: string, fileName: string): string => join(distBuildGame(buildName, gameName), fileName)
export const distBuildGameIcon = (buildName: types.buildName, gameName: string): string => distBuildGameFile(buildName, gameName, `icon.svg`)
export const distBuildGamePackage = (buildName: types.buildName, gameName: string, packageName: string, audioFormat: types.audioFormat): string => distBuildGameFile(buildName, gameName, `${packageName}-${audioFormat}.txt`)
