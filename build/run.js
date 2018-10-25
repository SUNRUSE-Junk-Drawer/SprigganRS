export default (paths, onSuccess, onDone) => {
  normalizePaths(paths)

  console.log(`Running for files:`)
  Object
    .keys(paths)
    .forEach(key => console.log(`\t"${key}" @ ${paths[key]}`))

  onSuccess()
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
