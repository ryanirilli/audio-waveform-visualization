import Ember from 'ember';
import Shuffle from "audio-visualization/mixins/shuffle";
const dropboxBaseURL = 'https://dl.dropboxusercontent.com/u/7119407';

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
let test = true;

export default Ember.Component.extend(Shuffle, {
  facebook: Ember.inject.service(),
  audioCache: null,
  isConnectingToFacebook: false,
  isConnectedToFacebook: false,
  isLoadingPhotos: false,
  hasLoadedPhotos: false,
  isPlaying: false,
  loadingProgress: 0,
  photoUrls: null,
  photos: null,
  currentPhotoIndex: 0,
  songs: [{
    name: 'Beat Connection - Saola (Odesza Remix)',
    path: `${dropboxBaseURL}/Beat%20Connection%20-%20Saola%20%28ODESZA%20Remix%29.mp3`
  },{
    name: 'J Dilla - So Far To Go',
    path: `${dropboxBaseURL}/j-dilla-so-far-to-go.mp3`
  }],
  selectedSong: null,
  audioStartTime: 0,
  error: null,

  THRESHOLD: 13,
  FFTSIZE: 1024,
  SMOOTHING: 0.1,
  MAX_IMAGE_DURATION: 5000,
  FRAMES_PER_SECOND: 24,

  onInit: function(){
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    this.setProperties({
      selectedSong: this.get('songs.firstObject'),
      photos: Ember.A(),
      audioCache: Ember.Map.create()
    });
  }.on('init'),

  actions: {
    fbConnect: function(){
      this.set('isConnectingToFacebook', true);
      this.get('facebook').fbConnect().then(() => {
        this.setProperties({
          isConnectedToFacebook: true,
          isConnectingToFacebook: false
        });
        this.fetchPhotoUrls();
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
    }
  },

  fetchPhotoUrls() {
    this.get('facebook').fbFetchPhotoUrls().then((urls) => {
      this.set('photoUrls', urls);
    });
  },

  photoUrlsObserver: function(){
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
      });
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
    this.compareFrames();
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

  setPhoto() {
    let $polaroidViewer = this.get('$polaroidViewer');
    if(!$polaroidViewer) {
      $polaroidViewer = this.$('.polaroid__viewer');
      this.set('$polaroidViewer', $polaroidViewer);
    }
    const random = this.getRandomPhoto();
    const width = random.$img[0].width;
    if(test) {
      //test = false;
      $polaroidViewer.css({
        'background-image': `url(${random.path})`,
        'background-size': 'cover'
      });
    }

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
    if(change > this.THRESHOLD) {
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

  getCurrentFrameVal() {
    let analyser = this.get('analyser');
    let frequencyData = new Uint8Array(analyser.frequencyBinCount); //empty array
    analyser.getByteFrequencyData(frequencyData); //populated array
    return this.getAvgVolume(frequencyData);
  },

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

  setFrameInterval() {
    let frameInterval = this.get('frameInterval');
    if (!frameInterval) {
      frameInterval = setInterval(()=> {
        this.compareFrames();
      }, 1000/this.FRAMES_PER_SECOND);
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
