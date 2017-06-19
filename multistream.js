'use strict'

var needsMetadata = Symbol.for('needsMetadata')

var levels = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10
}

function multistream (opts) {
  var streams = []
  var counter = 0

  opts = opts || {}

  var res = {
    write,
    add,
    minLevel: 0,
    [needsMetadata]: true
  }

  if (Array.isArray(opts.streams)) {
    opts.streams.forEach(add)
  } else if (opts.streams) {
    add(opts.streams)
  }

  return res

  // we can exit early because the streams are ordered by level
  function write (data) {
    var dest
    var level = this.lastLevel
    for (var i = 0; i < streams.length; i++) {
      dest = streams[i]
      if (dest.level <= level) {
        dest.stream.write(data)
      } else {
        break
      }
    }
  }

  function add (dest) {
    if (typeof dest.write === 'function') {
      return add({ stream: dest })
    } else if (typeof dest.levelVal === 'number') {
      return add(Object.assign({}, dest, { level: dest.levelVal, levelVal: undefined }))
    } else if (typeof dest.level === 'string') {
      return add(Object.assign({}, dest, { level: levels[dest.level] }))
    } else if (typeof dest.level !== 'number') {
      // we default level to 'info'
      dest = Object.assign({}, dest, { level: 30 })
    } else {
      dest = Object.assign({}, dest)
    }

    dest.id = counter++

    streams.unshift(dest)
    streams.sort(compareByLevel)

    res.minLevel = streams[0].level

    return res
  }

  function compareByLevel (a, b) {
    if (a.level < b.level) {
      return -1
    } else if (a.level > b.level) {
      return 1
    } else {
      if (a.counter < b.counter) {
        return -1
      } else if (a.counter > b.counter) {
        return 1
      } else {
        return 0
      }
    }
  }
}

module.exports = multistream
