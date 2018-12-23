import * as util from "util"
import * as fs from "fs"
import * as faviconsType from "favicons"
const favicons = util.promisify(require(`favicons`) as (
  source: string,
  configuration: Partial<faviconsType.Configuration>,
  callback: faviconsType.Callback
) => void)
const isPng = require(`is-png`)
const pngcrushBin = require(`pngcrush-bin`)
const execBuffer = require(`exec-buffer`)
import * as htmlMinifier from "html-minifier"
import * as types from "./types"
import * as paths from "./paths"

const fsWriteFile = util.promisify(fs.writeFile)

export default async function (
  createdOrModifiedFiles: Set<string>,
  buildName: types.buildName,
  gameName: string,
  metadata: types.metadata
): Promise<void> {
  if (createdOrModifiedFiles.has(paths.srcGameMetadata(gameName))
    || createdOrModifiedFiles.has(paths.srcGameIcon(gameName))) {
    console.log(`Generating favicons...`)
    const response = await favicons(paths.srcGameIcon(gameName), {
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
    })

    const files = response.images.concat(response.files)
    let compressed = 0
    let written = 0
    const total = files.length

    const promises = files.map(async file => {
      if (buildName == `oneOff` && isPng(file.contents)) {
        console.log(`Compressing favicon file "${file.name}"...`)
        const compressed = await execBuffer({
          input: file.contents,
          bin: pngcrushBin,
          args: [`-brute`, `-force`, `-q`, `-reduce`, execBuffer.input, execBuffer.output]
        })
        file.contents = compressed
      }
      console.log(`Writing favicon file "${file.name}" (compressed ${++compressed}/written ${written}/total ${total})...`)
      await fsWriteFile(
        paths.distBuildGameFile(buildName, gameName, file.name),
        file.contents
      )

      console.log(`Written favicon file "${file.name}" (compressed ${compressed}/written ${++written}/total ${total}).`)
    })

    for (const promise of promises) {
      await promise
    }

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
    await fsWriteFile(
      paths.distBuildGameHtml(buildName, gameName),
      html
    )
  } else {
    console.log(`Skipped regeneration of HTML.`)
  }
}
