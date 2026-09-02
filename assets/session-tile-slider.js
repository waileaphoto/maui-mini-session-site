// session-tile-slider.js — small manual (arrows-only, no autoplay) image slider for the
// pricing.html session tiles. Reusable: drop a `.tile-slider` block with multiple
// `<figure>` slides plus `.tile-prev`/`.tile-next` buttons inside any
// `.session-card-image[data-tile-slider]` and this wires it up automatically. Tiles with
// only one slide, or no `.tile-slider` at all, are left untouched.
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.session-card-image[data-tile-slider]').forEach((tile) => {
      const figures = Array.from(tile.querySelectorAll('.tile-slider > figure'));
      const prevBtn = tile.querySelector('.tile-prev');
      const nextBtn = tile.querySelector('.tile-next');
      if (figures.length <= 1 || !prevBtn || !nextBtn) return;

      let index = Math.max(0, figures.findIndex((f) => f.classList.contains('active')));
      let touchStartX = 0;

      tile.setAttribute('role', 'group');
      tile.setAttribute('aria-roledescription', 'carousel');

      function updateAccessibility() {
        figures.forEach((figure, figureIndex) => {
          const visible = figureIndex === index;
          figure.setAttribute('aria-hidden', visible ? 'false' : 'true');
          figure.querySelector('img')?.setAttribute('tabindex', visible ? '0' : '-1');
        });
      }

      function show(nextIndex) {
        figures[index].classList.remove('active');
        index = (nextIndex + figures.length) % figures.length;
        figures[index].classList.add('active');
        updateAccessibility();
      }

      prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        show(index - 1);
      });
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        show(index + 1);
      });

      tile.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
      });
      tile.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].clientX;
      }, { passive: true });
      tile.addEventListener('touchend', (e) => {
        const distance = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(distance) > 45) show(index + (distance < 0 ? 1 : -1));
      }, { passive: true });

      updateAccessibility();
    });
  });
})();
