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

app.post('/publish-slideshow', function(req, res) {
  var urls = req.body.urls;
  var token = req.body.token;
  var songPath = req.body.songPath;

  res.status(200).send(JSON.stringify({ data: 'all good in the hood' }));
});

app.get('*', function(req, res) {
  res.sendFile(path.resolve('dist/index.html'));
});

app.listen(serverSettings.port, function() {
  console.log(`Server listening on port ${serverSettings.port}`);
});
