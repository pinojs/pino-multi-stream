'use strict'

var pino = require('pino')
var multistream = require('./multistream')

function pinoMultiStream (opts, stream) {
  var iopts = opts || {}

  stream = stream || process.stdout // same default of pino

  if (opts && (opts.writable || opts._writableState)) {
    return fixLevel(pino(null, multistream({ streams: [{ stream }] })))
  }

  if (iopts.hasOwnProperty('stream') === true) {
    return fixLevel(pino(null, multistream({ streams: [{ stream: iopts.stream }] })))
  }

  if (iopts.hasOwnProperty('streams') === false) {
    return fixLevel(pino(null, multistream({ streams: [{ stream }] })))
  }

  return fixLevel(pino(Object.assign({}, iopts, { streams: undefined }), multistream(iopts)))

  function fixLevel (pino) {
    pino.levelVal = pino.stream.minLevel

    if (Array.isArray(iopts.streams)) {
      iopts.streams.forEach(function (s) {
        if (s.levelVal) {
          pino.addLevel(s.level, s.levelVal)
        }
      })
    }

    return pino
  }
}

module.exports = pinoMultiStream
module.exports.multistream = multistream
module.exports.stdSerializers = pino.stdSerializers
module.exports.pretty = pino.pretty
