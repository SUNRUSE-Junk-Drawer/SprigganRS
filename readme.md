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

```

## Variables

| Name    | Initialization | Views     | Callbacks  |
|---------|----------------|-----------|------------|
| state   | Read/write     | Read-only | Read/write |
| content | Read-only      | Read-only | Read-only  |
| borders | No             | Read-only | No         |

### state

The JSON-serializable game state.
Initially an empty anonymous object.

### content

Any files considered content are stored inside an object.  Filenames are split
by slashes to form hierarchy:

- `a/b/c/d`
- `e/f/g/h`
- `a/b/i/j`
- `a/b/c/k`

```json
{
  a: {
    b: {
      c: {
        d: "(varies by content type)",
        k: "(varies by content type)"
      },
      i: {
        j: "(varies by content type)"
      }
    }
  },
  e: {
    f: {
      g: {
        h: "(varies by content type)"
      }
    }
  }
}
```

If the path ends with two slashes, this is taken to mean a file with a name of
a slash inside a folder:

| Input             | 1     | 2       | 3   |
|-------------------|-------|---------|-----|
| `fonts/default//` | fonts | default | /   |
| `fonts/default/\` | fonts | default | \   |
| `fonts\default\/` | fonts | default | /   |
| `fonts\default\\` | fonts | default | \   |

### borders

Contains the borders of the page, in scene graph coordinates.

```js
/* Assuming that the page is wider than the configured 320x180 "safe zone". */
console.log(borders.left)   /* -4.78 */
console.log(borders.right)  /* 324.78 */
console.log(borders.top)    /* 0 */
console.log(borders.bottom) /* 180 */
```

## Functions

| Name         | Initialization | Views | Callbacks |
|--------------|----------------|-------|-----------|
| view         | Yes            | No    | No        |
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
| batch        | Yes            | No    | Yes       |
| pause        | Yes            | No    | Yes       |
| resume       | Yes            | No    | Yes       |

### View

Defines a new view "pass"/"layer".

```js
var viewReference = view("View Name", function() {
  return aSceneGraph
})
```

### Sprite

Draws a specified SVG.

```js
var sceneGraph = sprite("Object Name", stringContainingSvgWhichWasLikelyImported)
```

### Move

Translates a child by a given number of units.

```js
var sceneGraph = move(
  14, // 14 units right.
  7,  // 7 units down.
  childSceneGraph
)
```

```js
var sceneGraph = moveBetween(
  14, // Linearly interpolate from 14 units right.
  7,  // Linearly interpolate from 7 units down.
  11, // Linearly interpolate to 11 units right.
  29, // Linearly interpolate to 29 units down.
  46, // Start moving at 46 seconds of elapsed time.
  72, // Stop moving at 72 seconds of elapsed time.
  childSceneGraph
)
```

```js
var sceneGraph = moveBetween(
  14, // Linearly interpolate from 14 units right.
  7,  // Linearly interpolate from 7 units down.
  11, // Linearly interpolate to 11 units right.
  29, // Linearly interpolate to 29 units down.
  46, // Start moving at 46 seconds of elapsed time.
  72, // Stop moving at 72 seconds of elapsed time.
  childSceneGraph,
  function() { /* Executed at 72 seconds of elapsed time. */ }
)
```

```js
var sceneGraph = moveBetween(
  14, // Linearly interpolate from 14 units right.
  7,  // Linearly interpolate from 7 units down.
  11, // Linearly interpolate to 11 units right.
  29, // Linearly interpolate to 29 units down.
  46, // Start moving at 46 seconds of elapsed time.
  2,  // Moves at 2 units per second.
  childSceneGraph
)
```

```js
var sceneGraph = moveBetween(
  14, // Linearly interpolate from 14 units right.
  7,  // Linearly interpolate from 7 units down.
  11, // Linearly interpolate to 11 units right.
  29, // Linearly interpolate to 29 units down.
  46, // Start moving at 46 seconds of elapsed time.
  2,  // Move at 2 units per second.
  childSceneGraph,
  function() { /* Executed on reaching the destination. */ }
)
```

Note: if wrapped in a scaling function, the move itself will be scaled:

```js
// Actually moves 7, 12 units.
var sceneGraph = scale(0.5, 2, move(14, 6, childSceneGraph))
```

### Scale

Multiplies the size of a child scene graph by a given factor.

```js
var sceneGraph = scale(
  2,   // Double in size horizontally.
  0.5, // Halve in size vertically.
  childSceneGraph
)
```

```js
var sceneGraph = scale(
  2,    // Linearly interpolate from doubling in size horizontally.
  0.5,  // Linearly interpolate from halving in size vertically.
  3,    // Linearly interpolate to tripling in size horizontally.
  0.25, // Linearly interpolate to dividing its size by 4 vertically.
  46,   // Start scaling at 46 seconds of elapsed time.
  72,   // Stop scaling at 72 seconds of elapsed time.
  childSceneGraph
)
```

```js
var sceneGraph = scale(
  2,    // Linearly interpolate from doubling in size horizontally.
  0.5,  // Linearly interpolate from halving in size vertically.
  3,    // Linearly interpolate to tripling in size horizontally.
  0.25, // Linearly interpolate to dividing its size by 4 vertically.
  46,   // Start scaling at 46 seconds of elapsed time.
  72,   // Stop scaling at 72 seconds of elapsed time.
  childSceneGraph,
  function() { /* Executed at the end of the scaling. */ }
)
```

### Fade

Multiplies the opacity of a child scene graph by a given factor.
Clamped to 0 and 1 at the time of emitting objects.
This additionally adjusts the volume of sounds.

```js
var sceneGraph = fade(
  0.3, // 30% opacity.
  childSceneGraph
)
```

```js
var sceneGraph = fadeBetween(
  0.25, // Linearly interpolate from 25% opacity.
  0.75, // Linearly interpolate to 75% opacity.
  46,   // Start fading at 46 seconds of elapsed time.
  72,   // Stop fading at 72 seconds of elapsed time.
  childSceneGraph
)
```

```js
var sceneGraph = fadeBetween(
  0.25, // Linearly interpolate from 25% opacity.
  0.75, // Linearly interpolate to 75% opacity.
  46,   // Start fading at 46 seconds of elapsed time.
  72,   // Stop fading at 72 seconds of elapsed time.
  childSceneGraph,
  function() { /* Executed at the end of the fading. */ }
)
```

### Click

Executes a callback (and subsequently re-renders) on clicking on any object emitted by a child scene graph.

```js
var sceneGraph = click(
  childSceneGraph,
  function () { /* Executed on clicking on the below child scene graph. */ }
)
```

Note: if multiple calls are nested, only the inner-most handler will be used on clicking on its children:

```js
click([
  childSceneGraphA,
  click(
    childSceneGraphB,
    function() {
      /* Called only on clicking on childSceneGraphB. */
    }
  ),
  childSceneGraphC
], function() {
/* Called only on clicking on childSceneGraphA or childSceneGraphC. */
})
```

### Delays

Executes a callback (and subsequently re-renders) at a specified time.

```js
var sceneGraph = at(46, function () {
  /* Called at 46 seconds of elapsed time. */
})
```

### Batch

Caches a complex child scene graph, meaning it is only generated once.

```js
var cached = batch(childSceneGraph)

var sceneGraph = sprite("Object Name", cached)
```

### Pause

Pauses a view's timer.  Has no effect if already paused.

```js
pause(viewReference)
```

### Resume

Unpauses a view's timer.  Has no effect if not paused.

```js
resume(viewReference)
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

Included in the `content` object.  If an Inkscape SVG with multiple layers is
found, it is split into one piece of content per layer and their names are
included in their file names; a file with a name of:

`a/b/c.svg`

Containing layers:

- `d/e/f`
- `g/h/i`
- `j/k/l`

Is equivalent to separate files of:

- `a/b/c/d/e/f`
- `a/b/c/g/h/i`
- `a/b/c/j/k/l`

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
