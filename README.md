# Visaudio

## Install

`cd` into the project directory

[Install nvm](https://github.com/creationix/nvm) and source it

`. ~/.nvm/nvm.sh`

```
npm install -g bower ember-cli
npm install
bower install
```

## Start the app

we use a proxy for api requests, first start the api server 

```
node api/server.js
```

then start the ember server (takes care of frontend build and livereload)

```
ember serve --proxy-http://localhost:3000
```

navigate to `http://localhost:4200` in your browser

## Deployment 
[heroku-buildpack-multi](https://github.com/heroku/heroku-buildpack-multi)

[heroku-buildpack-ember-cli-without-webserver](https://github.com/szimek/heroku-buildpack-ember-cli-without-webserver)

[heroku-buildpack-ffmpeg](https://github.com/shunjikonishi/heroku-buildpack-ffmpeg)

[heroku-buildpack-graphicsmagick](https://github.com/mcollina/heroku-buildpack-graphicsmagick)


Enjoy!



