import * as fs from "fs"
import * as xmlJs from "xml-js"
import Svgo from "svgo"
import * as paths from "./paths"

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

export default function (oldState, newState, buildName, gameName, packageName, fileName, onError, onSuccess) {
  console.log(`Reading "${paths.srcGamePackageFile(gameName, packageName, fileName, `svg`)}"...`)
  fs.readFile(paths.srcGamePackageFile(gameName, packageName, fileName, `svg`), (err, data) => {
    if (err) {
      onError(err)
    } else {
      console.log(`Parsing "${paths.srcGamePackageFile(gameName, packageName, fileName, `svg`)}"...`)
      const xml = xmlJs.xml2js(data)
      const elements = xml
        .elements
        .find(element => element.type == `element` && element.name == `svg`)
        .elements
        .filter(element => element.type == `element`)
        .filter(element => !element.name.startsWith(`sodipodi:`))
        .filter(element => element.name != `metadata`)
      const sharedBetweenLayers = elements.filter(element => element.name == `defs`)
      const layers = elements.filter(element => element.name == `g` && element.attributes && element.attributes[`inkscape:groupmode`] == `layer`)
      const isInkscape = layers.length + sharedBetweenLayers.length == elements.length
      const effectiveLayers = []
      if (isInkscape && layers.length > 1) {
        console.log(`Splitting "${paths.srcGamePackageFile(gameName, packageName, fileName, `svg`)}" by Inkscape layer...`)
        layers
          .forEach(layer => {
            const layerXml = JSON.parse(JSON.stringify(xml))

            // Re-shows hidden layers.
            delete layer.attributes.style

            layerXml
              .elements
              .find(element => element.type == `element` && element.name == `svg`)
              .elements = sharedBetweenLayers.concat([layer])

            let name = paths.join(fileName, layer.attributes[`inkscape:label`])
            if (layer.attributes[`inkscape:label`] == `/` || layer.attributes[`inkscape:label`].endsWith(`//`)) {
              name += `//`
            } else if (layer.attributes[`inkscape:label`] == `\\` || layer.attributes[`inkscape:label`].endsWith(`/\\`)) {
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
      const generated = {}

      effectiveLayers.forEach(layer => {
        // Workaround for https://github.com/nashwaan/xml-js/issues/69.
        escapeAttributes(layer.xml)

        function escapeAttributes(inXml) {
          if (inXml.attributes) {
            for (const key in inXml.attributes) {
              inXml.attributes[key] = inXml
                .attributes[key]
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

        svgo
          .optimize(xmlJs.js2xml(layer.xml))
          .catch(reason => {
            onError(reason)
            onCompressed()
          })
          .then(value => {
            generated[layer.name] = {
              code: `engineSvg`,
              data: value.data
            }
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
    }
  })
}
