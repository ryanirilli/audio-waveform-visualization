import Ember from 'ember';

export default Ember.Component.extend({
  analyser: null,
  images: null,
  lastFrameVal: 0,
  isLoadingPhotos: true,
  raf: null,
  audio: null,
  photos: [
    'https://40.media.tumblr.com/c0e165fc797ab0292bb44b8d29942b39/tumblr_nip4ae4u8l1u98dhxo1_1280.jpg',
    'https://36.media.tumblr.com/d5420dd9f68cec42030f36e6975c8cb4/tumblr_nip48kLauG1u98dhxo1_1280.jpg',
    'https://40.media.tumblr.com/1b542a741eb9be0c9e53b0a9f22af5d8/tumblr_nip48kLauG1u98dhxo2_1280.jpg',
    'https://36.media.tumblr.com/f53a0d47fca41af9e31807cec8376f46/tumblr_nip48kLauG1u98dhxo3_1280.jpg',
    'https://40.media.tumblr.com/78a256565a5a358d615a27e1b5a79ca9/tumblr_nip48kLauG1u98dhxo4_1280.jpg',
    'https://40.media.tumblr.com/232e1ecd08bd23e14cd4460d9ae14c76/tumblr_nip48kLauG1u98dhxo5_1280.jpg',
    'https://41.media.tumblr.com/05f21fb6282f01cfa46d614f0c9e8ee0/tumblr_nip48kLauG1u98dhxo6_1280.jpg',
    'https://36.media.tumblr.com/9a1a0dc0a26f31d7bfebb6a1b92fbe4b/tumblr_nip3x55zuo1u98dhxo1_540.jpg',
    'https://40.media.tumblr.com/ba0cf63c96016e83a8fb2b224cc4405f/tumblr_nip3ux2x5l1u98dhxo1_1280.jpg',
    'https://40.media.tumblr.com/b685b3d05717346ea0518a5c0f9d476f/tumblr_nip3t9Vzqp1u98dhxo2_500.jpg',
    'https://36.media.tumblr.com/fabe7f7e6880a002e20fd9bcbb1b73ea/tumblr_nip3t9Vzqp1u98dhxo5_1280.jpg',
    'https://40.media.tumblr.com/75d442378ba37c638143c437c81d6632/tumblr_nip3t9Vzqp1u98dhxo6_1280.jpg',
    'https://40.media.tumblr.com/dbc58559e00306826678d06c4578c021/tumblr_nip3t9Vzqp1u98dhxo7_1280.jpg',
    'https://41.media.tumblr.com/cdd18238baf4801f76750596f6b18ff6/tumblr_nip3t9Vzqp1u98dhxo4_1280.jpg',
    'https://40.media.tumblr.com/55cf07be8d4d032f882f3288f8250dd1/tumblr_nip3t9Vzqp1u98dhxo1_1280.jpg',
    'https://40.media.tumblr.com/1ac1387210d0007351bfb2631fb4f0ce/tumblr_nip3t9Vzqp1u98dhxo8_1280.jpg',
    'https://41.media.tumblr.com/cbc791b30d40eafca41dacdd363f1640/tumblr_nip3t9Vzqp1u98dhxo9_1280.jpg',
    'https://40.media.tumblr.com/9b5c7c5cf72f30327353f3cc56da4fa1/tumblr_nip3t9Vzqp1u98dhxo10_1280.jpg',
    'https://41.media.tumblr.com/da6dd45ab30ecf7cdcb95309cc429e55/tumblr_nip3c3l7XO1u98dhxo1_540.jpg',
    'https://40.media.tumblr.com/e769feabd489d042895700da42642c79/tumblr_nip39ykYyg1u98dhxo2_1280.jpg',
    'https://40.media.tumblr.com/6686291df547e87d803149fa7a191894/tumblr_nip35kY6uV1u98dhxo1_540.jpg',
    'https://40.media.tumblr.com/2e6c8b86f63fa1de731fbe56d07db07b/tumblr_nip33ozaKh1u98dhxo4_1280.jpg'
  ],

  onDidInsertElement: function(){
    var self = this;
    this.set('images', Ember.A());
    this.loadPhotos().then(function(data){
      self.initAudio();
      self.set('isLoadingPhotos', false);
    });
  }.on('didInsertElement'),

  loadPhotos: function(){
    var self = this;
    var promises = [];
    self.get('photos').forEach(function(path){
      var promise = new Promise(function(resolve, reject) {
        var $img = Ember.$('<img />');
        $img.attr('src', path);
        $img.css({
          position: 'absolute',
          visibility: 'hidden'
        });
        self.$().find('.audio-visualizer__viewer').append($img);
        $img.load(function(){
          self.get('images').pushObject($img);
          $img.css('visibility', 'visible');
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
    audio.src = '03_Looking_For_Love.mp3';
    audio.controls = true;
    audio.loop = true;
    audio.autoplay = false;

    this.set('audio', audio);

    this.$().find('.mp3-player__audio-box').append(audio);

    var context = new AudioContext(); // AudioContext object instance
    var analyser = context.createAnalyser(); // AnalyserNode method
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.3;
    this.set('analyser', analyser);

    // Re-route audio playback into the processing graph of the AudioContext
    var source = context.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(context.destination);
  },

  frameLoop: function(){
    var self = this;

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

    if(Math.abs(lastFrameVal - curFrameVal) > 10) {
      var images = this.get('images');
      var image = images[Math.floor(Math.random()*images.length)];
      $('img').hide();
      image.show();
    }
  },

  getAvgVolume: function(frequencyData){
    var values = 0;
    var average;
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
    },

    stop: function(){
      this.get('audio').pause();
      cancelAnimationFrame(this.get('raf'));
    }
  }
});
