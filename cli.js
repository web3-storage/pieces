#!/usr/bin/env node

import plan from './src/plan.js'
import verify from './src/verify.js'
import find from './src/find.js'
import v2 from './src/v2.js'
import sade from 'sade'

const cli = sade('piece').version('1')

cli.command('plan [pieceCid]', 'create aria2 download plan for aggregate offer json')
  .option('--input, -i', 'path to w3filecoin aggregate json')
  .option('--output, -o', 'path to write aria2 input file')
  .option('--concurrency, -c', 'number of requests in parallel', '100')
  .action(plan)

cli.command('verify [car] [cid]', 'check the car piece cid is correct')
  .option('--input, -i', 'path to w3filecoin aggregate json')
  .action(verify)

cli.command('find <piece>', 'resolve url for piece cid')
  .action(find)

cli.command('v2 [pieceCid]', 'convert PieceCIDv1 to PieceCIDv2')
  .option('--height, -h', 'Piece height')
  .option('--log-size, -l', 'Log2 size of the Piece')
  .action(v2)

cli.parse(process.argv)
