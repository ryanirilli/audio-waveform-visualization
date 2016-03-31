import Ember from 'ember';

export default Ember.Controller.extend({
  hasClickedGetStarted: false,
  actions: {
    getStarted() {
      this.set('hasClickedGetStarted', true);
      setTimeout(() => {
        this.transitionToRoute('app');
      }, 1000);
    }
  }
});
