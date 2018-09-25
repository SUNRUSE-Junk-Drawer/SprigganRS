import * as fs from "fs"
import * as path from "path"
import InstancedStage from "./instancedStage"

export default class FileListStage extends InstancedStage {
  constructor(parent, name, dependencies, instanceFactory, searchPathFactory) {
    super(parent, name, dependencies, instanceFactory)
    this.searchPathFactory = searchPathFactory
  }

  getInstanceNames() {
    fs.readdir(path.join.apply(path, this.searchPathFactory()), (error, files) => this.handle(error, () => this.gotInstanceNames(files)))
  }
}
