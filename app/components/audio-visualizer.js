import Ember from 'ember';

export default Ember.Component.extend({
  THRESHOLD: 9,
  analyser: null,
  images: null,
  lastFrameVal: 0,
  lastChangeVal: 0,
  isLoadingPhotos: true,
  isPlaying: false,
  raf: null,
  audio: null,
  photos: null,
  usedPhotos: [],

  onReady: function(){
    if(!this.get('photos')) {return}
    var self = this;
    this.set('images', Ember.A());
    this.loadPhotos().then(function(data){
      self.initAudio();
      self.set('isLoadingPhotos', false);
    });
  }.observes('photos'),

  loadPhotos: function(){
    var self = this;
    var promises = [];
    var $viewer = this.$().find('.audio-visualizer__viewer');
    var viewerHeight = $viewer.outerHeight();
    self.get('photos').forEach(function(path){
      var promise = new Promise(function(resolve, reject) {
        var $img = Ember.$('<img />');
        $img.attr('src', path);
        $img.css({
          position: 'fixed',
          visibility: 'hidden'
        });
        self.$().find('.audio-visualizer__viewer').append($img);
        $img.load(function(){

          self.get('images').pushObject($img);

          $img.css({
            position: 'relative',
            visibility: 'visible',
            width: '100%'
          });

          $img.data('id', Ember.generateGuid());

          //if image is longer tha
          var heightDiff = $img.outerHeight() - viewerHeight;
          if(heightDiff > 0) {
            $img.css({
              top: -(heightDiff/3)
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

  initAudio: function(){
    var audio = new Audio();
    audio.src = '02_How_Did_I_Get_Here.mp3';
    audio.controls = true;
    audio.loop = true;
    audio.autoplay = false;

    this.set('audio', audio);
    this.$('audio-visualizer').append(audio);

    var audioContext = new AudioContext(); // AudioContext object instance
    var analyser = audioContext.createAnalyser(); // AnalyserNode method
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.3;
    this.set('analyser', analyser);

    // Re-route audio playback into the processing graph of the AudioContext
    var source = audioContext.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioContext.destination);
  },

  frameLoop: function(){
    var self = this;
    var usedPhotos = this.get('usedPhotos');

    var raf = requestAnimationFrame( function(){
      self.frameLoop();
    } );

    this.set('raf', raf);

    var analyser = this.get('analyser');
    var frequencyData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(frequencyData);

    var lastFrameVal = this.get('lastFrameVal');
    var curFrameVal = this.getAvgVolume(frequencyData);
    this.set('lastFrameVal', curFrameVal);

    var change = curFrameVal - lastFrameVal;
    var lastChangeVal = this.get('lastChangeVal');

    if(change > this.get('THRESHOLD')) {
      this.showRandomImage();
    }
  },

  showRandomImage: function(){
    var $curImage = this.getRandomImage()
    this.$('.audio-visualizer__viewer img').hide();
    $curImage.show();
    setTimeout(function(){
      $curImage.toggleClass('audio-visualizer__effect--scale');
    });
  },

  getRandomImage: function(){
    var images = this.get('images');
    var image = images[Math.floor(Math.random()*images.length)];
    var imageId = image.data('id');
    var photos = this.get('photos');
    var usedPhotos = this.get('usedPhotos');

    if(photos.length === usedPhotos.length) {
      usedPhotos = [];
      this.set('usedPhotos', usedPhotos);
    }

    if(usedPhotos.contains(imageId)){
      return this.getRandomImage();
    } else {
      usedPhotos.push(imageId);
      return image;
    }
  },

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

  actions: {
    play: function(){
      this.get('audio').play();
      this.frameLoop();
      this.set('isPlaying', true);
    },

    stop: function(){
      this.get('audio').pause();
      cancelAnimationFrame(this.get('raf'));
      this.set('isPlaying', false);
    }
  }
});
