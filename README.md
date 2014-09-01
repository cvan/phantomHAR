![phantomHAR Logo](https://raw.github.com/cvan/phantomHAR/master/images/logo.png)

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

    cp settings_local.js.dist settings_local.js.dist


## Development

Run the development server:

    node app.js

To have the server restart upon changes, use [nodemon](https://github.com/remy/nodemon):

    nodemon app.js


## Usage

### Output to `stdout`

    phantomjs phantomhar.js 'http://thephantomoftheopera.com'

### Output to clipboard (Mac OS X)

    phantomjs phantomhar.js 'http://thephantomoftheopera.com' | pbcopy

### Output to a file

    phantomjs phantomhar.js 'http://thephantomoftheopera.com' > 'tpoto.com-'$(date +%Y.%m.%d-%H.%M.%S)'.har'
