# SprigganRS
A "reactive" event-driven web game engine.

## Architecture
```
               .-> video
state -> view -|-> audio
  ^            |-> interactions -.
  |            '-> timers ------.|
   '-----------------------------'
```
All game state is stored in a JSON-serializable value called **state**.

This is then converted into a **scene graph** by a function called a **view** which is interpreted to produce video, audio and points of interaction.

## Coordinate Space
```
                      .----------------.
.-------------------. |░░░░░░░░░░░░░░░░|
|░░O            X+░░| |O             X+|
|░░               ░░| |                |
|░░Y+             ░░| |Y+              |
'-------------------' |░░░░░░░░░░░░░░░░|
                      '----------------'
```
A "safe zone" (shown unshaded) is centered in the page and scaled to be as large as possible while keeping within its boundaries.  The remaining space (shown shaded) is not cropped or trimmed; in wider viewers, additional background may be visible to the left and right of the "safe zone", while in taller viewers, it may be visible above and below.

The coordinate space is a number of "units" wide (X) and tall (Y) (defined in the game's "metadata.json"), where 0, 0 is the top left corner.

## Game script

A game script is structured as follows:

```js
function game() {
  /* View. */
}

function ui() {
  /* View. */
}
```

## Variables

| Name    | Initialization | Views     | Callbacks  |
|---------|----------------|-----------|------------|
| state   | Read/write     | Read-only | Read/write |
| borders | No             | Read-only | No         |
| times   | Read-only      | Read-only | Read-only  |

### state

The JSON-serializable game state.
Initially an empty anonymous object.

### borders

Contains the borders of the page, in scene graph coordinates.

```js
/* Assuming that the page is wider than the configured 320x180 "safe zone". */
console.log(borders.left)   /* -4.78 */
console.log(borders.right)  /* 324.78 */
console.log(borders.top)    /* 0 */
console.log(borders.bottom) /* 180 */
```

### times

Elapsed times, in seconds.

```js
/* When the game has been running for 6.2 seconds, but the game was paused after 4.9. */
console.log(times.game) /* 4.9 */
console.log(times.ui)   /* 6.2 */
```

Note: it is important these be used over any external timers as they are monotonic, and will indicate the time for the event being processed, not the actual elapsed time.

## Functions

| Name         | Initialization | Views | Callbacks |
|--------------|----------------|-------|-----------|
| sprite       | No             | Yes   | No        |
| move         | No             | Yes   | No        |
| moveBetween  | No             | Yes   | No        |
| moveAt       | No             | Yes   | No        |
| scale        | No             | Yes   | No        |
| scaleBetween | No             | Yes   | No        |
| fade         | No             | Yes   | No        |
| fadeBetween  | No             | Yes   | No        |
| click        | No             | Yes   | No        |
| at           | No             | Yes   | No        |
| batch        | No             | Yes   | No        |
| keepBatch    | No             | Yes   | No        |
| pause        | Yes            | No    | Yes       |
| resume       | Yes            | No    | Yes       |

### Sprite

Draws a specified SVG.

```js
sprite("Object Name", stringContainingSvgWhichWasLikelyImported)
```

### Move

Translates a child by a given number of units.

```js
move(14, 7, function () {
  /* The child scene graph to move 14 units right and 7 units down. */
})

moveBetween(14, 7, 11, 29, 46, 72, function () {
  /* The child scene graph; linearly interpolates
     from 14 units right and 7 units down
     to 11 units right and 29 units down
     between 46 and 72 seconds of elapsed time. */
})

moveBetween(14, 7, 11, 29, 46, 72, function () {
  /* The child scene graph; linearly interpolates
     from 14 units right and 7 units down
     to 11 units right and 29 units down
     between 46 and 72 seconds of elapsed time. */
}, function () {
/* Callback executed at 72 seconds of elapsed time. */
})

moveAt(14, 7, 11, 29, 46, 2, function () {
  /* The child scene graph; linearly interpolates
     from 14 units right and 7 units down
     to 11 units right and 29 units down
     at 2 units per second starting at 46 seconds of elapsed time. */
})

moveAt(14, 7, 11, 29, 46, 2, function () {
  /* The child scene graph; linearly interpolates
     from 14 units right and 7 units down
     to 11 units right and 29 units down
     at 2 units per second starting at 46 seconds of elapsed time. */
}, function () {
  /* Callback executed on reaching the destination. */
})
```

Note: if wrapped in a scaling function, the move itself will be scaled:

```js
scale(0.5, function() {
  move(14, 6, function () {
    /* Actually moves 7, 3 units. */
  })
})
```

### Scale

Multiplies the size of a child scene graph by a given factor.

```js
scale(2, 0.5, function () {
  /* The child scene graph to double in size on the X axis and halve in size on the Y axis. */
})

scaleBetween(2, 0.5, 3, 0.25, 46, 72, function () {
  /* The child scene graph; linearly interpolates
     from doubling in size on the X axis and halving in size on the Y axis
     to tripling in size on the X axis in dividing its size by 4 four on the Y axis
     between 46 and 72 seconds of elapsed time. */
}, function () {
  /* Callback executed at 72 seconds of elapsed time. */
})
```

### Fade

Multiplies the opacity of a child scene graph by a given factor.
Clamped to 0 and 1 at the time of emitting objects.
This additionally adjusts the volume of sounds.

```js
fade(0.5, function () {
  /* The child scene graph to make semi-transparent. */
})

fadeBetween(0.25, 0.75, 46, 72, function () {
  /* The child scene graph; linearly interpolates
     from 25% opacity
     to 75% opacity
     between 46 and 72 seconds of elapsed time. */
})

fadeBetween(0.25, 0.75, 46, 72, function () {
  /* The child scene graph; linearly interpolates
     from 25% opacity
     to 75% opacity
     between 46 and 72 seconds of elapsed time. */
}, function () {
  /* Callback executed at the end of the fade. */
})
```

### Click

Executes a callback (and subsequently re-renders) on clicking on any object emitted by a child scene graph.

```js
click(function () {
  /* Called on clicking on the below child scene graph. */
}, function () {
  /* The child scene graph which can be clicked on. */
})
```

Note: if multiple calls are nested, only the inner-most handler will be used on clicking on its children:

```js
click(function () {
  /* Called only on clicking on A or C. */
}, function () {
  /* A. */
  click(function () {
    /* Called only on clicking on B. */
  }, function () {
    /* B. */
  })
  /* C. */
})
```

### Delays

Executes a callback (and subsequently re-renders) at a specified time.

```js
at(46, function () {
  /* Called at 46 seconds of elapsed time. */
})
```

### Batch

Caches a complex child scene graph, meaning it is only generated once.

```js
batch("Object Name", "Cache Key", function () { /* Scene graph to draw. */ })
```

Note: the cache will be dropped if it is not used during a scene.  Call keepBatch to keep it cached without actually drawing it.

```js
keepBatch("Cache Key", function () { /* Scene graph to cache, but not draw. */ })
```

### Pause

Pauses the game timer.  Has no effect if already paused.

```js
pause()
```

### Resume

Unpauses the game timer.  Has no effect if not paused.

```js
resume()
```

## Project Structure

```
|'- dist
|   |'- (game name).zip
|    '- (game name)
|       |'- index.html
|        '- index.js
 '- src
    |'- bootloader
    |   '- (**/*.js)
    |'- engine
    |   '- (**/*.js)
     '- (game name)
        |'- metadata.json
        |'- icon.svg
        |'- (**/*.js)
         '- (**/*.svg)
```

### dist/(game name).zip

A zip file containing every part of the corresponding game, minfied, but not
including debugging tools.  Only produced by "one-off" builds.

### dist/(game name)

A directory containing every part of the corresponding game, including debugging
tools, without much in the way of minification.  Only produced by "watch"
builds.

### src/bootloader/**/*.js

All JavaScript in the "src/bootloader" directory (and its subdirectories) is
loaded at startup, and is responsible for handling errors and loading all other
content.

### src/engine/**/*.js

All JavaScript in the "src/engine" directory (and its subdirectories) is
included in every game.  This is the runtime engine.  It is responsible for:

- Timing.
- DOM manipulation.
- Input.
- Save/load.
- Debugging tools.
- State management.

### src/games/(game name)/metadata.json

A JSON file describing that particular game.

```json
{
  "name": "Game Name",
  "description": "Game Description",
  "developer": {
    "name": "Developer Name",
    "url": "https://example.com"
  },
  "width": 320,
  "height": 180
}
```

#### name

Shown as the page title, and when "pinned" to the home screen of a mobile
device.

#### description

A short description of the game, included in metadata.

#### developer.name

The name of the developer of the game, included in metadata.

#### developer.url

The URL of the developer of the game, included in metadata.

#### width

The number of units the "safe zone" is "wide" (see Coordinate Space).

#### width

The number of units the "safe zone" is "tall" (see Coordinate Space).

### src/games/(game name)/icon.svg

An icon to use; shown as a favicon, splash screen and when "pinned" to the home
screen of a mobile devce.  Expected to be square.

### src/games/(game name)/**/*.js

Included as game code.  The order in which it is included is non-deterministic.

### src/games/(game name)/**/*.svg

Included in the game; declarations are added to the JavaScript global namespace.
However, the name requires some manipulation to fit into a JavaScript variable
name.

For example:
`src/games/Example Game/Example Dir A/Example Dir B/Example Dir C/Example File.svg`

Becomes:
`exampleDirAExampleDirBExampleDirCExampleFileSvg`

## Building

The final build product is a set of files which can be hosted on a HTTP/S server
to play the game.

"Watch" builds will automatically host such a server on HTTP port 5000.
Navigate to http://localhost:5000/game-name to test your game.

Fork this repository to develop your own games.

### Visual Studio Code

Build tasks exist for many common tasks.  Generally, you would want to run
"Install dependencies", then "Watch for changes" for local development tasks.

### Travis CI

The default Travis CI configuration will build all games and publish them as
separate zip files as GitHub release assets.  However, the "deploy" section of
the .travis.yml file will need to be regenerated as the access token will not
be applicable to your fork's GitHub repository or Travis CI instance; see the
[Travis CI documentation](https://docs.travis-ci.com/user/deployment/releases/)
for details on how to do this.
