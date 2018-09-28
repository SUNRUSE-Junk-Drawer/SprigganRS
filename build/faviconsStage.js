import * as path from "path"
import favicons from "favicons"
import Stage from "./stage"

export default class FaviconsStage extends Stage {
  constructor(parent, name, dependencies, logoPathSegmentFactory, metadataFactory) {
    super(parent, name, dependencies)
    this.logoPathSegmentFactory = logoPathSegmentFactory
    this.metadataFactory = metadataFactory
  }

  performStart() {
    const metadata = this.metadataFactory()
    const prefix = this.oneOff() ? `` : `DEVELOPMENT BUILD - `
    favicons(path.join.apply(path, this.logoPathSegmentFactory()), {
      appName: `${prefix}${metadata.name}`,
      appDescription: `${prefix}${metadata.description}`,
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
      online: false,
      preferOnline: false,
      icons: {
        android: this.oneOff(),
        appleIcon: this.oneOff(),
        appleStartup: this.oneOff(),
        coast: this.oneOff(),
        favicons: true,
        firefox: this.oneOff(),
        windows: this.oneOff(),
        yandex: this.oneOff()
      }
    }, (error, response) => this.handle(error, () => {
      this.response = response
      this.done()
    }))
  }
}
