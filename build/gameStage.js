import WatchableStage from "./watchableStage"
import JavaScriptParseStage from "./javaScriptParseStage"
import JavaScriptCombineStage from "./javaScriptCombineStage"
import DeleteDirectoryStage from "./deleteDirectoryStage"
import CreateDirectoryStage from "./createDirectoryStage"
import ReadJsonStage from "./readJsonStage"
import FaviconsStage from "./faviconsStage"
import WriteFilesStage from "./writeFilesStage"

export default class GameStage extends WatchableStage {
  constructor(parent, name, dependencies, engine) {
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
    const deleteDistDirectory = new DeleteDirectoryStage(this, `deleteDistDirectory`, [combineJavaScript, favicons], () => [`dist`, name])
    const createDistDirectory = new CreateDirectoryStage(this, `createDistDirectory`, [deleteDistDirectory], () => [`dist`, name])
    const writeFiles = new WriteFilesStage(
      this,
      `write`,
      [createDistDirectory],
      false,
      () => [{
        name: `index.js`,
        contents: combineJavaScript.code
      }]
        .concat(favicons.response.files)
        .concat(favicons.response.images),
      () => [`dist`, name]
    )
  }
}
