import * as path from "path"
import * as uglifyJs from "uglify-js"
import Svgo from "svgo"
import FileSearchStage from "./fileSearchStage"
import GroupStage from "./groupStage"
import Stage from "./stage"
import ReadTextStage from "./readTextStage"

const svgo = new Svgo({
  plugins: [{
    cleanupAttrs: true
  }, {
    inlineStyles: true
  }, {
    removeDoctype: true
  }, {
    removeXMLProcInst: true
  }, {
    removeComments: true
  }, {
    removeMetadata: true
  }, {
    removeTitle: true
  }, {
    removeDesc: true
  }, {
    removeUselessDefs: true
  }, {
    removeXMLNS: false
  }, {
    removeEditorsNSData: true
  }, {
    removeEmptyAttrs: true
  }, {
    removeHiddenElems: true
  }, {
    removeEmptyText: true
  }, {
    removeEmptyContainers: true
  }, {
    removeViewBox: true
  }, {
    cleanupEnableBackground: true
  }, {
    minifyStyles: true
  }, {
    convertStyleToAttrs: true
  }, {
    convertColors: true
  }, {
    convertPathData: true
  }, {
    convertTransform: true
  }, {
    removeUnknownsAndDefaults: true
  }, {
    removeNonInheritableGroupAttrs: true
  }, {
    removeUselessStrokeAndFill: true
  }, {
    removeUnusedNS: true
  }, {
    cleanupIDs: true
  }, {
    cleanupNumericValues: true
  }, {
    cleanupListOfValues: true
  }, {
    moveElemsAttrsToGroup: true
  }, {
    moveGroupAttrsToElems: true
  }, {
    collapseGroups: true
  }, {
    removeRasterImages: true
  }, {
    mergePaths: true
  }, {
    convertShapeToPath: true
  }, {
    sortAttrs: true
  }, {
    removeDimensions: false
  }, {
    removeStyleElement: true
  }, {
    removeScriptElement: true
  }]
})

class ParseStage extends Stage {
  constructor(parent, name, dependencies, searchPathFactory, sourceFactory, parsedName, onParse) {
    super(parent, name, dependencies)
    this.searchPathFactory = searchPathFactory
    this.sourceFactory = sourceFactory
    this.parsedName = parsedName
    this.onParse = onParse
  }

  performStart() {
    svgo
      .optimize(this.sourceFactory())
      .catch(e => this.handle(e))
      .then(result => {
        const originalName = path.relative(path.join.apply(path, this.searchPathFactory()), this.parsedName)

        let escapedName = ``

        let first = true
        let nextCharacterMustBeUpperCase = false
        for (const character of originalName) {
          if (first) {
            if (!/^[A-Za-z_$]$/.test(character)) {
              this.handle(`The first character of the generated variable name would not be supported`)
              return
            }
            escapedName = originalName.charAt(0).toLowerCase()
            first = false
            continue
          }

          if (/^[A-Z_$0-9]$/.test(character)) {
            escapedName += character
            nextCharacterMustBeUpperCase = false
            continue
          }

          if (/^[a-z]$/.test(character)) {
            if (nextCharacterMustBeUpperCase) {
              escapedName += character.toUpperCase()
              nextCharacterMustBeUpperCase = false
            } else {
              escapedName += character
            }
            continue
          }

          nextCharacterMustBeUpperCase = true
        }

        const parsed = uglifyJs.minify(`var ${escapedName} = ${JSON.stringify(`data:image/svg+xml,${encodeURIComponent(result.data)}`)}`, {
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
      })
  }
}

class InstanceStage extends GroupStage {
  constructor(parent, name, dependencies, searchPathFactory) {
    super(parent, name, dependencies)
    const readText = new ReadTextStage(this, `read`, [], () => [name])
    new ParseStage(this, `parse`, [readText], searchPathFactory, () => readText.text, name, parsed => this.parent.parsed[this.name] = parsed)
  }

  stop() {
    super.stop()
    delete this.parent.parsed[this.name]
  }
}

export default class SvgParseStage extends FileSearchStage {
  constructor(parent, name, dependencies, cacheInstances, searchPathFactory) {
    super(parent, name, dependencies, cacheInstances, instance => new InstanceStage(this, instance, [], searchPathFactory), searchPathFactory, `svg`)
    this.parsed = {}
  }
}
