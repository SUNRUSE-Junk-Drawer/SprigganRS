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
A 16:9 "safe zone" (shown unshaded) is centered in the page and scaled to be as large as possible while keeping within its boundaries.  The remaining space (shown shaded) is not cropped or trimmed; in wider viewers, additional background may be visible to the left and right of the "safe zone", while in taller viewers, it may be visible above and below.

The coordinate space is 320 "units" wide (X) and 180 "units" tall (Y), where 0, 0 is the top left corner.

## Game script

A game script is structured as follows:

```js
const game = () => {
  /* View. */
}

const ui = () => {
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
/* Assuming that the page is wider than 16:9. */
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

### Move

Translates a child by a given number of units.

```js
move(14, 7, () => {
  /* The child scene graph to move 14 units right and 7 units down. */
})

moveBetween(14, 7, 11, 29, 46, 72, () => {
  /* The child scene graph; linearly interpolates
     from 14 units right and 7 units down
     to 11 units right and 29 units down
     between 46 and 72 seconds of elapsed time. */
})

moveBetween(14, 7, 11, 29, 46, 72, () => {
  /* The child scene graph; linearly interpolates
     from 14 units right and 7 units down
     to 11 units right and 29 units down
     between 46 and 72 seconds of elapsed time. */
}, () => {
  /* Callback executed at 72 seconds of elapsed time. */
})

moveAt(14, 7, 11, 29, 46, 2, () => {
  /* The child scene graph; linearly interpolates
     from 14 units right and 7 units down
     to 11 units right and 29 units down
     at 2 units per second starting at 46 seconds of elapsed time. */
})

moveAt(14, 7, 11, 29, 46, 2, () => {
  /* The child scene graph; linearly interpolates
     from 14 units right and 7 units down
     to 11 units right and 29 units down
     at 2 units per second starting at 46 seconds of elapsed time. */
}, () => {
  /* Callback executed on reaching the destination. */
})
```

Note: if wrapped in a scaling function, the move itself will be scaled:

```js
scale(0.5, () => move(14, 6, () => {
  /* Actually moves 7, 3 units. */
}))
```

### Scale

Multiplies the size of a child scene graph by a given factor.

```js
scale(2, 0.5, () => {
  /* The child scene graph to double in size on the X axis and halve in size on the Y axis. */
})

scaleBetween(2, 0.5, 3, 0.25, 46, 72, () => {
  /* The child scene graph; linearly interpolates
     from doubling in size on the X axis and halving in size on the Y axis
     to tripling in size on the X axis in dividing its size by 4 four on the Y axis
     between 46 and 72 seconds of elapsed time. */
}, () => {
  /* Callback executed at 72 seconds of elapsed time. */
})
```

### Fade

Multiplies the opacity of a child scene graph by a given factor.
Clamped to 0 and 1 at the time of emitting objects.
This additionally adjusts the volume of sounds.

```js
fade(0.5, () => {
  /* The child scene graph to make semi-transparent. */
})

fadeBetween(0.25, 0.75, 46, 72, () => {
  /* The child scene graph; linearly interpolates
     from 25% opacity
     to 75% opacity
     between 46 and 72 seconds of elapsed time. */
})

fadeBetween(0.25, 0.75, 46, 72, () => {
  /* The child scene graph; linearly interpolates
     from 25% opacity
     to 75% opacity
     between 46 and 72 seconds of elapsed time. */
}, () => {
  /* Callback executed at the end of the fade. */
})
```

### Click

Executes a callback (and subsequently re-renders) on clicking on any object emitted by a child scene graph.

```js
click(() => {
  /* Called on clicking on the below child scene graph. */
}, () => {
  /* The child scene graph which can be clicked on. */
})
```

Note: if multiple calls are nested, only the inner-most handler will be used on clicking on its children:

```js
click(() => {
  /* Called only on clicking on A or C. */
}, () => {
  /* A. */
  click(() => {
    /* Called only on clicking on B. */
  }, () => {
    /* B. */
  })
  /* C. */
})
```

### Delays

Executes a callback (and subsequently re-renders) at a specified time.

```js
at(46, () => {
  /* Called at 46 seconds of elapsed time. */
})
```

### Batch

Caches a complex child scene graph, meaning it is only generated once.

```js
batch(`Object Name`, `Cache Key`, () => { /* Scene graph to draw. */ })
```

Note: the cache will be dropped if it is not used during a scene.  Call keepBatch to keep it cached without actually drawing it.

```js
keepBatch(`Cache Key`, () => { /* Scene graph to cache, but not draw. */ })
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
