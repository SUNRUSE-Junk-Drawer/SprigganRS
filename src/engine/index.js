var state = {}

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
    paused: false,
    time: 0
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

function moveBetween(fromX, fromY, toX, toY, start, end, sceneGraph, callback) {
  return {
    moveBetween: {
      fromX: fromX,
      fromY: fromY,
      toX: toX,
      toY: toY,
      start: start,
      end: end,
      sceneGraph: sceneGraph,
      callback: callback
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

function at(time, callback) {
  return {
    delay: {
      at: time,
      callback: callback
    }
  }
}

function engineNextEventOf(accumulator, currentValue) {
  if (currentValue && (!accumulator || currentValue.at < accumulator.at)) {
    return currentValue
  } else {
    return accumulator
  }
}

var engineBaseTransform
var engineTransformStack = []

function engineBuildTransformString(at) {
  var output = engineBaseTransform
  engineTransformStack.forEach(function (pass) {
    if (pass.move) {
      output += " translate(" + pass.move.x + "px, " + pass.move.y + "px)"
    } else if (pass.moveBetween) {
      if (at <= pass.moveBetween.start) {
        output += " translate(" + pass.moveBetween.fromX + "px, " + pass.moveBetween.fromY + "px)"
      } else if (at >= pass.moveBetween.end) {
        output += " translate(" + pass.moveBetween.toX + "px, " + pass.moveBetween.toY + "px)"
      } else {
        var alpha = (at - pass.moveBetween.start) / (pass.moveBetween.end - pass.moveBetween.start)
        var inverseAlpha = 1 - alpha
        output += " translate(" + (pass.moveBetween.fromX * inverseAlpha + pass.moveBetween.toX * alpha) + "px, " + (pass.moveBetween.fromY * inverseAlpha + pass.moveBetween.toY * alpha) + "px)"
      }
    } else if (pass.scale) {
      output += " scale(" + pass.scale.x + ", " + pass.scale.y + ")"
    }
  })
  return output
}

function engineCalculateOpacity(at) {
  var output = 1
  engineTransformStack.forEach(function (pass) {
    if (pass.fade) {
      output *= pass.fade.opacity
    }
  })
  return output
}

function engineRecurseSceneGraphToRender(view, sceneGraph, click) {
  if (sceneGraph) {
    if (Array.isArray(sceneGraph)) {
      sceneGraph.forEach(function (childSceneGraph) {
        engineRecurseSceneGraphToRender(view, childSceneGraph, click)
      })
    } else if (sceneGraph.sprite) {
      var object

      for (var i = 0; i < view.objects.length; i++) {
        object = view.objects[i]
        if (object.name != sceneGraph.sprite.name) {
          continue
        }

        if (i < view.emittedElements) {
          throw new Error("Object \"" + object.name + "\" emitted twice by the \"" + view.name + "\" view")
        }

        if (i > view.emittedElements) {
          view.element.insertBefore(object.element, view.objects[view.emittedElements].element)
          view.objects.splice(i, 1)
          view.objects.splice(view.emittedElements, 0, object)
        }

        view.emittedElements++

        break
      }

      var start = null
      var end = null
      var transformFrom, transformTo, opacityFrom, opacityTo
      var startDate, endDate

      if (view.paused) {
        transformFrom = engineBuildTransformString(view.time)
        transformTo = null
        opacityFrom = engineCalculateOpacity(view.time)
        opacityTo = null
        startDate = null
        endDate = null
      } else {
        engineTransformStack.forEach(function (pass) {
          if (pass.moveBetween
            && pass.moveBetween.start <= view.time
            && pass.moveBetween.end > view.time) {
            if (start == null) {
              start = pass.moveBetween.start
              end = pass.moveBetween.end
            } else {
              start = Math.max(start, pass.moveBetween.start)
              end = Math.min(end, pass.moveBetween.end)
            }
          }
        })

        if (start == null) {
          transformFrom = engineBuildTransformString(view.time)
          transformTo = null
          opacityFrom = engineCalculateOpacity(view.time)
          opacityTo = null
          startDate = null
          endDate = null
        } else {
          transformFrom = engineBuildTransformString(start)
          transformTo = engineBuildTransformString(end)
          opacityFrom = engineCalculateOpacity(start)
          opacityTo = engineCalculateOpacity(end)
          startDate = (engineNow / 1000) + start - game.time
          endDate = (engineNow / 1000) + end - game.time
        }
      }

      if (i == view.objects.length) {
        object = {
          name: sceneGraph.sprite.name,
          element: document.createElement("IMG"),
          svg: sceneGraph.sprite.svg,
          transformFrom: transformFrom,
          transformTo: transformTo,
          opacityFrom: opacityFrom,
          opacityTo: opacityTo,
          startDate: startDate,
          endDate: endDate,
          click: click
        }

        object.element.style.position = "absolute"
        object.element.setAttribute("src", "data:image/svg+xml," + encodeURIComponent(sceneGraph.sprite.svg))
        object.element.style.transformOrigin = "left top"
        object.element.style.transform = transformFrom
        object.element.style.opacity = opacityFrom
        object.element.onclick = function () {
          if (object.click) {
            engineRefresh(object.click)
          }
        }
        if (view.objects.length > view.emittedElements) {
          view.element.insertBefore(object.element, view.objects[view.emittedElements].element)
        } else {
          view.element.appendChild(object.element)
        }
        if (end != null) {
          window.getComputedStyle(object.element, undefined).getPropertyValue("left")
          object.element.style.transition = "transform " + (end - start) + "s linear, opacity" + (end - start) + "s linear"
          object.element.style.transform = transformTo
          object.element.style.opacity = opacityTo
        }
        view.objects.splice(view.emittedElements, 0, object)
        view.emittedElements++
        return
      }

      if (object.svg != sceneGraph.sprite.svg) {
        object.svg = sceneGraph.sprite.svg
        object.element.setAttribute("src", "data:image/svg+xml," + encodeURIComponent(sceneGraph.sprite.svg))
      }

      if (
        transformFrom != object.transformFrom
        || transformTo != object.transformTo
        || opacityFrom != object.opacityFrom
        || opacityTo != object.opacityTo
        || Math.abs(startDate - object.startDate) > 0.01
        || Math.abs(endDate - object.endDate) > 0.01
      ) {
        object.element.style.transform = transformFrom
        object.element.style.opacity = opacityFrom
        if (end == null) {
          object.element.style.transition = "initial"
        } else {
          window.getComputedStyle(object.element, undefined).getPropertyValue("left")
          object.element.style.transition = "transform " + (end - start) + "s linear, opacity" + (end - start) + "s linear"
          object.element.style.transform = transformTo
          object.element.style.opacity = opacityTo
        }
        object.transformFrom = transformFrom
        object.transformTo = transformTo
        object.opacityFrom = opacityFrom
        object.opacityTo = opacityTo
        object.startDate = startDate
        object.endDate = endDate
      }

      object.click = click
    } else if (sceneGraph.move) {
      engineTransformStack.push(sceneGraph)
      engineRecurseSceneGraphToRender(view, sceneGraph.move.sceneGraph, click)
      engineTransformStack.pop()
    } else if (sceneGraph.moveBetween) {
      engineTransformStack.push(sceneGraph)
      engineRecurseSceneGraphToRender(view, sceneGraph.moveBetween.sceneGraph, click)
      engineTransformStack.pop()
    } else if (sceneGraph.scale) {
      engineTransformStack.push(sceneGraph)
      engineRecurseSceneGraphToRender(view, sceneGraph.scale.sceneGraph, click)
      engineTransformStack.pop()
    } else if (sceneGraph.fade) {
      engineTransformStack.push(sceneGraph)
      engineRecurseSceneGraphToRender(view, sceneGraph.fade.sceneGraph, click)
      engineTransformStack.pop()
    } else if (sceneGraph.click) {
      engineTransformStack.push(sceneGraph)
      engineRecurseSceneGraphToRender(view, sceneGraph.click.sceneGraph, sceneGraph.click.then)
      engineTransformStack.pop()
    }
  }
}

function engineNoOp() { }

function engineRecurseSceneGraphToFindNextEvent(view, sceneGraph) {
  if (sceneGraph) {
    if (Array.isArray(sceneGraph)) {
      var output = null
      for (var i = 0; i < sceneGraph.length; i++) {
        output = engineNextEventOf(
          output,
          engineRecurseSceneGraphToFindNextEvent(view, sceneGraph[i])
        )
      }
      return output
    } else if (sceneGraph.move) {
      return engineRecurseSceneGraphToFindNextEvent(view, sceneGraph.move.sceneGraph)
    } else if (sceneGraph.moveBetween) {
      var output
      if (sceneGraph.moveBetween.start > view.time) {
        output = {
          view: view,
          at: sceneGraph.moveBetween.start,
          callback: engineNoOp
        }
      } else if (sceneGraph.moveBetween.callback) {
        output = {
          view: view,
          at: sceneGraph.moveBetween.end,
          callback: sceneGraph.moveBetween.callback
        }
      } else if (sceneGraph.moveBetween.end > view.time) {
        output = {
          view: view,
          at: sceneGraph.moveBetween.end,
          callback: engineNoOp
        }
      } else {
        output = null
      }
      return engineNextEventOf(output, engineRecurseSceneGraphToFindNextEvent(view, sceneGraph.moveBetween.sceneGraph))
    } else if (sceneGraph.scale) {
      return engineRecurseSceneGraphToFindNextEvent(view, sceneGraph.scale.sceneGraph)
    } else if (sceneGraph.fade) {
      return engineRecurseSceneGraphToFindNextEvent(view, sceneGraph.fade.sceneGraph)
    } else if (sceneGraph.click) {
      return engineRecurseSceneGraphToFindNextEvent(view, sceneGraph.click.sceneGraph)
    } else if (sceneGraph.delay) {
      return {
        view: view,
        at: sceneGraph.delay.at,
        callback: sceneGraph.delay.callback
      }
    }
  }
}

function engineGetNextEvent() {
  var output = null
  engineViews
    .filter(function (view) {
      return !view.paused
    })
    .forEach(function (view) {
      output = engineNextEventOf(
        output,
        engineRecurseSceneGraphToFindNextEvent(view, view.sceneGraphFactory())
      )
    })
  return output
}

var borders = {}
var engineNow = + new Date

var engineTimeout = null

function engineRefresh(callback) {
  if (engineTimeout !== null) {
    clearTimeout(engineTimeout)
    engineTimeout = null
  }

  var nextEvent = engineGetNextEvent()

  var nextEventDelta = nextEvent
    ? nextEvent.at - nextEvent.view.time
    : 0

  var nextNow = + new Date
  var delta = Math.min(
    (nextNow - engineNow) / 1000,
    nextEventDelta + 0.25
  )
  engineNow = nextNow

  if (callback) {
    var callbackDelta
    if (nextEvent) {
      callbackDelta = Math.min(nextEvent.at, delta)
    } else {
      callbackDelta = delta
    }

    engineViews
      .filter(function (view) { return !view.paused })
      .forEach(function (view) { view.time += callbackDelta })

    delta -= callbackDelta

    callback()

    nextEvent = engineGetNextEvent()
  }

  while (true) {
    if (nextEvent) {
      var requiredDelta = nextEvent.at - nextEvent.view.time
      if (requiredDelta <= delta) {
        engineViews
          .filter(function (view) { return !view.paused })
          .forEach(function (view) { view.time += requiredDelta })
        delta -= requiredDelta
        nextEvent.callback()
        nextEvent = engineGetNextEvent()
        continue
      }
    }

    engineViews
      .filter(function (view) { return !view.paused })
      .forEach(function (view) { view.time += delta })
    break
  }

  if (nextEvent) {
    setTimeout(engineRefresh, (nextEvent.at - nextEvent.view.time) * 1000)
  }

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

  engineBaseTransform = "translate(" + x + "px, " + y + "px) scale(" + scale + ")"

  for (var i = 0; i < engineViews.length; i++) {
    var view = engineViews[i]
    view.emittedElements = 0
    engineRecurseSceneGraphToRender(view, view.sceneGraphFactory(), null)
    while (view.objects.length > view.emittedElements) {
      var object = view.objects.pop()
      view.element.removeChild(object.element)
    }
  }
}

onresize = engineRefresh
setTimeout(engineRefresh, 0)
