'use strict'

const pino = require('pino')
const multistream = require('./multistream')
const {
  streamSym,
  setLevelSym,
  getLevelSym,
  levelValSym
} = pino.symbols

function pinoMultiStream (opts, stream) {
  if (stream === undefined && opts && typeof opts.write === 'function') {
    opts = { stream: opts }
  }

  const iopts = opts || {}
  iopts.stream = iopts.stream || stream || process.stdout // same default of pino

  // pretend it is Bunyan
  const isBunyan = iopts.bunyan
  delete iopts.bunyan
  const toPino = Object.assign({}, iopts, { streams: undefined, stream: undefined })

  if (iopts.hasOwnProperty('streams') === true) {
    return fixLevel(pino(toPino, multistream(iopts.streams)))
  }

  return fixLevel(pino(toPino, multistream({ stream: iopts.stream, level: iopts.level })))

  function fixLevel (pino) {
    pino.level = pino[streamSym].minLevel

    if (Array.isArray(iopts.streams)) {
      iopts.streams.forEach(function (s) {
        if (s.levelVal) {
          pino.addLevel(s.level, s.levelVal)
        }
      })
    }

    // internal knowledge dependency
    var setLevel = pino[setLevelSym]

    pino[setLevelSym] = function (val) {
      var prev = this[levelValSym]

      // needed to support bunyan .level()
      if (typeof val === 'function') {
        val = this[levelValSym]
      }

      setLevel.call(this, val)

      // to avoid child loggers changing the stream levels
      // of parents
      if (prev !== this[levelValSym]) {
        this[streamSym] = this[streamSym].clone(this[levelValSym])
      }
    }

    if (isBunyan) {
      Object.defineProperty(pino, 'level', {
        get: function () {
          var that = this
          return function (val) {
            if (val !== undefined) {
              that[setLevelSym](val)
            }
            return that[levelValSym]
          }
        },
        set: pino[setLevelSym]
      })
    } else {
      Object.defineProperty(pino, 'level', {
        get: pino[getLevelSym],
        set: pino[setLevelSym]
      })
    }

    return pino
  }
}

Object.assign(pinoMultiStream, pino)
pinoMultiStream.multistream = multistream

module.exports = pinoMultiStream
