// @ts-expect-error piscina export type error
import { Piscina } from 'piscina'
import { Aggregate, Piece } from '@web3-storage/data-segment'
import Progress from 'cli-progress'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import fs from 'node:fs'
import chalk from 'chalk'
import map from 'p-map'
import { Offer } from './offer.js'
import { exit } from './util.js'
import { pieceCidForCar } from './worker.js'

/**
 * @param {string | undefined} car
 * @param {string | undefined} pieceCid
 * @param {object} opts
 * @param {string} opts.input
 */
export default async function verify (car, pieceCid, opts) {
  const input = opts.input ? path.resolve(opts.input) : undefined
  if (!input) {
    return verifyOne(car, pieceCid)
  }
  const offer = Offer.fromPath(input)
  if (!offer) {
    return exit(400, `failed to parse input: ${input}`)
  }
  const aggregate = await aggregateFromOffer(offer)
  const aggregateOk = offer.aggregate === aggregate.link.toString()
  if (!aggregateOk) {
    console.log(`expect: ${offer.aggregate}`)
    console.log(`actual: ${aggregate.link.toString()}`)
    return exit(1, 'bad aggregate cid')
  } else {
    console.log(`aggregate cid ${offer.aggregate} ok`)
  }

  const files = await statAll(offer.pieces)
  const missing = files.filter(x => x.size === undefined || x.size === 0)
  if (missing.length > 0) {
    for (const miss of missing) {
      console.log(`${miss.car} missing`)
      console.log(`↳ ${miss.error}`)
    }
    return exit(1, 'failed to verify: cars are missing')
  }
  // @ts-expect-error size will be set as we have filtered out the bad ones
  const totalBytes = files.reduce((total, x) => total + x.size, 0)

  console.log(`verifying ${offer.pieces.length} pieces ${chalk.dim(`${mib(totalBytes)} MiB`)}`)

  const bar = progressBar()
  bar.start(totalBytes, 0, { totalMib: mib(totalBytes), valueMib: 0 })

  // lots of hashing to do! use more cores with a worker pool.
  // drops time for 16GiB from 600s (no workers) to 100s on 8 cores.
  const piscina = new Piscina({
    filename: new URL('./worker.js', import.meta.url).href
  })

  let byteCount = 0
  const res = await map(offer.pieces, async (expected) => {
    const car = `${expected}.car`
    const actual = await piscina.run(car)
    const file = files.find(x => x.expected === expected)
    byteCount += file?.size || 0
    bar.update(byteCount, { valueMib: mib(byteCount) })
    const ok = actual === expected
    return ok ? { car, ok } : { car, ok, error: 'not match', expected, actual }
  })
  bar.stop()

  const bads = res.filter(x => x.ok === false)
  for (const x of bads) {
    console.log(JSON.stringify(x))
  }

  const allOk = bads.length === 0

  if (!allOk) {
    exit(1, `failed to verify ${bads.length}`)
  } else {
    console.log('ok')
  }
}

/**
 * @param {string | undefined} car - path to car
 * @param {string | undefined} pieceCid
 */
async function verifyOne (car, pieceCid) {
  // handle single
  if (!car || !fs.existsSync(car)) {
    return exit(400, `Could not find car file at ${car}`)
  }

  pieceCid = pieceCid ?? path.basename(car, '.car')
  if (!pieceCid) {
    return exit(400, `Could not infer piece cid from ${car}`)
  }

  const actual = await pieceCidForCar(car)

  if (pieceCid === actual.toString()) {
    console.log(`${pieceCid} ok`)
    return
  }

  console.log('expect', pieceCid)
  console.log('actual', pieceCid.toString())
  exit(1, `Piece cid does not match for ${car}`)
}

/** @param {string[]} cids */
async function statAll (cids) {
  return map(cids, async (cid) => {
    const car = `${cid}.car`
    try {
      const { size } = await stat(car)
      return { car, size, expected: cid }
    } catch (err) {
      return { car, expected: cid, error: err.message ?? String(err) }
    }
  })
}

/** @param {Offer} offer */
async function aggregateFromOffer ({ pieces: parts }) {
  const pieces = parts.map(p => Piece.fromString(p))
  return Aggregate.build({ pieces })
}

/** @param {number} byteLength} */
function mib (byteLength) {
  return (byteLength / (1024 ^ 2)).toFixed(0)
}

function progressBar () {
  return new Progress.SingleBar({
    stopOnComplete: true,
    clearOnComplete: true,
    format: '{bar} {percentage}% | {valueMib} MiB'
  },
  Progress.Presets.shades_classic)
}
