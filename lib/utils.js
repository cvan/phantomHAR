var Promise = require('es6-promise').Promise;


module.exports.promisify = function (func) {
  // Already a Promise.
  if (func && typeof func.then === 'function') {
    return func;
  }

  return function () {
    var args = Array.prototype.slice.apply(arguments);

    return new Promise(function (resolve, reject) {
      func.apply({}, args.concat(function (err, value) {
        if (err) {
          reject(err);
        } else {
          resolve(value);
        }
      }));
    });
  };
};


module.exports.getType = function (ct, url) {
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
};


module.exports.getErrorString = function (error) {
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
};
