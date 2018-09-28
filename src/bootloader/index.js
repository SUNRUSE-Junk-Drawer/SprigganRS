function SetMessage(to) {
  var message = document.getElementById("message")
  if (!message) {
    return
  }

  message.innerText = to
  message.textContext = to
  message.style.display = "block"
}

var errorEncountered = false

onerror = function (message, source, lineno, colno) {
  if (errorEncountered) {
    return
  }

  errorEncountered = true

  SetMessage("Error on column " + colno + " of line " + lineno + " of file " + source + ":\n" + message)
}

SetMessage("Loading bootloader...")

function CloseMessage() {
  var message = document.getElementById("message")
  if (!message) {
    return
  }

  message.style.display = "none"
}

onload = function () {
  if (errorEncountered) {
    return
  }

  SetMessage("Loading scripts...")

  var loadedFiles = 0
  var totalFiles = 0

  function RefreshMessage() {
    SetMessage("Loading files... (" + loadedFiles + "/" + totalFiles + ")")
  }

  var script
  LoadFile("index.js", "text", function (file) { script = file })

  function LoadFile(url, responseType, then) {
    totalFiles++
    var request = new XMLHttpRequest()
    request.open("GET", url, true)
    request.responseType = responseType
    request.onload = function () {
      if (errorEncountered) {
        return
      }

      if (request.readyState != 4) {
        return
      }

      if (request.status < 200 || request.status > 299) {
        throw new Error("Unexpected HTTP status " + request.status + " while loading " + JSON.stringify(url))
      }

      then(request.response)

      loadedFiles++

      if (loadedFiles < totalFiles) {
        RefreshMessage()
        return
      }

      SetMessage("Starting scripts...")
      eval(script)
      CloseMessage()
    }
    request.send()
  }
}
