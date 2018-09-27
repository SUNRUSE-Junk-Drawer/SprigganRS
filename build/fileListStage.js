import * as fs from "fs"
import * as path from "path"
import InstancedStage from "./instancedStage"

export default class FileListStage extends InstancedStage {
  constructor(parent, name, dependencies, cacheInstances, instanceFactory, searchPathFactory) {
    super(parent, name, dependencies, cacheInstances, instanceFactory)
    this.searchPathFactory = searchPathFactory
  }

  getInstanceKey(instance) {
    return instance
  }

  getInstances() {
    fs.readdir(path.join.apply(path, this.searchPathFactory()), (error, files) => this.handle(error, () => this.gotInstances(files)))
  }
}
