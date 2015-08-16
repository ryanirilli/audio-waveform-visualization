import Ember from 'ember';

export default Ember.Component.extend({
  isInitialized: false,
  selection: null,
  options: null,
  valueProperty: null,
  labelProperty: null,
  defaultLabel: null,
  isShowingBody: false,
  clickId: null,
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
      let isShowingBody = this.get('isShowingBody');
      let clickId = this.get('clickId');
      var isInitialized = this.get('isInitialized');
      if(!clickId) {
        clickId = Ember.generateGuid();
        this.set('clickId', clickId);
      }
      if(isShowingBody) {
        Ember.$(window).on(`click.${clickId}`, (e)=> {
          if(!isInitialized) {
            isInitialized = true;
            return;
          }
          this.setProperties({
            isInitialized: false,
            isShowingBody: false
          });
          Ember.$(window).off(`click.${clickId}`);
        });
      }
    }
  },

  willDestroyElement: function(){
    let clickId = this.get('clickId');
    Ember.$(window).off(`click.${clickId}`);
  }
});
