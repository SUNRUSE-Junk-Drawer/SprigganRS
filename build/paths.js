export const join = (...fragments) => fragments
  .map(fragment => fragment.split(`/`))
  .reduce((a, b) => a.concat(b))
  .map(fragment => fragment.split(`\\`))
  .reduce((a, b) => a.concat(b))
  .filter(fragment => fragment)
  .join(`/`)

export const src = `src`
export const temp = `temp`
export const dist = `dist`
export const srcGame = gameName => join(src, `games`, gameName)
export const srcGameFile = (gameName, fileName) => join(srcGame(gameName), fileName)
export const srcGameMetadata = gameName => srcGameFile(gameName, `metadata.json`)
export const srcGameIcon = gameName => srcGameFile(gameName, `icon.svg`)
export const tempBuild = buildName => join(temp, buildName)
export const tempBuildState = buildName => join(tempBuild(buildName), `state.json`)
export const tempBuildGame = (buildName, gameName) => join(tempBuild(buildName), `games`, gameName)
export const distBuild = buildName => join(dist, buildName)
export const distBuildGame = (buildName, gameName) => join(distBuild(buildName), gameName)
export const distBuildGameFile = (buildName, gameName, fileName) => join(distBuildGame(buildName, gameName), fileName)
export const distBuildGameHtml = (buildName, gameName) => distBuildGameFile(buildName, gameName, `index.html`)
