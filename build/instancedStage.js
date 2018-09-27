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
      case `gettingInstances`:
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
    this.subState = `gettingInstances`
    this.getInstances()
  }

  getInstances() {
    this.criticalStop(`"getInstances" is not implemented`)
  }

  checkState() {
    switch (this.subState) {
      case `notRunning`:
      case `waitingForChildren`:
        super.checkState()
        break

      case `gettingInstances`:
        break

      default:
        this.criticalStop(`Sub-state "${this.subState}" is not implemented by "checkState".`)
    }
  }

  getInstanceKey(instance) {
    this.criticalStop(`"getInstanceKey" is not implemented`)
  }

  gotInstances(instances) {
    if (this.subState != `gettingInstances`) {
      this.criticalStop(`Sub-state "${this.subState}" is not implemented by "gotInstances".`)
    }

    this.subState = `waitingForChildren`

    this.children
      .forEach(child => instances.map(instance => this.getInstanceKey(instance)).indexOf(child.name) == -1 && child.stop())

    // This removes duplicates.
    instances
      .forEach(instance => this.get([this.getInstanceKey(instance)]) || this.instanceFactory(instance))

    super.performStart()
  }

  done() {
    if (this.subState != `waitingForChildren`) {
      this.criticalStop(`Sub-state "${this.subState}" is not implemented by "done".`)
    }

    super.done()
  }
}
