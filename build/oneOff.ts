import * as util from "util"
import * as fs from "fs"
import * as paths from "./paths"
import run from "./run"

const fsReaddir = util.promisify(fs.readdir)
const fsStat = util.promisify(fs.stat)

program().then(
  () => console.log(`Done.`),
  (error: any) => {
    console.error(error)
    process.exit(1)
  }
)

async function program(): Promise<void> {
  const allPaths: { [path: string]: number } = {}

  await recurse(`src`)
  await run(allPaths, `oneOff`)

  async function recurse(directory: string): Promise<void> {
    for (let file of await fsReaddir(directory)) {
      file = paths.join(directory, file)
      const stats = await fsStat(file)
      if (stats.isFile()) {
        allPaths[file] = stats.mtime.getTime()
      } else if (stats.isDirectory()) {
        await recurse(file)
      } else {
        console.warn(`Ignoring unexpected filesystem record "${file}"`)
      }
    }
  }
}
