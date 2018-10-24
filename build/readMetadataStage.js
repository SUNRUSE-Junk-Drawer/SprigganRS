import * as uglifyJs from "uglify-js"
import ReadTextStage from "./readTextStage"

export default class ReadMetadataStage extends ReadTextStage {
  done() {
    this.try(
      () => JSON.parse(this.text),
      json => {
        this.json = json
        const parsed = uglifyJs.minify(`
        var metadataWidth = ${this.json.width}
        var metadataHeight = ${this.json.height}
      `, {
            parse: {},
            compress: false,
            mangle: false,
            output: {
              ast: true,
              code: false
            }
          }
        )
        this.handle(parsed.error, () => {
          this.parsed = parsed.ast
          super.done()
        })
      }
    )
  }
}
