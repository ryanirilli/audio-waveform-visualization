import Ember from 'ember';

export default Ember.Component.extend({

  isShowingConfirmUi: true,
  isShowingSuccessUi: false,
  
  publish() {
    const urls = this.get('urls');
    const songPath = this.get('songPath');
    const token = window.FB.getAccessToken();
    
    const requestData = {
      url: '/api/publish-slideshow',
      type: 'post',
      data: { urls, songPath, token },
      success: function(data) {
        this.setProperties({
          isShowingSuccessUi: true
        });
      }.bind(this),
      error: function(err) {
        this.set('isShowingPublishError', true);
      }.bind(this)
    };
    Ember.$.ajax(requestData);
  },
  
  actions: {}
});
