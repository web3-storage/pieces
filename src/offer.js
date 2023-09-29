import { readFileSync } from 'node:fs'

export class Offer {
  /**
   * @param {string} aggregate
   * @param {string[]} pieces
   */
  constructor (aggregate, pieces) {
    this.aggregate = aggregate
    this.pieces = pieces
  }

  /**
   * @param {string | undefined} src
   */
  static fromPath (src) {
    if (!src) return
    try {
      const { aggregate, pieces } = JSON.parse(readFileSync(src, { encoding: 'utf-8' }))
      return new Offer(aggregate, pieces)
    } catch {
      // just return undefined. calling code to inform user
    }
  }
}
