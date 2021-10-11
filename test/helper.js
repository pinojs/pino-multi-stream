'use strict'

const writeStream = require('flush-write-stream')
const split = require('split2')
const os = require('os')
const pid = process.pid
const hostname = os.hostname()

function sink (func) {
  const result = split(JSON.parse)
  result.pipe(writeStream.obj(func))
  return result
}

function check (t, chunk, level, msg) {
  t.ok(new Date(chunk.time) <= new Date(), 'time is greater than Date.now()')
  delete chunk.time
  t.same(chunk, {
    pid: pid,
    hostname: hostname,
    level: level,
    msg: msg
  })
}

module.exports.sink = sink
module.exports.check = check
