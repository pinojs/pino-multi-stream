'use strict'

const test = require('tap').test
const os = require('os')
const pino = require('../')

const sink = require('./helper').sink
const check = require('./helper').check

const pid = process.pid
const hostname = os.hostname()

function levelTest (name, level) {
  test(name + ' logs as ' + level, function (t) {
    t.plan(2)
    const instance = pino(sink(function (chunk, enc, cb) {
      check(t, chunk, level, 'hello world')
    }))

    instance.level = name
    instance[name]('hello world')
  })

  test('passing objects at level ' + name, function (t) {
    t.plan(2)
    const instance = pino(sink(function (chunk, enc, cb) {
      t.ok(new Date(chunk.time) <= new Date(), 'time is greater than Date.now()')
      delete chunk.time
      t.same(chunk, {
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
    const instance = pino(sink(function (chunk, enc, cb) {
      t.ok(new Date(chunk.time) <= new Date(), 'time is greater than Date.now()')
      delete chunk.time
      t.same(chunk, {
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
    const instance = pino(sink(function (chunk, enc, cb) {
      check(t, chunk, level, 'hello 42')
    }))

    instance.level = name
    instance[name]('hello %d', 42)
  })

  test('passing error with a serializer at level ' + name, function (t) {
    t.plan(2)
    const err = new Error('myerror')
    const instance = pino({
      serializers: {
        err: pino.stdSerializers.err
      }
    }, sink(function (chunk, enc, cb) {
      t.ok(new Date(chunk.time) <= new Date(), 'time is greater than Date.now()')
      delete chunk.time
      t.same(chunk, {
        pid: pid,
        hostname: hostname,
        level: level,
        msg: 'myerror',
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
    const instance = pino(sink(function (chunk, enc, cb) {
      t.ok(new Date(chunk.time) <= new Date(), 'time is greater than Date.now()')
      delete chunk.time
      t.same(chunk, {
        pid: pid,
        hostname: hostname,
        level: level,
        msg: 'hello world',
        hello: 'world'
      })
    }))

    instance.level = name
    const child = instance.child({
      hello: 'world'
    })
    child[name]('hello world')
  })

  test('child logger for level ' + name + ' does not change parent level', function (t) {
    const instance = pino({
      customLevels: {
        buu: level + 1
      }
    }, sink(function (chunk, enc, cb) {
      t.fail('should not be called')
    }))

    instance.level = level + 1

    const child = instance.child({
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
