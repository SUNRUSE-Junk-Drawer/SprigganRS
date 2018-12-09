export const join = (...fragments) => fragments
  .map(fragment => fragment.split(`/`))
  .reduce((a, b) => a.concat(b))
  .map(fragment => fragment.split(`\\`))
  .reduce((a, b) => a.concat(b))
  .filter(fragment => fragment)
  .join(`/`)

const is = (regex, path) => {
  const match = regex.exec(path)
  if (match) {
    return match[1]
  } else {
    return null
  }
}

export const src = `src`
export const temp = `temp`
export const dist = `dist`
export const srcGame = gameName => join(src, `games`, gameName)
export const isSrcGame = path => is(/^src\/games\/([^\/]+)\/.+$/i, path)
export const srcGameFile = (gameName, fileName) => join(srcGame(gameName), fileName)
export const srcGameMetadata = gameName => srcGameFile(gameName, `metadata.json`)
export const srcGameIcon = gameName => srcGameFile(gameName, `icon.svg`)
export const srcGamePackageFile = (gameName, packageName, fileName, fileExtension) => join(srcGame(gameName), `packages`, packageName, `${fileName}.${fileExtension}`)
export const isSrcGamePackage = path => is(/^src\/games\/[^\/]+\/packages\/([^\/]+)\/.+$/i, path)
export const extractSrcGamePackageFileName = path => is(/^src\/games\/[^\/]+\/packages\/[^\/]+\/(.+)\..+$/i, path)
export const extractSrcGamePackageFileExtension = path => is(/^src\/games\/[^\/]+\/packages\/[^\/]+\/.+\.(.+)$/i, path)
export const tempBuild = buildName => join(temp, buildName)
export const tempBuildState = buildName => join(tempBuild(buildName), `state.json`)
export const tempBuildGame = (buildName, gameName) => join(tempBuild(buildName), `games`, gameName)
export const tempBuildGamePackage = (buildName, gameName, packageName) => join(tempBuildGame(buildName, gameName), `packages`, packageName)
export const tempBuildGamePackageCode = (buildName, gameName, packageName) => join(tempBuildGamePackage(buildName, gameName, packageName), `code.ts`)
export const tempBuildGamePackageFile = (buildName, gameName, packageName, fileName, fileExtension) => join(tempBuildGame(buildName, gameName), `packages`, packageName, `files`, `${fileName}.${fileExtension}`)
export const tempBuildGamePackageFileCache = (buildName, gameName, packageName, fileName, fileExtension) => join(tempBuildGamePackageFile(buildName, gameName, packageName, fileName, fileExtension), `cache.json`)
export const distBuild = buildName => join(dist, buildName)
export const distBuildGame = (buildName, gameName) => join(distBuild(buildName), gameName)
export const distBuildGameFile = (buildName, gameName, fileName) => join(distBuildGame(buildName, gameName), fileName)
export const distBuildGamePackage = (buildName, gameName, packageName) => distBuildGameFile(buildName, gameName, `${packageName}.txt`)
export const distBuildGameHtml = (buildName, gameName) => distBuildGameFile(buildName, gameName, `index.html`)
