import Ember from 'ember';
import Shuffle from "audio-visualization/mixins/shuffle";
export default Ember.Component.extend(Shuffle, {
  /**----------------------------
   * Services
   * ----------------------------*/
  facebook: Ember.inject.service(),

  /**----------------------------
  * Settings
  * ----------------------------*/
  THRESHOLD: 18,
  FFTSIZE: 1024,
  SMOOTHING: 0.1,
  MAX_IMAGE_DURATION: 5000,
  FRAMES_PER_SECOND: 10,

  /**----------------------------
   * Audio
   * ----------------------------*/
  audioCache: null,
  analyser: null,
  source: null,
  lastFrameVal: 0,
  isPlaying: false,
  selectedSong: null,
  times: [],
  songs: [{
    name: 'Islandis - Home',
    path: 'https://dl.dropboxusercontent.com/u/7119407/01%20Home_1.mp3'
  },{
    name: 'Odesza - How did i get here',
    path: 'https://dl.dropboxusercontent.com/u/7119407/02_How_Did_I_Get_Here.mp3'
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
        this.hideImg($img);
        this.$().find('.audio-visualizer__viewer').append($img);
        $img.load(() => {
          this.incrementProperty('loadingProgress');
          this.get('images').pushObject($img);
          this.showImg($img);
          this.adjustImagePosition($img);
          $img.hide();
          resolve();
        });
      });
      promises.push(promise);
    });
    return Ember.RSVP.all(promises);
  },

  adjustImagePosition($img) {
    let $viewer = this.$().find('.audio-visualizer__viewer');
    let viewerHeight = $viewer.outerHeight();
    let heightDiff = $img.outerHeight() - viewerHeight;
    if(heightDiff > 0) {
      $img.css({
        top: -(heightDiff/4)
      });
    }
  },

  createImage(path) {
    let $img = Ember.$('<img />');
    $img.attr('src', path);
    return $img;
  },

  hideImg($img) {
    $img.css({
      position: 'fixed',
      visibility: 'hidden'
    });
  },

  showImg($img) {
    $img.css({
      position: 'relative',
      visibility: 'visible',
      width: '100%'
    });
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

  initAudio(audioSrcPath){
    let audioCache = this.get('audioCache');
    let data = audioCache.get(audioSrcPath);
    if(data) {
      this.startPlaying(data);
    } else {
      this.set('loadingProgress', 'Loading audio...');
      this.fetchAudio(audioSrcPath).then((data) => {
        audioCache.set(audioSrcPath, data);
        this.set('isProgressComplete', true);
        this.startPlaying(data);
      });
    }
  },

  startPlaying(data) {
    let context = new AudioContext();
    let source = this.createSource(context);
    let analyser = this.createAnalyser(context);
    context.decodeAudioData(data, (buffer) => {
      source.buffer = buffer;
      source.connect(analyser);
      source.connect(context.destination);
      source.start(0);
      this.set('isPlaying', true);
      this.compareFrames();
    });
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
    let $curImage = this.getCurrentImage();

    this.captureTime();
    this.setMaxImageInterval();

    this.$('.audio-visualizer__viewer img').hide();
    $curImage.show();
    setTimeout(function(){
      $curImage.toggleClass('audio-visualizer__effect--scale');
    });
  },

  getCurrentImage() {
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

    let selectedSong = this.get('selectedSong');
    this.initAudio(selectedSong.path);

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
    let selectedSong = this.get('selectedSong');
    this.initAudio(selectedSong.path);
  },

  stop: function(){
    let source = this.get('source');
    source.onended = function() {
      //TODO capture stop time
    };
    source.stop();

    clearInterval(this.get('frameInterval'));
    clearInterval(this.get('showImageInterval'));

    this.setProperties({
      frameInterval: null,
      isPlaying: false
    });
  },

  actions: {
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
