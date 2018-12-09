import * as fs from "fs"
import * as xmlJs from "xml-js"
import * as svgo from "svgo"
import * as paths from "./paths"

const svgoInstance = new svgo({
  plugins: [{
    cleanupAttrs: true
  }, {
    inlineStyles: true
  } as any, {
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

export default function (
  oldState: {
    readonly paths: {
      readonly [path: string]: number
    }
  },
  newState: {
    readonly paths: {
      readonly [path: string]: number
    }
  },
  buildName: string,
  gameName: string,
  packageName: string,
  fileName: string,
  onError: (error: any) => void,
  onSuccess: (generated: {
    [path: string]: {
      readonly code: string
      readonly data: string
    }
  }) => void
): void {
  console.log(`Reading "${paths.srcGamePackageFile(gameName, packageName, fileName, `svg`)}"...`)
  fs.readFile(paths.srcGamePackageFile(gameName, packageName, fileName, `svg`), { encoding: `utf8` }, (err, data) => {
    if (err) {
      onError(err)
    } else {
      console.log(`Parsing "${paths.srcGamePackageFile(gameName, packageName, fileName, `svg`)}"...`)
      const xml: xmlJs.Element = xmlJs.xml2js(data) as xmlJs.Element
      if (!xml.elements) {
        onError(`The file contains no elements.`)
        return
      }
      const rootElement = xml
        .elements
        .find(element => element.type == `element` && element.name == `svg`)
      if (!rootElement) {
        onError(`The file contains no root element.`)
        return
      }
      if (!rootElement.elements) {
        onError(`The root element contains no elements.`)
        return
      }
      const elements = rootElement
        .elements
        .filter(element => element.type == `element`)
        .filter(element => element.name && !element.name.startsWith(`sodipodi:`))
        .filter(element => element.name != `metadata`)
      const sharedBetweenLayers = elements.filter(element => element.name == `defs`)
      const layers = elements.filter(element => element.name == `g` && element.attributes && element.attributes[`inkscape:groupmode`] == `layer`)
      const isInkscape = layers.length + sharedBetweenLayers.length == elements.length
      const effectiveLayers: {
        readonly name: string
        readonly xml: xmlJs.Element
      }[] = []
      if (isInkscape && layers.length > 1) {
        console.log(`Splitting "${paths.srcGamePackageFile(gameName, packageName, fileName, `svg`)}" by Inkscape layer...`)
        layers
          .forEach(layer => {
            const layerXml: xmlJs.Element = JSON.parse(JSON.stringify(xml))

            if (!layer.attributes) {
              onError(`This should never happen, and is required by Typescript.`)
              return
            }

            // Re-shows hidden layers.
            delete layer.attributes.style

            if (!layerXml.elements) {
              onError(`This should never happen, and is required by Typescript.`)
              return
            }

            const layerRootElement = layerXml
              .elements
              .find(element => element.type == `element` && element.name == `svg`)

            if (!layerRootElement) {
              onError(`This should never happen, and is required by Typescript.`)
              return
            }

            layerRootElement.elements = sharedBetweenLayers.concat([layer])

            const layerName = coerceToString(layer.attributes[`inkscape:label`])

            let name = paths.join(fileName)
            if (layerName == `/`
              || layerName.endsWith(`\\/`)
              || layerName.endsWith(`//`)) {
              name += `//`
            } else if (layerName == `\\`
              || layerName.endsWith(`\\\\`)
              || layerName.endsWith(`/\\`)) {
              name += `/\\`
            }

            effectiveLayers.push({
              name,
              xml: layerXml
            })
          })
      } else {
        if (isInkscape) {
          console.log(`"${paths.srcGamePackageFile(gameName, packageName, fileName, `svg`)}" is from Inkscape, but has only one layer; it will not be split.`)
        } else {
          console.log(`"${paths.srcGamePackageFile(gameName, packageName, fileName, `svg`)}" is not from Inkscape; it will not be split.`)
        }
        effectiveLayers.push({
          name: fileName,
          xml
        })
      }

      let compressed = 0
      const generated: {
        [path: string]: {
          readonly code: string
          readonly data: string
        }
      } = {}

      effectiveLayers.forEach(layer => {
        // Workaround for https://github.com/nashwaan/xml-js/issues/69.
        escapeAttributes(layer.xml)

        function escapeAttributes(inXml: xmlJs.Element): void {
          if (inXml.attributes) {
            for (const key in inXml.attributes) {
              inXml.attributes[key] = coerceToString(inXml.attributes[key])
                .replace(`&`, `&amp;`)
                .replace(`<`, `&lt;`)
                .replace(`>`, `&gt;`)
                .replace(`"`, `&quot;`)
                .replace(`'`, `&#39;`)
            }
          }
          if (inXml.elements) {
            inXml.elements.forEach(escapeAttributes)
          }
        }

        svgoInstance
          .optimize(xmlJs.js2xml(layer.xml))
          .then(value => {
            generated[layer.name] = {
              code: `engineSvg`,
              data: value.data
            }
            onCompressed()
          }, reason => {
            onError(reason)
            onCompressed()
          })
      })

      function onCompressed() {
        compressed++
        if (compressed < effectiveLayers.length) {
          console.log(`Compressing "${paths.srcGamePackageFile(gameName, packageName, fileName, `svg`)}" (${compressed}/${effectiveLayers.length})...`)
        } else {
          onSuccess(generated)
        }
      }

      function coerceToString(value: string | number | undefined): string {
        if (value === undefined) {
          return ``
        } else if (typeof value === `string`) {
          return value
        } else {
          return `${value}`
        }
      }
    }
  })
}
