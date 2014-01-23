// Based on https://github.com/ariya/phantomjs/blob/master/examples/netsniff.js

var fs = require('fs');
var system = require('system');

var webpage = require('webpage');


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

        entries.push({
            cache: {},
            pageref: address,
            request: {
                bodySize: -1,
                cookies: [],
                headers: request.headers,
                headersSize: -1,
                httpVersion: 'HTTP/1.1',
                method: request.method,
                queryString: [],
                url: request.url,
            },
            response: {
                bodySize: startReply.bodySize,
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
                    size: startReply.bodySize,
                    text: startReply.content || ''
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
            pages: [{
                startedDateTime: startTime.toISOString(),
                id: address,
                title: title,
                pageTimings: {
                    onLoad: page.endTime - page.startTime
                }
            }],
            version: '1.2',
        }
    };
}

function openPage(url) {
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
    fs.removeTree(page.offlineStoragePath);

    page.open(page.address, function(status) {
        if (status !== 'success') {
            console.log('FAILed to load the address');
            phantom.exit(1);
        } else {
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
            console.log(JSON.stringify(har, null, 4));
            phantom.exit();
        }
    });
}

if (system.args.length === 1) {
    console.log('Usage:', system.args[0], '<URL>');
    phantom.exit(1);
}

openPage(system.args[1]);
