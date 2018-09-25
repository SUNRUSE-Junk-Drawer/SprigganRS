import Stage from "./stage"
import * as stage from "./stage"

export default class GroupStage extends Stage {
  constructor(parent, name, dependencies) {
    super(parent, name, dependencies)
    this.children = []
  }

  blocksChildren() {
    switch (this.state) {
      case `running`:
      case `restarting`:
        if (this.parent) {
          return this.parent.blocksChildren()
        } else {
          return false
        }
      case `blocked`:
      case `done`:
      case `failed`:
        return true
      default:
        this.criticalStop(`State "${this.state}" is not implemented by "blocksChildren".`)
    }
  }

  checkState() {
    switch (this.state) {
      case `running`:
      case `restarting`:
        if (!this.children.every(child => {
          switch (child.state) {
            case `restarting`:
            case `running`:
              return false

            case `blocked`:
              return !child.couldStart()

            case `done`:
            case `failed`:
              return true

            default:
              this.criticalStop(`State "${child.state}" is not implemented by "checkState" when inspecting child "${child.fullName}".`)
          }
        })) {
          return
        }

        this.handle(this.children.some(child => child.state != `done`) && `One or more children failed to process.`, () => this.done())
        break

      case `blocked`:
      case `done`:
      case `failed`:
        super.checkState()
        break
      default:
        this.criticalStop(`State "${this.state}" is not implemented by "checkState" (derivced).`)
    }
  }

  performStart() {
    stage.handleChanges()
  }

  stop() {
    super.stop()
    while (this.children.length) {
      this.children[0].stop()
    }
  }
}
