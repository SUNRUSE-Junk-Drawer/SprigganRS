import ReadTextStage from "./readTextStage"

export default class ReadJsonStage extends ReadTextStage {
  done() {
    this.try(
      () => JSON.parse(this.text),
      json => {
        this.json = json
        super.done()
      }
    )
  }
}
