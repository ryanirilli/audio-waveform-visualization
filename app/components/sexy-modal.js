import Ember from 'ember';

export default Ember.Component.extend({
  isShowing: false,
  isCloseEnabled: true,

  didInsertElement() {
    this._super.apply(this, arguments);
    Ember.run.later(() => {
      this.set('isShowing', true);
    }, 100);
  },

  shouldCloseObserver: function(){
    const shouldClose = this.get('shouldClose');
    if(shouldClose) {
      this.send('close');
    }
  }.observes('shouldClose'),

  actions: {
    close() {
      this.set('isShowing', false);
      Ember.run.later(() => {
        const onClose = this.get('onClose');
        if(typeof onClose === 'function') {
          onClose();
        }
      }, 300);
    }
  }
});
