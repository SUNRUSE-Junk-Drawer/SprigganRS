# SprigganRS
A "reactive" event-driven web game engine.

Currently early in development.

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

## Project Structure

```
|'- dist
|   |'- (game name).zip
|    '- (game name)
|       |'- index.html
|       |'- icon.svg
|        '- (localization name)
|           |'- flag.svg
|           |'- index.html
|           |'- index.js
|            '- (package name)-(audio format).txt
 '- src
    |'- engine
    |   |'- header/index.ts
    |   |'- index.ts
    |    '- footer/index.ts
     '- (game name)
        |'- metadata.json
        |'- localizations
        |   '- icon.svg
        |   '- flag.svg
        |'- icon.svg
        |'- index.ts
         '- packages
            '- (package name)
               |'- *.svg
               |'- *.wav
                '- *
                   |'- (localization name).svg
                    '- (localization name).wav
```

### dist/(game name).zip

A zip file containing every part of the corresponding game, minfied, but not
including debugging tools.  Only produced by "one-off" builds.

### dist/(game name)

A directory containing every part of the corresponding game, including debugging
tools, without much in the way of minification.  Only produced by "watch"
builds.

### src/engine/header/index.ts

The entry point for the "header" of the engine, included in every game.  This is
responsible for:

- Error handling.
- Content types.

### src/engine/index.ts

The entry point for the "body" of the engine, included in every game.  This is
the runtime engine.  It is responsible for:

- Timing.
- DOM manipulation.
- Input.
- Save/load.
- Debugging tools.
- State management.

### src/engine/header/index.ts

The entry point for the "footer" of the engine, included in every game.  This is
responsible for:

- Starting the game once all JavaScript has been loaded.

### src/games/(game name)/metadata.json

A JSON file describing that particular game.

```json
{
  "title": "Game Title",
  "description": "Game Description",
  "developer": {
    "name": "Developer Name",
    "url": "https://example.com"
  },
  "width": 320,
  "height": 180,
  "defaultLocalization": "en-gb",
  "localizations": [{
    "name": "en-gb",
    "title": "Game Title",
    "description": "Game Description",
    "developer": {
      "name": "Developer Name",
      "url": "https://example.com"
    }
  }]
}
```

#### title

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

#### localizations

Only the first will be used under a watch build to reduce iteration times.

#### localizations.(localization name).title

Shown as the page title, and when "pinned" to the home screen of a mobile
device.

#### localizations.(localization name).description

A short description of the game, included in metadata.

#### localizations.(localization name).developer.name

The name of the developer of the game, included in metadata.

#### localizations.(localization name).developer.url

The URL of the developer of the game, included in metadata.

### src/games/(game name)/localizations/(localization name)/flag.svg

An icon to use under this localization; shown as a favicon, splash screen and
when "pinned" to the home screen of a mobile devce.  Expected to be square.

### src/games/(game name)/localizations/(localization name)/flag.svg

An icon for this localization; shown on the localization menu.  Expected to be
square.

### src/games/(game name)/icon.svg

An icon to use; shown as a favicon, splash screen and when "pinned" to the home
screen of a mobile devce.  Expected to be square.

### src/games/(game name)/packages/(package name)

Each folder forms a "package", which is a collection of content which is loaded
as a unit.

Filenames are split by slashes to form a hierarchy:

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

### src/games/(game name)/packages/(package name)/*/(localization name).*

Subdirectories in packages represent content which varies by localization.  For
instance:

| Path                                               | Localization Name | Imported as though                           |
|----------------------------------------------------|-------------------|----------------------------------------------|
| src/games/example/packages/menu/strings/en-gb.json | en-gb             | src/games/example/packages/menu/strings.json |
| src/games/example/packages/menu/strings/fr-fr.json | fr-fr             | src/games/example/packages/menu/strings.json |

### src/games/(game name)/package/(package name)/*[/(localization name)].svg

If an Inkscape SVG with multiple layers is found, it is split into one piece of
content per layer and their names are included in their file names; a file with
a name of:

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
