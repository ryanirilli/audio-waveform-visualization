import Ember from 'ember';
import ShuffleMixin from '../../../mixins/shuffle';
import { module, test } from 'qunit';

module('Unit | Mixin | shuffle');

// Replace this with your real tests.
test('it works', function(assert) {
  var ShuffleObject = Ember.Object.extend(ShuffleMixin);
  var subject = ShuffleObject.create();
  assert.ok(subject);
});
