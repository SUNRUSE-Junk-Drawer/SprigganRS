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
export const isSrcGamePackage = path => is(/^src\/games\/[^\/]+\/packages\/([^\/]+)\/.+$/i, path)
export const tempBuild = buildName => join(temp, buildName)
export const tempBuildState = buildName => join(tempBuild(buildName), `state.json`)
export const tempBuildGame = (buildName, gameName) => join(tempBuild(buildName), `games`, gameName)
export const tempBuildGamePackage = (buildName, gameName, packageName) => join(tempBuildGame(buildName, gameName), `packages`, packageName)
export const distBuild = buildName => join(dist, buildName)
export const distBuildGame = (buildName, gameName) => join(distBuild(buildName), gameName)
export const distBuildGameFile = (buildName, gameName, fileName) => join(distBuildGame(buildName, gameName), fileName)
export const distBuildGamePackage = (buildName, gameName, packageName) => join(distBuildGameFile(buildName, gameName), `${packageName}.json`)
export const distBuildGameHtml = (buildName, gameName) => distBuildGameFile(buildName, gameName, `index.html`)
