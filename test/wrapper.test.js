'use strict'

var writeStream = require('flush-write-stream')
var test = require('tap').test
var pinoms = require('../')

test('sends to multiple streams', function (t) {
  var messageCount = 0
  var stream = writeStream(function (data, enc, cb) {
    messageCount += 1
    cb()
  })
  var streams = [
    {stream: stream},
    {level: 'debug', stream: stream},
    {level: 'fatal', stream: stream}
  ]
  var log = pinoms({streams: streams})
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
  var log = pinoms({streams: [{level: 'info', stream: stream}]})
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
  var log = pinoms({streams: stream})
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
    {stream: stream}
  ]
  var log = pinoms({streams: streams}).child({child: 'one'})
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
    {stream: stream},
    {level: 'debug', stream: stream}
  ]
  var log = pinoms({streams: streams}).child({child: 'one'}).child({grandchild: 'two'})
  log.info('grandchild stream')
  log.debug('debug grandchild')
})

test('supports custom levels', function (t) {
  var stream = writeStream(function (data, enc, cb) {
    t.is(JSON.parse(data).msg, 'bar')
    t.done()
  })
  var log = pinoms({streams: [{level: 'foo', levelVal: 35, stream: stream}]})
  log.foo('bar')
})

test('children support custom levels', function (t) {
  var stream = writeStream(function (data, enc, cb) {
    t.is(JSON.parse(data).msg, 'bar')
    t.done()
  })
  var parent = pinoms({streams: [{level: 'foo', levelVal: 35, stream: stream}]})
  var child = parent.child({child: 'yes'})
  child.foo('bar')
})

test('supports empty constructor arguments', function (t) {
  var log = pinoms()
  t.is(typeof log.info, 'function')
  t.done()
})

test('exposes pino.pretty', function (t) {
  t.is(typeof pinoms.pretty, 'function')
  t.done()
})

test('exposes pino.stdSerializers', function (t) {
  t.is(typeof pinoms.stdSerializers, 'object')
  t.is(pinoms.stdSerializers.hasOwnProperty('err'), true)
  t.is(pinoms.stdSerializers.hasOwnProperty('req'), true)
  t.is(pinoms.stdSerializers.hasOwnProperty('res'), true)
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
    {stream: stream},
    {level: 'debug', stream: stream},
    {level: 'fatal', stream: stream}
  ]
  var log = pinoms({name: 'system', streams: streams})
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
    {stream: stream},
    {level: 'debug', stream: stream},
    {level: 'fatal', stream: stream}
  ]
  var log = pinoms({streams: streams}).child({name: 'system'})
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
  var log = pinoms({name: 'system', stream: stream})
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
  var log = pinoms({name: 'system', level: 'debug', stream: stream})
  log.info('info stream')
  log.debug('debug stream')
  log.fatal('fatal stream')
  t.is(log.level, 'debug')
  t.is(messageCount, 3)
  t.done()
})
