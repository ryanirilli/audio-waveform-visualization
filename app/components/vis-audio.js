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
  willShowControls: false,
  hasShownControls: false,
  isLoadingPhotos: false,
  isLoadingAudio: false,
  hasLoadedPhotos: false,
  slideshowPublishSuccess: false,

  isPlaying: false,
  loadingProgress: 0,
  photoUrls: null,
  photos: null,
  currentPhotoIndex: 0,
  songs: [{
    name: 'The Lumineers - Sleep on the Floor',
    audioFile: `The-Lumineers_Sleep_on_the_Floor.mp3`,
    path: `${baseAudioPath}/The-Lumineers_Sleep_on_the_Floor.mp3`
  } , {
    name: 'LCD Soundsystem - Dance Yourself Clean',
    audioFile: `LCD-Soundsystem_Dance-Yourself-Clean.mp4`,
    path: `${baseAudioPath}/LCD-Soundsystem_Dance-Yourself-Clean.${extension}`
  } , {
    name: 'Shakey Graves - Family and Genus',
    audioFile: `Shakey-Graves_Family-and-Genus.mp4`,
    path: `${baseAudioPath}/Shakey-Graves_Family-and-Genus.${extension}`
  }],
  selectedSong: null,
  audioStartTime: 0,
  error: null,
  frameInterval: null,
  THRESHOLD: 12,
  FFTSIZE: 1024,
  SMOOTHING: 0.1,
  MAX_IMAGE_DURATION: 5000,
  IMG_FRAMES_PER_SECOND: 25,


  $polaroidImg: null,

  _animateIn: false,

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

    if(this.get('animateIn')) {
      Ember.run.next(() => {
        this.set('_animateIn', true);
      });
    }

  },

  actions: {
    fbConnect: function(){
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
        url: '/api/publish-slideshow',
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
    },

    sampleConnect() {
      this.set('willShowControls', true);
      const photoUrls = [];
      for(let i = 0; i<100; i++) {
        photoUrls.push(`https://unsplash.it/710/455/?random=${i}`);
      }
      this.set('photoUrls', photoUrls);
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
      this.setProperties({
        audioStartTime: 0
      });
      this.fetchAudio(selectedSong.path).then(data => {
        this.startPlaying(data);
        this.set('isShowingControls', true);
        Ember.run.scheduleOnce('afterRender', () => {
          this.set('hasShownControls', true);
        });
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
    this.set('source', source);

    source.onended = function(){
      console.log(JSON.stringify(this.get('times')));
    }.bind(this);

    return source;
  },

  createAnalyser(context) {
    let analyser = context.createAnalyser();
    analyser.fftSize = this.get('FFTSIZE');
    analyser.smoothingTimeConstant = this.get('SMOOTHING');
    this.set('analyser', analyser);
    return analyser;
  },

  times: [],
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

  minTimeReached: true,
  compareFrames() {

    this.setFrameInterval();
    let lastFrameVal = this.get('lastFrameVal');
    let curFrameVal = this.getCurrentFrameVal();
    this.set('lastFrameVal', curFrameVal);
    let change = curFrameVal - lastFrameVal;
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
