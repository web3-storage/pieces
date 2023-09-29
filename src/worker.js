import { pipeline } from 'node:stream/promises'
import { createReadStream } from 'node:fs'
import { PieceHash } from './piece.js'

/**
 * Return the piece cid string for a given fs path to a car
 * The entry point for worker threads created by `piece verify`
 *
 * @param {string} car
 */
export default async function worker (car) {
  const pieceCid = await pieceCidForCar(car)
  return pieceCid.toString()
}

/**
 * @param {string} car - path to car
 */
export async function pieceCidForCar (car) {
  const pieceHash = new PieceHash()
  await pipeline(
    createReadStream(car),
    pieceHash.sink()
  )
  return pieceHash.link()
}
