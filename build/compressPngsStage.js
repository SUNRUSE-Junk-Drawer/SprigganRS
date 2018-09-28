import isPng from "is-png"
import pngcrushBin from "pngcrush-bin"
import execBuffer from "exec-buffer"
import InstancedStage from "./instancedStage"
import Stage from "./stage"

class CompressPngStage extends Stage {
  constructor(parent, name, dependencies, instance) {
    super(parent, name, dependencies)
    this.instance = instance
  }

  performStart() {
    if (isPng(this.instance.contents)) {
      execBuffer({
        input: this.instance.contents,
        bin: pngcrushBin,
        args: [`-brute`, `-force`, `-q`, `-reduce`, execBuffer.input, execBuffer.output]
      })
        .catch(error => this.handle(error))
        .then(compressed => {
          this.instance.contents = compressed
          this.done()
        })
    } else {
      this.done()
    }
  }
}

export default class CompressPngsStage extends InstancedStage {
  constructor(parent, name, dependencies, cacheInstances, filesFactory) {
    super(parent, name, dependencies, cacheInstances, instance => new CompressPngStage(this, instance.name, [], instance))
    this.filesFactory = filesFactory
    this.compressed = []
  }

  getInstanceKey(instance) {
    return instance.name
  }

  getInstances() {
    if (this.oneOff()) {
      this.files = this.filesFactory()
      this.gotInstances(this.files)
    } else {
      this.gotInstances([])
    }
  }
}
