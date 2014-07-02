// Based on https://github.com/ariya/phantomjs/blob/master/examples/netsniff.js

var fs = require('fs');
var system = require('system');

var webpage = require('webpage');


function getErrorString(error) {
    // According to http://qt-project.org/doc/qt-4.8/qnetworkreply.html
    switch (error.errorCode) {
        case 1:
            return '(refused)';
        case 2:
            return '(closed)';
        case 3:
            return '(host not found)';
        case 4:
            return '(timeout)';
        case 5:
            return '(canceled)';
        case 6:
            return '(ssl failure)';
        case 7:
            return '(net failure)';
        default:
            return '(unknown error)';
    }
}

function getType(ct, url) {
    ct = ct.toLowerCase();
    if (ct.substr(0, 8) === 'text/css') {
        return 'css';
    }
    if (/javascript/.test(ct)) {
        return 'js';
    }
    if (/\/json/.test(ct)) {
        return 'json';
    }
    if (/flash/.test(ct)) {
        return 'flash';
    }
    if (ct.substr(0, 6) === 'image/') {
        return 'cssimage';
    }
    if (ct.substr(0, 6) === 'audio/') {
        return 'audio';
    }
    if (ct.substr(0, 6) === 'video/') {
        return 'video';
    }
    if (/(\/|-)font-/.test(ct) || /\/font/.test(ct) ||
        ct.substr(0, 5) === 'font/' ||
        /\.((eot)|(otf)|(ttf)|(woff))($|\?)/i.test(url)) {
        return 'font';
    }
    if (/\.((gif)|(png)|(jpe)|(jpeg)|(jpg)|(tiff))($|\?)/i.test(url)) {
        return 'cssimage';
    }
    if (/\.((flac)|(ogg)|(opus)|(mp3)|(wav)|(weba))($|\?)/i.test(url)) {
        return 'audio';
    }
    if (/\.((mp4)|(webm))($|\?)/i.test(url)) {
        return 'video';
    }
    if (ct.substr(0, 9) === 'text/html' ||
        ct.substr(0, 10) === 'text/plain') {
        return 'doc';
    }
    return null;
}

function createHAR(page) {
    var address = page.address;
    var title = page.title;
    var startTime = page.startTime;
    var resources = page.resources;
    var types = page.types;

    var entries = [];

    resources.forEach(function(resource) {
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

        var type = types[request.url];
        if (!type && endReply.contentType &&
            typeof endReply.contentType === 'string') {
            type = getType(endReply.contentType, request.url);
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
            type = null;
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
                url: request.url,
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
                    _type: type,
                    mimeType: endReply.contentType,
                    size: endReply.bodySize,
                    // Return `text` when we can decode `gzip`-d/`deflate`-d responses.
                    // text: includeResponseText ? endReply.body || '' : null
                    text: null
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
                name: 'PhantomJS (using phantomHAR)',
                version: phantom.version.major + '.' + phantom.version.minor +
                         '.' + phantom.version.patch
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
            version: '1.2',
        }
    };
}

function openPage(url, delay, includeResponseText) {
    delay = delay || 15000;  // Default to 15 seconds

    var page = webpage.create();

    page.address = url;
    page.resources = [];
    page.types = {};

    page.onLoadStarted = function() {
        page.startTime = new Date();
    };

    page.onResourceRequested = function(req) {
        page.resources[req.id] = {
            request: req,
            startReply: null,
            endReply: null
        };
    };

    page.onResourceReceived = function(res) {
        switch (res.stage) {
            case 'start':
                page.resources[res.id].startReply = res;
                break;
            case 'end':
                page.resources[res.id].endReply = res;
                break;
        }
    };

    // Clear browser cache/cookies/localStorage.
    // TODO: Figure out a way to do this with SlimerJS. (This works fine in PhantomJS.)
    //fs.removeTree(page.offlineStoragePath);

    page.open(page.address, function(status) {
        if (status !== 'success') {
            console.log('Failed to load the address');
            return phantom.exit(1);
        }

        window.setTimeout(function() {
            page.endTime = new Date();

            page.evaluate(function() {
                // Get all inline with a `background-image`.
                var elements = Array.prototype.slice.call(
                    document.querySelectorAll('[style*="url("]'));
                var url;
                var urlPattern = /url\(([^)]+)\)/;
                return elements.map(function(x) {
                    url = urlPattern.exec(x.getAttribute('style'));
                    if (url && url[1]) {
                        return url[1].trim()
                            .replace(/["']/g, '')
                            .replace(/^\/\//, window.location.href + '//');
                    }
                });
            }).forEach(function(x) {
                page.types[x] = 'inlinecssimage';
            });

            page.evaluate(function() {
                // Using `img[src]` since `document.images` ain't cooperating.
                var elements = Array.prototype.slice.call(
                    document.querySelectorAll('img[src]'));
                return elements.map(function(x) {
                    return x.getAttribute('src').trim()
                        .replace(/^\/\//, window.location.href + '//');
                });
            }).forEach(function(x) {
                page.types[x] = 'inlineimage';
            });

            var har = createHAR(page);
            console.log(JSON.stringify(har, null, 2));
            phantom.exit();
        }, delay);
    });
}

if (system.args.length === 1) {
    // console.log('Usage:', system.args[0], '<URL> [<delay>] [<includeResponseText>]');
    console.log('Usage:', system.args[0], '<URL> [<delay>]');
    phantom.exit(1);
}

openPage(system.args[1], system.args[2], system.args[3]);
