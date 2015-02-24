![PhantomHAR Logo](https://raw.githubusercontent.com/cvan/phantomHAR/master/images/logo.png "PhantomHAR Logo")

A PhantomJS script to generate
[HTTP Archive (HAR)](https://dvcs.w3.org/hg/webperf/raw-file/tip/specs/HAR/Overview.html)
data from captured network traffic.


## Dependencies

To use PhantomJS:

<code>[brew](http://brew.sh/) install [phantomjs](http://phantomjs.org/)</code>

To use SlimerJS:

    ./install-packages.sh


## Installation

If you'd like easier CLI invocation, you can install PhantomHAR globally:

    npm install -g phantomhar

Or clone the repo locally and install the Node dependencies:

    git clone git@github.com:cvan/phantomHAR.git
    npm install



## Tests

To run tests:

    npm test


## Usage

### Command-Line Interface

To run from the command line:

    phantomhar

Alternatively:

    node cli.js

This will output:

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

##### Globally

    phantomhar 'http://thephantomoftheopera.com'

##### Locally

    node cli.js 'http://thephantomoftheopera.com'

#### Output to clipboard (Mac OS X)

##### Globally

    phantomhar 'http://thephantomoftheopera.com' | pbcopy

##### Locally

    node cli.js 'http://thephantomoftheopera.com' | pbcopy

#### Output to a file

##### Globally

    phantomhar 'http://thephantomoftheopera.com' > 'tpoto.com-'$(date +%Y.%m.%d-%H.%M.%S)'.har'

##### Locally

    node cli.js 'http://thephantomoftheopera.com' > 'tpoto.com-'$(date +%Y.%m.%d-%H.%M.%S)'.har'
