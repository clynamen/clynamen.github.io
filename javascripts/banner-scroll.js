$(window).off('scroll', scrollHandler);
var scrollHandler = function () {
  var scroll = $(window).scrollTop();
  var banner = $('.collapse-sidebar.sidebar-footer > header');
  if (scroll > 200) {
    console.log('changing top:' + banner.css('position'));
    banner.css('top', - Math.ceil( (scroll - 200) / 2) + 'px');
  }
}
$(window).scroll(scrollHandler);

