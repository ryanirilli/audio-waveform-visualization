export default function(){
  this.transition(
    this.fromRoute('index'),
    this.toRoute('app'),
    this.use('toLeft', { duration: 1000 }),
    this.reverse('toRight', { duration: 1000 })
  );
}