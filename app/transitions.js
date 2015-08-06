export default function(){
  this.transition(
    this.fromRoute('index'),
    this.toRoute('app'),
    this.use('toLeft'),
    this.reverse('toRight')
  );
}