import * as path from "path"
import * as chokidar from "chokidar"
import GroupStage from "./groupStage"

export default class WatchableStage extends GroupStage {
  constructor(parent, name, dependencies) {
    super(parent, name, dependencies)
    this.watches = []
  }

  watch(pathSegmentFactory, stage, depth) {
    if (!this.oneOff()) {
      this.watches.push(chokidar
        .watch(path.join.apply(path, pathSegmentFactory()), { ignoreInitial: true, depth })
        .on(`error`, error => this.criticalStop(error))
        .on(`all`, (event, path) => {
          this.log(`Starting stage "${stage.fullName}" affected by ${event} of "${path}"...`)
          stage.start()
        }))
    }
  }

  watchInstanced(pathSegmentFactory, stage, childName, depth) {
    if (!this.oneOff()) {
      this.watches.push(chokidar
        .watch(path.join.apply(path, pathSegmentFactory()), { ignoreInitial: true, depth })
        .on(`error`, error => this.criticalStop(error))
        .on(`all`, (event, path) => {
          const pathToStart = [path]
          if (childName) {
            pathToStart.push(childName)
          }
          const toStart = stage.get(pathToStart) || stage
          this.log(`Starting stage "${toStart.fullName}" affected by ${event} of "${path}"...`)
          toStart.start()
        })
      )
    }
  }

  stop() {
    super.stop()
    this.watches.forEach(watch => watch.close())
  }
}
