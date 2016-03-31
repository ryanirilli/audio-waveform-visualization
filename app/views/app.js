import Ember from 'ember';

export default Ember.View.extend({
  shouldAnimateIn: false,
  didInsertElement() {
    this._super.apply(this, arguments);
    this.set('shouldAnimateIn', true);
  }
});
