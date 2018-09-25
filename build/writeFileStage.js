import * as fs from "fs"
import * as path from "path"
import Stage from "./stage"

export default class WriteFileStage extends Stage {
  constructor(parent, name, dependencies, pathSegmentFactory, contentFactory) {
    super(parent, name, dependencies)
    this.pathSegmentFactory = pathSegmentFactory
    this.contentFactory = contentFactory
  }

  performStart() {
    fs.writeFile(
      path.join.apply(path, this.pathSegmentFactory()),
      this.contentFactory(),
      error => this.handle(error, () => this.done())
    )
  }
}
