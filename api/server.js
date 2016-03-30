var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var compress = require('compression');

var serverSettings = {
  port: process.env.PORT || 3000
};

var app = express();
app.use(compress());
app.use(express.static(path.resolve('dist')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/***************************
 * Routes
 * **************************/

app.get('*', function(req, res) {
  res.sendFile(path.resolve('dist/index.html'));
});

app.listen(serverSettings.port, function() {
  console.log(`Server listening on port ${serverSettings.port}`);
});
