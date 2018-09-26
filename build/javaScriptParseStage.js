import * as uglifyJs from "uglify-js"
import FileSearchStage from "./fileSearchStage"
import GroupStage from "./groupStage"
import Stage from "./stage"
import ReadTextStage from "./readTextStage"

class ParseStage extends Stage {
  constructor(parent, name, dependencies, sourceFactory, onParse) {
    super(parent, name, dependencies)
    this.sourceFactory = sourceFactory
    this.onParse = onParse
  }

  performStart() {
    const parsed = uglifyJs.minify(this.sourceFactory(), {
      parse: {},
      compress: false,
      mangle: false,
      output: {
        ast: true,
        code: false
      }
    })
    this.handle(parsed.error, () => {
      this.onParse(parsed.ast)
      this.done()
    })
  }
}

class InstanceStage extends GroupStage {
  constructor(parent, name, dependencies) {
    super(parent, name, dependencies)
    const readText = new ReadTextStage(this, `read`, [], () => [name])
    new ParseStage(this, `parse`, [readText], () => readText.text, parsed => this.parent.parsed[this.name] = parsed)
  }

  stop() {
    super.stop()
    delete this.parent.parsed[this.name]
  }
}

export default class JavaScriptParseStage extends FileSearchStage {
  constructor(parent, name, dependencies, searchPathFactory) {
    super(parent, name, dependencies, instance => new InstanceStage(this, instance, []), searchPathFactory, `js`)
    this.parsed = {}
  }
}
