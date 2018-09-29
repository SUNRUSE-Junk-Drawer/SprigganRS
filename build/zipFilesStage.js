import fs from "fs"
import path from "path"
import archiver from "archiver"
import Stage from "./stage"

export default class ZipFilesStage extends Stage {
  constructor(parent, name, dependencies, pathSegmentFactory, filesFactory) {
    super(parent, name, dependencies, pathSegmentFactory, filesFactory)
    this.pathSegmentFactory = pathSegmentFactory
    this.filesFactory = filesFactory
  }

  performStart() {
    const archive = archiver(`zip`)
    archive.on(`close`, () => this.done())
    archive.on(`error`, error => this.handle(error))
    archive.pipe(fs.createWriteStream(path.join.apply(path, this.pathSegmentFactory())))
    this
      .filesFactory()
      .forEach(file => archive.append(file.contents, { name: file.name }))
    archive.finalize()
  }
}
