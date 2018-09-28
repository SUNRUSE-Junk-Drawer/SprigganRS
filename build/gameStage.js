import WatchableStage from "./watchableStage"
import JavaScriptParseStage from "./javaScriptParseStage"
import JavaScriptCombineStage from "./javaScriptCombineStage"
import DeleteDirectoryStage from "./deleteDirectoryStage"
import CreateDirectoryStage from "./createDirectoryStage"
import ReadJsonStage from "./readJsonStage"
import FaviconsStage from "./faviconsStage"
import WriteFilesStage from "./writeFilesStage"
import CompressPngsStage from "./compressPngsStage"
import MinifyHtmlStage from "./minifyHtmlStage"
import ZipFilesStage from "./zipFilesStage"

export default class GameStage extends WatchableStage {
  constructor(parent, name, dependencies, engine, combineBootloader) {
    super(parent, name, dependencies)
    const readMetadata = new ReadJsonStage(this, `readMetadata`, [], () => [`src`, `games`, name, `metadata.json`])
    this.watch(() => [`src`, `games`, name, `metadata.json`], readMetadata, null)
    const parseJavaScript = new JavaScriptParseStage(this, `parseJavaScript`, [], true, () => [`src`, `games`, name])
    this.watchInstanced(() => [`src`, `games`, name], parseJavaScript, `read`, null)
    const combineJavaScript = new JavaScriptCombineStage(
      this,
      `combineJavaScript`,
      [engine, parseJavaScript],
      () => Object
        .keys(engine.parsed)
        .map(key => engine.parsed[key])
        .concat(
          Object
            .keys(parseJavaScript.parsed)
            .map(key => parseJavaScript.parsed[key])
        )
    )
    const favicons = new FaviconsStage(this, `favicons`, [readMetadata], () => [`src`, `games`, name, `icon.svg`], () => readMetadata.json)
    this.watch(() => [`src`, `games`, name, `icon.svg`], favicons, null)
    const compressPngs = new CompressPngsStage(
      this,
      `compressPngs`,
      [favicons],
      false,
      () => favicons.response.images
    )
    const minifyHtml = new MinifyHtmlStage(
      this,
      `minifyHtml`,
      [favicons],
      () => `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${this.oneOff() ? `` : `DEVELOPMENT BUILD - `}${readMetadata.json.name}</title>
          <meta name="viewport" content="initial-scale=1, minimum-scale=1, maximum-scale=1, width=device-width, height=device-height, user-scalable=no">
          ${favicons.response.html.join(``)}
        </head>
        <body style="background: black; color: white;">
          <div id="message" style="position: fixed; font-family: sans-serif; font-size: 0.5cm; top: 50%; line-height: 0.5cm; transform: translateY(-50%); left: 0; right: 0; text-align: center;">Loading bootloader; please ensure that JavaScript is enabled.</div>
          <script src="bootloader.js"></script>
        </body>
      </html>`
    )
    const filesFactory = () => [{
      name: `index.js`,
      contents: combineJavaScript.code
    }, {
      name: `bootloader.js`,
      contents: combineBootloader.code
    }, {
      name: `index.html`,
      contents: minifyHtml.minified
    }]
      .concat(favicons.response.files)
      .concat(favicons.response.images)
    if (this.oneOff()) {
      new ZipFilesStage(
        this,
        `write`,
        [combineBootloader, compressPngs, minifyHtml],
        () => [`dist`, `${name}.zip`],
        filesFactory
      )
    } else {
      const deleteDistDirectory = new DeleteDirectoryStage(this, `deleteDistDirectory`, [combineJavaScript, favicons], () => [`dist`, name])
      const createDistDirectory = new CreateDirectoryStage(this, `createDistDirectory`, [deleteDistDirectory], () => [`dist`, name])
      new WriteFilesStage(
        this,
        `write`,
        [combineBootloader, createDistDirectory, compressPngs, minifyHtml],
        false,
        filesFactory,
        () => [`dist`, name]
      )
    }
  }
}
