import * as stage from "./stage"
import FileListStage from "./fileListStage"
import GameStage from "./gameStage"
import WatchableStage from "./watchableStage"
import JavaScriptParseStage from "./javaScriptParseStage"

export default class RootStage extends WatchableStage {
  constructor(parent, name, dependencies, isOneOff) {
    super(parent, name, dependencies)
    this.isOneOff = isOneOff

    const engine = new JavaScriptParseStage(this, `engine`, [], () => [`src`, `engine`])
    this.watchInstanced(() => [`src`, `engine`], engine, `read`, null)

    const games = new FileListStage(
      this,
      `games`,
      [],
      instanceName => new GameStage(games, instanceName, [], engine),
      () => [`src`, `games`]
    )
    this.watchInstanced(() => [`src`, `games`], games, null, 0)

    stage.handleChanges()
  }

  oneOff() {
    return this.isOneOff
  }
}
