import fs from 'node:fs'
import path from 'node:path'
import { CID } from 'multiformats/cid'
import { base16 } from 'multiformats/bases/base16'
import { Piece } from '@web3-storage/data-segment'
import Progress from 'cli-progress'
import retry from 'p-retry'
import map from 'p-map'
import { Offer } from './offer.js'

/**
 * `plan` command creates aria2 an input file for an aggregate offer json
 *
 * output file has aria2 to verify the car by car cid, and keep the piece cid as the car name.
 * otherwise the download is carCid.car and we'd have to manually verify it, and keep
 * a car cid -> piece cid mapping around
 * see: https://aria2.github.io/manual/en/html/aria2c.html#input-file
 *
 * @param {string | undefined} cidStr
 * @param {object} opts
 * @param {string} opts.concurrency - how many pending fetches in parallel
 * @param {string} [opts.input] - path to aggregate offer json
 * @param {string} [opts.output] - path to write aria2 input file
 */
export default async function plan (cidStr, opts) {
  const input = opts.input ? path.resolve(opts.input) : undefined
  if (!input) {
    return planOne(cidStr, opts)
  }
  const offer = Offer.fromPath(input)
  if (!offer) {
    return exit(400, `failed to parse input: ${input}`)
  }
  const bar = progressBar()
  bar.start(offer.pieces.length, 0)

  const res = await map(offer.pieces, async (cidStr) => {
    const { piece, car, roundabout } = await fetchCarLocation(cidStr)
    const line = toAriaFormat(roundabout, car, `${piece}.car`)
    bar.increment()
    return line
  }, { concurrency: parseInt(opts.concurrency) })

  const head = `# aria2 input for aggregate ${offer.aggregate}`
  const file = [head, ...res].join('\n')
  if (opts.output) {
    fs.writeFileSync(opts.output, file, { encoding: 'utf-8' })
  } else {
    console.log(file)
  }
  bar.stop()
}

/**
 * @param {string | undefined} cidStr - piece cid for car
 * @param {object} opts
 * @param {string} [opts.output] - path to write aria2 input file
 */
async function planOne (cidStr, opts) {
  if (!cidStr) {
    return exit(400, 'need to specify cid or --input <aggregate json>')
  }
  const { piece, car, roundabout } = await fetchCarLocation(cidStr)
  const file = toAriaFormat(roundabout, car, `${piece}.car`)
  if (opts.output) {
    fs.writeFileSync(opts.output, file, { encoding: 'utf-8' })
  } else {
    console.log(file)
  }
}

/**
 * Convert a url and cid to a checksum'd download input item for aria2
 * @param {string} url - location of car
 * @param {string} cid - sha2-s56 car cid string
 * @param {string} out - filename for download
 */
export function toAriaFormat (url, cid, out) {
  const hashBytes = CID.parse(cid).multihash.digest
  const checksum = base16.baseEncode(hashBytes)
  return `${url}\n  checksum=sha-256=${checksum}\n  out=${out}`
}

/**
 * @param {string} cidStr
 */
export async function fetchCarLocation (cidStr) {
  const piece = Piece.fromString(cidStr)
  const cid = piece.link.toString()
  const req = new URL(cid, 'https://roundabout.web3.storage')
  const res = await fetchRetry(req, { redirect: 'manual', expectStatus: 302 })
  const loc = new URL(res.headers.get('location') ?? '')
  const car = loc.pathname.split('/').at(1) ?? ''
  return { piece: cid, car, url: loc.toString(), roundabout: req.toString() }
}

/**
 * @param {string | URL} url
 * @param {RequestInit & import('p-retry').Options & { expectStatus?: number }} opts
 **/
async function fetchRetry (url, opts = {}) {
  opts = { retries: 5, ...opts }
  return retry(async () => {
    const res = await fetch(url, opts)
    if (opts.expectStatus && res.status !== opts.expectStatus) {
      throw new Error(`HTTP Status ${res.status} was not expected ${opts.expectStatus}`)
    }
    if (!opts.expectStatus && !res.ok) {
      throw new Error(`HTTP Status ${res.status} not ok`)
    }
    return res
  }, opts)
}

/**
 * @param {number} code
 * @param {string} message
 */
function exit (code, message) {
  console.error(message)
  process.exit(code)
}

function progressBar () {
  return new Progress.SingleBar({
    stopOnComplete: true,
    clearOnComplete: true
  },
  Progress.Presets.shades_classic)
}
