import mkdirp from "mkdirp"

export default (paths, onError, onDone) => {
  console.log(`Ensuring "temp" exists...`)
  mkdirp(`temp`, error => {
    if (error) {
      onError(error)
      onDone()
    } else {
      normalizePaths(paths)

      console.log(`Running for files:`)
      Object
        .keys(paths)
        .forEach(key => console.log(`\t"${key}" @ ${paths[key]}`))

      findGames(paths)

      onDone()
    }
  })
}

function normalizePaths(paths) {
  Object
    .keys(paths)
    .forEach(path => {
      const modified = paths[path]
      delete paths[path]
      paths[path.replace(/\\/g, `/`)] = modified
    })
}

function findGames(paths) {
  const byMetadata = new Set(
    Object
      .keys(paths)
      .map(path => /^src\/games\/([^\/]+)\/metadata\.json$/i.exec(path))
      .filter(match => match)
      .map(match => match[1])
  )

  const byOthers = new Set(
    Object
      .keys(paths)
      .map(path => /^src\/games\/([^\/]+)\/.*$/i.exec(path))
      .filter(match => match)
      .map(match => match[1])
      .filter(path => !byMetadata.has(path))
  )

  byOthers.forEach(game => console.warn(`Game "${game}" has no metadata.json file`))

  return byMetadata
}
