import Ember from 'ember';
import Shuffle from "audio-visualization/mixins/shuffle";
const baseAudioPath = '/assets/audio';
const extension = Dolby.checkDDPlus() ? 'mp4' : 'mp3';

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default Ember.Component.extend(Shuffle, {
  facebook: Ember.inject.service(),
  profileUrl: null,
  audioCache: null,
  isConnectingToFacebook: false,
  isConnectedToFacebook: false,
  facebookConnectSuccess: false,
  isShowingControls: false,
  isLoadingPhotos: false,
  hasLoadedPhotos: false,
  isPlaying: false,
  loadingProgress: 0,
  photoUrls: null,
  photos: null,
  currentPhotoIndex: 0,
  songs: [{
    name: 'Shakey Graves - Family and Genus',
    audioFile: `Shakey-Graves_Family-and-Genus.mp4`,
    path: `${baseAudioPath}/Shakey-Graves_Family-and-Genus.${extension}`
  }, {
    name: 'LCD Soundsystem - Dance Yourself Clean',
    audioFile: `LCD-Soundsystem_Dance-Yourself-Clean.mp4`,
    path: `${baseAudioPath}/LCD-Soundsystem_Dance-Yourself-Clean.${extension}`
  }],
  selectedSong: null,
  audioStartTime: 0,
  error: null,
  frameInterval: null,
  THRESHOLD: 12,
  FFTSIZE: 1024,
  SMOOTHING: 0.1,
  MAX_IMAGE_DURATION: 5000,
  IMG_FRAMES_PER_SECOND: 30,
  $polaroidImg: null,

  slideshowPublishSuccess: false,

  onInit: function(){
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    this.setProperties({
      selectedSong: this.get('songs.firstObject'),
      photos: Ember.A(),
      audioCache: Ember.Map.create(),
    });
  }.on('init'),

  didInsertElement() {
    this._super.apply(this, arguments);
    const $polaroidImg = this.$('.polaroid__img');
    this.set('$polaroidImg', $polaroidImg);
  },

  actions: {
    fbConnect: function(){
      const facebook = this.get('facebook');
      this.set('isConnectingToFacebook', true);
      facebook.fbConnect().then(() => {
        this.set('facebookConnectSuccess', true);

        facebook.fbFetchProfilePic().then(pic => {
          this.set('profileUrl', pic);
        });

        setTimeout(() => {
          this.setProperties({
            isConnectedToFacebook: true,
            isConnectingToFacebook: false
          });
        }, 500);
        this.fetchPhotoUrls();
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
      const urls = this.get('photos').map(photo => photo.path);
      const token = window.FB.getAccessToken();
      const songPath = this.get('selectedSong.audioFile');
      const requestData = {
        url: '/publish-slideshow',
        type: 'post',
        data: { urls, token, songPath },
        success: function(data) {
          this.set('slideshowPublishSuccess', true);
        }.bind(this),
        error: function(err) {
          this.set('slideshowPublishError', true);
        }.bind(this)
      };

      Ember.$.ajax(requestData);
    }
  },

  fetchPhotoUrls() {
    this.get('facebook').fbFetchPhotoUrls().then((urls) => {
      this.set('photoUrls', urls);
    });
  },

  photoUrlsObserver: function() {
    const photoUrls = this.get('photoUrls');
    this.loadPhotos(photoUrls).then(() => {
      this.initAudio(this.get('selectedSong'));
    });
  }.observes('photoUrls'),

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
    let selectedSong = this.get('selectedSong');
    source.onended = function(e) {
      let endTime = moment(e.timestamp);
      let diff = endTime.diff(this.get('audioStartTime'), 'seconds');
      selectedSong.startTime = selectedSong.startTime || 0;
      selectedSong.startTime += diff;
    }.bind(this);
    source.stop();
    clearInterval(this.get('frameInterval'));
    this.setProperties({
      frameInterval: null,
      isPlaying: false
    });
  },

  initAudio(selectedSong){
    let buffer = selectedSong.buffer;
    if(buffer) {
      this.startPlaying(buffer);
    } else {
      this.setProperties({
        audioStartTime: 0
      });
      this.fetchAudio(selectedSong.path).then((data) => {
        this.startPlaying(data);
        this.set('isShowingControls', true);
      });
    }
  },

  startPlaying(data) {
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
      isPlaying: true,
      audioStartTime: moment()
    });

    this.setPhoto();
    this.compareFrames();
  },

  fetchAudio(url) {
    return new Promise(function(resolve) {
      let request = new XMLHttpRequest();
      request.open('GET', url, true);
      request.responseType = 'arraybuffer';
      request.onload = function() {
        resolve(request.response);
      };
      request.send();
    });
  },

  createSource(context) {
    let source = context.createBufferSource();
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

  setPhoto() {
    const $polaroidImg = this.get('$polaroidImg');
    const random = this.getRandomPhoto();
    $polaroidImg.css({
      'background-image': `url(${random.path})`
    });
  },

  loadPhotos: function(photoUrls){
    const promises = [];
    const photos = this.get('photos');
    this.setProperties({
      isLoadingPhotos: true
    });

    photoUrls.forEach((path) => {
      let promise = new Promise((resolve) => {
        let $img = this.createImage(path);
        $img.load(() => {
          this.incrementProperty('loadingProgress');
          photos.pushObject({$img, path});
          resolve();
        });
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


  compareFrames() {
    this.setFrameInterval();
    let lastFrameVal = this.get('lastFrameVal');
    let curFrameVal = this.getCurrentFrameVal();
    this.set('lastFrameVal', curFrameVal);
    let change = curFrameVal - lastFrameVal;
    if(Math.floor(change) >= this.THRESHOLD) {
      this.setPhoto();
      this.changeBgColor();
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

  getCurrentFrameVal() {
    return this.getAvgVolume(this.getByteFrequencyData());
  },

  getAvgVolume: function(frequencyData){
    let values = 0;
    for(let i = 0; i < frequencyData.length; i++) {
      values += frequencyData[i];
    }
    return values/frequencyData.length;
  },

  setFrameInterval() {
    let frameInterval = this.get('frameInterval');
    if (!frameInterval) {
      frameInterval = setInterval(()=> {
        this.compareFrames();
      }, 1000/this.IMG_FRAMES_PER_SECOND);
      this.set('frameInterval', frameInterval);
    }
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
