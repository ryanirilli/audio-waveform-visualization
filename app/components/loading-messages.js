import Ember from 'ember';

export default Ember.Component.extend({
  messages: [
    'getting photos',
    'oh, nice, found some good ones',
    'loading them up, one sec',
    'this is gonna be epic',
    'sorry for the delay, you know how the internet is',
    'think of all the people you love while you wait',
    'cmon, cmon, cmon',
    'maybe grab a snack?',
    'alright almost finished',
    'annnnnddddd....',
    'gah fail, but you\'re still here',
    'you\'re committed now',
    'this is ridiculous...',
    'you know, im proud of you',
    'thanks for sticking this through',
    'I wish I could give you a hug',
    'we are getting close!'
  ],
  interval: null,

  onDidInsertElement: function(){
    let messages = this.get('messages');
    let curIndex = 0;
    this.setText(0);
    let interval = setInterval(() => {
      if(curIndex === messages.length) {
        curIndex = 0;
      }
      this.setText(curIndex++);
    }, 3000);
    this.set('interval', interval);
  }.on('didInsertElement'),

  setText: function(index){
    let messages = this.get('messages');
    this.$().text(messages[index]);
  },

  willDestroyElement: function(){
    let interval = this.get('interval');
    if(interval) {
      clearInterval(interval);
    }
  }
});
