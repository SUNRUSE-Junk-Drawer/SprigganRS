import * as stage from "./stage"
import FileListStage from "./fileListStage"
import GameStage from "./gameStage"
import WatchableStage from "./watchableStage"
import JavaScriptParseStage from "./javaScriptParseStage"
import JavaScriptCombineStage from "./javaScriptCombineStage"
import DeleteDirectoryStage from "./deleteDirectoryStage"
import CreateDirectoryStage from "./createDirectoryStage"
import HostHttpStage from "./hostHttpStage"

export default class RootStage extends WatchableStage {
  constructor(parent, name, dependencies, isOneOff) {
    super(parent, name, dependencies)
    this.isOneOff = isOneOff

    const engine = new JavaScriptParseStage(this, `engine`, [], true, () => [`src`, `engine`])
    this.watchInstanced(() => [`src`, `engine`], engine, `read`, null)

    const parseBootloader = new JavaScriptParseStage(this, `parseBootloader`, [], true, () => [`src`, `bootloader`])
    this.watchInstanced(() => [`src`, `bootloader`], parseBootloader, `read`, null)
    const combineBootloader = new JavaScriptCombineStage(this, `combineBootloader`, [parseBootloader], () => Object
      .keys(parseBootloader.parsed)
      .map(key => parseBootloader.parsed[key]))

    const deleteDistDirectory = new DeleteDirectoryStage(this, `deleteDistDirectory`, [], () => [`dist`])
    const createDistDirectory = new CreateDirectoryStage(this, `createDistDirectory`, [deleteDistDirectory], () => [`dist`])

    if (!this.oneOff()) {
      new HostHttpStage(this, `hostHttp`, [createDistDirectory], () => [`dist`])
    }

    const games = new FileListStage(
      this,
      `games`,
      [createDistDirectory],
      true,
      instance => new GameStage(games, instance, [], engine, combineBootloader),
      () => [`src`, `games`]
    )
    this.watchInstanced(() => [`src`, `games`], games, null, 0)

    stage.handleChanges()
  }

  oneOff() {
    return this.isOneOff
  }
}
