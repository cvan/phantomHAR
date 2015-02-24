#!/usr/bin/env node
var program = require('commander');

var phantomhar = require('./lib/phantomhar.js');
var pkg = require('./package');


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


/**
 * Open page.
 */
phantomhar.har(options).then(function (processedData) {
  console.log(JSON.stringify(processedData, null, 2));
}).catch(function (err) {
  console.error('Error:\n' + err);
});
