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

Enjoy!



