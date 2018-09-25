import * as path from "path"
import rimraf from "rimraf"
import Stage from "./stage"

export default class DeleteDirectoryStage extends Stage {
  constructor(parent, name, dependencies, pathSegmentFactory) {
    super(parent, name, dependencies)
    this.pathSegmentFactory = pathSegmentFactory
  }

  performStart() {
    rimraf(
      path.join.apply(path, this.pathSegmentFactory()),
      error => this.handle(error, () => this.done())
    )
  }
}
