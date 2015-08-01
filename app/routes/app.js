import Ember from 'ember';
export default Ember.Route.extend({
  facebook: Ember.inject.service(),
  beforeModel: function(){
    if(!this.get('facebook').getUser()) {
      this.transitionTo('index');
    }
  }
});
