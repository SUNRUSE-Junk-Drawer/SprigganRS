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
    favicons(path.join.apply(path, this.logoPathSegmentFactory()), {
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
      online: false,
      preferOnline: false,
      icons: {
        android: true,
        appleIcon: true,
        appleStartup: true,
        coast: true,
        favicons: true,
        firefox: true,
        windows: true,
        yandex: true
      }
    }, (error, response) => this.handle(error, () => {
      this.response = response
      this.done()
    }))
  }
}
