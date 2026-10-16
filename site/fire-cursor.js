(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var coarse = window.matchMedia('(pointer: coarse)');
  if (reduced.matches || coarse.matches) return;
  if (!document.documentElement || !document.body) return;

  document.documentElement.classList.add('fire-cursor');

  var dot = document.createElement('div');
  dot.className = 'custom-cursor';
  dot.setAttribute('aria-hidden', 'true');

  var ring = document.createElement('div');
  ring.className = 'custom-cursor-ring';
  ring.setAttribute('aria-hidden', 'true');

  document.body.appendChild(dot);
  document.body.appendChild(ring);

  var mouse = { x: -100, y: -100, targetX: -100, targetY: -100 };
  var ringX = -100;
  var ringY = -100;

  function lerp(start, end, speed) {
    return start + (end - start) * speed;
  }

  document.addEventListener('mousemove', function (e) {
    mouse.targetX = e.clientX;
    mouse.targetY = e.clientY;
  }, { passive: true });

  function updateCursor() {
    mouse.x = lerp(mouse.x, mouse.targetX, 0.2);
    mouse.y = lerp(mouse.y, mouse.targetY, 0.2);
    ringX = lerp(ringX, mouse.targetX, 0.1);
    ringY = lerp(ringY, mouse.targetY, 0.1);

    dot.style.left = mouse.x + 'px';
    dot.style.top = mouse.y + 'px';
    ring.style.left = ringX + 'px';
    ring.style.top = ringY + 'px';

    requestAnimationFrame(updateCursor);
  }
  requestAnimationFrame(updateCursor);

  var INTERACTIVE = 'a, button, [role="button"], input, select, textarea, label, summary, .cursor-glow, .story-card, .book-card';
  document.addEventListener('mouseover', function (e) {
    var target = e.target.closest(INTERACTIVE);
    if (target) {
      document.body.classList.add('cursor-active');
    } else {
      document.body.classList.remove('cursor-active');
    }
  }, { passive: true });
})();