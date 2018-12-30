import * as util from "util"
import * as fs from "fs"
import * as mkdirp from "mkdirp"
import * as rimraf from "rimraf"
import * as types from "./types"
import * as paths from "./paths"
import generateHtml from "./generateHtml"
import * as _package from "./_package"
import svgo from "./svgo"

const fsReadFile = util.promisify(fs.readFile)
const fsWriteFile = util.promisify(fs.writeFile)
const mkdirpPromisified = util.promisify(mkdirp)
const rimrafPromisified = util.promisify(rimraf)

export async function created(
  oldState: types.state,
  newState: types.state,
  buildName: types.buildName,
  gameName: string,
  audioFormats: types.audioFormat[]
): Promise<void> {
  console.log(`Creating "${paths.tempBuildGame(buildName, gameName)}"...`)
  await mkdirpPromisified(paths.tempBuildGame(buildName, gameName))

  console.log(`Creating "${paths.distBuildGame(buildName, gameName)}"...`)
  await mkdirpPromisified(paths.distBuildGame(buildName, gameName))

  await updated(oldState, newState, buildName, gameName, audioFormats)
}

export async function updated(
  oldState: types.state,
  newState: types.mutable<types.state>,
  buildName: types.buildName,
  gameName: string,
  audioFormats: types.audioFormat[]
): Promise<void> {
  console.log(`Updating game "${gameName}"...`)

  if (!Object.prototype.hasOwnProperty.call(newState.paths, paths.srcGameMetadata(gameName))) {
    throw new Error(`Game "${gameName}" does not appear to have a "metadata.json" file`)
  } else if (!Object.prototype.hasOwnProperty.call(newState.paths, paths.srcGameIcon(gameName))) {
    throw new Error(`Game "${gameName}" does not appear to have an "icon.svg" file`)
  } else {
    const createdOrModifiedFiles = new Set(
      Object
        .keys(newState.paths)
        .filter(path => (/^src\/games\/([^\/]+)\/.*$/.exec(path) || [])[1] == gameName)
        .filter(path =>
          !Object.prototype.hasOwnProperty.call(oldState.paths, path)
          || oldState.paths[path] != newState.paths[path])
    )
    const deletedFiles = new Set(
      Object
        .keys(oldState.paths)
        .filter(path => (/^src\/games\/([^\/]+)\/.*$/.exec(path) || [])[1] == gameName)
        .filter(path => !Object.prototype.hasOwnProperty.call(newState.paths, path))
    )
    const changedFiles = new Set([...createdOrModifiedFiles, ...deletedFiles])

    const oldMetadata: types.metadata = Object.prototype.hasOwnProperty.call(oldState.games, gameName)
      ? oldState.games[gameName].metadata
      : {
        title: ``,
        description: ``,
        developer: {
          name: ``,
          url: ``
        },
        width: 0,
        height: 0,
        localizations: []
      }

    console.log(`Reading "${paths.srcGameMetadata(gameName)}"...`)
    const data = await fsReadFile(paths.srcGameMetadata(gameName), { encoding: `utf8` })
    console.log(`Parsing...`)
    let newMetadata: types.mutable<types.metadata> = JSON.parse(data)

    if (buildName == `watch`) {
      newMetadata.title = `DEVELOPMENT BUILD - ${newMetadata.title}`
    }

    if (Object.prototype.hasOwnProperty.call(newState.games, gameName)) {
      newState.games[gameName].metadata = newMetadata
    } else {
      newState.games[gameName] = {
        metadata: newMetadata
      }
    }

    const oldLocalizationNames = oldMetadata.localizations.map(localization => localization.name)
    const newLocalizationNames = newMetadata.localizations.map(localization => localization.name)
    for (const localizationName of oldLocalizationNames.filter(localizationName => !newLocalizationNames.includes(localizationName))) {
      console.log(`Deleting "${paths.distBuildGameLocalization(buildName, gameName, localizationName)}"...`)
      await rimrafPromisified(paths.distBuildGameLocalization(buildName, gameName, localizationName))
      console.log(`Deleting "${paths.tempBuildGameLocalization(buildName, gameName, localizationName)}"...`)
      await rimrafPromisified(paths.tempBuildGameLocalization(buildName, gameName, localizationName))
    }
    for (const localizationName of newLocalizationNames.filter(localizationName => !oldLocalizationNames.includes(localizationName))) {
      console.log(`Creating "${paths.distBuildGameLocalization(buildName, gameName, localizationName)}"...`)
      await mkdirpPromisified(paths.distBuildGameLocalization(buildName, gameName, localizationName))
    }

    const oldPackageNames = packageNames(oldState, gameName)
    const newPackageNames = packageNames(newState, gameName)

    const createdPackages = Array
      .from(newPackageNames)
      .filter(packageName => !oldPackageNames.has(packageName))

    const updatedPackages = Array
      .from(newPackageNames)
      .filter(packageName => oldPackageNames.has(packageName))
      .filter(packageName => changedFiles.has(paths.srcGameMetadata(gameName)) || Array.from(changedFiles).map(paths.isSrcGamePackage).includes(packageName))

    const deletedPackages = Array
      .from(oldPackageNames)
      .filter(packageName => !newPackageNames.has(packageName))

    for (const packageName of createdPackages) {
      await _package.created(oldState, newState, buildName, gameName, packageName, audioFormats)
    }

    for (const packageName of updatedPackages) {
      await _package.updated(oldState, newState, buildName, gameName, packageName, audioFormats)
    }

    for (const packageName of deletedPackages) {
      await _package.deleted(buildName, gameName, oldLocalizationNames, packageName, audioFormats)
    }

    await minifySvg(
      newState,
      createdOrModifiedFiles,
      paths.srcGameIcon(gameName),
      paths.distBuildGameIcon(buildName, gameName)
    )

    await generateHtml(
      createdOrModifiedFiles,
      buildName,
      paths.srcGameIcon(gameName),
      paths.distBuildGame(buildName, gameName),
      oldMetadata,
      newMetadata,
      `<body style="background: black; position: fixed; left: 50%; top: 50%; width: 100%; transform: translate(-50%, -50%); text-align: center; font-size: 0; margin: 0;">
          <img src="icon.svg" alt="${escapeHtml(newMetadata.title)}" style="width: 35vmin; height: 35vmin; margin: 2.5vmin;">
          <div>
            ${newMetadata.localizations.map(localization => `<a href="${escapeHtml(localization.name)}">
              <img src="${localization.name}/flag.svg" alt="${escapeHtml(localization.name)}" style="width: 24vmin; height: 24vmin; margin: 2.5vmin;">
            </a>`).join(``)}
        </div>
      </body>`
    )

    for (const newLocalization of newMetadata.localizations) {
      const oldLocalization = oldMetadata
        .localizations
        .find(oldLocalization => oldLocalization.name == newLocalization.name) || {
          title: ``,
          description: ``,
          developer: {
            name: ``,
            url: ``
          }
        }

      await minifySvg(
        newState,
        createdOrModifiedFiles,
        paths.srcGameLocalizationFlag(gameName, newLocalization.name),
        paths.distBuildGameLocalizationFlag(buildName, gameName, newLocalization.name)
      )

      await generateHtml(
        createdOrModifiedFiles,
        buildName,
        paths.srcGameLocalizationIcon(gameName, newLocalization.name),
        paths.distBuildGameLocalization(buildName, gameName, newLocalization.name),
        oldLocalization,
        newLocalization,
        `<body style="background: black; color: white;">
          <div id="message" style="position: fixed; font-family: sans-serif; font-size: 0.5cm; top: 50%; line-height: 0.5cm; transform: translateY(-50%); left: 0; right: 0; text-align: center;">Loading; please ensure that JavaScript is enabled.</div>
          <script src="index.js"></script>
        </body>`
      )
    }
  }
}

async function minifySvg(
  newState: types.state,
  createdOrModifiedFiles: Set<string>,
  srcFileName: string,
  distFileName: string
): Promise<void> {
  if (!Object.prototype.hasOwnProperty.call(newState.paths, srcFileName)) {
    throw new Error(`"${srcFileName}" does not exist.`)
  }

  if (!createdOrModifiedFiles.has(srcFileName)) {
    console.log(`Skipping regeneration of "${srcFileName}".`)
  } else {
    console.log(`Reading "${srcFileName}"...`)
    const data = await fsReadFile(srcFileName, { encoding: `utf8` })

    console.log(`Compressing...`)
    const optimized = await svgo.optimize(data)

    console.log(`Writing "${distFileName}"...`)
    await fsWriteFile(distFileName, optimized.data)
  }
}

export async function deleted(
  newState: types.mutable<types.state>,
  buildName: types.buildName,
  gameName: string
): Promise<void> {
  console.log(`Deleting "${paths.tempBuildGame(buildName, gameName)}"...`)
  await rimrafPromisified(paths.tempBuildGame(buildName, gameName))

  console.log(`Deleting "${paths.distBuildGame(buildName, gameName)}"...`)
  await rimrafPromisified(paths.distBuildGame(buildName, gameName))

  delete newState.games[gameName]
}

function packageNames(
  state: types.state,
  gameName: string
): Set<string> {
  return new Set(
    Object
      .keys(state.paths)
      .filter(path => paths.isSrcGame(path) == gameName)
      .map(paths.isSrcGamePackage)
      .filter((packageName: null | string): packageName is string => !!packageName)
  )
}

function escapeHtml(text: string): string {
  // Based on https://www.owasp.org/index.php/XSS_(Cross_Site_Scripting)_Prevention_Cheat_Sheet#RULE_.231_-_HTML_Escape_Before_Inserting_Untrusted_Data_into_HTML_Element_Content
  return text
    .replace(/&/g, `&amp;`)
    .replace(/</g, `&lt;`)
    .replace(/>/g, `&gt;`)
    .replace(/"/g, `&quot;`)
    .replace(/'/g, `&#39;`)
    .replace(/\//g, `&#47;`)
}
