export interface metadata {
  readonly name: string
  readonly description: string
  readonly developer: {
    readonly name: string
    readonly url: string
  }
  readonly width: number
  readonly height: number
}

export type mutable<T> = { -readonly [P in keyof T]-?: T[P] }

export interface state {
  readonly version: number
  readonly paths: {
    [path: string]: number
  }
}

export type buildName = `oneOff` | `watch`

export type audioFormat = `none` | `wav` | `mp3` | `ogg`
