var http = require('http');
var zlib = require('zlib');

var phantom = require('node-phantom-simple');
var program = require('commander');
var Promise = require('es6-promise').Promise;
var request = require('request');

var utils = require('./lib/utils');
var pkg = require('./package');


// The contents of these types of files should be included in the HAR.
var ALLOWED_CONTENT_TYPES = ['css', 'js', 'json', 'doc'];


var errors = {};
function Exception() {
}
Exception.prototype.toString = function () {
  return (this.name ? '[' + this.name + '] ' : '') + (this.message || '');
};

[
  'ConnectionError'
].forEach(function (key) {
  errors[key] = function (message) {
    this.name = key;
    this.message = message;
  };
  errors[key].prototype = new Exception();
});


var phantomInstance;

phantom.create = utils.promisify(phantom.create);


function openPage(opts) {
  return phantom.create().then(function (ph) {
    phantomInstance = ph;
    return utils.promisify(ph.createPage)().then(function (page) {
      return createPage(page, ph, opts);
    });
  });
}

function createPage(page, ph, opts) {
  return new Promise(function (resolve, reject) {
    page.address = opts.url;
    page.customHeaders = {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };
    page.resources = {};
    page.types = {};

    page.onLoadStarted = function () {
      page.startTime = new Date();
    };

    page.onResourceRequested = function (req) {
      // TODO: File issue against `node-phantom-simple` for this.
      req = req[0];

      page.resources[req.id] = {
        request: req,
        startReply: null,
        endReply: null
      };
    };

    page.onResourceReceived = function (res) {
      // console.log('\nreceived!! ', JSON.stringify(res));

      var resource = page.resources[res.id];
      if (typeof resource === 'undefined') {
        // TODO: File issue against `node-phantom-simple` for data URIs not
        // having requests.
        resource = {
          request: {},
          startReply: null,
          endReply: null
        };
      }

      switch (res.stage) {
        case 'start':
          resource.startReply = res;
          break;
        case 'end':
          resource.endReply = res;
          break;
      }

      page.endTime = new Date();
    };

    // Clear browser cache/cookies/localStorage.
    // TODO: Figure out a way to do this with SlimerJS. (This works fine in PhantomJS.)
    //fs.removeTree(page.offlineStoragePath);

    return page.open(page.address, function (err, status) {
      if (status !== 'success') {
        return reject(
          new errors.ConnectionError('Failed to load the URL (status: ' + status + ')'));
      }

      setTimeout(function () {
        resolve(createHAR(page));
      }, opts.delay * 1000);
    });
  });
}


function createHAR(page) {
  var address = page.address;
  var title = page.title;
  var startTime = page.startTime;
  var types = page.types;

  var entries = [];

  Object.keys(page.resources).forEach(function (key) {
    var resource = page.resources[key];
    var request = resource.request;
    var startReply = resource.startReply;
    var endReply = resource.endReply;
    var error = resource.error;

    if (!request || !startReply || !endReply) {
      return;
    }

    // Exclude data URIs from the HAR because they aren't
    // included in the spec.
    if (request.url.substring(0, 5).toLowerCase() === 'data:') {
      return;
    }

    var resType = types[request.url];
    if (!resType && endReply.contentType &&
        typeof endReply.contentType === 'string') {
      resType = utils.getType(endReply.contentType, request.url);
    }

    if (typeof request.time === 'string') {
      request.time = new Date(request.time);
    }

    if (error) {
      startReply.bodySize = 0;
      startReply.time = 0;
      endReply.time = 0;
      endReply.content = {};
      endReply.contentType = null;
      endReply.headers = [];
      endReply.statusText = getErrorString(error);
      endReply.status = null;
      resType = null;
    }

    entries.push({
      cache: {},
      pageref: address,
      request: {
        // Accurate `bodySize` blocked on https://github.com/ariya/phantomjs/pull/11484
        // bodySize: -1,
        bodySize: startReply.bodySize,
        cookies: [],
        headers: request.headers,
        // Accurate `headersSize` blocked on https://github.com/ariya/phantomjs/pull/11484
        // headersSize: -1,
        headersSize: 0,
        httpVersion: 'HTTP/1.1',
        method: request.method,
        queryString: [],
        url: request.url
      },
      response: {
        // Accurate `bodySize` (after gzip/deflate) blocked on https://github.com/ariya/phantomjs/issues/10156
        // bodySize: -1,
        bodySize: endReply.bodySize,
        cookies: [],
        headers: endReply.headers,
        headersSize: -1,
        httpVersion: 'HTTP/1.1',
        redirectURL: '',
        status: endReply.status,
        statusText: endReply.statusText,
        content: {
          _type: resType,
          mimeType: endReply.contentType,
          size: endReply.bodySize,
          // This will be empty because of this PhantomJS bug: https://github.com/ariya/phantomjs/pull/11484
          // Fortunately, in `processResponses` we have a workaround :)
          text: ALLOWED_CONTENT_TYPES.indexOf(endReply.contentType) !== -1 ? endReply.body : null
        }
      },
      startedDateTime: request.time.toISOString(),
      time: endReply.time - request.time,
      timings: {
        blocked: 0,
        dns: -1,
        connect: -1,
        send: 0,
        wait: startReply.time - request.time,
        receive: endReply.time - startReply.time,
        ssl: -1
      }
    });
  });

  return {
    log: {
      creator: {
        name: pkg.name,
        version: pkg.version
      },
      entries: entries,
      pages: [
        {
          startedDateTime: startTime.toISOString(),
          id: address,
          title: title,
          pageTimings: {
            onLoad: page.endTime.getTime() - page.startTime.getTime()
          }
        }
      ],
      version: pkg.version
    }
  };
}


function processResponses(data) {
  var opts = {};
  var promises = [];

  // Fetch each request separately.
  Object.keys(data.log.entries).forEach(function (key, idx) {
    var entry = data.log.entries[key];

    promises.push(new Promise(function (resolve) {
      opts = {
        method: entry.request.method,
        url: entry.request.url,
        headers: {}
      };
      entry.request.headers.forEach(function (header) {
        opts.headers[header.name] = header.value;
      });

      var rawReqHeaders = 'HTTP/1.1 GET ' + entry.request.url + '\r\n';
      Object.keys(opts.headers).forEach(function (headerKey) {
        rawReqHeaders += headerKey + ': ' + opts.headers[headerKey] + '\r\n';
      });
      rawReqHeaders += '\r\n';

      request(opts).on('response', function (res) {
        // Raw headers were added in v0.12
        // (https://github.com/joyent/node/issues/4844), but let's
        // reconstruct them for backwards compatibility.
        var rawResHeaders = ('HTTP/' + res.httpVersion + ' ' + res.statusCode +
                          ' ' + http.STATUS_CODES[res.statusCode] + '\r\n');
        Object.keys(res.headers).forEach(function (headerKey) {
          rawResHeaders += headerKey + ': ' + res.headers[headerKey] + '\r\n';
        });
        rawResHeaders += '\r\n';

        var uncompressedSize = 0;  // size after uncompression
        var bodySize = 0;  // bytes size over the wire
        var body = '';  // plain text body (after uncompressing gzip/deflate)

        function tally() {
          entry.request.headerSize = Buffer.byteLength(rawReqHeaders, 'utf8');

          if (ALLOWED_CONTENT_TYPES.indexOf(entry.response.content._type) !== -1) {
            // Store only human-readable content (i.e., not binary)
            // (and if the user actually wants the response bodies in the HAR).
            entry.response.content.text = body;
          }
          entry.response.bodySize = bodySize;
          entry.response.content.headersSize = Buffer.byteLength(rawResHeaders, 'utf8');
          entry.response.content.size = uncompressedSize;
          entry.response.content.compression = uncompressedSize - bodySize;
          entry.response.content.bodySize = bodySize + entry.response.content.compression;

          resolve({idx: idx, data: entry});
        }

        switch (res.headers['content-encoding']) {
          case 'gzip':
            var gzip = zlib.createGunzip();

            gzip.on('data', function (data) {
              body += data;
              uncompressedSize += data.length;
            }).on('end', function () {
              tally();
            });

            res.on('data', function (data) {
              bodySize += data.length;
            }).pipe(gzip);

            break;
          case 'deflate':
            var deflate = zlib.createInflate();

            deflate.on('data', function (data) {
              body += data;
              uncompressedSize += data.length;
            }).on('end', function () {
              tally();
            });

            res.on('data', function (data) {
              bodySize += data.length;
            }).pipe(deflate);

            break;
          default:
            res.on('data', function (data) {
              body += data;
              uncompressedSize += bodySize += data.length;
            }).on('end', function () {
              tally();
            });

            break;
        }
      });

    }));
  });

  return Promise.all(promises).then(function (responses) {
    Object.keys(responses).forEach(function (key) {
      var res = responses[key];
      data.log.entries[res.idx] = res.data;
    });
    return data;
  });
}


/**
 * Accept command-line arguments.
 */
program
  .version(pkg.version)
  .option('-u, --url <url>',
    'specify the url for which to generate a HAR')

  .option('-d, --delay [delay]',
    'wait X seconds before generating the HAR [$PHANTOMHAR_DELAY || 1000]',
    process.env.PHANTOMHAR_DELAY || 0)

  .option('-b, --bodies',
    'include response bodies in the HAR [$PHANTOMHAR_BODIES || false]',
    process.env.PHANTOMHAR_BODIES || false)

  .option('-H, --host [host]',
    'specify the server host [$PHANTOMHAR_HOST || 0.0.0.0]',
    process.env.PHANTOMHAR_HOST || '0.0.0.0')

  .option('-p, --port [port]',
    'specify the server port [$PHANTOMHAR_PORT || 4000]',
    process.env.PHANTOMHAR_PORT || '4000');

var options = program.parse(process.argv);

// Handle URL passed without `--url` option.
if (!options.url && options.args[0]) {
  options.url = options.args[0];
}

// Show help if no URL passed.
if (!options.url) {
  program.help();
}

// If the user doesn't want response bodies shown, remove all possible types.
if (!options.bodies) {
  ALLOWED_CONTENT_TYPES = [];
}


openPage(options).then(function (data) {
  return processResponses(data);
}).then(function (processedData) {
  console.log(JSON.stringify(processedData, null, 2));
  phantomInstance.exit();
}).catch(function (err) {
  console.error('Error:\n' + err);
  phantomInstance.exit(1);
});
