/* SEVEN — timed opening animation. Video loading never blocks entry. */
(function () {
  var root = document.documentElement;
  var intro = document.getElementById('intro');
  if (!intro) return;
  var num = intro.querySelector('.intro__num');
  var bars = [].slice.call(intro.querySelectorAll('.intro__bar'));
  // The loading shows when the website is opened or refreshed. Moving between the site's
  // own pages (Menu → Home, or the browser's back button) goes straight to the site.
  var KEY = 'seven-intro-seen';
  var seen = false;
  try { seen = window.sessionStorage.getItem(KEY) === '1'; } catch (e) {}
  var nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || {};
  var fromSite = false;
  try { fromSite = !!document.referrer && new URL(document.referrer).origin === location.origin && new URL(document.referrer).pathname !== location.pathname; } catch (e) {}
  // Works on a real server AND when the files are opened straight from a folder (no referrer there):
  // every page of the site notes the moment you leave it (script.js), so arriving a few seconds
  // later means you came from inside the site.
  var leftAt = 0;
  try { leftAt = Number(window.localStorage.getItem('seven-left-at')) || 0; } catch (e) {}
  var justLeftSite = leftAt && Date.now() - leftAt < 15000;
  if (nav.type !== 'reload' && (nav.type === 'back_forward' || fromSite || justLeftSite || (seen && fromSite))) { intro.parentNode.removeChild(intro); return; }
  function remember() { try { window.sessionStorage.setItem(KEY, '1'); } catch (e) {} }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('has-intro', 'intro-lock');

  var DURATION = 2300;   // animation length on fast internet (whole intro ≤ 3s)
  var LIMIT = 2800;     // hard limit; video buffering never holds the intro

  // A timed brand animation, independent of downloads and autoplay permission.
  var ready = true, total = 1, done = 1;
  var opened = false;
  setTimeout(open, LIMIT);

  /* ---------- reduced motion: the complete lines, then the site when ready ---------- */
  if (reduce) {
    bars.forEach(function (b) { b.style.transform = 'none'; });
    (function wait() {
      num.textContent = Math.round(Math.min(99, total ? done / total * 100 : 0)) + '%';
      if (ready) { num.textContent = '100%'; setTimeout(open, 250); } else setTimeout(wait, 120);
    })();
    return;
  }

  /* ---------- one smooth frame loop ---------- */
  var n = bars.length, start = 0, shown = 0, last = 0, finished = false;
  var ease = function (t) { return 1 - Math.pow(1 - t, 3); };
  function frame(now) {
    if (!start) { start = now; last = now; }
    var dt = Math.min(64, now - last); last = now;
    var clock = Math.min(1, (now - start) / DURATION);
    var loaded = ready ? 1 : (total ? done / total : 0);
    // How far the real loading allows the animation to go: the first lines can
    // always start; every essential file that arrives unlocks more; the end
    // (100%) only when everything is ready.
    var allowed = ready ? 1 : 0.3 + 0.69 * loaded;
    var goal = Math.min(clock, allowed);
    if (!ready) goal = Math.min(goal, 0.99);
    // Glide toward the goal (no jumps when a big file finishes).
    var catchUp = ready && clock >= 1 ? 0.3 : 0.2;
    shown += (goal - shown) * (1 - Math.pow(1 - catchUp, dt / 16.7));
    if (ready && clock >= 1 && 1 - shown < 0.004) shown = 1;
    var slots = shown * n;
    for (var i = 0; i < n; i += 1) {
      var t = Math.max(0, Math.min(1, slots - i));
      bars[i].style.transform = 'scaleY(' + ease(t).toFixed(4) + ')';
    }
    num.textContent = Math.floor(shown * 100 + 0.0001) + '%';
    if (shown >= 1) { if (!finished) { finished = true; setTimeout(open, 60); } return; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function open() {
    if (opened) return;
    opened = true;
    num.textContent = "100%";
    // A short, soft fade into the website.
    remember();
    root.classList.remove('intro-lock');
    root.classList.add('intro-done');
    document.dispatchEvent(new CustomEvent('seven:intro-done'));
    if (reduce) { if (intro.parentNode) intro.parentNode.removeChild(intro); return; }
    intro.classList.add('is-leaving');
    setTimeout(function () { if (intro.parentNode) intro.parentNode.removeChild(intro); }, 650);
  }
})();
