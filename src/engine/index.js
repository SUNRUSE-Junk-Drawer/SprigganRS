var engineViewport = document.createElement("DIV")
engineViewport.style.position = "fixed"
engineViewport.style.left = 0
engineViewport.style.right = 0
engineViewport.style.top = 0
engineViewport.style.bottom = 0
engineViewport.style.overflow = "hidden"
document.body.appendChild(engineViewport)

var engineViews = []

function view(name, sceneGraphFactory) {
  var newView = {
    name: name,
    sceneGraphFactory: sceneGraphFactory,
    element: document.createElement("DIV"),
    objects: [],
    paused: false
  }
  newView.element.style.position = "absolute"
  newView.element.style.left = 0
  newView.element.style.right = 0
  newView.element.style.top = 0
  newView.element.style.bottom = 0
  newView.element.style.overflow = "hidden"
  engineViewport.appendChild(newView.element)
  engineViews.push(newView)
  return newView
}

function sprite(name, svg) {
  return {
    sprite: {
      name: name,
      svg: svg
    }
  }
}

function move(x, y, sceneGraph) {
  return {
    move: {
      x: x,
      y: y,
      sceneGraph: sceneGraph
    }
  }
}

function scale(x, y, sceneGraph) {
  return {
    scale: {
      x: x,
      y: y,
      sceneGraph: sceneGraph
    }
  }
}

function fade(opacity, sceneGraph) {
  return {
    fade: {
      opacity: opacity,
      sceneGraph: sceneGraph
    }
  }
}

function click(sceneGraph, then) {
  return {
    click: {
      sceneGraph: sceneGraph,
      then: then
    }
  }
}

function pause(view) {
  view.paused = true
}

function resume(view) {
  view.paused = false
}

function engineRecurseSceneGraph(view, sceneGraph, translationX, translationY, scaleX, scaleY, opacity, click) {
  if (sceneGraph) {
    if (Array.isArray(sceneGraph)) {
      sceneGraph.forEach(function (childSceneGraph) {
        engineRecurseSceneGraph(view, childSceneGraph, translationX, translationY, scaleX, scaleY, opacity, click)
      })
    } else if (sceneGraph.sprite) {
      var object

      for (var i = 0; i < view.objects.length; i++) {
        object = view.objects[i]
        if (object.name != sceneGraph.sprite.name) {
          continue
        }

        if (i < view.emittedElements) {
          throw new Error("Object \"" + s + "\" emitted twice by the \"" + view.name + "\" view")
        }

        if (i > view.emittedElements) {
          view.element.insertBefore(object.element, view.objects[view.emittedElements].element)
          view.objects.splice(i, 1)
          view.objects.splice(view.emittedElements, 0, object)
        }

        view.emittedElements++

        break
      }

      if (i == view.objects.length) {
        object = {
          name: sceneGraph.sprite.name,
          element: document.createElement("IMG"),
          svg: sceneGraph.sprite.svg,
          translationX: translationX,
          translationY: translationY,
          scaleX: scaleX,
          scaleY: scaleY,
          opacity: opacity,
          click: click
        }

        object.element.style.position = "absolute"
        object.element.setAttribute("src", "data:image/svg+xml," + encodeURIComponent(sceneGraph.sprite.svg))
        object.element.style.transform = "translate(" + translationX + "px, " + translationY + "px) scale(" + scaleX + ", " + scaleY + ")"
        object.element.style.opacity = opacity
        object.element.onclick = function () {
          if (object.click) {
            object.click()
            engineRefresh()
          }
        }
        if (view.objects.length > view.emittedElements) {
          view.element.insertBefore(object.element, view.objects[view.emittedElements].element)
        } else {
          view.element.appendChild(object.element)
        }
        view.objects.splice(view.emittedElements, 0, object)
        view.emittedElements++
        return
      }

      if (object.svg != sceneGraph.sprite.svg) {
        object.svg = sceneGraph.sprite.svg
        object.element.setAttribute("src", "data:image/svg+xml," + encodeURIComponent(sceneGraph.sprite.svg))
      }

      if (object.translationX != translationX || object.translationY != translationY || object.scaleX != scaleX || object.scaleY != scaleY) {
        object.translationX = translationX
        object.translationY = translationY
        object.scaleX = scaleX
        object.scaleY = scaleY
        object.element.style.transform = "translate(" + translationX + "px, " + translationY + "px) scale(" + scaleX + ", " + scaleY + ")"
      }

      if (object.opacity != opacity) {
        object.opacity = opacity
        object.element.style.opacity = opacity
      }

      object.click = click
    } else if (sceneGraph.move) {
      engineRecurseSceneGraph(view, sceneGraph.move.sceneGraph, translationX + scaleX * sceneGraph.move.x, translationY + scaleY * sceneGraph.move.y, scaleX, scaleY, opacity, click)
    } else if (sceneGraph.scale) {
      engineRecurseSceneGraph(view, sceneGraph.scale.sceneGraph, translationX, translationY, scaleX * sceneGraph.scale.x, scaleY * sceneGraph.scale.y, opacity, click)
    } else if (sceneGraph.fade) {
      engineRecurseSceneGraph(view, sceneGraph.fade.sceneGraph, translationX, translationY, scaleX, scaleY, opacity * sceneGraph.fade.opacity, click)
    } else if (sceneGraph.click) {
      engineRecurseSceneGraph(view, sceneGraph.click.sceneGraph, translationX, translationY, scaleX, scaleY, opacity, sceneGraph.click.then)
    }
  }
}

var borders = {}

function engineRefresh() {
  var width = engineViewport.clientWidth
  var height = engineViewport.clientHeight

  var scaleFillingWidth = width / metadataWidth
  var scaleFillingHeight = height / metadataHeight

  var scale = Math.min(scaleFillingWidth, scaleFillingHeight)

  var realWidth = width / scale
  var realHeight = height / scale

  borders.left = (realWidth - metadataWidth) / -2
  borders.right = realWidth + borders.left
  borders.top = (realHeight - metadataHeight) / -2
  borders.bottom = realHeight + borders.top

  var x = borders.left * -scale
  var y = borders.top * -scale

  for (var i = 0; i < engineViews.length; i++) {
    var view = engineViews[i]
    view.emittedElements = 0
    engineRecurseSceneGraph(view, view.sceneGraphFactory(), x, y, scale, scale, 1, null)
    while (view.objects.length > view.emittedElements) {
      var object = view.objects.pop()
      view.element.removeChild(object.element)
    }
  }
}

onresize = engineRefresh
setTimeout(engineRefresh, 0)
