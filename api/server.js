var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var compress = require('compression');
var kue = require('kue');
var jobs = kue.createQueue();


var slideshow = require('./../slideshow/slideshow');
var facebook = require('./../slideshow/facebook');

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
  function createJob() {
    var job = jobs.create('slideshows', {
      token: token,
      songPath: songPath,
      urls: urls
    });
    job.on('complete', function (){
      console.log('Job', job.id, 'with token', job.data.token, 'is done');
    }).on('failed', function (){
      console.log('Job', job.id, 'with token', job.data.token, 'has failed');
      createJob()
    });
    job.save();
  }
  createJob()

  res.status(200).send(JSON.stringify({ data: 'all good in the hood' }));
});

app.get('*', function(req, res) {
  res.sendFile(path.resolve('dist/index.html'));
});

app.listen(serverSettings.port, function() {
  console.log('Server listening on port ' + serverSettings.port);
});
