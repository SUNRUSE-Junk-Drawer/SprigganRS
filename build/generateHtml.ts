import * as fs from "fs"
import * as faviconsType from "favicons"
const favicons: (
  source: string,
  configuration: Partial<faviconsType.Configuration>,
  callback: faviconsType.Callback
) => void = require(`favicons`)
const isPng = require(`is-png`)
const pngcrushBin = require(`pngcrush-bin`)
const execBuffer = require(`exec-buffer`)
import * as htmlMinifier from "html-minifier"
import * as paths from "./paths"

export default function (
  createdOrModifiedFiles: Set<string>,
  buildName: string,
  gameName: string,
  metadata: {
    name: string
    readonly description: string
    readonly developer: {
      readonly name: string
      readonly url: string
    }
    readonly width: number
    readonly height: number
  },
  onError: (error: any) => void,
  onSuccess: () => void
): void {
  if (createdOrModifiedFiles.has(paths.srcGameMetadata(gameName))
    || createdOrModifiedFiles.has(paths.srcGameIcon(gameName))) {
    console.log(`Generating favicons...`)
    favicons(paths.srcGameIcon(gameName), {
      appName: metadata.name,
      appDescription: metadata.description,
      developerName: metadata.developer.name,
      developerURL: metadata.developer.url,
      background: `#000`,
      theme_color: `#000`,
      path: ``,
      display: `standalone`,
      orientation: `landscape`,
      start_url: ``,
      version: `1.0` /* TODO: Get Git commit hash. */,
      logging: false,
      icons: {
        android: buildName == `oneOff`,
        appleIcon: buildName == `oneOff`,
        appleStartup: buildName == `oneOff`,
        coast: buildName == `oneOff`,
        favicons: true,
        firefox: buildName == `oneOff`,
        windows: buildName == `oneOff`,
        yandex: buildName == `oneOff`
      }
    }, (error: any, response: any) => {
      if (error) {
        onError(error)
      } else {
        const files = response.images.concat(response.files)
        let compressed = 0
        let written = 0
        const total = files.length
        let failed = false

        files.forEach((file: any): void => {
          if (buildName == `oneOff` && isPng(file.contents)) {
            console.log(`Compressing favicon file "${file.name}"...`)
            execBuffer({
              input: file.contents,
              bin: pngcrushBin,
              args: [`-brute`, `-force`, `-q`, `-reduce`, execBuffer.input, execBuffer.output]
            })
              .then((compressed: Buffer): void => {
                if (failed) {
                  return
                }
                file.contents = compressed
                writeFile()
              }, (error: any) => {
                if (failed) {
                  return
                }
                failed = true
                onError(error)
              })
          } else {
            writeFile()
          }
          function writeFile() {
            console.log(`Writing favicon file "${file.name}" (compressed ${++compressed}/written ${written}/total ${total})...`)
            fs.writeFile(
              paths.distBuildGameFile(buildName, gameName, file.name),
              file.contents,
              err => {
                if (failed) {
                  return
                }
                if (err) {
                  onError(err)
                } else {
                  console.log(`Written favicon file "${file.name}" (compressed ${compressed}/written ${++written}/total ${total}).`)
                  checkDone()
                }
              }
            )
          }
        })

        checkDone()

        function checkDone() {
          if (written == total) {
            console.log(`All files written.`)
            let html = `<!DOCTYPE html>
              <html>
                <head>
                  <meta charset="UTF-8">
                  <title>${metadata.name}</title>
                  <meta name="viewport" content="initial-scale=1, minimum-scale=1, maximum-scale=1, width=device-width, height=device-height, user-scalable=no">
                  ${response.html.join(``)}
                </head>
                <body style="background: black; color: white;">
                  <div id="message" style="position: fixed; font-family: sans-serif; font-size: 0.5cm; top: 50%; line-height: 0.5cm; transform: translateY(-50%); left: 0; right: 0; text-align: center;">Loading; please ensure that JavaScript is enabled.</div>
                  <script src="index.js"></script>
                </body>
              </html>`
            if (buildName == `oneOff`) {
              html = htmlMinifier.minify(html, {
                caseSensitive: false,
                collapseBooleanAttributes: true,
                collapseInlineTagWhitespace: true,
                collapseWhitespace: true,
                conservativeCollapse: false,
                customAttrAssign: [],
                customAttrSurround: [],
                customEventAttributes: [],
                decodeEntities: true,
                html5: true,
                ignoreCustomComments: [],
                ignoreCustomFragments: [],
                includeAutoGeneratedTags: false,
                keepClosingSlash: false,
                minifyCSS: {
                  level: {
                    2: {
                      all: true
                    }
                  }
                } as any,
                minifyJS: false,
                minifyURLs: false,
                preserveLineBreaks: false,
                preventAttributesEscaping: false,
                processConditionalComments: false,
                processScripts: [],
                quoteCharacter: `"`,
                removeAttributeQuotes: true,
                removeComments: true,
                removeEmptyAttributes: true,
                removeEmptyElements: true,
                removeOptionalTags: true,
                removeRedundantAttributes: true,
                removeScriptTypeAttributes: true,
                removeStyleLinkTypeAttributes: true,
                removeTagWhitespace: true,
                sortAttributes: true,
                sortClassName: true,
                trimCustomFragments: true,
                useShortDoctype: true
              })
            }
            console.log(`Writing "${paths.distBuildGameHtml(buildName, gameName)}"...`)
            fs.writeFile(
              paths.distBuildGameHtml(buildName, gameName),
              html,
              error => {
                if (error) {
                  onError(error)
                } else {
                  onSuccess()
                }
              }
            )
          }
        }
      }
    })
  } else {
    console.log(`Skipped regeneration of HTML.`)
    onSuccess()
  }
}
