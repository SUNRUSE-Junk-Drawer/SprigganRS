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
export const isSrcGame = (path: string): null | string => is(/^src\/games\/([^\/]+)\/.+$/i, path)
export const srcGameFile = (gameName: string, fileName: string): string => join(srcGame(gameName), fileName)
export const srcGameMetadata = (gameName: string): string => srcGameFile(gameName, `metadata.json`)
export const srcGameIcon = (gameName: string): string => srcGameFile(gameName, `icon.svg`)
export const srcGamePackageFile = (gameName: string, packageName: string, fileName: string, fileExtension: string): string => join(srcGame(gameName), `packages`, packageName, `${fileName}.${fileExtension}`)
export const isSrcGamePackage = (path: string): null | string => is(/^src\/games\/[^\/]+\/packages\/([^\/]+)\/.+$/i, path)
export const extractSrcGamePackageFileName = (path: string): string => extract(/^src\/games\/[^\/]+\/packages\/[^\/]+\/(.+)\..+$/i, path)
export const extractSrcGamePackageFileExtension = (path: string): string => extract(/^src\/games\/[^\/]+\/packages\/[^\/]+\/.+\.(.+)$/i, path)
export const tempBuild = (buildName: string): string => join(temp, buildName)
export const tempBuildState = (buildName: string): string => join(tempBuild(buildName), `state.json`)
export const tempBuildGame = (buildName: string, gameName: string): string => join(tempBuild(buildName), `games`, gameName)
export const tempBuildGamePackage = (buildName: string, gameName: string, packageName: string): string => join(tempBuildGame(buildName, gameName), `packages`, packageName)
export const tempBuildGamePackageCode = (buildName: string, gameName: string, packageName: string): string => join(tempBuildGamePackage(buildName, gameName, packageName), `code.ts`)
export const tempBuildGamePackageFile = (buildName: string, gameName: string, packageName: string, fileName: string, fileExtension: string): string => join(tempBuildGame(buildName, gameName), `packages`, packageName, `files`, `${fileName}.${fileExtension}`)
export const tempBuildGamePackageFileCache = (buildName: string, gameName: string, packageName: string, fileName: string, fileExtension: string): string => join(tempBuildGamePackageFile(buildName, gameName, packageName, fileName, fileExtension), `cache.json`)
export const distBuild = (buildName: string): string => join(dist, buildName)
export const distBuildGame = (buildName: string, gameName: string): string => join(distBuild(buildName), gameName)
export const distBuildGameFile = (buildName: string, gameName: string, fileName: string): string => join(distBuildGame(buildName, gameName), fileName)
export const distBuildGamePackage = (buildName: string, gameName: string, packageName: string): string => distBuildGameFile(buildName, gameName, `${packageName}.txt`)
export const distBuildGameHtml = (buildName: string, gameName: string): string => distBuildGameFile(buildName, gameName, `index.html`)
