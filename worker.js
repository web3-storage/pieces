import { pipeline } from 'node:stream/promises'
import { createReadStream } from 'node:fs'
import { PieceHash } from './index.js'

/**
 * @param {string} car
 */
export default async function worker (car) {
  const pieceCid = await pieceCidForCar(car)
  return pieceCid.toString()
}

/**
 * @param {string} car - path to car
 */
async function pieceCidForCar (car) {
  const pieceHash = new PieceHash()
  await pipeline(
    createReadStream(car),
    pieceHash.sink()
  )
  return pieceHash.link()
}
