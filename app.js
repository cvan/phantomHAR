var cors = require('cors');
var express = require('express');
var morgan = require('morgan');
var request = require('request');


try {
  var settings = require('./settings_local');
} catch (e) {
  var settings = require('./settings');
}


var env = process.env.NODE_ENV || 'development';
var app = express();

// Logging.
app.use(morgan(env === 'development' ? 'dev' : 'combined'));

// CORS everything.
app.use(cors());

app.get('/har', har);
app.post('/har', har);


function har(req, res) {
  var DATA = req.body;

  // (1) Accept JSON payload from GitHub.
  // (2) Accept JSON payload à la CLI options.
  // (3) Accept query-string options.

  // if (payload) {
  //   try {
  //     payload = JSON.parse(payload);
  //   } catch(e) {
  //   }
  //   if (payload && payload.after &&
  //       payload.repository && payload.repository.url) {
  //     sha = payload.after;
  //     repoUrl = payload.repository.url;
  //   }
  // }
}


var port = process.env.PORT || settings.PORT || 9000;

var server = app.listen(port, function (url) {
  var address = server.address();
  console.log('Server listening at %s:%s', address.address, address.port);
});
