import Ember from 'ember';

export default Ember.Component.extend({
  resizeId: null,
  onDidInsertElement: function(){
    this.setHeight();
    this.setCoverPhoto();
    let id = Ember.generateGuid();
    this.set('resizeId', id);
    $(window).on(`resize.${id}`, ()=>{
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
  },

  willDestroyElement: function(){
    let id = this.get('resizeId');
    $(window).off(`resize.${id}`);
  }
});
