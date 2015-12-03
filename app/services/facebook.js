import Ember from 'ember';

var _user = null;

export default Ember.Service.extend({
  getUser() {
    return _user;
  },

  fbConnect() {
    return new Ember.RSVP.Promise((resolve, reject) => {
      this.fbGetLoginStatus().then((status) => {
        if (status === 'connected') {
          this.fbFetchUser().then(() => {
            resolve();
          });
        } else {
          this.fbLogin().then(() => {
            this.fbFetchUser().then(() => {
              resolve();
            });
          });
        }
      }).catch((error)=> {
        reject(error);
      });
    });
  },

  fbLogin() {
    return new Ember.RSVP.Promise(function (resolve, reject) {
      FB.login(function (response) {
        if (response.authResponse) {
          resolve(response.authResponse);
        } else {
          reject();
        }
      }, {scope: 'user_photos'});
    });
  },

  fbGetLoginStatus() {
    return new Ember.RSVP.Promise(function (resolve, reject) {
      FB.getLoginStatus(function (response) {
        if (response && !response.error) {
          resolve(response.status);
        } else {
          reject(response.error);
        }
      });
    });
  },

  fbGetPhotos() {
    return new Ember.RSVP.Promise(function (resolve) {
      resolve();
    });
  },

  fbApi() {
    return new Ember.RSVP.Promise(function (resolve) {
      resolve();
    });
  },

  fbFetchUser() {
    return new Ember.RSVP.Promise((resolve) => {
      FB.api('/me', function (user) {
        _user = user;
        resolve();
      });
    });
  },

  fbFetchPhotoUrls() {
    return this.fbFetchMePhotos().then((photos) => {
      let urls = [];
      let photosPromises = [];
      photos.forEach((photo) => {
        photosPromises.push(this.fetchPhoto(photo.id).then((photoUrl) => {
          urls.push(photoUrl);
        }));
      });
      return Ember.RSVP.all(photosPromises).then(function () {
        return urls;
      });
    });
  },

  fetchPhoto: function (photoId) {
    return new Ember.RSVP.Promise((resolve) => {
      FB.api(`${photoId}`, 'get', {fields: 'images'}, (response)=> {
        resolve(response.images[1].source);
      });
    });
  },

  fetchAlbumPhotos: function (albumId) {
    return new Ember.RSVP.Promise((resolve) => {
      FB.api(`/${albumId}/photos`, function (response) {
        resolve(response.data);
      });
    });
  },

  fbFetchAlbums() {
    return new Ember.RSVP.Promise((resolve) => {
      FB.api('/me/albums', function (response) {
        resolve(response.data);
      });
    });
  },

  fbFetchMePhotos() {
    var ismobile=navigator.userAgent.match(/(iPad)|(iPhone)|(iPod)|(android)|(webOS)/i);
    var numImages = ismobile ? 10 : 500;
    return new Ember.RSVP.Promise((resolve) => {
      FB.api(`/${_user.id}/photos`, 'get', {type: 'uploaded', limit: numImages}, function (response) {
        resolve(response.data);
      });
    });
  },

  fbShare: function() {
    FB.ui({
      method: 'share',
      href: 'http://visaudio.me'
    });
  }
});
