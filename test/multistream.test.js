'use strict'

const writeStream = require('flush-write-stream')
const { join } = require('path')
const { readFileSync } = require('fs')
const os = require('os')
const test = require('tap').test
const pino = require('pino')
const multistream = require('../').multistream

test('sends to multiple streams using string levels', function (t) {
  let messageCount = 0
  const stream = writeStream(function (data, enc, cb) {
    messageCount += 1
    cb()
  })
  const streams = [
    { stream: stream },
    { level: 'debug', stream: stream },
    { level: 'trace', stream: stream },
    { level: 'fatal', stream: stream },
    { level: 'silent', stream: stream }
  ]
  const log = pino({
    level: 'trace'
  }, multistream(streams))
  log.info('info stream')
  log.debug('debug stream')
  log.fatal('fatal stream')
  t.is(messageCount, 9)
  t.done()
})

test('sends to multiple streams using custom levels', function (t) {
  let messageCount = 0
  const stream = writeStream(function (data, enc, cb) {
    messageCount += 1
    cb()
  })
  const streams = [
    { stream: stream },
    { level: 'debug', stream: stream },
    { level: 'trace', stream: stream },
    { level: 'fatal', stream: stream },
    { level: 'silent', stream: stream }
  ]
  const log = pino({
    level: 'trace'
  }, multistream(streams))
  log.info('info stream')
  log.debug('debug stream')
  log.fatal('fatal stream')
  t.is(messageCount, 9)
  t.done()
})

test('sends to multiple streams using optionally predefined levels', function (t) {
  let messageCount = 0
  const stream = writeStream(function (data, enc, cb) {
    messageCount += 1
    cb()
  })
  const opts = {
    levels: {
      silent: Infinity,
      fatal: 60,
      error: 50,
      warn: 50,
      info: 30,
      debug: 20,
      trace: 10
    }
  }
  const streams = [
    { stream: stream },
    { level: 'trace', stream: stream },
    { level: 'debug', stream: stream },
    { level: 'info', stream: stream },
    { level: 'warn', stream: stream },
    { level: 'error', stream: stream },
    { level: 'fatal', stream: stream },
    { level: 'silent', stream: stream }
  ]
  const mstream = multistream(streams, opts)
  const log = pino({
    level: 'trace'
  }, mstream)
  log.trace('trace stream')
  log.debug('debug stream')
  log.info('info stream')
  log.warn('warn stream')
  log.error('error stream')
  log.fatal('fatal stream')
  log.silent('silent stream')
  t.is(messageCount, 24)
  t.done()
})

test('sends to multiple streams using number levels', function (t) {
  let messageCount = 0
  const stream = writeStream(function (data, enc, cb) {
    messageCount += 1
    cb()
  })
  const streams = [
    { stream: stream },
    { level: 20, stream: stream },
    { level: 60, stream: stream }
  ]
  const log = pino({
    level: 'debug'
  }, multistream(streams))
  log.info('info stream')
  log.debug('debug stream')
  log.fatal('fatal stream')
  t.is(messageCount, 6)
  t.done()
})

test('level include higher levels', function (t) {
  let messageCount = 0
  const stream = writeStream(function (data, enc, cb) {
    messageCount += 1
    cb()
  })
  const log = pino({}, multistream([{ level: 'info', stream: stream }]))
  log.fatal('message')
  t.is(messageCount, 1)
  t.done()
})

test('supports multiple arguments', function (t) {
  const messages = []
  const stream = writeStream(function (data, enc, cb) {
    messages.push(JSON.parse(data))
    if (messages.length === 2) {
      const msg1 = messages[0]
      t.is(msg1.msg, 'foo bar baz foobar')

      const msg2 = messages[1]
      t.is(msg2.msg, 'foo bar baz foobar barfoo foofoo')

      t.done()
    }
    cb()
  })
  const log = pino({}, multistream({ stream }))
  log.info('%s %s %s %s', 'foo', 'bar', 'baz', 'foobar') // apply not invoked
  log.info('%s %s %s %s %s %s', 'foo', 'bar', 'baz', 'foobar', 'barfoo', 'foofoo') // apply invoked
})

test('supports children', function (t) {
  const stream = writeStream(function (data, enc, cb) {
    const input = JSON.parse(data)
    t.is(input.msg, 'child stream')
    t.is(input.child, 'one')
    t.done()
    cb()
  })
  const streams = [
    { stream: stream }
  ]
  const log = pino({}, multistream(streams)).child({ child: 'one' })
  log.info('child stream')
})

test('supports grandchildren', function (t) {
  const messages = []
  const stream = writeStream(function (data, enc, cb) {
    messages.push(JSON.parse(data))
    if (messages.length === 3) {
      const msg1 = messages[0]
      t.is(msg1.msg, 'grandchild stream')
      t.is(msg1.child, 'one')
      t.is(msg1.grandchild, 'two')

      const msg2 = messages[1]
      t.is(msg2.msg, 'grandchild stream')
      t.is(msg2.child, 'one')
      t.is(msg2.grandchild, 'two')

      const msg3 = messages[2]
      t.is(msg3.msg, 'debug grandchild')
      t.is(msg3.child, 'one')
      t.is(msg3.grandchild, 'two')

      t.done()
    }
    cb()
  })
  const streams = [
    { stream: stream },
    { level: 'debug', stream: stream }
  ]
  const log = pino({
    level: 'debug'
  }, multistream(streams)).child({ child: 'one' }).child({ grandchild: 'two' })
  log.info('grandchild stream')
  log.debug('debug grandchild')
})

test('supports custom levels', function (t) {
  const stream = writeStream(function (data, enc, cb) {
    t.is(JSON.parse(data).msg, 'bar')
    t.done()
  })
  const log = pino({
    customLevels: {
      foo: 35
    }
  }, multistream([{ level: 35, stream: stream }]))
  log.foo('bar')
})

test('supports pretty print', function (t) {
  const stream = writeStream(function (data, enc, cb) {
    t.isNot(data.toString().match(/INFO.*: pretty print/), null)
    t.done()
    cb()
  })
  const outStream = pino({
    prettyPrint: {
      levelFirst: true,
      colorize: false
    }
  }, stream)

  const log = pino({
    level: 'debug',
    name: 'helloName'
  }, multistream([
    { stream: outStream[pino.symbols.streamSym] }
  ]))

  log.info('pretty print')
})

test('children support custom levels', function (t) {
  const stream = writeStream(function (data, enc, cb) {
    t.is(JSON.parse(data).msg, 'bar')
    t.done()
  })
  const parent = pino({
    customLevels: {
      foo: 35
    }
  }, multistream([{ level: 35, stream: stream }]))
  const child = parent.child({ child: 'yes' })
  child.foo('bar')
})

test('levelVal ovverides level', function (t) {
  let messageCount = 0
  const stream = writeStream(function (data, enc, cb) {
    messageCount += 1
    cb()
  })
  const streams = [
    { stream: stream },
    { level: 'blabla', levelVal: 15, stream: stream },
    { level: 60, stream: stream }
  ]
  const log = pino({
    level: 'debug'
  }, multistream(streams))
  log.info('info stream')
  log.debug('debug stream')
  log.fatal('fatal stream')
  t.is(messageCount, 6)
  t.done()
})

test('forwards metadata', function (t) {
  t.plan(3)
  const streams = [
    {
      stream: {
        [Symbol.for('pino.metadata')]: true,
        write (chunk) {
          t.equal(log, this.lastLogger)
          t.equal(30, this.lastLevel)
          t.deepEqual({ hello: 'world', msg: 'a msg' }, this.lastObj)
        }
      }
    }
  ]

  const log = pino({
    level: 'debug'
  }, multistream(streams))

  log.info({ hello: 'world' }, 'a msg')
  t.done()
})

test('forward name', function (t) {
  t.plan(2)
  const streams = [
    {
      stream: {
        [Symbol.for('pino.metadata')]: true,
        write (chunk) {
          const line = JSON.parse(chunk)
          t.equal(line.name, 'helloName')
          t.equal(line.hello, 'world')
        }
      }
    }
  ]

  const log = pino({
    level: 'debug',
    name: 'helloName'
  }, multistream(streams))

  log.info({ hello: 'world' }, 'a msg')
  t.done()
})

test('forward name with child', function (t) {
  t.plan(3)
  const streams = [
    {
      stream: {
        write (chunk) {
          const line = JSON.parse(chunk)
          t.equal(line.name, 'helloName')
          t.equal(line.hello, 'world')
          t.equal(line.component, 'aComponent')
        }
      }
    }
  ]

  const log = pino({
    level: 'debug',
    name: 'helloName'
  }, multistream(streams)).child({ component: 'aComponent' })

  log.info({ hello: 'world' }, 'a msg')
  t.done()
})

test('clone generates a new multistream with all stream at the same level', function (t) {
  let messageCount = 0
  const stream = writeStream(function (data, enc, cb) {
    messageCount += 1
    cb()
  })
  const streams = [
    { stream: stream },
    { level: 'debug', stream: stream },
    { level: 'trace', stream: stream },
    { level: 'fatal', stream: stream }
  ]
  const ms = multistream(streams)
  const clone = ms.clone(30)

  t.notEqual(clone, ms)

  clone.streams.forEach((s, i) => {
    t.notEqual(s, streams[i])
    t.equal(s.stream, streams[i].stream)
    t.equal(s.level, 30)
  })

  const log = pino({
    level: 'trace'
  }, clone)

  log.info('info stream')
  log.debug('debug message not counted')
  log.fatal('fatal stream')
  t.is(messageCount, 8)

  t.done()
})

test('one stream', function (t) {
  let messageCount = 0
  const stream = writeStream(function (data, enc, cb) {
    messageCount += 1
    cb()
  })
  const log = pino({
    level: 'trace'
  }, multistream({ stream, level: 'fatal' }))
  log.info('info stream')
  log.debug('debug stream')
  log.fatal('fatal stream')
  t.is(messageCount, 1)
  t.done()
})

test('dedupe', function (t) {
  let messageCount = 0
  const stream1 = writeStream(function (data, enc, cb) {
    messageCount -= 1
    cb()
  })

  const stream2 = writeStream(function (data, enc, cb) {
    messageCount += 1
    cb()
  })

  const streams = [
    {
      stream: stream1,
      level: 'info'
    },
    {
      stream: stream2,
      level: 'fatal'
    }
  ]

  const log = pino({
    level: 'trace'
  }, multistream(streams, { dedupe: true }))
  log.info('info stream')
  log.fatal('fatal stream')
  log.fatal('fatal stream')
  t.is(messageCount, 1)
  t.done()
})

test('no stream', function (t) {
  const log = pino({
    level: 'trace'
  }, multistream())
  log.info('info stream')
  log.debug('debug stream')
  log.fatal('fatal stream')
  t.done()
})

test('flushSync', function (t) {
  const tmp = join(
    os.tmpdir(),
    '_' + Math.random().toString(36).substr(2, 9)
  )
  const destination = pino.destination({ dest: tmp, sync: false, minLength: 4096 })
  const log = pino({ level: 'info' }, multistream([{ level: 'info', stream: destination }]))
  destination.on('ready', () => {
    log.info('foo')
    log.info('bar')
    t.is(readFileSync(tmp, { encoding: 'utf-8' }).split('\n').length - 1, 0)
    pino.final(log, (err, finalLogger) => {
      if (err) {
        t.fail()
        return t.done()
      }
      t.is(readFileSync(tmp, { encoding: 'utf-8' }).split('\n').length - 1, 2)
      finalLogger.info('biz')
      t.is(readFileSync(tmp, { encoding: 'utf-8' }).split('\n').length - 1, 3)
      t.done()
    })()
  })
})
