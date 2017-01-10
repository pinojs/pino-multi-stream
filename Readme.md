# pino-multi-stream

*pino-multi-stream* is a wrapper around the [pino](pino) logger. The purpose
of *pino-multi-stream* is to provide a stop-gap method for migrating from the
[Bunyan](bunyan) logger. Whereas *pino* allows only one destination stream,
*pino-multi-stream* allows multiple destination streams via the same
configuration API as Bunyan.

Please see the [caveats](#caveats) section for some important information
regarding the performance of this module.

+ [Install](#install)
+ [Usage](#usage)
+ [API](#api)
+ [Caveats](#caveats)
+ [License](#license)

[pino]: https://npm.im/pino
[bunyan]: https://npm.im/bunyan

<a id="install"></a>
## Install

```js
npm install -s pino-multi-stream
```

*pino-multi-stream* does not provide the CLI that *pino* provides. Therefore,
you should not install it globally.

<a id="usage"></a>
## Usage

```js
var fs = require('fs')
var pinoms = require('pino-multi-stream')
var streams = [
  {stream: fs.createWriteStream('/tmp/info.stream.out')},
  {level: 'fatal', stream: fs.createWriteStream('/tmp/fatal.stream.out')}
]
var log = pinoms({streams: streams})

log.info('this will be written to /tmp/info.stream.out')
log.fatal('this will be written to /tmp/fatal.stream.out')
```

<a id="api"></a>
## API

The API for *pino-multi-stream* is the same as that for *pino*. Please
read [pino's documentation][pinoapi] for full details. Highlighted here are
the specifics for *pino-multi-stream*:

+ The signature for constructor remains the same, `pino(opts, stream)`, but
  there are a few conditions under which you may get a real *pino* instance
  or one wrapped by *pino-multi-stream*:

  1. If the `opts` parameter is a writable stream, then a real *pino*
     instance will be returned.

  2. If the `opts` parameter is an object with a singular `stream` property
     then a real *pino* instance will be returned. If there is also a plural
     `streams` property, the singular `stream` property takes precedence.

  3. If the `opts` parameter is an object with a plural `streams` property,
     does not include a singluar `stream` property, and is an array, then
     a *pino-multi-stream* wrapped instance will be returned. Otherwise,
     `opts.streams` is treated a single stream and a real *pino* instance
     will be returned.

+ The *pino* options object accepts a `streams` option, as alluded to in then
  previous item. This option should be an array of stream objects. A stream
  object is one with at least a `stream` property and, optionally, a `level`
  property. For example:

  ```js
  var logger = pinoms({
    streams: [
      {stream: process.stdout}, // an "info" level destination stream
      {level: 'error', stream: process.stderr} // an "error" level destination stream
    ]
  })
  ```

[pinoapi]: https://github.com/pinojs/pino#api

<a id="caveats"></a>
## Caveats

+ The speed of *pino-multi-stream* is dependent upon the number of streams you
add. Regardless of the number, it will be slower than a regular *pino* instance.

+ If you create child loggers then a new logger will be created for ***each
stream*** of the parent logger. This holds true for however many child loggers
are created.

**Stern warning:** the performance of this module being dependent on the number
of streams you supply cannot be overstated. This module is being provided so
that you can switch to *pino* from *Bunyan* and get some immediate improvement,
but it is not meant to be a long term solution. We *strongly* suggest that you
use this module for only as long as it will take you to overhaul the way
you handle logging in your application.

To illustrate what we mean, here is a benchmark of *pino* and *Bunyan* using
"multiple" streams to write to a single stream:

```
benchBunyanOne*10000: 798.461ms
benchPinoMSOne*10000: 255.239ms
```

Now let's look at the same benchmark but increase the number of destination
streams to four:

```
benchBunyanFour*10000: 2654.913ms
benchPinoMSFour*10000: 1282.892ms
```

And, finally, with ten destination streams:

```
benchBunyanTen*10000: 6659.032ms
benchPinoMSTen*10000: 5109.693ms
```

<a id="license"></a>
## License

[MIT License](http://jsumners.mit-license.org/)
