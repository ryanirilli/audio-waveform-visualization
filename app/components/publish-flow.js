import Ember from 'ember';

export default Ember.Component.extend({

  isShowingPublishFlow: null,
  isShowingConfirmUi: true,
  isShowingSuccessUi: false,
  isShowingInterstitial: false,
  isFinished: false,

  submit() {

    this.setProperties({
      isShowingSuccessUi: true,
      isShowingInterstitial: false,
      isShowingConfirmUi: false
    });

    return;

    const urls = this.get('urls');
    const songPath = this.get('songPath');
    const token = window.FB.getAccessToken();

    const requestData = {
      url: '/api/publish-slideshow',
      type: 'post',
      data: { urls, songPath, token },
      success: function(data) {
        this.setProperties({
          isShowingSuccessUi: true,
          isShowingInterstitial: false,
          isShowingConfirmUi: false,
          isFinished: true
        });
      }.bind(this),
      error: function(err) {
        console.log('ERROR: ', err);
      }.bind(this)
    };
    Ember.$.ajax(requestData);
  },

  actions: {
    hidePublishFlow() {
      this.set('isShowingPublishFlow', false);
    },

    publish() {

      this.setProperties({
        isShowingInterstitial: true
      });

      Ember.run.later(() => {
        this.submit();
      }, 2000);
    },

    finished() {
      this.set('isFinished', true);
    }
  }
});
