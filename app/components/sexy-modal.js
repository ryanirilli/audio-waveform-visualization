import Ember from 'ember';

export default Ember.Component.extend({
  isShowing: false,

  _buttonText: function(){
    return this.get('buttonText') || 'Alright'
  }.property('buttonText'),

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
        const onClose = this.get('onClose');
        if(typeof onClose === 'function') {
          onClose();
        }
      },   300);
    }
  }
});
