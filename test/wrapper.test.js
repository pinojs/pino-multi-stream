'use strict'

const writeStream = require('flush-write-stream')
const pino = require('pino')
const test = require('tap').test
const pinoms = require('../')
const { Writable } = require('stream')
const strip = require('strip-ansi')

test('sends to multiple streams', function (t) {
  let messageCount = 0
  const stream = writeStream(function (data, enc, cb) {
    messageCount += 1
    cb()
  })
  const streams = [
    { stream: stream },
    { level: 'debug', stream: stream },
    { level: 'fatal', stream: stream }
  ]
  const log = pinoms({ streams: streams })
  log.info('info stream')
  log.debug('debug stream')
  log.fatal('fatal stream')
  t.equal(messageCount, 6)
  t.end()
})

test('level include higher levels', function (t) {
  let messageCount = 0
  const stream = writeStream(function (data, enc, cb) {
    messageCount += 1
    cb()
  })
  const log = pinoms({ streams: [{ level: 'info', stream: stream }] })
  log.fatal('message')
  t.equal(messageCount, 1)
  t.end()
})

test('supports multiple arguments', function (t) {
  const messages = []
  const stream = writeStream(function (data, enc, cb) {
    messages.push(JSON.parse(data))
    if (messages.length === 2) {
      const msg1 = messages[0]
      t.equal(msg1.msg, 'foo bar baz foobar')

      const msg2 = messages[1]
      t.equal(msg2.msg, 'foo bar baz foobar barfoo foofoo')

      t.end()
    }
    cb()
  })
  const log = pinoms({ streams: stream })
  log.info('%s %s %s %s', 'foo', 'bar', 'baz', 'foobar') // apply not invoked
  log.info('%s %s %s %s %s %s', 'foo', 'bar', 'baz', 'foobar', 'barfoo', 'foofoo') // apply invoked
})

test('supports children', function (t) {
  const stream = writeStream(function (data, enc, cb) {
    const input = JSON.parse(data)
    t.equal(input.msg, 'child stream')
    t.equal(input.child, 'one')
    t.end()
    cb()
  })
  const streams = [
    { stream: stream }
  ]
  const log = pinoms({ streams: streams }).child({ child: 'one' })
  log.info('child stream')
})

test('supports grandchildren', function (t) {
  const messages = []
  const stream = writeStream(function (data, enc, cb) {
    messages.push(JSON.parse(data))
    if (messages.length === 3) {
      const msg1 = messages[0]
      t.equal(msg1.msg, 'grandchild stream')
      t.equal(msg1.child, 'one')
      t.equal(msg1.grandchild, 'two')

      const msg2 = messages[1]
      t.equal(msg2.msg, 'grandchild stream')
      t.equal(msg2.child, 'one')
      t.equal(msg2.grandchild, 'two')

      const msg3 = messages[2]
      t.equal(msg3.msg, 'debug grandchild')
      t.equal(msg3.child, 'one')
      t.equal(msg3.grandchild, 'two')

      t.end()
    }
    cb()
  })
  const streams = [
    { stream: stream },
    { level: 'debug', stream: stream }
  ]
  const log = pinoms({ streams: streams }).child({ child: 'one' }).child({ grandchild: 'two' })
  log.info('grandchild stream')
  log.debug('debug grandchild')
})

test('supports custom levels', function (t) {
  const stream = writeStream(function (data, enc, cb) {
    t.equal(JSON.parse(data).msg, 'bar')
    t.end()
  })
  const log = pinoms({
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
  const stream = writeStream(function (data, enc, cb) {
    t.equal(JSON.parse(data).msg, 'bar')
    t.end()
  })
  const parent = pinoms({
    customLevels: {
      foo: 35
    },
    streams: [{
      level: 35,
      stream: stream
    }]
  })
  const child = parent.child({ child: 'yes' })
  child.foo('bar')
})

test('supports empty constructor arguments', function (t) {
  const log = pinoms()
  t.equal(typeof log.info, 'function')
  t.end()
})

test('exposes pino.destination', function (t) {
  t.equal(pinoms.destination, pino.destination)
  t.end()
})

test('exposes pino.extreme', function (t) {
  t.equal(pinoms.extreme, pino.extreme)
  t.end()
})

test('exposes pino.stdSerializers', function (t) {
  t.equal(pinoms.stdSerializers, pino.stdSerializers)
  t.end()
})

test('exposes pino.stdTimeFunctions', function (t) {
  t.equal(pinoms.stdTimeFunctions, pino.stdTimeFunctions)
  t.end()
})

test('exposes pino.LOG_VERSION', function (t) {
  t.equal(pinoms.LOG_VERSION, pino.LOG_VERSION)
  t.end()
})

test('exposes pino.levels', function (t) {
  t.equal(pinoms.levels, pino.levels)
  t.end()
})

test('exposes pino.symbols', function (t) {
  t.equal(pinoms.symbols, pino.symbols)
  t.end()
})

test('forwards name', function (t) {
  let messageCount = 0
  const stream = writeStream(function (data, enc, cb) {
    messageCount += 1
    const line = JSON.parse(data)
    t.equal(line.name, 'system')
    cb()
  })
  const streams = [
    { stream: stream },
    { level: 'debug', stream: stream },
    { level: 'fatal', stream: stream }
  ]
  const log = pinoms({ name: 'system', streams: streams })
  log.info('info stream')
  log.debug('debug stream')
  log.fatal('fatal stream')
  t.equal(messageCount, 6)
  t.end()
})

test('forwards name via child', function (t) {
  let messageCount = 0
  const stream = writeStream(function (data, enc, cb) {
    messageCount += 1
    const line = JSON.parse(data)
    t.equal(line.name, 'system')
    cb()
  })
  const streams = [
    { stream: stream },
    { level: 'debug', stream: stream },
    { level: 'fatal', stream: stream }
  ]
  const log = pinoms({ streams: streams }).child({ name: 'system' })
  log.info('info stream')
  log.debug('debug stream')
  log.fatal('fatal stream')
  t.equal(messageCount, 6)
  t.end()
})

test('forwards name without streams', function (t) {
  let messageCount = 0
  const stream = writeStream(function (data, enc, cb) {
    messageCount += 1
    const line = JSON.parse(data)
    t.equal(line.name, 'system')
    cb()
  })
  const log = pinoms({ name: 'system', stream: stream })
  log.info('info stream')
  log.debug('debug stream')
  log.fatal('fatal stream')
  t.equal(messageCount, 2)
  t.end()
})

test('correctly set level if passed with just one stream', function (t) {
  let messageCount = 0
  const stream = writeStream(function (data, enc, cb) {
    messageCount += 1
    const line = JSON.parse(data)
    t.equal(line.name, 'system')
    cb()
  })
  const log = pinoms({ name: 'system', level: 'debug', stream: stream })
  log.info('info stream')
  log.debug('debug stream')
  log.fatal('fatal stream')
  t.equal(log.level, 'debug')
  t.equal(messageCount, 3)
  t.end()
})

test('creates pretty write stream', function (t) {
  const prettyStream = pinoms.prettyStream()
  t.equal(typeof prettyStream.write, 'function')
  t.end()
})

test('creates pretty write stream with default pino-pretty (empty options)', function (t) {
  const dest = new Writable({
    objectMode: true,
    write (formatted, enc) {
      t.equal(/^\s*\[\d+\]\sINFO\s+\(\d+\s+on\s+.*?\):\sfoo\n$/.test(strip(formatted)), true)
      t.end()
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
      t.equal(formatted, 'FOO bar')
      t.end()
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
      t.equal(formatted, 'INFO: foo\n')
      t.end()
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
      t.equal(formatted, 'INFO: foo\n')
      t.end()
    }
  })
  const opts = { colorize: false, ignore: 'hostname,pid,time' }
  const prettyStream = pinoms.prettyStream({ opts, dest })
  const log = pinoms({}, prettyStream)
  log.info('foo')
})

test('custom levels', function (t) {
  let messageCount = 0
  const stream = writeStream(function (data, enc, cb) {
    messageCount += 1
    cb()
  })
  const streams = [
    { stream: stream },
    { level: 15, stream: stream },
    { level: 60, stream: stream }
  ]
  const log = pinoms({
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
  t.equal(messageCount, 7)
  t.end()
})
