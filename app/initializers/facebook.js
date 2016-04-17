export function initialize(/* container, application */) {
  var fbAsyncInit = function () {
    FB.init({
      appId      : '1636056166653570',
      status     : true,
      xfbml      : true,
      version    : 'v2.3' // or v2.0, v2.1, v2.0
    });
  };

  (function (d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) {
      return;
    }
    js = d.createElement(s);
    js.id = id;
    js.src = "//connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'facebook-jssdk'));
  window.fbAsyncInit = fbAsyncInit;
}

export default {
  name: 'facebook',
  initialize: initialize
};
