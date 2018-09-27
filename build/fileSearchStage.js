import * as path from "path"
import recursiveReaddir from "recursive-readdir"
import InstancedStage from "./instancedStage"

export default class FileSearchStage extends InstancedStage {
  constructor(parent, name, dependencies, cacheInstances, instanceFactory, searchPathFactory, extension) {
    super(parent, name, dependencies, cacheInstances, instanceFactory)
    this.searchPathFactory = searchPathFactory
    this.extension = extension
  }

  getInstanceKey(instance) {
    return instance
  }

  getInstances() {
    recursiveReaddir(path.join.apply(path, this.searchPathFactory()), (error, files) => this.handle(error, () => this.gotInstances(files.filter(file => file.endsWith(`.${this.extension}`)))))
  }
}
