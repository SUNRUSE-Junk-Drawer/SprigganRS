import GroupStage from "./groupStage"

export default class InstancedStage extends GroupStage {
  constructor(parent, name, dependencies, instanceFactory) {
    super(parent, name, dependencies)
    this.subState = `notRunning`
    this.instanceFactory = instanceFactory
  }

  blocksChildren() {
    switch (this.subState) {
      case `notRunning`:
      case `gettingInstanceNames`:
        return true

      case `waitingForChildren`:
        return false

      default:
        this.criticalStop(`Sub-state "${this.subState}" is not implemented by "blocksChildren"`)
    }
  }

  handle(potentialError, onSuccess) {
    if (potentialError) {
      this.subState = `notRunning`
    }

    super.handle(potentialError, onSuccess)
  }

  performStart() {
    this.subState = `gettingInstanceNames`
    this.getInstanceNames()
  }

  getInstanceNames() {
    this.criticalStop(`"getInstanceNames" is not implemented`)
  }

  checkState() {
    switch (this.subState) {
      case `notRunning`:
      case `waitingForChildren`:
        super.checkState()
        break

      case `gettingInstanceNames`:
        break

      default:
        this.criticalStop(`Sub-state "${this.subState}" is not implemented by "checkState".`)
    }
  }

  gotInstanceNames(instanceNames) {
    if (this.subState != `gettingInstanceNames`) {
      this.criticalStop(`Sub-state "${this.subState}" is not implemented by "gotInstanceNames".`)
    }

    this.subState = `waitingForChildren`

    this.children
      .forEach(child => instanceNames.indexOf(child.name) == -1 && child.stop())

    // This removes duplicates.
    instanceNames
      .forEach(instanceName => this.get([instanceName]) || this.instanceFactory(instanceName))

    super.performStart()
  }

  done() {
    if (this.subState != `waitingForChildren`) {
      this.criticalStop(`Sub-state "${this.subState}" is not implemented by "done".`)
    }

    super.done()
  }
}
