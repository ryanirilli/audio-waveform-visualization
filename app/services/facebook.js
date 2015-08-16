import Ember from 'ember';

var _user = null;

export default Ember.Service.extend({
  getUser: function () {
    return _user;
  },

  fbConnect: function () {
    return new Ember.RSVP.Promise((resolve, reject) => {
      this.fbGetLoginStatus().then((status) => {
        if (status === 'connected') {
          this.fbFetchUser().then(() => {
            resolve();
          });
        } else {
          this.fbLogin().then((authResponse) => {
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

  fbLogin: function () {
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

  fbGetLoginStatus: function () {
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

  fbGetPhotos: function () {
    return new Ember.RSVP.Promise(function (resolve, reject) {
      resolve();
    })
  },

  fbApi: function () {
    return new Ember.RSVP.Promise(function (resolve, reject) {
      resolve();
    })
  },

  fbFetchUser: function () {
    return new Ember.RSVP.Promise((resolve, reject) => {
      FB.api('/me', function (user) {
        _user = user;
        resolve();
      });
    });
  },

  fbFetchPhotoUrls: function () {
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
    return new Ember.RSVP.Promise((resolve, reject) => {
      FB.api(`${photoId}`, 'get', {fields: 'images'}, (response)=> {
        resolve(response.images[1].source);
      });
    });
  },

  fetchAlbumPhotos: function (albumId) {
    return new Ember.RSVP.Promise((resolve, reject) => {
      FB.api(`/${albumId}/photos`, function (response) {
        resolve(response.data);
      });
    })
  },

  fbFetchAlbums: function () {
    return new Ember.RSVP.Promise((resolve, reject) => {
      FB.api('/me/albums', function (response) {
        resolve(response.data);
      });
    });
  },

  fbFetchMePhotos: function () {
    return new Ember.RSVP.Promise((resolve, reject) => {
      FB.api(`/${_user.id}/photos`, 'get', {limit: 500}, function (response) {
        resolve(response.data);
      });
    });
  },

  fbShare: function() {
    FB.ui({
      method: 'share',
      href: 'http://visaudio.me'
    }, function(response){
    });
  }
});
