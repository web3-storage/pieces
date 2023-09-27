#!/usr/bin/env node

import sade from 'sade'
import fs from 'node:fs'
import path from 'node:path'
import { fetch } from 'undici'
import { pipeline } from 'node:stream/promises'
import * as readline from 'node:readline/promises'
import { Piece } from '@web3-storage/data-segment'
import { PieceHash } from './index.js'
import { CID } from 'multiformats/cid'
import { base16 } from 'multiformats/bases/base16'
import Progress from 'cli-progress'
import retry from 'p-retry'
import map from 'p-map'

const cli = sade('piece').version('1')

cli.command('plan [pieceCid]', 'create aria2 download plan for aggregate offer json')
  .option('--input, -i', 'path to w3filecoin aggregate json')
  .option('--output, -o', 'path to write aria2 input file')
  .option('--concurrency, -c', 'number of requests in parallel', '100')
  .action(async (cidStr, opts) => {
    const input = opts.input ? path.resolve(opts.input) : undefined
    if (input && !fs.existsSync(input)) {
      exit(404, `input not found: ${input}`)
    }
    const pieces = input ? JSON.parse(fs.readFileSync(input, { encoding: 'utf-8' })).pieces : [cidStr]
    const bar = new Progress.SingleBar({}, Progress.Presets.shades_classic)
    bar.start(pieces.length, 0)

    /**
     * Get aria2 to verify the car by car cid, and keep the piece cid as the car name.
     * otherwise the download is carcid.car and we'd have to manually verify it, and keep
     * a car cid -> piece cid mapping around
     * see: https://aria2.github.io/manual/en/html/aria2c.html#input-file
     * @param {string} cidStr
     */
    const toAriaInput = async (cidStr) => {
      const { piece, car, roundabout } = await fetchCarLocation(cidStr)
      const hashBytes = CID.parse(car).multihash.digest
      const checksum = base16.baseEncode(hashBytes)
      bar.increment()
      return `${roundabout}\n  checksum=sha-256=${checksum}\n  out=${piece}.car`
    }
    const res = await map(pieces, toAriaInput, { concurrency: parseInt(opts.concurrency) })
    const body = res.join('\n')
    if (opts.output) {
      fs.writeFileSync(opts.output, body, { encoding: 'utf-8' })
    } else {
      console.log('# aria2 input for aggregate pieces')
      console.log(body)
    }
    bar.stop()
  })

cli.command('verify <car> [cid]', 'check the car piece cid is correct')
  .action(async (car, cid, opts) => {
    if (!car || !fs.existsSync(car)) {
      exit(400, `Could not find car file at ${car}`)
    }
    cid = cid ?? path.basename(car, '.car')
    if (!cid) {
      exit(400, `Could not infer piece cid from ${car}`)
    }

    const pieceHash = new PieceHash()
    await pipeline(
      fs.createReadStream(car),
      pieceHash.getPieceHashTransform()
    )
    const pieceCid = pieceHash.link()

    if (cid === pieceCid.toString()) {
      console.log('ok')
      return
    }

    console.log('expect', cid)
    console.log('actual', pieceCid.toString())
    exit(1, `Piece cid does not match for ${car}`)
  })

cli.command('find <piece>')
  .action(async (pieceCid, opts) => {
    inputStream(pieceCid, opts._).pipeTo(new WritableStream({
      async write (cidStr) {
        const { piece } = await fetchCarLocation(cidStr)
        console.log(`${cidStr} ${piece}`)
      }
    }))
  })

cli.parse(process.argv)

/**
 * @param {string} cidStr
 */
async function fetchCarLocation (cidStr) {
  const piece = Piece.fromString(cidStr)
  const cid = piece.link.toString()
  // console.log(cid, piece.size)
  const req = new URL(cid, 'https://roundabout.web3.storage')
  const res = await fetchRetry(req, { redirect: 'manual', expectStatus: 302 })
  const loc = new URL(res.headers.get('location') ?? '')
  const car = loc.pathname.split('/').at(1) ?? ''
  return { piece: cid, car, url: loc.toString(), roundabout: req.toString() }
}

/**
 * @param {string | URL} url
 * @param {import('undici').RequestInit & import('p-retry').Options & { expectStatus?: number }} opts
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

/**
 * ReadableStream from params or stdin
 *
 * @param {string} first
 * @param {string[]} rest
 */
function inputStream (first, rest = []) {
  /** @type {ReadableStream<string>} */
  const source = new ReadableStream({
    async start (controller) {
      // input param passed
      if (first) {
        controller.enqueue(first)
        // maybe more then one
        for (const item of rest) {
          controller.enqueue(item)
        }
        return
      }
      // note: "having asynchronous operations between interface creation and asynchronous iteration may result in missed lines."
      // https://nodejs.org/docs/latest-v18.x/api/readline.html#rlsymbolasynciterator
      const rl = readline.createInterface({ input: process.stdin })
      for await (const line of rl) {
        controller.enqueue(line)
      }
      rl.close()
    }
  })

  return source
}
