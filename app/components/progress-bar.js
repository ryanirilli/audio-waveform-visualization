import Ember from 'ember';

export default Ember.Component.extend({

  progressBar: null,
  progress: 0,

  didInsertElement() {
    this._super.apply(this, arguments);
    this.initProgressbar();
  },

  initProgressbar() {
    const element = this.$()[0];
    const progress = this.get('progress');
    const progressBar = new ProgressBar.Circle(element, {
      duration: 200,
      color: "#FFFFFF",
      trailColor: "transparent"
    });
    progressBar.animate(progress/100);
    this.set('progressBar', progressBar);
  },

  progressObserver: function(){
    const progress = this.get('progress');
    const progressBar = this.get('progressBar');
    if(progressBar) {
      progressBar.animate(progress/100);
    }
  }.observes('progress')
});
