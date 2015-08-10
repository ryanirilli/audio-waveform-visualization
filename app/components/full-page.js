import Ember from 'ember';

export default Ember.Component.extend({
  onDidInsertElement: function(){
    this.setHeight();
    this.setCoverPhoto();
    $(window).resize(()=>{
      Ember.run.debounce(this, this.setHeight, 100);
    });
  }.on('didInsertElement'),

  setHeight: function(){
    let windowHeight = $(window).outerHeight();
    this.$().height(windowHeight);
  },

  setCoverPhoto: function(){
    let coverPhotoPath = this.get('coverPhotoPath');
    if(!this.get('coverPhotoPath')) { return; }
    this.$().css({
      background: `url(${coverPhotoPath})`,
      'background-size': 'cover',
      'background-attachment': 'fixed'
    });
  }
});
