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


module.exports = errors;
