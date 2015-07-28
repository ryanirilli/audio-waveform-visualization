import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';


moduleForComponent('audio-visualizer', 'Integration | Component | audio visualizer', {
  integration: true
});

test('it renders', function(assert) {
  assert.expect(2);

  // Set any properties with this.set('myProperty', 'value');
  // Handle any actions with this.on('myAction', function(val) { ... });

  this.render(hbs`{{audio-visualizer}}`);

  assert.equal(this.$().text(), '');

  // Template block usage:
  this.render(hbs`
    {{#audio-visualizer}}
      template block text
    {{/audio-visualizer}}
  `);

  assert.equal(this.$().text().trim(), 'template block text');
});
