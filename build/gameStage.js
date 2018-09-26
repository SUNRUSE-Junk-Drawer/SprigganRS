import WatchableStage from "./watchableStage"
import JavaScriptParseStage from "./javaScriptParseStage"
import JavaScriptCombineStage from "./javaScriptCombineStage"
import WriteFileStage from "./writeFileStage"
import DeleteDirectoryStage from "./deleteDirectoryStage"
import CreateDirectoryStage from "./createDirectoryStage"
import ReadJsonStage from "./readJsonStage"

export default class GameStage extends WatchableStage {
  constructor(parent, name, dependencies, engine) {
    super(parent, name, dependencies)
    const readMetadata = new ReadJsonStage(this, `readMetadata`, [], () => [`src`, `games`, name, `metadata.json`])
    this.watch(() => [`src`, `games`, name, `metadata.json`], readMetadata, null)
    const parseJavaScript = new JavaScriptParseStage(this, `parseJavaScript`, [], () => [`src`, `games`, name])
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
    const deleteDistDirectory = new DeleteDirectoryStage(this, `deleteDistDirectory`, [combineJavaScript], () => [`dist`, name])
    const createDistDirectory = new CreateDirectoryStage(this, `createDistDirectory`, [deleteDistDirectory], () => [`dist`, name])
    new WriteFileStage(this, `writeJavaScript`, [createDistDirectory], () => [`dist`, name, `index.js`], () => combineJavaScript.code)
  }
}
