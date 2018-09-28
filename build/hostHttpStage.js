import * as path from "path"
import newExpress from "express"
import * as express from "express"
import Stage from "./stage"

export default class HostHttpStage extends Stage {
  constructor(parent, name, dependencies, pathSegmentFactory) {
    super(parent, name, dependencies)
    this.pathSegmentFactory = pathSegmentFactory
  }

  performStart() {
    newExpress()
      .use(express.static(path.join.apply(path, this.pathSegmentFactory())))
      .listen(5000, () => this.done())
  }
}
