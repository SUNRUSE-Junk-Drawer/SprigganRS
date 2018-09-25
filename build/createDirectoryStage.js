import * as path from "path"
import mkdirp from "mkdirp"
import Stage from "./stage"

export default class CreateDirectoryStage extends Stage {
  constructor(parent, name, dependencies, pathSegmentFactory) {
    super(parent, name, dependencies)
    this.pathSegmentFactory = pathSegmentFactory
  }

  performStart() {
    mkdirp(
      path.join.apply(path, this.pathSegmentFactory()),
      error => this.handle(error, () => this.done())
    )
  }
}
