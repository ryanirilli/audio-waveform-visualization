import Ember from 'ember';
import Shuffle from "audio-visualization/mixins/shuffle";


function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default Ember.Component.extend(Shuffle, {
  facebook: Ember.inject.service(),
  songsService: Ember.inject.service('songs'),
  songs: Ember.computed.alias('songsService.songs'),
  profileUrl: null,
  audioCache: null,

  logGeneratedTimes: true,
  times: [],

  isConnectingToFacebook: false,
  isConnectedToFacebook: false,
  facebookConnectSuccess: false,
  isShowingControls: false,
  willShowControls: false,
  hasShownControls: false,
  isLoadingPhotos: false,
  isLoadingAudio: false,
  hasLoadedPhotos: false,

  isPlaying: false,
  willPublish: false,
  hasPublished: false,
  isShowingPublishSuccess: false,
  isShowingPublishError: false,

  loadingProgress: 0,
  photoUrls: null,
  photos: null,
  currentPhotoIndex: 0,

  selectedSong: null,
  audioStartTime: 0,
  error: null,
  frameInterval: null,

  MAX_SAMPLE_PHOTOS: 100,
  THRESHOLD: 12,
  FFTSIZE: 1024,
  SMOOTHING: 0.1,
  IMG_FRAMES_PER_SECOND: 25,

  $polaroidImg: null,
  _animateIn: false,

  init: function(){
    this._super.apply(this, arguments);
    this.setProperties({
      selectedSong: this.get('songs.firstObject'),
      photos: Ember.A(),
      audioCache: Ember.Map.create()
    });
  },

  didInsertElement() {
    this._super.apply(this, arguments);
    const $polaroidImg = this.$('.polaroid__img');
    this.set('$polaroidImg', $polaroidImg);

    if(this.get('animateIn')) {
      Ember.run.next(() => {
        this.set('_animateIn', true);
      });
    }
  },

  resetPlayer() {
    this.stop();
    const $polaroidImg = this.get('$polaroidImg');
    $polaroidImg.css({
      'background-image': 'none'
    });
    this.setProperties({
      isShowingControls: false,
      isPlaying: false,
      loadingProgress: 0,
      photoUrls: [],
      photos: [],
      currentPhotoIndex: 0
    });
  },

  actions: {
    fbConnect: function(){

      this.resetPlayer();

      const facebook = this.get('facebook');
      this.set('isConnectingToFacebook', true);
      facebook.fbConnect().then(() => {

        facebook.fbFetchProfilePic().then(pic => {
          this.set('profileUrl', pic);
        });

        this.set('facebookConnectSuccess', true);
        setTimeout(() => {
          this.setProperties({
            isConnectedToFacebook: true,
            isConnectingToFacebook: false
          });
        }, 500);

        this.fetchFacebookPhotoUrls();

      }).catch(() => {
        this.setProperties({
          isConnectingToFacebook: false,
          error: 'There was an issue connecting to Facebook, sorry!'
        });
      });
    },

    play() {
      this.play();
    },

    stop() {
      this.stop();
    },

    share() {
      this.stop();
      this.set('willPublish', true);
      Ember.run.later(() => {
        const urls = this.get('photos').map(photo => photo.path);
        const userId = this.get('facebook').getUser().id ;
        const songPath = this.get('selectedSong.audioFile');
        const requestData = {
          url: '/api/publish-slideshow',
          type: 'post',
          data: { urls, userId, songPath },
          success: function(data) {
            this.setProperties({
              isShowingPublishSuccess: true,
              willPublish: false,
              hasPublished: true
            });
          }.bind(this),
          error: function(err) {
            this.set('isShowingPublishError', true);
          }.bind(this)
        };
        Ember.$.ajax(requestData);
      }, 3000);
    },

    sampleConnect() {
      this.set('willShowControls', true);
      const photoUrls = [];
      for(let i = 0; i<this.MAX_SAMPLE_PHOTOS; i++) {
        photoUrls.push(`https://unsplash.it/710/455/?random=${i}`);
      }
      this.set('photoUrls', photoUrls);
    },

    hidePublishSuccess() {
      this.setProperties({
        isShowingPublishSuccess: false
      });
    }
  },

  fetchFacebookPhotoUrls() {
    this.get('facebook').fbFetchPhotoUrls().then((urls) => {
      this.set('photoUrls', urls);
    });
  },

  photoUrlsObserver: function() {
    const photoUrls = this.get('photoUrls') || [];
    if(!photoUrls.length) { return }

    this.loadPhotos(photoUrls).then(() => {
      this.initAudio(this.get('selectedSong'));
    });
  }.observes('photoUrls'),

  hasShownControlsObserver: function() {
    const isShowingControls = this.get('isShowingControls');
    if(isShowingControls) {
      Ember.run.later(() => {
        this.set('hasShownControls', true);
      }, 500);
    }
  }.observes('isShowingControls'),

  selectedSongObserver: function(){
    if(!this.get('hasLoadedPhotos')) {
      return;
    }
    if(this.get('isPlaying')) {
      this.stop();
    }
    this.play();
  }.observes('selectedSong'),

  play: function(){
    this.initAudio(this.get('selectedSong'));
  },

  stop: function(){
    let source = this.get('source');
    if(!source) { return }

    const selectedSong = this.get('selectedSong');
    source.stop();
    clearInterval(this.get('frameInterval'));
    this.setProperties({
      frameInterval: null,
      isPlaying: false,
      times: []
    });
  },

  initAudio(selectedSong){
    let buffer = selectedSong.buffer;
    if(buffer) {
      this.startPlaying(buffer);
    } else {
      this.fetchAudio(selectedSong.path).then(data => {
        this.startPlaying(data);
      });
    }
  },

  startPlaying(data) {
    this.set('isPlaying', true);
    let context = new AudioContext();
    if(data instanceof ArrayBuffer) {
      context.decodeAudioData(data, (buffer) => {
        let selectedSong = this.get('selectedSong');
        selectedSong.buffer = buffer;
        this.connectAndStart(buffer, context);
      });
    } else {
      this.connectAndStart(data, context);
    }
  },

  connectAndStart(buffer, context) {
    let source = this.createSource(context);
    let analyser = this.createAnalyser(context);
    source.buffer = buffer;
    source.connect(analyser);
    source.connect(context.destination);
    source.start(0, 0);

    this.setProperties({
      isShowingControls: true,
      audioStartTime: moment()
    });

    this.setPhoto();
    this.compareFrames();
  },

  fetchAudio(url) {
    this.set('isLoadingAudio', true);
    return new Promise(resolve => {
      let request = new XMLHttpRequest();
      request.open('GET', url, true);
      request.responseType = 'arraybuffer';
      request.onload = function() {
        this.set('isLoadingAudio', false);
        resolve(request.response);
      }.bind(this);
      request.send();
    });
  },

  createSource(context) {
    let source = context.createBufferSource();
    if(this.get('logGeneratedTimes')) {
      source.onended = function(){
        console.log(JSON.stringify(this.get('times')));
      }.bind(this);
    }

    this.set('source', source);
    return source;
  },

  createAnalyser(context) {
    let analyser = context.createAnalyser();
    analyser.fftSize = this.get('FFTSIZE');
    analyser.smoothingTimeConstant = this.get('SMOOTHING');
    this.set('analyser', analyser);
    return analyser;
  },

  logTimes() {
    const times = this.get('times');
    const curTime = moment();
    const lastTime = this.get('lastTime');
    this.set('lastTime', curTime);

    if(!lastTime) {
      return;
    }

    var duration = moment.duration(curTime.diff(lastTime));
    times.push(duration.asMilliseconds());
  },

  setPhoto() {
    this.logTimes();
    const $polaroidImg = this.get('$polaroidImg');
    const random = this.getRandomPhoto();
    $polaroidImg.css({
      'background-image': `url(${random.path})`
    });
  },

  loadPhotos: function(photoUrls){
    const promises = [];
    const photos = this.get('photos');
    this.set('isLoadingPhotos', true);

    photoUrls.forEach(path => {
      const promise = new Promise((resolve) => {
        const $img = this.createImage(path);
        $img.load(() => {
          this.incrementProperty('loadingProgress');
          photos.pushObject({ $img, path });
          resolve();
        }).error(resolve);
      });
      promises.push(promise);
    });

    return Ember.RSVP.all(promises).then(() => {
      this.setProperties({
        isLoadingPhotos: false,
        hasLoadedPhotos: true,
        photos
      });
      this.shuffle(photos);
    });
  },

  createImage(path) {
    let $img = Ember.$('<img />');
    $img.attr('src', path);
    return $img;
  },

  progress: function(){
    let totalCount = this.get('photoUrls.length');
    if(!totalCount) { return 0; }
    let loadingProgress = this.get('loadingProgress');
    return Math.floor(loadingProgress/totalCount*100);
  }.property('loadingProgress', 'photoUrls'),

  minTimeReached: true,

  compareFrames() {
    this.setFrameInterval();
    let lastFrameVal = this.get('lastFrameVal');
    let curFrameVal = this.getFrameVal();
    this.set('lastFrameVal', curFrameVal);
    const change = curFrameVal - lastFrameVal;
    if(Math.floor(change) >= this.THRESHOLD) {

      const minTimeReached = this.get('minTimeReached');
      if(!minTimeReached) { return }

      this.set('minTimeReached', false);
      setTimeout(() => {
        this.set('minTimeReached', true);
      }, 500);

      this.setPhoto();
      this.changeBgColor();
    }
  },

  setFrameInterval() {
    let frameInterval = this.get('frameInterval');
    if (!frameInterval) {
      frameInterval = setInterval(this.compareFrames.bind(this), 1000/this.IMG_FRAMES_PER_SECOND);
      this.set('frameInterval', frameInterval);
    }
  },

  changeBgColor() {
    const randomBg = getRandomInt(1, 5);
    let $visaudio = this.get('$visaudio');
    if(!$visaudio) {
      $visaudio = this.$('.visaudio');
      this.set('$visaudio', $visaudio);
    }
    $visaudio.removeClass (function (index, css) {
      return (css.match (/(^|\s)visaudio--\S+/g) || []).join(' ');
    });
    $visaudio.addClass(`visaudio--${randomBg}`);
  },

  getByteFrequencyData() {
    let analyser = this.get('analyser');
    let frequencyData = new Uint8Array(analyser.frequencyBinCount); //empty array
    analyser.getByteFrequencyData(frequencyData); //populated array
    return frequencyData;
  },

  getFrameVal() {
    return this.getAvg(this.getByteFrequencyData());
  },

  getAvg: function(arr){
    let values = 0;
    for(let i = 0; i < arr.length; i++) {
      values += arr[i];
    }
    return values/arr.length;
  },

  getRandomPhoto() {
    let photos = this.get('photos');
    let currentPhotoIndex = this.get('currentPhotoIndex');
    if(currentPhotoIndex === photos.length-1) {
      this.shuffle(photos);
      currentPhotoIndex = 0;
      this.set('currentPhotoIndex', 0);
    } else {
      this.incrementProperty('currentPhotoIndex');
    }
    return photos[currentPhotoIndex];
  }

});
