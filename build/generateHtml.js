import * as fs from "fs"
import * as path from "path"
import favicons from "favicons"
import isPng from "is-png"
import pngcrushBin from "pngcrush-bin"
import execBuffer from "exec-buffer"

export default function (createdOrModifiedFiles, buildName, metadataPath, metadata, iconPath, distPath, onError, onSuccess) {
  if (createdOrModifiedFiles.has(metadataPath)
    || createdOrModifiedFiles.has(iconPath)) {
    console.log(`Generating favicons...`)
    favicons(iconPath, {
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
        android: buildName == `oneOff`,
        appleIcon: buildName == `oneOff`,
        appleStartup: buildName == `oneOff`,
        coast: buildName == `oneOff`,
        favicons: true,
        firefox: buildName == `oneOff`,
        windows: buildName == `oneOff`,
        yandex: buildName == `oneOff`
      }
    }, (error, response) => {
      if (error) {
        onError(error)
      } else {
        const files = response.images.concat(response.files)
        const totalFiles = files.length
        takeNextFile()

        function takeNextFile() {
          if (files.length) {
            const file = files.shift()
            if (buildName == `oneOff` && isPng(file.contents)) {
              console.log(`Compressing favicon file "${file.name}"... (${totalFiles - files.length}/${totalFiles})`)
              execBuffer({
                input: file.contents,
                bin: pngcrushBin,
                args: [`-brute`, `-force`, `-q`, `-reduce`, execBuffer.input, execBuffer.output]
              })
                .catch(onError)
                .then(compressed => {
                  file.contents = compressed
                  writeFile()
                })
            } else {
              writeFile()
            }
            function writeFile() {
              console.log(`Writing favicon file "${file.name}"... (${totalFiles - files.length}/${totalFiles})`)
              fs.writeFile(
                path.join(distPath, file.name),
                file.contents,
                err => {
                  if (err) {
                    onError(err)
                  } else {
                    takeNextFile()
                  }
                }
              )
            }
          } else {
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
                  ${response.html.join(``)}
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
          }
        }
      }
    })
  } else {
    console.log(`Skipped regeneration of HTML.`)
    onSuccess()
  }
}
