var engineViewport = document.createElement("DIV")
engineViewport.style.position = "fixed"
engineViewport.style.left = 0
engineViewport.style.right = 0
engineViewport.style.top = 0
engineViewport.style.bottom = 0
engineViewport.style.overflow = "hidden"
document.body.appendChild(engineViewport)

var borders = {}

function engineRefresh() {
  var width = engineViewport.clientWidth
  var height = engineViewport.clientHeight

  var scaleFillingWidth = width / metadataWidth
  var scaleFillingHeight = height / metadataHeight

  engineScale = Math.min(scaleFillingWidth, scaleFillingHeight)

  var realWidth = width / engineScale
  var realHeight = height / engineScale

  borders.left = (realWidth - metadataWidth) / -2
  borders.right = realWidth + borders.left
  borders.top = (realHeight - metadataHeight) / -2
  borders.bottom = realHeight + borders.top
}

onresize = engineRefresh
setTimeout(engineRefresh, 0)
