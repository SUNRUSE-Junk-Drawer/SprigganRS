export default (paths, onSuccess, onDone) => {
  console.log(`Running for files:`)
  Object
    .keys(paths)
    .forEach(key => console.log(`\t"${key}" @ ${paths[key]}`))
  onSuccess()
}
