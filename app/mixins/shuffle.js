import Ember from 'ember';
export default Ember.Mixin.create({
  shuffle: function(array) {
    let cur = array.length;
    while (0 !== cur) {
      let random = Math.floor(Math.random() * cur);
      cur -= 1;
      [array[cur], array[random]] = [array[random], array[cur]]
    }
    return array;
  }
});
