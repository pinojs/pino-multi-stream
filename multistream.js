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

function multistream (streamsArray) {
  var streams = []
  var counter = 0

  streamsArray = streamsArray || []

  var res = {
    write,
    add,
    minLevel: 0,
    [needsMetadata]: true
  }

  if (Array.isArray(streamsArray)) {
    streamsArray.forEach(add)
  } else if (streamsArray) {
    add(streamsArray)
  }

  // clean this object up
  // or it will stay allocated forever
  // as it is closed on the following closures
  streamsArray = null

  return res

  // we can exit early because the streams are ordered by level
  function write (data) {
    var dest
    var level = this.lastLevel
    var stream
    for (var i = 0; i < streams.length; i++) {
      dest = streams[i]
      stream = dest.stream
      if (dest.level <= level) {
        if (stream[needsMetadata]) {
          stream.lastLevel = level
          stream.lastMsg = this.lastMsg
          stream.lastObj = this.lastObj
          stream.lastLogger = this.lastLogger
        }
        stream.write(data)
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
