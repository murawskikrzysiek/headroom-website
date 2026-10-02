// Before and after slider: the transparent range input over two captures
// sets --ba on its frame, which clips the after image and places the
// divider (headroom.css, .ba__*). The input carries the keyboard (arrow keys,
// Home, End) and the spoken value. Without JS the frame stays at 50%.
(function () {
  var frames = document.querySelectorAll('.ba__frame');
  Array.prototype.forEach.call(frames, function (frame) {
    var range = frame.querySelector('.ba__range');
    if (!range) return;
    function update() {
      frame.style.setProperty('--ba', range.value + '%');
      range.setAttribute('aria-valuetext', 'Before on the left, after from ' + range.value + '%');
    }
    range.addEventListener('input', update);
    update();
  });
})();
