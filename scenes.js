/* ==========================================================================
   SEVEN — SCENE EFFECTS (lightweight, no libraries)
   Each effect can be switched on/off per screen size in the dashboard
   (Design & effects). Settings: 'all' | 'wide' (laptop & desktop) | 'small'
   (phones & tablets) | 'off'. The page gets one class per active effect:
     fx-reveal · fx-sweep · fx-magnetic · fx-parallax · fx-progress · fx-grain
   Everything is switched off with "prefers-reduced-motion".
   ========================================================================== */
(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const design = () => Object.assign({ reveal: 'all', magnetic: 'wide', parallax: 'all', progressLine: 'all', grain: 'all', menuFooter: 'Seven' }, window.SEVEN_CONFIG?.get().design || {});
  const isWide = () => ['laptop', 'desktop', 'large'].includes(root.dataset.screen);
  const active = (mode) => mode === 'all' || (mode === 'wide' && isWide()) || (mode === 'small' && !isWide());
  const fx = (name) => root.classList.contains(`fx-${name}`);
  root.classList.add('has-scenes');
  let parallaxEls = [];

  const applySettings = () => {
    const d = design();
    const motion = !reduce.matches;
    root.classList.toggle('fx-reveal', motion && active(d.reveal));
    root.classList.remove('fx-sweep'); // shine effects removed
    root.classList.toggle('fx-magnetic', motion && active(d.magnetic));
    root.classList.toggle('fx-parallax', motion && active(d.parallax));
    root.classList.toggle('fx-progress', active(d.progressLine));
    root.classList.toggle('fx-grain', active(d.grain));
    if (!fx('parallax')) parallaxEls.forEach((img) => { img.style.translate = ''; });
    // Small line under the three-dot menu links (editable). The old default "Seven — Smash Burger" now reads "Seven".
    let footer = d.menuFooter ?? 'Seven';
    if (/^\s*seven\s*[—-]\s*smash burger\s*$/i.test(footer)) footer = 'Seven';
    const foot = document.querySelector('#menu .menu-foot');
    if (foot) { foot.textContent = footer; foot.hidden = !footer; }
  };

  /* ---------- 3. Hero headline: "OBSESSED" fills the width between equal side margins ---------- */
  const heroH1 = document.querySelector('.hero-text h1');
  const fitHero = () => {
    if (!heroH1) return;
    const hero = heroH1.closest('.hero');
    heroH1.style.removeProperty('font-size');
    const left = heroH1.parentElement.getBoundingClientRect().left - (hero ? hero.getBoundingClientRect().left : 0);
    const heroW = hero ? hero.clientWidth : window.innerWidth;
    const room = heroW - 2 * Math.max(16, left);                 // same margin on both sides
    const base = parseFloat(getComputedStyle(heroH1).fontSize);
    const wide = heroH1.getBoundingClientRect().width;           // widest line (inline-block)
    if (!wide || !room) return;
    // How much of the width "OBSESSED" takes and its height limit are set per screen in scenes.css
    // (--hero-fit, --hero-max-h), so the headline stays compact and the video stays the star.
    const cs = hero ? getComputedStyle(hero) : null;
    const fit = parseFloat(cs?.getPropertyValue('--hero-fit')) || 1;
    const maxH = parseFloat(cs?.getPropertyValue('--hero-max-h')) || 0.58;
    let size = base * ((room * fit) / wide);
    const heroH = hero ? hero.clientHeight : window.innerHeight;
    const lines = 2, lh = 0.94;
    size = Math.min(size, (heroH * maxH) / (lines * lh + 0.06));
    heroH1.style.setProperty('font-size', `${size.toFixed(1)}px`, 'important');
  };
  fitHero();
  window.addEventListener('resize', fitHero);
  window.sevenOnLoad(fitHero);
  document.fonts?.ready.then(fitHero);
  window.addEventListener('seven:screenchange', () => { fitHero(); applySettings(); });

  /* ---------- reveal on scroll ---------- */
  const REVEAL_MASK = '.page-shell > section:not(.hero) h2, .menu-page h1';
  const REVEAL_UP = [
    '.our-story__copy p', '.burger-story__heading p', '.burger-story__button',
    '.best-sellers__intro-text', '.best-sellers__button', '.best-sellers__card', '.partners__inner > p', '.partners__logos',
    '.franchise h3', '.franchise__copy', '.franchise__contact',
    '.location__map', '.location__details', '.playlist__lead', '.playlist__copy', '.playlist__carousel',
    '.instagram-feed__cta', '.instagram-feed__carousel', '.contact__lead', '.contact__details',
    '.contact__social', '.menu-page__heading p', '.menu-index li', '.story-strip'
  ].join(',');
  let io = null;
  const reveal = (el) => {
    el.classList.add('is-in');
    // Once revealed, the mask is removed completely so nothing can be cut off.
    window.setTimeout(() => el.classList.add('is-done'), 1300);
  };
  const setupReveal = () => {
    const els = [...document.querySelectorAll(REVEAL_MASK)].map((el) => [el, 'rv-mask'])
      .concat([...document.querySelectorAll(REVEAL_UP)].map((el) => [el, 'rv-up']));
    if (reduce.matches || !('IntersectionObserver' in window)) {
      els.forEach(([el]) => el.classList.add('is-in', 'is-done'));
      return;
    }
    io?.disconnect();
    // Clipped headings are watched through their container (a fully clipped element never "intersects").
    const waiting = new Map();
    io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      (waiting.get(en.target) || []).forEach(reveal);
      waiting.delete(en.target); io.unobserve(en.target);
    }), { threshold: 0, rootMargin: '0px 0px -1px 0px' });
    const watch = (target, el) => {
      if (!waiting.has(target)) { waiting.set(target, []); io.observe(target); }
      waiting.get(target).push(el);
    };
    els.forEach(([el, cls]) => {
      if (el.classList.contains('is-in')) return;
      const sibs = el.parentElement ? [...el.parentElement.children].filter((c) => c.matches(REVEAL_UP)) : [];
      el.style.setProperty('--rv-d', `${Math.min(5, Math.max(0, sibs.indexOf(el))) * 80}ms`);
      el.classList.add(cls);
      let target = cls === 'rv-mask' ? (el.parentElement || el) : el;
      while (target !== el && target.parentElement && getComputedStyle(target).display === 'contents') target = target.parentElement;
      watch(target, el);
    });
  };
  setupReveal();
  // The hero statement reveals once the page is visible (after the loading intro, if there is one).
  const heroIn = () => window.requestAnimationFrame(() => window.setTimeout(() => root.classList.add('hero-in'), 120));
  if (root.classList.contains('has-intro') && !root.classList.contains('intro-done')) document.addEventListener('seven:intro-done', heroIn, { once: true });
  else heroIn();
  window.setTimeout(() => document.querySelector('.hero-text h1')?.classList.add('is-done'), 1700);

  /* ---------- small line under the three-dot menu links (text editable in the dashboard) ---------- */
  const menu = document.getElementById('menu');
  if (menu && !menu.querySelector('.menu-foot')) {
    const foot = document.createElement('p'); foot.className = 'menu-foot'; foot.setAttribute('aria-hidden', 'true');
    menu.appendChild(foot);
  }

  /* ---------- progress line ---------- */
  const progress = document.createElement('div');
  progress.className = 'scroll-progress'; progress.setAttribute('aria-hidden', 'true');
  progress.innerHTML = '<i></i>';
  document.body.appendChild(progress);
  const bar = progress.firstChild;

  /* ---------- magnetic hover (mouse only) ---------- */
  const MAGNET = '.burger-story__button, .instagram-feed__button, .hero-aside__button, .best-sellers__button, .location__button, #menu a, .header-nav a, .menu-index a';
  let magnet = null;
  const release = (el) => { if (el) el.style.translate = ''; };
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !fx('magnetic')) { release(magnet); magnet = null; return; }
    const el = e.target.closest?.(MAGNET);
    if (magnet && magnet !== el) { release(magnet); magnet = null; }
    if (!el) return;
    magnet = el;
    const r = el.getBoundingClientRect();
    const strength = el.matches('#menu a, .header-nav a, .menu-index a') ? 5 : 9;
    const dx = ((e.clientX - (r.left + r.width / 2)) / Math.max(r.width, 60)) * strength * 2;
    const dy = ((e.clientY - (r.top + r.height / 2)) / Math.max(r.height, 30)) * strength;
    el.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
  }, { passive: true });
  document.addEventListener('pointerleave', () => { release(magnet); magnet = null; });

  /* ---------- parallax images ---------- */
  const PARALLAX = '.best-sellers__card img, .story-strip__photo img, .menu-item__img, .gallery__slide img';
  const collect = () => { parallaxEls = [...document.querySelectorAll(PARALLAX)]; };
  window.sevenOnLoad(collect);
  collect();
  document.addEventListener('seven:menu-rendered', () => { setupReveal(); collect(); });

  /* ---------- burger layer labels: one evenly spaced column (laptop & desktop) ---------- */
  const burgerPieces = [...document.querySelectorAll('.burger-story__piece')];
  const evenLabels = () => {
    if (!burgerPieces.length) return;
    const centres = burgerPieces.map((p) => p.offsetTop + p.offsetHeight / 2);
    const first = centres[0]; const last = centres[centres.length - 1];
    const step = (last - first) / Math.max(1, centres.length - 1);
    burgerPieces.forEach((p, i) => p.style.setProperty('--even-dy', `${(first + step * i - centres[i]).toFixed(1)}px`));
  };

  /* ---------- one frame loop for scroll-linked work ---------- */
  let frame = 0;
  const update = () => {
    frame = 0;
    const vh = window.innerHeight;
    const max = Math.max(1, document.documentElement.scrollHeight - vh);
    bar.style.transform = `scale${progress.offsetWidth > progress.offsetHeight ? 'X' : 'Y'}(${Math.min(1, window.scrollY / max).toFixed(4)})`;
    if (fx('parallax')) {
      const amount = window.innerWidth < 768 ? 10 : 22;
      parallaxEls.forEach((img) => {
        const r = img.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100 || !r.height) return;
        const p = (r.top + r.height / 2 - vh / 2) / vh;
        img.style.translate = `0 ${(-p * amount).toFixed(1)}px`;
      });
    }
  };
  const request = () => { if (!frame) frame = window.requestAnimationFrame(update); };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  window.sevenOnLoad(request);

  /* ---------- 6. Best seller on every screen: swipe/drag showcase that follows the finger or mouse ---------- */
  const bsCards = document.querySelector('.best-sellers__cards');
  if (bsCards) {
    let cards = []; let current = 0;
    const staged = () => bsCards.classList.contains('is-stage');
    const paint = () => {
      const n = cards.length;
      cards.forEach((c, i) => {
        c.classList.toggle('is-active', i === current);
        c.classList.toggle('is-prev', n > 1 && i === (current - 1 + n) % n && i !== current);
        c.classList.toggle('is-next', n > 2 && i === (current + 1) % n);
      });
    };
    const go = (i) => { const n = cards.length; if (!n) return; current = ((i % n) + n) % n; paint(); };
    const build = () => {
      cards = [...bsCards.querySelectorAll('.best-sellers__card')];
      bsCards.classList.toggle('is-stage', cards.length > 1);
      if (cards.length > 1) { bsCards.tabIndex = 0; bsCards.setAttribute('aria-roledescription', 'carousel'); bsCards.setAttribute('aria-label', 'Best sellers. Swipe, drag or use the arrow keys.'); }
      if (current >= cards.length) current = 0;
      if (!build.done) { current = cards.length > 2 ? 1 : 0; build.done = true; }
      bsCards.style.removeProperty('--drag');
      paint();
    };
    // Small minimal arrows under the burgers: they show the showcase can be swiped (and they work too).
    const arrows = document.createElement('div');
    arrows.className = 'best-sellers__arrows';
    const chev = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
    arrows.innerHTML = `<button type="button" class="best-sellers__arrow best-sellers__arrow--prev" aria-label="Previous burger">${chev('M15 5l-7 7 7 7')}</button>`
      + `<button type="button" class="best-sellers__arrow best-sellers__arrow--next" aria-label="Next burger">${chev('M9 5l7 7-7 7')}</button>`;
    bsCards.after(arrows);
    arrows.querySelector('.best-sellers__arrow--prev').addEventListener('click', () => go(current - 1));
    arrows.querySelector('.best-sellers__arrow--next').addEventListener('click', () => go(current + 1));
    const syncArrows = () => { arrows.hidden = !staged(); };
    build(); syncArrows();
    window.addEventListener('seven:screenchange', () => { build(); syncArrows(); });
    document.addEventListener('seven:content-applied', () => { build(); syncArrows(); });
    // Tap a side burger to bring it forward (the front one keeps its link).
    let justSwiped = false;
    bsCards.addEventListener('click', (e) => {
      if (!staged()) return;
      if (justSwiped) { e.preventDefault(); justSwiped = false; return; }
      const card = e.target.closest('.best-sellers__card');
      if (card && !card.classList.contains('is-active')) { e.preventDefault(); go(cards.indexOf(card)); }
    });
    // Drag: the burgers follow the finger, then settle on the next/previous one.
    let sx = 0; let sy = 0; let dx = 0; let axis = null; let tracking = false;
    const start = (x, y) => { if (!staged()) return; tracking = true; sx = x; sy = y; dx = 0; axis = null; };
    const move = (x, y, e) => {
      if (!tracking) return;
      const mx = x - sx; const my = y - sy;
      if (!axis && (Math.abs(mx) > 8 || Math.abs(my) > 8)) axis = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
      if (axis !== 'x') return;
      if (e && e.cancelable) e.preventDefault();       // horizontal drag: keep the page still
      dx = mx;
      bsCards.classList.add('is-dragging');
      bsCards.style.setProperty('--drag', `${dx.toFixed(1)}px`);
    };
    const end = () => {
      if (!tracking) return;
      tracking = false;
      bsCards.classList.remove('is-dragging');
      bsCards.style.setProperty('--drag', '0px');
      const limit = Math.min(70, bsCards.clientWidth * 0.15);
      if (axis === 'x' && Math.abs(dx) > limit) { go(current + (dx < 0 ? 1 : -1)); justSwiped = true; window.setTimeout(() => { justSwiped = false; }, 350); }
      axis = null;
    };
    bsCards.addEventListener('touchstart', (e) => start(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    bsCards.addEventListener('touchmove', (e) => move(e.touches[0].clientX, e.touches[0].clientY, e), { passive: false });
    bsCards.addEventListener('touchend', end);
    bsCards.addEventListener('touchcancel', end);
    // Keyboard: left/right arrows.
    bsCards.addEventListener('keydown', (e) => {
      if (!staged()) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); }
    });
    bsCards.addEventListener('dragstart', (e) => e.preventDefault());
    // Mouse / trackpad drag.
    bsCards.addEventListener('mousedown', (e) => { if (e.button === 0) { start(e.clientX, e.clientY); } });
    window.addEventListener('mousemove', (e) => { if (tracking) move(e.clientX, e.clientY, null); });
    window.addEventListener('mouseup', end);
  }

  applySettings();
  request();
  // Changes saved in the dashboard (another tab) apply straight away.
  window.addEventListener('storage', (e) => { if (e.key === window.SEVEN_CONFIG?.storageKey) applySettings(); });
})();
