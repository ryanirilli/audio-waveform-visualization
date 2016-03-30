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
    name: 'J Dilla - So Far To Go',
    path: `${dropboxBaseURL}/j-dilla-so-far-to-go.mp3`
  }, {
    name: 'Beat Connection - Saola (Odesza Remix)',
    path: `${dropboxBaseURL}/Beat%20Connection%20-%20Saola%20%28ODESZA%20Remix%29.mp3`
  }],
  selectedSong: null,
  audioStartTime: 0,
  error: null,
  frameInterval: null,
  audioFrameInterval: null,


  THRESHOLD: 13,
  FFTSIZE: 1024,
  SMOOTHING: 0.1,
  MAX_IMAGE_DURATION: 5000,
  IMG_FRAMES_PER_SECOND: 30,
  AUDIO_VIS_FRAMES_PER_SECOND: 8,
  audioCanvas: null,
  $polaroidImg: null,

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
    const $canvas = this.$('.audio-animation');
    this.set('audioCanvas', $canvas[0]);
    const $polaroidImg = this.$('.polaroid__img');
    this.set('$polaroidImg', $polaroidImg);
    $canvas.attr('width', Ember.$(window).width());
    $canvas.attr('height', Ember.$(window).height());
    //const ctx = canvas.getContext('2d');
  },

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

    play() {
      this.play();
    },

    stop() {
      this.stop();
    }
  },

  fetchPhotoUrls() {
    this.get('facebook').fbFetchPhotoUrls().then((urls) => {
      this.set('photoUrls', urls);
    });
  },

  photoUrlsObserver: function() {

    const photoUrls = this.get('photoUrls');
    const token = FB.getAccessToken();
debugger;
    Ember.$.ajax({
      url: 'http://localhost:3000/generate-slideshow',
      type: 'POST',
      data: {
        photoUrls,
        token
      }
    }).then(data => {
      console.log('DONE!');
    });

    // this.loadPhotos(photoUrls).then(() => {
    //   this.initAudio(this.get('selectedSong'));
    // });
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
    clearInterval(this.get('audioFrameInterval'));
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
    if(test) {
      //test = false;
      $polaroidImg.css({
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
      }, 1000/this.IMG_FRAMES_PER_SECOND);
      this.set('frameInterval', frameInterval);
    }


    let audioFrameInterval = this.get('audioFrameInterval');
    if (!audioFrameInterval) {
      audioFrameInterval = setInterval(()=> {
        this.audioWavAnimation();
      }, 1000/this.AUDIO_VIS_FRAMES_PER_SECOND);
      this.set('audioFrameInterval', audioFrameInterval);
    }
  },

  audioWavAnimation(){
    let byteFrequencyData = this.getByteFrequencyData();
    const audioCanvas = this.get('audioCanvas');
    const ctx = audioCanvas.getContext('2d');
    ctx.clearRect(0, 0, audioCanvas.width, audioCanvas.height); // Clear the audioCanvas

    const colors = ['#000000', '#ffffff'];
    const color = colors[Math.floor(Math.random()*colors.length)];
    ctx.fillStyle = color; // Color of the bars

    const bars = 100;
    const barWidth = audioCanvas.width/bars;
    for (let i = 0; i < bars; i++) {
      const barX = i * barWidth;
      const barHeight = -(byteFrequencyData[i]*3);
      ctx.fillRect(barX, audioCanvas.height, barWidth, barHeight);
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
