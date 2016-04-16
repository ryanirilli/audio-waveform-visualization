import Ember from 'ember';

export default Ember.Component.extend({
  isShowing: false,

  didInsertElement() {
    this._super.apply(this, arguments);
    Ember.run.later(() => {
      this.set('isShowing', true);
    }, 100);
  },

  actions: {
    close() {
      this.set('isShowing', false);
      Ember.run.later(() => {
        this.get('onClose')();
      }, 300);
    }
  }
});
