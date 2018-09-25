import * as path from "path"
import * as fs from "fs"
import Stage from "./stage"

export default class ReadTextStage extends Stage {
  constructor(parent, name, dependencies, pathSegmentFactory) {
    super(parent, name, dependencies)
    this.pathSegmentFactory = pathSegmentFactory
  }

  performStart() {
    fs.readFile(
      path.join.apply(path, this.pathSegmentFactory()),
      { encoding: `utf8` },
      (error, text) => this.handle(error, () => {
        this.text = text
        this.done()
      })
    )
  }
}
