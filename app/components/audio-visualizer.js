import Ember from 'ember';
import Shuffle from "audio-visualization/mixins/shuffle";

export default Ember.Component.extend(Shuffle, {
  facebook: Ember.inject.service(),
  THRESHOLD: 25,
  FFTSIZE: 1024,
  SMOOTHING: 0.1,
  analyser: null,
  images: null,
  increment: 0,
  lastFrameVal: 0,
  isLoadingPhotos: true,
  loadingProgress: 0,
  isProgressComplete: false,
  isPlaying: false,
  raf: null,
  audio: null,
  photoUrls: null,
  selectedSong: null,
  showImageInterval: null,
  songs: [{
    name: 'Kendrick Lamar - I',
    path: 'kendrick-i.mp3'
  }, {
    name: 'Family Of The Year - Hero',
    path: '05_hero.mp3'
  },{
    name: 'Black Keys - In Time',
    path: '02_In_Time.mp3'
  }, {
    name: 'Pretty Lights - Looking for Love (But Not So Sure)',
    path: '03_Looking_For_Love.mp3'
  }],


  onReady: function(){
    if(!this.get('photoUrls')) {return}
    let selectedSong = this.get('songs.firstObject');
    this.set('selectedSong', selectedSong);
    this.set('images', Ember.A());
    this.loadPhotos().then(() => {
      let images = this.get('images');
      this.shuffle(images);
      this.initAudio(selectedSong.path);
      this.set('isLoadingPhotos', false);
    });
  }.observes('photoUrls'),

  loadPhotos: function(){
    var self = this;
    var promises = [];
    var $viewer = this.$().find('.audio-visualizer__viewer');
    var viewerHeight = $viewer.outerHeight();
    self.get('photoUrls').forEach(function(path){
      var promise = new Promise(function(resolve, reject) {
        var $img = Ember.$('<img />');
        $img.attr('src', path);
        $img.css({
          position: 'fixed',
          visibility: 'hidden'
        });
        self.$().find('.audio-visualizer__viewer').append($img);
        $img.load(function(){
          self.incrementProperty('loadingProgress');
          self.get('images').pushObject($img);

          $img.css({
            position: 'relative',
            visibility: 'visible',
            width: '100%'
          });

          $img.data('id', Ember.generateGuid());

          //if image is longer than viewer, adjust to fit in frame
          var heightDiff = $img.outerHeight() - viewerHeight;
          if(heightDiff > 0) {
            $img.css({
              top: -(heightDiff/4)
            });
          }

          $img.hide();
          resolve();
        });
      });
      promises.push(promise);
    });
    return Ember.RSVP.all(promises);
  },

  progress: function(){
    let totalCount = this.get('photoUrls.length');
    if(!totalCount) { return 0; }
    let currentProgress = this.get('loadingProgress');
    let progress = Math.floor(currentProgress/totalCount*100);
    if(progress === 100) {
      this.set('isProgressComplete', true);
      this.play();
    } else {
      return progress;
    }
  }.property('loadingProgress', 'photoUrls'),

  initAudio: function(audioSrcPath){
    let curAudio = this.get('audio');
    if(curAudio) {
      curAudio.remove();
    }

    let audio =  new Audio();
    audio.src = audioSrcPath;

    this.set('audio', audio);
    this.$('.audio-visualizer').append(audio);

    let audioContext = this.get('audioContext');
    if(!audioContext) {
      audioContext = new AudioContext();
      this.set('audioContext', audioContext)
    }

    let analyser = audioContext.createAnalyser();
    analyser.fftSize = this.get('FFTSIZE');
    analyser.smoothingTimeConstant = this.get('SMOOTHING');
    this.set('analyser', analyser);

    // Re-route audio playback into the processing graph of the AudioContext
    let source = audioContext.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioContext.destination);
  },

  frameLoop: function(){
    let raf = requestAnimationFrame(()=> {
      this.frameLoop();
    });
    this.set('raf', raf);
    let analyser = this.get('analyser');
    let frequencyData = new Uint8Array(analyser.frequencyBinCount); //empty array
    analyser.getByteFrequencyData(frequencyData); //populated array

    let lastFrameVal = this.get('lastFrameVal');
    let curFrameVal = this.getAvgVolume(frequencyData);
    this.set('lastFrameVal', curFrameVal);

    let change = curFrameVal - lastFrameVal;
    if(change > this.get('THRESHOLD')) {
      this.showImage();
    }
  },

  showImage: function(){
    let images = this.get('images');
    let increment = this.get('increment');

    if(increment === images.length-1) {
      this.shuffle(images);
      this.set('increment', 0);
    }

    let showImageInterval = this.get('showImageInterval');
    if(showImageInterval) {
      clearInterval(showImageInterval);
    }
    showImageInterval = setInterval(()=> {
      this.showImage();
    }, 2000);
    this.set('showImageInterval', showImageInterval);

    let $curImage = images[increment];
    this.incrementProperty('increment');
    this.$('.audio-visualizer__viewer img').hide();
    $curImage.show();
    setTimeout(function(){
      $curImage.toggleClass('audio-visualizer__effect--scale');
    });
  },

  selectedSongObserver: function(){
    var selectedSong = this.get('selectedSong');
    this.stop();
    this.initAudio(selectedSong.path);
    if(!this.get('isLoadingPhotos')) {
      this.play();
    }
  }.observes('selectedSong'),

  getAvgVolume: function(frequencyData){
    var average;
    var values = 0;
    var length = frequencyData.length;
    for(var i=0; i < length; i++) {
      values += frequencyData[i];
    }
    average = values/length;
    return average;
  },

  play: function(){
    this.get('audio').play();
    this.frameLoop();
    this.set('isPlaying', true);
  },

  stop: function(){
    let audio = this.get('audio');
    audio && audio.pause();
    cancelAnimationFrame(this.get('raf'));
    this.set('isPlaying', false);
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
