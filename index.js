'use strict'

var realPino = require('pino')
var noop = function () {}

function pino (opts, stream) {
  var iopts = opts || {}
  if (opts && (opts.writable || opts._writableState)) {
    return realPino(null, iopts)
  }

  if (iopts.hasOwnProperty('stream') === true) {
    return realPino(iopts, iopts.stream)
  }

  if (iopts.hasOwnProperty('streams') === false) {
    return realPino(iopts, stream)
  }

  if (Array.isArray(iopts.streams) === false) {
    return realPino(iopts, iopts.streams)
  }

  var streams = iopts.streams
  var loggers = {}
  function addLogger (opts, stream) {
    var logger = realPino(opts, stream)
    if (loggers[opts.level]) {
      loggers[opts.level].push(logger)
    } else {
      loggers[opts.level] = [logger]
    }
    return logger
  }
  for (var i = 0, j = streams.length; i < j; i += 1) {
    var _opts = Object.create(iopts)
    var s = streams[i]
    _opts.level = (s.level) ? s.level : 'info'
    _opts.levelVal = (s.levelVal) ? s.levelVal : undefined
    var logger = addLogger(_opts, s.stream)
    var levelValues = logger.levels.values
    var curLevel = levelValues[_opts.level]
    Object.keys(levelValues)
      .filter(function (l) { return levelValues[l] > curLevel })
      .forEach(function (l) { addLogger({level: l}, s.stream) })
  }

  var stdLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace']
  var levels = stdLevels.concat(Object.keys(loggers).filter(function (val) {
    return stdLevels.indexOf(val) === -1
  }))
  function MSPino (_loggers) {
    this.loggers = _loggers
    for (var i = 0, j = levels.length; i < j; i += 1) {
      if (this.loggers.hasOwnProperty(levels[i]) === false) {
        this[levels[i]] = noop
      }
    }
  }
  MSPino.prototype = Object.create(realPino._Pino.prototype)
  MSPino.constructor = MSPino

  function genLog (level) {
    return function LOG (arg1, arg2, arg3, arg4, arg5, arg6) {
      for (var i = 0, j = this.loggers[level].length; i < j; i += 1) {
        var logger = this.loggers[level][i]
        var x
        var args
        switch (arguments.length) {
          case 1:
            logger[level](arg1)
            break
          case 2:
            logger[level](arg1, arg2)
            break
          case 3:
            logger[level](arg1, arg2, arg3)
            break
          case 4:
            logger[level](arg1, arg2, arg3, arg4)
            break
          case 5:
            logger[level](arg1, arg2, arg3, arg4, arg5)
            break
          case 6:
            logger[level](arg1, arg2, arg3, arg4, arg5, arg6)
            break
          default:
            args = [arg1, arg2, arg3, arg4, arg5, arg6]
            for (x = 7; x < arguments.length; x += 1) {
              args[x - 1] = arguments[x]
            }
            logger[level].apply(logger, args)
        }
      }
    }
  }

  levels.forEach(function (level) {
    MSPino.prototype[level] = genLog(level)
  })

  MSPino.prototype.child = function child (bindings) {
    var levels = Object.keys(this.loggers)
    var childLoggers = {}
    for (var i = 0, j = levels.length; i < j; i += 1) {
      childLoggers[levels[i]] = []
      for (var x = 0, y = this.loggers[levels[i]].length; x < y; x += 1) {
        var log = this.loggers[levels[i]][x]
        childLoggers[levels[i]].push(log.child(bindings))
      }
    }
    return new MSPino(childLoggers)
  }

  return new MSPino(loggers)
}

pino.pretty = realPino.pretty
pino.stdSerializers = realPino.stdSerializers

module.exports = pino
