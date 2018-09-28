import * as uglifyJs from "uglify-js"
import Stage from "./stage"

export default class JavaScriptCombineStage extends Stage {
  constructor(parent, name, dependencies, allParsedFactory) {
    super(parent, name, dependencies)
    this.allParsedFactory = allParsedFactory
  }

  performStart() {
    const cloned = this
      .allParsedFactory()
      .map(parsed => parsed.clone(true))

    const combined = cloned[0]

    cloned
      .slice(1)
      .forEach(parsed => {
        combined.body = combined.body.concat(parsed.body)
        combined.end = parsed.end
      })

    const minified = uglifyJs.minify(combined, {
      mangle: this.oneOff()
        ? {
          toplevel: true,
          properties: true
        }
        : false,
      toplevel: true,
      output: {
        ast: false,
        code: true
      }
    })

    this.handle(minified.error, () => {
      this.code = minified.code
      this.done()
    })
  }
}
