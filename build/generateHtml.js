import * as fs from "fs"
import * as path from "path"

export default function (createdOrModifiedFiles, metadataPath, metadata, iconPath, distPath, onError, onSuccess) {
  if (createdOrModifiedFiles.has(metadataPath)
    || createdOrModifiedFiles.has(iconPath)) {
    const htmlPath = path.join(distPath, `index.html`)
    console.log(`Writing "${htmlPath}"...`)
    fs.writeFile(
      htmlPath,
      `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${metadata.name}</title>
          <meta name="viewport" content="initial-scale=1, minimum-scale=1, maximum-scale=1, width=device-width, height=device-height, user-scalable=no">
        </head>
        <body style="background: black; color: white;">
          <div id="message" style="position: fixed; font-family: sans-serif; font-size: 0.5cm; top: 50%; line-height: 0.5cm; transform: translateY(-50%); left: 0; right: 0; text-align: center;">Loading; please ensure that JavaScript is enabled.</div>
          <script src="index.js"></script>
        </body>
      </html>`,
      error => {
        if (error) {
          onError(error)
        } else {
          onSuccess()
        }
      }
    )
  } else {
    console.log(`Skipped regeneration of HTML.`)
    onSuccess()
  }
}
