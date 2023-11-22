import * as PieceHasher from 'fr32-sha2-256-trunc254-padded-binary-tree-multihash'
// import * as mh from '@web3-storage/data-segment/multihasher'
import * as Link from 'multiformats/link'
import * as Digest from 'multiformats/hashes/digest'
import * as raw from 'multiformats/codecs/raw'

export class PieceHash {
  hasher = PieceHasher.create()

  /**
   * Pipeline destination to hash bytes from a stream
   */
  sink () {
    const hasher = this.hasher
    /** @param {AsyncIterable<Uint8Array>} source */
    return async function pieceHash (source) {
      for await (const chunk of source) {
        hasher.write(chunk)
      }
    }
  }

  digest () {
    const bytes = new Uint8Array(this.hasher.multihashByteLength())
    this.hasher.digestInto(bytes, 0, true)
    return bytes
  }

  link () {
    const digest = Digest.decode(this.digest())
    return Link.create(raw.code, digest)
  }

  reset () {
    this.hasher.reset()
  }
}
