import Ember from 'ember';

export default Ember.Controller.extend({
  facebook: Ember.inject.service(),
  actions: {
    fbConnect: function(){
      this.get('facebook').fbConnect().then((authResponse) => {
        this.transitionToRoute('app');
      }).catch(() => {});
    }
  }
});
