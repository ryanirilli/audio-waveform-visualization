import Ember from 'ember';

export default Ember.Controller.extend({
  facebook: Ember.inject.service(),
  isLoading: false,
  actions: {
    fbConnect: function(){
      this.set('isLoading', true);
      this.get('facebook').fbConnect().then(() => {
        this.set('isLoading', false);
        this.transitionToRoute('app');
      }).catch(() => {
        this.setProperties({
          isLoading: false,
          error: 'There was an issue connecting to Facebook, sorry!'
        });
      });
    }
  }
});
