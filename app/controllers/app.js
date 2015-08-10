import Ember from 'ember';

export default Ember.Controller.extend({
  photoUrls: null,
  facebook: Ember.inject.service(),
  onInit: function(){
    //var user = this.get('facebook').getUser();

    this.get('facebook').fbFetchPhotoUrls().then((urls) => {
      this.set('photoUrls', urls);
    });
  }.on('init')
});
