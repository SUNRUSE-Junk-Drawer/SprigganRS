import * as util from "util"
import * as fs from "fs"
import * as types from "./types"
import * as paths from "./paths"
const nodeWav: {
  decode(buffer: Buffer): {
    readonly sampleRate: number
    readonly channelData: Float32Array[]
  }
  encode(channelData: ReadonlyArray<Float32Array>, options: {
    readonly sampleRate: number
    readonly float: boolean
    readonly bitDepth: number
  }): Buffer
} = require(`node-wav`)
const lamejs: {
  readonly Mp3Encoder: {
    new(numberOfChannels: number, sampleRate: number, bitRate: number): {
      encodeBuffer(...channelData: Int16Array[]): Int8Array
      flush(): Int8Array
    }
  }
} = require(`lamejs`)
const libVorbisJs: {
  _encoder_create_vbr(numberOfChannels: number, sampleRate: number, bitRate: number): number
  _encoder_get_data_len(instance: number): number
  _encoder_get_data(instance: number): number
  _encoder_clear_data(instance: number): void
  _encoder_write_headers(instance: number): void
  _encoder_prepare_analysis_buffers(instance: number, numberOfSamples: number): void
  _encoder_get_analysis_buffer(instance: number, channelIndex: number): number
  _encoder_encode(instance: number): void
  _encoder_finish(instance: number): void
  _encoder_destroy(instance: number): void
  readonly HEAPU8: {
    subarray(start: number, end: number): number[]
  }
  readonly HEAPF32: {
    set(data: Float32Array, start: number): void
  }
} = require(`libvorbis.js`)

const fsReadFile = util.promisify(fs.readFile)

export default async function (
  oldState: types.state,
  newState: types.state,
  buildName: types.buildName,
  gameName: string,
  packageName: string,
  fileName: string,
  audioFormats: types.audioFormat[]
): Promise<{
  [path: string]: {
    readonly type: `audio`
    readonly code: string
    readonly data: {
      readonly [format: string]: string
    }
  } | {
    readonly type: `nonAudio`
    readonly code: string
    readonly data: string
  }
}> {
  console.log(`Reading "${paths.srcGamePackageFile(gameName, packageName, fileName, `svg`)}"...`)
  const data = await fsReadFile(paths.srcGamePackageFile(gameName, packageName, fileName, `wav`))
  console.log(`Decoding "${paths.srcGamePackageFile(gameName, packageName, fileName, `svg`)}"...`)
  const wav = nodeWav.decode(data)

  console.log(`Checking format...`)
  if (wav.sampleRate != 44100) throw new Error(`File "${paths.srcGamePackageFile(gameName, packageName, fileName, `svg`)}" uses a sample rate of ${wav.sampleRate}; 44100 was expected.`)

  if (wav.channelData.length < 1) throw new Error(`File "${paths.srcGamePackageFile(gameName, packageName, fileName, `svg`)}" contains no audio channels.`)
  if (wav.channelData.length > 2) throw new Error(`File "${paths.srcGamePackageFile(gameName, packageName, fileName, `svg`)}" contains more than two audio channels.`)

  console.log(`Checking gain...`)
  let gain = 0.0
  for (const channel of wav.channelData) for (let i = 0; i < channel.length; i++) gain = Math.max(gain, Math.abs(channel[i]))
  if (gain) {
    if (gain < 1) {
      console.log(`Maximum gain ${gain}, boosting...`)
      for (const channel of wav.channelData) for (let i = 0; i < channel.length; i++) channel[i] /= gain
    } else console.log(`This file already uses maximum gain`)
  } else {
    throw new Error(`This file is silent.`)
  }

  const silenceThreshold = 0.02

  console.log(`Checking to see if leading silence can be trimmed...`)

  const leadingSilenceSamples = wav.channelData.reduce((previous, channel) => Math.min(previous, Math.max(0, channel.findIndex(sample => Math.abs(sample) < silenceThreshold))), Infinity)
  if (leadingSilenceSamples) {
    if (!Number.isFinite(leadingSilenceSamples)) {
      throw new Error(`This file is silent.`)
    } else {
      console.log(`Trimming ${leadingSilenceSamples} leading samples of silence...`)
      wav.channelData.forEach((channel, index) => wav.channelData[index] = new Float32Array(channel.slice(leadingSilenceSamples)))
    }
  } else console.log(`There are no leading samples which can be trimmed.`)

  console.log(`Checking to see if trailing silence can be trimmed...`)
  const trailingSilenceSamples = wav.channelData.reduce((previous, channel) => Math.min(previous, Math.max(0, channel.slice().reverse().findIndex(sample => Math.abs(sample) < silenceThreshold))), Infinity)
  if (trailingSilenceSamples) {
    console.log(`Trimming ${trailingSilenceSamples} trailing samples of silence...`)
    wav.channelData.forEach((channel, index) => wav.channelData[index] = new Float32Array(channel.slice(0, -trailingSilenceSamples)))
  } else console.log(`There are no trailing samples which can be trimmed.`)

  if (wav.channelData.length == 2) {
    console.log(`Checking to see if the file is dual mono...`)
    const greatestChannelDifference = wav.channelData[0].reduce((previous, sample, index) => Math.max(previous, Math.abs(wav.channelData[1][index] - sample)), 0)
    if (greatestChannelDifference < silenceThreshold) {
      console.log(`The greatest difference between the left and right channels is ${greatestChannelDifference}, which is considered dual mono.  Dropping to mono.`)
      wav.channelData.length--
    } else {
      console.log(`The greatest difference between the left and right channels is ${greatestChannelDifference}, which is considered stereo.  Making no changes.`)
    }
  }

  // todo: use backticks
  // todo: check whether channels are identical and monoify if so

  const output: {
    [path: string]: {
      readonly type: `audio`
      readonly code: string
      readonly data: {
        readonly [format: string]: string
      }
    } | {
      readonly type: `nonAudio`
      readonly code: string
      readonly data: string
    }
  } = {}

  const outputItem: {
    readonly type: `audio`
    readonly code: string
    readonly data: {
      [format: string]: string
    }
  } = {
    type: `audio`,
    code: `engineAudio`,
    data: {}
  }

  for (const audioFormat of audioFormats) {
    console.log(`Encoding as "${audioFormat}"...`)
    outputItem.data[audioFormat] = encoders[audioFormat](wav.channelData).toString(`base64`)
  }

  output[fileName] = outputItem

  return output
}

const encoders: {
  readonly [audioFormat in types.audioFormat]: (
    channelData: ReadonlyArray<Float32Array>
  ) => Buffer
} = {
  none(channelData) {
    return Buffer.from(new Uint8Array())
  },
  wav(channelData) {
    return nodeWav.encode(channelData, {
      sampleRate: 44100,
      float: false,
      bitDepth: 8
    })
  },
  mp3(channelData) {
    const encoder = new lamejs.Mp3Encoder(channelData.length, 44100, 192)

    const converted = channelData.map(channel => new Int16Array(channel.map(sample => sample * 32767)))

    return Buffer.concat([Buffer.from(encoder.encodeBuffer.apply(encoder, converted)), Buffer.from(encoder.flush())])
  },
  ogg(channelData) {
    let possibleEncoder: null | number = null
    try {
      possibleEncoder = libVorbisJs._encoder_create_vbr(channelData.length, 44100, 0.5)
      const encoder = possibleEncoder
      const chunks: Buffer[] = []
      function FlushVorbis() {
        const dataLength = libVorbisJs._encoder_get_data_len(encoder)
        if (!dataLength) return
        const dataPointer = libVorbisJs._encoder_get_data(encoder)
        const chunk = libVorbisJs.HEAPU8.subarray(dataPointer, dataPointer + dataLength)
        const data = new Uint8Array(chunk)
        libVorbisJs._encoder_clear_data(encoder)
        chunks.push(Buffer.from(data))
      }
      libVorbisJs._encoder_write_headers(encoder)
      FlushVorbis()
      let readSamples = 0
      while (readSamples < channelData[0].length) {
        const sliceStart = readSamples
        readSamples += 4096 * 10
        readSamples = Math.min(readSamples, channelData[0].length)
        libVorbisJs._encoder_prepare_analysis_buffers(encoder, readSamples - sliceStart)
        channelData.forEach((channel, index) => libVorbisJs.HEAPF32.set(channel.subarray(sliceStart, readSamples), libVorbisJs._encoder_get_analysis_buffer(encoder, index) >> 2))
        libVorbisJs._encoder_encode(encoder)
        FlushVorbis()
      }
      libVorbisJs._encoder_finish(encoder)
      FlushVorbis()
      return Buffer.concat(chunks)
    }
    finally {
      if (possibleEncoder != null) {
        libVorbisJs._encoder_destroy(possibleEncoder)
      }
    }
  }
}
