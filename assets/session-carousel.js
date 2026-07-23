(function () {
  document.querySelectorAll('[data-session-carousel]').forEach(function (carousel) {
    var slides = Array.from(carousel.querySelectorAll('.session-carousel-slide'));
    var previous = carousel.querySelector('.session-carousel-prev');
    var next = carousel.querySelector('.session-carousel-next');
    var status = carousel.querySelector('.session-carousel-status');
    var index = 0;
    var touchStartX = null;

    if (slides.length < 2) {
      carousel.setAttribute('data-single-slide', '');
      return;
    }

    function show(newIndex) {
      index = (newIndex + slides.length) % slides.length;
      slides.forEach(function (slide, slideIndex) {
        var isActive = slideIndex === index;
        slide.classList.toggle('active', isActive);
        slide.setAttribute('aria-hidden', String(!isActive));
      });
      status.textContent = (index + 1) + ' / ' + slides.length;
    }

    previous.addEventListener('click', function () {
      show(index - 1);
    });

    next.addEventListener('click', function () {
      show(index + 1);
    });

    carousel.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        show(index - 1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        show(index + 1);
      }
    });

    carousel.addEventListener('touchstart', function (event) {
      touchStartX = event.changedTouches[0].clientX;
    }, { passive: true });

    carousel.addEventListener('touchend', function (event) {
      if (touchStartX === null) return;
      var distance = event.changedTouches[0].clientX - touchStartX;
      touchStartX = null;
      if (Math.abs(distance) > 45) show(index + (distance < 0 ? 1 : -1));
    }, { passive: true });

    carousel.setAttribute('tabindex', '0');
    show(0);
  });
})();
