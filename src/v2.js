import { Piece } from '@web3-storage/data-segment'
import { parse as parseLink } from 'multiformats/link'

/**
 * @typedef {object} Options
 * @property {string} [height] - Piece height
 * @property {string} [log-size] - Piece height
 */

/**
 * `v2` command converts PieceCIDv1 to PieceCIDv2 with its height embedded.
 *
 * @param {string} cidStr
 * @param {Options} opts
 */
export default async function v2 (cidStr, opts) {
  const height = opts.height ? Number(opts.height) : undefined
  const logSize = opts['log-size'] ? Number(opts['log-size']) : undefined

  if (!height && !logSize) {
    return exit(400, 'needs either height or log2 size of the Piece')
  }

  /** @type {import('@web3-storage/data-segment').LegacyPieceLink} */
  let pieceCidV1
  try {
    pieceCidV1 = parseLink(cidStr)
  } catch {
    throw new Error(`PieceCIDv1 received ${cidStr} is not a valid CID`)
  }

  if (height) {
    const piece = convertPieceCidV1toPieceCidV2(
      pieceCidV1,
      height
    )

    console.log(piece.toString())
  } else {
    const piece = convertPieceCidV1toPieceCidV2(
      pieceCidV1,
      log2PieceSizeToHeight(Number(logSize))
    )

    console.log(piece.toString())
  }
}

/**
 * @param {import('@web3-storage/data-segment').LegacyPieceLink} link
 * @param {number} height
 */
export function convertPieceCidV1toPieceCidV2 (link, height) {
  const piece = Piece.toView({
    root: link.multihash.digest,
    height,
    // Aggregates do not have padding
    padding: 0n
  })

  return piece.link
}

/**
 *
 * @param {number} log2Size
 */
export function log2PieceSizeToHeight (log2Size) {
  return Piece.Size.Expanded.toHeight(2n ** BigInt(log2Size))
}

/**
 * @param {number} code
 * @param {string} message
 */
function exit (code, message) {
  console.error(message)
  process.exit(code)
}
