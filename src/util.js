import * as readline from 'node:readline/promises'

/**
 * @param {number} code
 * @param {string} message
 */
export function exit (code, message) {
  console.error(message)
  process.exit(code)
}

/**
 * ReadableStream from params or stdin
 *
 * @param {string} first
 * @param {string[]} rest
 */
export function inputStream (first, rest = []) {
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
