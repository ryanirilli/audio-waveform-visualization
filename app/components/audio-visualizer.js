import Ember from 'ember';
import Shuffle from "audio-visualization/mixins/shuffle";
const dropboxBaseURL = 'https://dl.dropboxusercontent.com/u/7119407';
export default Ember.Component.extend(Shuffle, {
  /**----------------------------
   * Services
   * ----------------------------*/
  facebook: Ember.inject.service(),

  /**----------------------------
  * Settings
  * ----------------------------*/
  THRESHOLD: 8,
  FFTSIZE: 1024,
  SMOOTHING: 0.1,
  MAX_IMAGE_DURATION: 5000,
  FRAMES_PER_SECOND: 24,

  /**----------------------------
   * Audio
   * ----------------------------*/
  audioCache: null,
  analyser: null,
  source: null,
  lastFrameVal: 0,
  isPlaying: false,
  audioStartTime: null,
  selectedSong: null,
  times: [],
  songs: [{
    name: 'J Dilla - So Far To Go',
    path: `${dropboxBaseURL}/j-dilla-so-far-to-go.mp3`
  }],

  /**----------------------------
   * Images
   * ----------------------------*/
  images: null,
  currentImageIndex: 0,
  isLoadingPhotos: true,
  loadingProgress: 0,
  isProgressComplete: false,
  photoUrls: [],
  frameInterval: null,
  showImageInterval: null,
  startIntervalTime: null,

  /**----------------------------
   * Methods
   * ----------------------------*/

  onInit: function(){
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    this.setProperties({
      selectedSong: this.get('songs.firstObject'),
      images: Ember.A(),
      audioCache: Ember.Map.create()
    });
  }.on('init'),

  photoUrlsObserver: function(){
    let photoUrls = this.get('photoUrls');
    if(!photoUrls) { return; }
    this.loadImages(photoUrls).then(() => {
      this.set('isLoadingPhotos', false);
      this.shuffle(this.get('images'));
      this.play();
    });
  }.observes('photoUrls'),

  loadImages: function(photoUrls){
    var promises = [];
    photoUrls.forEach((path) => {
      let promise = new Promise((resolve) => {
        let $img = this.createImage(path);
        $img.load(() => {
          this.incrementProperty('loadingProgress');
          this.get('images').pushObject($img);
          resolve();
        });
      });
      promises.push(promise);
    });
    return Ember.RSVP.all(promises);
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
    if(typeof loadingProgress === 'number') {
      return Math.floor(loadingProgress/totalCount*100) + '%';
    } else {
      return loadingProgress;
    }

  }.property('loadingProgress', 'photoUrls'),

  initAudio(selectedSong){
    let buffer = selectedSong.buffer;
    if(buffer) {
      this.startPlaying(buffer);
    } else {
      this.setProperties({
        loadingProgress: 'Loading audio...',
        audioStartTime: 0
      });
      this.fetchAudio(selectedSong.path).then((data) => {
        this.set('isProgressComplete', true);
        this.startPlaying(data);
      });
    }
  },

  connectAndStart(buffer, context) {
    let source = this.createSource(context);
    let analyser = this.createAnalyser(context);
    source.buffer = buffer;
    source.connect(analyser);
    source.connect(context.destination);
    if(source.noteOn && this.isIphone()) {
      this.set('confirmPlay', true);
      Ember.run.scheduleOnce('afterRender', this, function(){
        this.$('.audio-visualizer__confirm-play').on('touchend', function(){
          source.noteOn(0);
        })
      });
    } else {
      source.start(0, this.get('selectedSong.startTime') || 0);
    }

    this.setProperties({
      isPlaying: true,
      audioStartTime: moment()
    });
    this.compareFrames();
  },

  isIphone() {
    return Ember.get('navigator.appVersion').indexOf('iPhone') > -1;
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

  compareFrames() {
    this.setFrameInterval();
    let lastFrameVal = this.get('lastFrameVal');
    let curFrameVal = this.getCurrentFrameVal();
    this.set('lastFrameVal', curFrameVal);
    let change = curFrameVal - lastFrameVal;
    if(change > this.THRESHOLD) {
      this.showImage();
    }
  },

  getCurrentFrameVal() {
    let analyser = this.get('analyser');
    let frequencyData = new Uint8Array(analyser.frequencyBinCount); //empty array
    analyser.getByteFrequencyData(frequencyData); //populated array
    return this.getAvgVolume(frequencyData);
  },

  setFrameInterval() {
    let frameInterval = this.get('frameInterval');
    if (!frameInterval) {
      frameInterval = setInterval(()=> {
        this.compareFrames();
      }, 1000/this.FRAMES_PER_SECOND);
      this.set('frameInterval', frameInterval);
    }
  },

  showImage(){
    let images = this.get('images');
    let $curImage1 = this.getRandomImage();
    let $curImage2 = this.getRandomImage();

    let $viewer1 = this.$().find('.audio-visualizer__viewer1');
    let $viewer2 = this.$().find('.audio-visualizer__viewer2');

    $viewer1.css({
      background: `url(${$curImage1.attr('src')})`,
    });

    $viewer2.css({
      background: `url(${$curImage2.attr('src')})`,
    });

    this.captureTime();
    this.setMaxImageInterval();
  },

  getRandomImage() {
    let images = this.get('images');
    let currentImageIndex = this.get('currentImageIndex');
    if(currentImageIndex === images.length-1) {
      this.shuffle(images);
      currentImageIndex = 0;
      this.set('currentImageIndex', 0);
    } else {
      this.incrementProperty('currentImageIndex');
    }
    return images[currentImageIndex];
  },

  setMaxImageInterval() {
    let showImageInterval = this.get('showImageInterval');
    if(showImageInterval) {
      clearInterval(showImageInterval);
    }
    showImageInterval = setInterval(()=> {
      this.showImage();
    }, this.MAX_IMAGE_DURATION);
    this.set('showImageInterval', showImageInterval);
  },

  captureTime() {
    let startIntervalTime = this.get('startIntervalTime');
    if(!startIntervalTime) {
      return;
    }
    let times = this.get('times');
    let endIntervalTime = moment();
    let diff = endIntervalTime.diff(startIntervalTime, 'milliseconds');
    times.push(diff);
    this.set('startIntervalTime', moment());
  },

  selectedSongObserver: function(){
    if(this.get('isLoadingPhotos')) {
      return;
    }
    if(this.get('isPlaying')) {
      this.stop();
    }
    this.play();
  }.observes('selectedSong'),

  getAvgVolume: function(frequencyData){
    //return random number if frequencyData is all jacked up
    if(_.unique(frequencyData).length === 1){
      return Math.floor((Math.random() * 35) + 1);
    }

    let values = 0;
    frequencyData.forEach(function(val) {
      values += val;
    });
    return values/frequencyData.length;
  },

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
    clearInterval(this.get('showImageInterval'));

    this.setProperties({
      frameInterval: null,
      isPlaying: false
    });
  },

  actions: {
    fbConnect: function(){
      this.set('isConnectingToFacebook', true);
      this.get('facebook').fbConnect().then(() => {
        this.set('isConnectingToFacebook', false);
      }).catch(() => {
        this.setProperties({
          isConnectingToFacebook: false,
          error: 'There was an issue connecting to Facebook, sorry!'
        });
      });
    },

    play: function(){
      this.play();
    },

    stop: function(){
      this.stop();
    },

    fbShare: function(){
      this.get('facebook').fbShare();
    }
  }
});
