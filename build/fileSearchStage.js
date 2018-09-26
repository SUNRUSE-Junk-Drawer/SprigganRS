import * as path from "path"
import recursiveReaddir from "recursive-readdir"
import InstancedStage from "./instancedStage"

export default class FileSearchStage extends InstancedStage {
  constructor(parent, name, dependencies, instanceFactory, searchPathFactory, extension) {
    super(parent, name, dependencies, instanceFactory)
    this.searchPathFactory = searchPathFactory
    this.extension = extension
  }

  getInstances() {
    recursiveReaddir(path.join.apply(path, this.searchPathFactory()), (error, files) => this.handle(error, () => this.gotInstances(files.filter(file => file.endsWith(`.${this.extension}`)))))
  }
}
