'use strict'

var writeStream = require('flush-write-stream')
var pino = require('pino')
var test = require('tap').test
var pinoms = require('../')
var { Writable } = require('stream')
var strip = require('strip-ansi')

test('sends to multiple streams', function (t) {
  var messageCount = 0
  var stream = writeStream(function (data, enc, cb) {
    messageCount += 1
    cb()
  })
  var streams = [
    { stream: stream },
    { level: 'debug', stream: stream },
    { level: 'fatal', stream: stream }
  ]
  var log = pinoms({ streams: streams })
  log.info('info stream')
  log.debug('debug stream')
  log.fatal('fatal stream')
  t.is(messageCount, 6)
  t.done()
})

test('level include higher levels', function (t) {
  var messageCount = 0
  var stream = writeStream(function (data, enc, cb) {
    messageCount += 1
    cb()
  })
  var log = pinoms({ streams: [{ level: 'info', stream: stream }] })
  log.fatal('message')
  t.is(messageCount, 1)
  t.done()
})

test('supports multiple arguments', function (t) {
  var messages = []
  var stream = writeStream(function (data, enc, cb) {
    messages.push(JSON.parse(data))
    if (messages.length === 2) {
      var msg1 = messages[0]
      t.is(msg1.msg, 'foo bar baz foobar')

      var msg2 = messages[1]
      t.is(msg2.msg, 'foo bar baz foobar barfoo foofoo')

      t.done()
    }
    cb()
  })
  var log = pinoms({ streams: stream })
  log.info('%s %s %s %s', 'foo', 'bar', 'baz', 'foobar') // apply not invoked
  log.info('%s %s %s %s %s %s', 'foo', 'bar', 'baz', 'foobar', 'barfoo', 'foofoo') // apply invoked
})

test('supports children', function (t) {
  var stream = writeStream(function (data, enc, cb) {
    var input = JSON.parse(data)
    t.is(input.msg, 'child stream')
    t.is(input.child, 'one')
    t.done()
    cb()
  })
  var streams = [
    { stream: stream }
  ]
  var log = pinoms({ streams: streams }).child({ child: 'one' })
  log.info('child stream')
})

test('supports grandchildren', function (t) {
  var messages = []
  var stream = writeStream(function (data, enc, cb) {
    messages.push(JSON.parse(data))
    if (messages.length === 3) {
      var msg1 = messages[0]
      t.is(msg1.msg, 'grandchild stream')
      t.is(msg1.child, 'one')
      t.is(msg1.grandchild, 'two')

      var msg2 = messages[1]
      t.is(msg2.msg, 'grandchild stream')
      t.is(msg2.child, 'one')
      t.is(msg2.grandchild, 'two')

      var msg3 = messages[2]
      t.is(msg3.msg, 'debug grandchild')
      t.is(msg3.child, 'one')
      t.is(msg3.grandchild, 'two')

      t.done()
    }
    cb()
  })
  var streams = [
    { stream: stream },
    { level: 'debug', stream: stream }
  ]
  var log = pinoms({ streams: streams }).child({ child: 'one' }).child({ grandchild: 'two' })
  log.info('grandchild stream')
  log.debug('debug grandchild')
})

test('supports custom levels', function (t) {
  var stream = writeStream(function (data, enc, cb) {
    t.is(JSON.parse(data).msg, 'bar')
    t.done()
  })
  var log = pinoms({
    customLevels: {
      foo: 35
    },
    streams: [{
      level: 35,
      stream: stream
    }
    ]
  })
  log.foo('bar')
})

test('children support custom levels', function (t) {
  var stream = writeStream(function (data, enc, cb) {
    t.is(JSON.parse(data).msg, 'bar')
    t.done()
  })
  var parent = pinoms({
    customLevels: {
      foo: 35
    },
    streams: [{
      level: 35,
      stream: stream
    }
    ]
  })
  var child = parent.child({ child: 'yes' })
  child.foo('bar')
})

test('supports empty constructor arguments', function (t) {
  var log = pinoms()
  t.is(typeof log.info, 'function')
  t.done()
})

test('exposes pino.destination', function (t) {
  t.is(pinoms.destination, pino.destination)
  t.done()
})

test('exposes pino.extreme', function (t) {
  t.is(pinoms.extreme, pino.extreme)
  t.done()
})

test('exposes pino.stdSerializers', function (t) {
  t.is(pinoms.stdSerializers, pino.stdSerializers)
  t.done()
})

test('exposes pino.stdTimeFunctions', function (t) {
  t.is(pinoms.stdTimeFunctions, pino.stdTimeFunctions)
  t.done()
})

test('exposes pino.LOG_VERSION', function (t) {
  t.is(pinoms.LOG_VERSION, pino.LOG_VERSION)
  t.done()
})

test('exposes pino.levels', function (t) {
  t.is(pinoms.levels, pino.levels)
  t.done()
})

test('exposes pino.symbols', function (t) {
  t.is(pinoms.symbols, pino.symbols)
  t.done()
})

test('forwards name', function (t) {
  var messageCount = 0
  var stream = writeStream(function (data, enc, cb) {
    messageCount += 1
    var line = JSON.parse(data)
    t.equal(line.name, 'system')
    cb()
  })
  var streams = [
    { stream: stream },
    { level: 'debug', stream: stream },
    { level: 'fatal', stream: stream }
  ]
  var log = pinoms({ name: 'system', streams: streams })
  log.info('info stream')
  log.debug('debug stream')
  log.fatal('fatal stream')
  t.is(messageCount, 6)
  t.done()
})

test('forwards name via child', function (t) {
  var messageCount = 0
  var stream = writeStream(function (data, enc, cb) {
    messageCount += 1
    var line = JSON.parse(data)
    t.equal(line.name, 'system')
    cb()
  })
  var streams = [
    { stream: stream },
    { level: 'debug', stream: stream },
    { level: 'fatal', stream: stream }
  ]
  var log = pinoms({ streams: streams }).child({ name: 'system' })
  log.info('info stream')
  log.debug('debug stream')
  log.fatal('fatal stream')
  t.is(messageCount, 6)
  t.done()
})

test('forwards name without streams', function (t) {
  var messageCount = 0
  var stream = writeStream(function (data, enc, cb) {
    messageCount += 1
    var line = JSON.parse(data)
    t.equal(line.name, 'system')
    cb()
  })
  var log = pinoms({ name: 'system', stream: stream })
  log.info('info stream')
  log.debug('debug stream')
  log.fatal('fatal stream')
  t.is(messageCount, 2)
  t.done()
})

test('correctly set level if passed with just one stream', function (t) {
  var messageCount = 0
  var stream = writeStream(function (data, enc, cb) {
    messageCount += 1
    var line = JSON.parse(data)
    t.equal(line.name, 'system')
    cb()
  })
  var log = pinoms({ name: 'system', level: 'debug', stream: stream })
  log.info('info stream')
  log.debug('debug stream')
  log.fatal('fatal stream')
  t.is(log.level, 'debug')
  t.is(messageCount, 3)
  t.done()
})

test('creates pretty write stream', function (t) {
  const prettyStream = pinoms.prettyStream()
  t.is(typeof prettyStream.write, 'function')
  t.done()
})

test('creates pretty write stream with default pino-pretty (empty options)', function (t) {
  const dest = new Writable({
    objectMode: true,
    write (formatted, enc) {
      t.is(/^\s*\[\d+\]\sINFO\s+\(\d+\s+on\s+.*?\):\sfoo\n$/.test(strip(formatted)), true)
      t.done()
    }
  })
  const prettyStream = pinoms.prettyStream({ dest })
  const log = pinoms({}, prettyStream)
  log.info('foo')
})

test('creates pretty write stream with custom prettifier', function (t) {
  const prettifier = function () {
    return function () {
      return 'FOO bar'
    }
  }
  const dest = new Writable({
    objectMode: true,
    write (formatted, enc) {
      t.is(formatted, 'FOO bar')
      t.done()
    }
  })
  const prettyStream = pinoms.prettyStream({ prettifier, dest })
  const log = pinoms({}, prettyStream)
  log.info('foo')
})

test('creates pretty write stream with custom options for pino-pretty, via prettyPrint (default)', function (t) {
  const dest = new Writable({
    objectMode: true,
    write (formatted, enc) {
      t.is(formatted, 'INFO : foo\n')
      t.done()
    }
  })
  const prettyPrint = { colorize: false, ignore: 'hostname,pid,time' }
  const prettyStream = pinoms.prettyStream({ prettyPrint, dest })
  const log = pinoms({}, prettyStream)
  log.info('foo')
})

test('creates pretty write stream with custom options for pino-pretty, via opts (obsolete)', function (t) {
  const dest = new Writable({
    objectMode: true,
    write (formatted, enc) {
      t.is(formatted, 'INFO : foo\n')
      t.done()
    }
  })
  const opts = { colorize: false, ignore: 'hostname,pid,time' }
  const prettyStream = pinoms.prettyStream({ opts, dest })
  const log = pinoms({}, prettyStream)
  log.info('foo')
})

test('custom levels', function (t) {
  var messageCount = 0
  var stream = writeStream(function (data, enc, cb) {
    messageCount += 1
    cb()
  })
  var streams = [
    { stream: stream },
    { level: 15, stream: stream },
    { level: 60, stream: stream }
  ]
  var log = pinoms({
    level: 'debug',
    customLevels: {
      blabla: 15
    },
    streams
  })
  log.blabla('blabla stream')
  log.info('info stream')
  log.debug('debug stream')
  log.fatal('fatal stream')
  t.is(messageCount, 7)
  t.done()
})
