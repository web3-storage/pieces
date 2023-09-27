import * as PieceHasher from 'fr32-sha2-256-trunc254-padded-binary-tree-multihash'
import * as Link from 'multiformats/link'
import * as Digest from 'multiformats/hashes/digest'
import * as raw from 'multiformats/codecs/raw'

export class PieceHash {
  hasher = PieceHasher.create()

  getPieceHashTransform () {
    const hasher = this.hasher

    /** @param {AsyncIterable<Uint8Array>} source */
    return async function * pieceHash (source) {
      for await (const chunk of source) {
        hasher.write(chunk)
        yield chunk
      }
    }
  }

  link () {
    const digestBytes = new Uint8Array(PieceHasher.prefix.length + PieceHasher.size)
    this.hasher.digestInto(digestBytes, 0, true)
    const digest = Digest.decode(digestBytes)
    const pieceCid = Link.create(raw.code, digest)
    return pieceCid
  }
}
