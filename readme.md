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

## Scene Graph

### Coordinate Space
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

### Variables (read-only)

#### borders

Contains the borders of the page, in scene graph coordinates.

```js
/* Assuming that the page is wider than 16:9. */
console.log(borders.left)   /* -4.78 */
console.log(borders.right)  /* 324.78 */
console.log(borders.top)    /* 0 */
console.log(borders.bottom) /* 180 */
```