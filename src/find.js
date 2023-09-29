import { inputStream } from './util.js'
import { fetchCarLocation } from './plan.js'

/**
 * `find <cid>` command returns the url for a piece cid
 * @param {string} pieceCid
 * @param {object} opts
 * @param {string[]} opts._
 */
export default async function (pieceCid, opts) {
  inputStream(pieceCid, opts._).pipeTo(new WritableStream({
    async write (cidStr) {
      const res = await fetchCarLocation(cidStr)
      console.log(JSON.stringify(res))
    }
  }))
}
