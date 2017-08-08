'use strict'

var pino = require('pino')
var multistream = require('./multistream')

function pinoMultiStream (opts, stream) {
  if (stream === undefined && opts && typeof opts.write === 'function') {
    opts = { stream: opts }
  }

  var iopts = opts || {}
  iopts.stream = iopts.stream || stream || process.stdout // same default of pino

  // pretend it is Bunyan
  var isBunyan = iopts.bunyan
  delete iopts.bunyan

  var toPino = Object.assign({}, iopts, { streams: undefined, stream: undefined })

  if (iopts.hasOwnProperty('streams') === true) {
    return fixLevel(pino(toPino, multistream(iopts.streams)))
  }

  return fixLevel(pino(toPino, multistream({ stream: iopts.stream, level: iopts.level })))

  function fixLevel (pino) {
    pino.levelVal = pino.stream.minLevel

    if (Array.isArray(iopts.streams)) {
      iopts.streams.forEach(function (s) {
        if (s.levelVal) {
          pino.addLevel(s.level, s.levelVal)
        }
      })
    }

    // internal knowledge dependency
    var setLevel = Object.getPrototypeOf(pino)._setLevel

    Object.defineProperty(pino, '_setLevel', {
      value: function (val) {
        var prev = this._levelVal

        // needed to support bunyan .level()
        if (typeof val === 'function') {
          val = this._levelVal
        }

        setLevel.call(this, val)

        // to avoid child loggers changing the stream levels
        // of parents
        if (prev !== this._levelVal) {
          this.stream = this.stream.clone(this._levelVal)
        }
      }
    })

    if (isBunyan) {
      Object.defineProperty(pino, 'level', {
        get: function () {
          var that = this
          return function (val) {
            if (val !== undefined) {
              that._setLevel(val)
            }
            return that._levelVal
          }
        },
        set: pino._setLevel
      })
    } else {
      Object.defineProperty(pino, 'level', {
        get: pino._getLevel,
        set: pino._setLevel
      })
    }

    return pino
  }
}

module.exports = pinoMultiStream
module.exports.multistream = multistream
module.exports.stdSerializers = pino.stdSerializers
module.exports.pretty = pino.pretty
