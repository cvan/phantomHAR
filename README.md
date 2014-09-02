![phantomHAR Logo](https://raw.githubusercontent.com/cvan/phantomHAR/master/images/logo.png)

A PhantomJS script to generate
[HTTP Archive (HAR)](https://dvcs.w3.org/hg/webperf/raw-file/tip/specs/HAR/Overview.html)
data from captured network traffic.


## Dependencies

To use PhantomJS:

<code>[brew](http://brew.sh/) install [phantomjs](http://phantomjs.org/)</code>

To use SlimerJS:

    ./install-packages.sh


## Installation

Initialise settings:

    cp settings_local.js.dist settings_local.js


## Development

Run the development server:

    node app.js

To have the server restart upon changes, use [nodemon](https://github.com/remy/nodemon):

    nodemon app.js


## Usage

### Command-Line Interface

To run from the command line, run `node phantomhar.js`.

      Usage: phantomhar [options]

      Options:

        -h, --help           output usage information
        -V, --version        output the version number
        -u, --url <url>      specify the url for which to generate a HAR
        -d, --delay [delay]  wait X seconds before generating the HAR [$PHANTOMHAR_DELAY || 1000]
        -b, --bodies         include response bodies in the HAR [$PHANTOMHAR_BODIES || false]
        -H, --host [host]    specify the server host [$PHANTOMHAR_HOST || 0.0.0.0]
        -p, --port [port]    specify the server port [$PHANTOMHAR_PORT || 4000]


#### Output to `stdout`

    node phantomhar.js 'http://thephantomoftheopera.com'

#### Output to clipboard (Mac OS X)

    node phantomhar.js 'http://thephantomoftheopera.com' | pbcopy

#### Output to a file

    node phantomhar.js 'http://thephantomoftheopera.com' > 'tpoto.com-'$(date +%Y.%m.%d-%H.%M.%S)'.har'
