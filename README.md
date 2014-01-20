# phantomHAR

A PhantomJS script to generate
[HTTP Archive (HAR)](https://dvcs.w3.org/hg/webperf/raw-file/tip/specs/HAR/Overview.html)
data from captured network traffic.


# Dependencies

* <code>[brew](http://brew.sh/) install [phantomjs](http://phantomjs.org/)</code>


# Usage

## Output to `stdout`

    phantomjs phantomhar.js 'http://thephantomoftheopera.com'

## Output to clipboard (Mac OS X)

    phantomjs phantomhar.js 'http://thephantomoftheopera.com' | pbcopy

## Output to a file

    phantomjs phantomhar.js 'http://thephantomoftheopera.com' > 'tpoto.com-'$(date +%Y.%m.%d-%H.%M.%S)'.har'
