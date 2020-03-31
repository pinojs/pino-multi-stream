'use strict'

var test = require('tap').test
var os = require('os')
var pino = require('../')

var sink = require('./helper').sink
var check = require('./helper').check

var pid = process.pid
var hostname = os.hostname()

function levelTest (name, level) {
  test(name + ' logs as ' + level, function (t) {
    t.plan(2)
    var instance = pino(sink(function (chunk, enc, cb) {
      check(t, chunk, level, 'hello world')
    }))

    instance.level = name
    instance[name]('hello world')
  })

  test('passing objects at level ' + name, function (t) {
    t.plan(2)
    var instance = pino(sink(function (chunk, enc, cb) {
      t.ok(new Date(chunk.time) <= new Date(), 'time is greater than Date.now()')
      delete chunk.time
      t.deepEqual(chunk, {
        pid: pid,
        hostname: hostname,
        level: level,
        hello: 'world'
      })
    }))

    instance.level = name
    instance[name]({ hello: 'world' })
  })

  test('passing an object and a string at level ' + name, function (t) {
    t.plan(2)
    var instance = pino(sink(function (chunk, enc, cb) {
      t.ok(new Date(chunk.time) <= new Date(), 'time is greater than Date.now()')
      delete chunk.time
      t.deepEqual(chunk, {
        pid: pid,
        hostname: hostname,
        level: level,
        msg: 'a string',
        hello: 'world'
      })
    }))

    instance.level = name
    instance[name]({ hello: 'world' }, 'a string')
  })

  test('formatting logs as ' + name, function (t) {
    t.plan(2)
    var instance = pino(sink(function (chunk, enc, cb) {
      check(t, chunk, level, 'hello 42')
    }))

    instance.level = name
    instance[name]('hello %d', 42)
  })

  test('passing error with a serializer at level ' + name, function (t) {
    t.plan(2)
    var err = new Error('myerror')
    var instance = pino({
      serializers: {
        err: pino.stdSerializers.err
      }
    }, sink(function (chunk, enc, cb) {
      t.ok(new Date(chunk.time) <= new Date(), 'time is greater than Date.now()')
      delete chunk.time
      t.deepEqual(chunk, {
        pid: pid,
        hostname: hostname,
        level: level,
        err: {
          type: 'Error',
          message: err.message,
          stack: err.stack
        }
      })
      cb()
    }))

    instance.level = name
    instance[name]({ err: err })
  })

  test('child logger for level ' + name, function (t) {
    t.plan(2)
    var instance = pino(sink(function (chunk, enc, cb) {
      t.ok(new Date(chunk.time) <= new Date(), 'time is greater than Date.now()')
      delete chunk.time
      t.deepEqual(chunk, {
        pid: pid,
        hostname: hostname,
        level: level,
        msg: 'hello world',
        hello: 'world'
      })
    }))

    instance.level = name
    var child = instance.child({
      hello: 'world'
    })
    child[name]('hello world')
  })

  test('child logger for level ' + name + ' does not change parent level', function (t) {
    var instance = pino({
      customLevels: {
        buu: level + 1
      }
    }, sink(function (chunk, enc, cb) {
      t.fail('should not be called')
    }))

    instance.level = level + 1

    var child = instance.child({
      hello: 'world'
    })

    child.level = name

    instance[name]('hello world')

    t.end()
  })
}

levelTest('fatal', 60)
levelTest('error', 50)
levelTest('warn', 40)
levelTest('info', 30)
levelTest('debug', 20)
levelTest('trace', 10)
