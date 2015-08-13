import Ember from 'ember';

export default Ember.Component.extend({
  selection: null,
  options: null,
  valueProperty: null,
  labelProperty: null,
  defaultLabel: null,
  isShowingBody: false,
  optionsLabels: Ember.computed(`options.@each`, function() {
    let options = this.get('options');
    let labels = [];
    options.forEach((option) => {
      labels.push(option[this.get('labelProperty')])
    });
    return labels;
  }),

  selectedLabel: function(){
    let selection = this.get('selection');
    this.set('isShowingBody', false)
    return selection ? selection[this.get('labelProperty')] : undefined;
  }.property('selection'),

  actions: {
    selectItem: function(selection) {
      let labels = this.get('optionsLabels');
      let index = labels.indexOf(selection);
      let options = this.get('options');
      this.setProperties({
        selection: options[index],
        isShowingBody: false
      });
    },

    toggleBody: function(){
      this.toggleProperty('isShowingBody');
    }
  }
});
