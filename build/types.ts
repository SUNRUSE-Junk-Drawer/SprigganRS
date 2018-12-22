export interface state {
  readonly version: number
  readonly paths: {
    [path: string]: number
  }
}

export type buildName = `oneOff` | `watch`

export type audioFormat = `none` | `wav` | `mp3` | `ogg`
