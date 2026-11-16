const menu = document.getElementById('menu');
const menuButton = document.getElementById('menu-button');
const closeButton = document.getElementById('close-menu');
const menuLinks = menu.querySelectorAll('a');

// Lock background scrolling while the menu is open (and keep the page from
// jumping sideways when the desktop scrollbar disappears).
function lockScroll(lock) {
  const root = document.documentElement;
  if (lock) {
    const gap = window.innerWidth - root.clientWidth;
    root.style.setProperty('--scrollbar-gap', `${Math.max(0, gap)}px`);
    root.classList.add('menu-open');
  } else {
    root.classList.remove('menu-open');
    root.style.removeProperty('--scrollbar-gap');
  }
}

function openMenu() {
  lockScroll(true);
  menu.classList.add('is-open');
  menu.setAttribute('aria-hidden', 'false');
  menuButton.setAttribute('aria-expanded', 'true');
  document.body.classList.add('menu-open');
  menuButton.setAttribute('aria-label', 'Close menu');
  menu.querySelector('a')?.focus();
}

function closeMenu() {
  menu.classList.remove('is-open');
  menu.setAttribute('aria-hidden', 'true');
  menuButton.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('menu-open');
  lockScroll(false);
  menuButton.setAttribute('aria-label', 'Open menu');
  menuButton.focus();
}

// The header stays on top of the open menu; the three thin lines turn into a close (×) button.
menuButton.addEventListener('click', () => (menu.classList.contains('is-open') ? closeMenu() : openMenu()));
closeButton.addEventListener('click', closeMenu);
menuLinks.forEach((link) => link.addEventListener('click', closeMenu));

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menu.classList.contains('is-open')) {
    closeMenu();
  }
});

// Start muted playback immediately and retry after browser/user lifecycle events.
(() => {
  const video = document.querySelector('.hero video');
  if (!video) return;
  const hero = video.closest('.hero');
  const canvas = hero.querySelector('.hero__canvas');
  const context = canvas?.getContext('2d', { alpha: false });
  let framePending = false;
  const drawFrame = () => {
    framePending = false;
    if (context && video.readyState >= 2) {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
    if (!video.paused && !video.ended && !document.hidden) scheduleFrame();
  };
  const scheduleFrame = () => {
    if (framePending) return;
    framePending = true;
    if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(drawFrame);
    else requestAnimationFrame(drawFrame);
  };
  video.addEventListener('loadeddata', drawFrame);
  video.addEventListener('playing', scheduleFrame);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !video.paused) scheduleFrame();
  });
  let pending = false;
  const hide = () => hero.classList.remove('is-video-playing');
  const play = () => {
    if (!video.paused && video.readyState >= 3) hero.classList.add('is-video-playing');
    if (document.hidden || pending || !video.paused) return;
    video.muted = video.defaultMuted = true;
    video.loop = video.autoplay = video.playsInline = true;
    video.controls = false;
    video.removeAttribute('controls');
    pending = true;
    try {
      Promise.resolve(video.play()).catch(hide).finally(() => { pending = false; });
    } catch (_) { pending = false; hide(); }
  };
  video.addEventListener('playing', () => hero.classList.add('is-video-playing'));
  ['emptied', 'error'].forEach((event) => video.addEventListener(event, hide));
  ['loadeddata', 'canplay'].forEach((event) => video.addEventListener(event, play));
  ['touchend', 'pointerdown', 'click', 'keydown'].forEach((event) =>
    window.addEventListener(event, play, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) play(); });
  window.addEventListener('pageshow', play);
  play();
})();

// Going to another page of the site (e.g. "Our Menu" / "Explore Menu" → menu page):
// close the menu if open, fade the page out softly, then open the page.
document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href]');
  if (!link || event.defaultPrevented || link.target === '_blank' || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin || !/\.html$/.test(url.pathname) || url.pathname === location.pathname) return;
  event.preventDefault();
  if (menu.classList.contains('is-open')) closeMenu();
  document.body.classList.add('is-leaving');
  window.setTimeout(() => { location.href = url.href; }, 260);
});
window.addEventListener('pageshow', () => document.body.classList.remove('is-leaving'));

// Menu navigation: every menu/footer link stays on this homepage and glides
// smoothly to its section. The section then fills the screen below the header.
// While gliding, the header "breathes" (expands softly, then settles), and the
// menu item for the section you're viewing is marked as active.
const pageShell = document.querySelector('.page-shell');
const siteHeader = document.getElementById('header');
if (pageShell && siteHeader) {
  const NAV_SECTIONS = ['home', 'our-story', 'our-menu', 'best-sellers', 'franchise', 'our-location', 'playlist', 'instagram', 'contact'];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const headerHeight = () => siteHeader.getBoundingClientRect().height;
  // Where to stop: a section shorter than the screen is centred in the space
  // below the header; a taller one starts right under the header.
  const sectionTop = (id) => {
    if (id === 'home') return 0;
    const el = document.getElementById(id);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const visible = window.innerHeight - headerHeight();
    const slack = Math.max(0, (visible - rect.height) / 2);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return Math.min(max, Math.max(0, rect.top + window.scrollY - headerHeight() - slack));
  };
  let focusedSection = null;
  let restY = 0;
  const releaseFocus = () => {
    if (!focusedSection) return;
    document.body.classList.remove('is-focus-mode');
    focusedSection.classList.remove('is-focused');
    focusedSection = null;
  };
  const focusSection = (id) => {
    releaseFocus();
    if (id === 'home') return;
    focusedSection = document.getElementById(id);
    focusedSection.classList.add('is-focused');
    document.body.classList.add('is-focus-mode');
  };
  const setActive = (id) => {
    document.querySelectorAll('#menu a, .header-nav a, .site-footer__nav a').forEach((link) => {
      const target = (link.getAttribute('href') || '').split('#')[1];
      if (target && target === id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  };

  let scrollFrame = 0;
  let gliding = false;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // easeInOutCubic
  const glideTo = (id) => {
    const destination = sectionTop(id);
    if (destination === null) return;
    cancelAnimationFrame(scrollFrame);
    setActive(id);
    focusSection(id);
    const start = window.scrollY;
    const distance = destination - start;
    // Longer trips take a little longer, but never feel slow.
    const duration = reduceMotion.matches ? 0 : Math.min(1400, Math.max(750, Math.abs(distance) * 0.35));
    document.documentElement.style.scrollBehavior = 'auto';
    siteHeader.style.setProperty('--glide-duration', `${Math.max(duration, 600)}ms`);
    siteHeader.classList.remove('is-gliding');
    void siteHeader.offsetWidth; // restart the header animation
    if (!reduceMotion.matches) siteHeader.classList.add('is-gliding');
    gliding = true;
    const began = performance.now();
    const step = (now) => {
      const t = duration ? Math.min(1, (now - began) / duration) : 1;
      // Re-measure as we go in case images above finish loading mid-glide.
      const live = sectionTop(id);
      window.scrollTo(0, start + (live - start) * ease(t));
      if (t < 1) scrollFrame = requestAnimationFrame(step);
      else { gliding = false; restY = window.scrollY; document.documentElement.style.scrollBehavior = ''; }
    };
    scrollFrame = requestAnimationFrame(step);
    history.replaceState(null, '', id === 'home' ? location.pathname : `#${id}`);
  };
  siteHeader.addEventListener('animationend', () => siteHeader.classList.remove('is-gliding'));
  // A finger or wheel on the page cancels an in-progress glide and ends the focus.
  const userTakesOver = (event) => {
    if (menu.classList.contains('is-open') || event.target.closest?.('#menu, #header')) return;
    if (gliding) { cancelAnimationFrame(scrollFrame); gliding = false; document.documentElement.style.scrollBehavior = ''; }
    releaseFocus();
  };
  ['wheel', 'touchmove'].forEach((type) => window.addEventListener(type, userTakesOver, { passive: true }));
  window.addEventListener('keydown', (event) => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) userTakesOver(event);
  });
  // Any other scrolling (scrollbar drag etc.) well away from the resting point also ends it.
  window.addEventListener('scroll', () => {
    if (focusedSection && !gliding && Math.abs(window.scrollY - restY) > 60) releaseFocus();
  }, { passive: true });

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    const url = new URL(link.href, location.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    const id = decodeURIComponent(url.hash.slice(1));
    if (!NAV_SECTIONS.includes(id)) return;
    event.preventDefault();
    const wasMenuOpen = menu.classList.contains('is-open');
    if (wasMenuOpen) closeMenu();
    // Let the menu start sliding away, then glide.
    window.setTimeout(() => glideTo(id), wasMenuOpen ? 180 : 0);
  });

  // Active item follows the section in the middle of the screen as you scroll.
  const spy = () => {
    if (gliding || focusedSection) return;
    const line = headerHeight() + (window.innerHeight - headerHeight()) * 0.4;
    let current = 'home';
    NAV_SECTIONS.slice(1).forEach((id) => {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= line) current = id;
    });
    if (window.scrollY < 40) current = 'home';
    setActive(current);
  };
  let spyFrame = 0;
  window.addEventListener('scroll', () => { if (!spyFrame) spyFrame = requestAnimationFrame(() => { spyFrame = 0; spy(); }); }, { passive: true });

  // Arriving with a section in the address (e.g. from the menu page): glide there once loaded.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const initial = decodeURIComponent(location.hash.slice(1));
  if (NAV_SECTIONS.includes(initial) && initial !== 'home') {
    window.sevenOnLoad(() => window.setTimeout(() => glideTo(initial), 120), { once: true });
  } else spy();
}

// Second-screen gallery: a seamless, endless slider.
// Slides travel smoothly from LEFT to RIGHT (the next photo enters from the left,
// matching the direction of the brand marquee above it). A copy of the first slide
// sits after the last one, so the loop always continues forward and never rewinds.
// The current slide is remembered for the visit, so returning to the page (back
// button, the menu page, or scrolling back up) resumes exactly where it was.
// Change GALLERY_DIRECTION to -1 if the slides should travel right to left instead.
const GALLERY_DIRECTION = 1;
const gallery = document.querySelector('.gallery');
const galleryTrack = gallery?.querySelector('.gallery__track');
const gallerySlides = galleryTrack ? [...galleryTrack.querySelectorAll('.gallery__slide')] : [];
if (gallery && galleryTrack && gallerySlides.length > 1) {
  const count = gallerySlides.length;
  const stateKey = 'seven-gallery-slide';
  const makeClone = (slide) => {
    const copy = slide.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    copy.classList.add('gallery__slide--clone');
    copy.querySelectorAll('img').forEach((img) => { img.loading = 'eager'; });
    return copy;
  };
  const before = makeClone(gallerySlides[count - 1]);
  const after = makeClone(gallerySlides[0]);
  galleryTrack.prepend(before);
  galleryTrack.append(after);
  // Every slide, including the two copies, gets a fixed position: -1 … count.
  [before, ...gallerySlides, after].forEach((slide, i) => {
    slide.style.transform = `translate3d(${-GALLERY_DIRECTION * (i - 1) * 100}%,0,0)`;
  });
  gallerySlides.forEach((slide) => slide.querySelectorAll('img').forEach((img) => { img.loading = 'eager'; }));
  gallery.classList.add('is-enhanced');

  const readSaved = () => {
    try { const saved = Number(sessionStorage.getItem(stateKey)); return Number.isInteger(saved) && saved >= 0 && saved < count ? saved : 0; }
    catch { return 0; }
  };
  const remember = () => { try { sessionStorage.setItem(stateKey, String(((index % count) + count) % count)); } catch {} };

  let index = readSaved();
  let dragOffset = 0;
  let timer = 0;
  let settleTimer = 0;
  let inView = true;
  let dragging = false;

  const paint = (animate) => {
    galleryTrack.classList.toggle('is-instant', !animate);
    galleryTrack.style.transform = `translate3d(calc(${GALLERY_DIRECTION * index * 100}% + ${dragOffset}px),0,0)`;
    gallerySlides.forEach((slide, i) => slide.setAttribute('aria-hidden', String(i !== ((index % count) + count) % count)));
  };
  // After arriving on one of the copies, swap to the identical real slide with no
  // animation. Both show the same photo, so the swap is invisible.
  const settle = () => {
    window.clearTimeout(settleTimer);
    if (index >= count || index < 0) {
      index = ((index % count) + count) % count;
      paint(false);
      void galleryTrack.offsetWidth; // commit the instant position before animations resume
      galleryTrack.classList.remove('is-instant');
    }
    remember();
  };
  const goTo = (target) => {
    if (index >= count || index < 0) settle();
    index = target;
    paint(true);
    remember();
    // transitionend is the normal trigger; the timeout covers background tabs.
    settleTimer = window.setTimeout(settle, 1300);
  };
  galleryTrack.addEventListener('transitionend', (event) => { if (event.target === galleryTrack) settle(); });

  const stop = () => { window.clearTimeout(timer); timer = 0; };
  const schedule = () => {
    stop();
    if (document.hidden || !inView || dragging) return;
    const delay = Math.max(1000, Number(window.SEVEN_CONFIG?.get().gallery?.delay) || 2000);
    timer = window.setTimeout(() => { goTo(index + 1); schedule(); }, delay);
  };

  // Pause while the gallery is off screen, so scrolling back up to it shows the
  // same photo you left, then continues smoothly from there.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) schedule(); else stop();
    }, { threshold: 0.35 }).observe(gallery);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stop(); settle(); } else schedule();
  });
  // Leaving for another page and coming back with the Back button restores this
  // page from the browser cache. Keep the exact slide and simply resume.
  window.addEventListener('pagehide', () => { stop(); settle(); });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) { settle(); paint(false); requestAnimationFrame(() => galleryTrack.classList.remove('is-instant')); }
    schedule();
  });

  // Swipe (touch) and drag (mouse). Dragging in the travel direction goes forward.
  let startX = 0; let startY = 0; let startTime = 0; let pointerId = null; let axis = null;
  galleryTrack.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    settle();
    pointerId = event.pointerId; startX = event.clientX; startY = event.clientY; startTime = performance.now(); axis = null;
  });
  galleryTrack.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointerId) return;
    const dx = event.clientX - startX; const dy = event.clientY - startY;
    if (!axis && Math.hypot(dx, dy) > 8) {
      axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (axis === 'x') { dragging = true; stop(); galleryTrack.classList.add('is-dragging'); galleryTrack.setPointerCapture(pointerId); }
      else pointerId = null;
    }
    if (axis === 'x') { dragOffset = dx; paint(false); }
  });
  const release = (event) => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    if (axis !== 'x') return;
    const width = gallery.clientWidth; const elapsed = performance.now() - startTime;
    const moved = dragOffset * GALLERY_DIRECTION;
    const flick = Math.abs(dragOffset) > 30 && elapsed < 280;
    let step = 0;
    if (moved > width * 0.18 || (flick && moved > 0)) step = 1;
    else if (moved < -width * 0.18 || (flick && moved < 0)) step = -1;
    dragOffset = 0; dragging = false; galleryTrack.classList.remove('is-dragging');
    goTo(index + step);
    schedule();
  };
  galleryTrack.addEventListener('pointerup', release);
  galleryTrack.addEventListener('pointercancel', release);
  galleryTrack.addEventListener('dragstart', (event) => event.preventDefault());

  paint(false);
  requestAnimationFrame(() => requestAnimationFrame(() => galleryTrack.classList.remove('is-instant')));
  schedule();
}

// Assemble on entry, separate and label each ingredient as the visitor scrolls.
// Positions are fractions of the stage WIDTH (the patty width), so the burger keeps
// identical proportions at every size. "compact" is a finished smash burger with the
// layers overlapping; "separated" opens it up with only small, controlled gaps.
const burgerSection = document.querySelector('.burger-story');
if (burgerSection) {
  const reduceBurgerMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stage = burgerSection.querySelector('.burger-story__stage');
  const pieces = [...stage.querySelectorAll('.burger-story__piece')];
  //               top bun  sauce  cheese  patty  bottom bun
  const compact   = [0,      .295,  .335,   .40,   .545];
  const separated = [0,      .325,  .395,   .485,  .65];
  let burgerFrame = 0;
  const stackHeight = (tops, width) => pieces.reduce((max, piece, i) =>
    Math.max(max, (tops[i] ?? 0) * width + piece.offsetHeight), 0);
  function updateBurger() {
    burgerFrame = 0;
    const width = stage.clientWidth;
    if (!width) return;
    // Scroll progress 0 → 1 (one-way: scrolling down opens, scrolling back up closes).
    let progress = 0;
    if (!reduceBurgerMotion) {
      // Untransformed page positions (the cinematic scroll scales sections, so getBoundingClientRect drifts).
      const pageTopOf = (node) => { let t = 0; for (let el = node; el; el = el.offsetParent) t += el.offsetTop; return t; };
      const vh = window.innerHeight;
      const travel = Math.max(0, burgerSection.offsetHeight - vh);  // pinned scroll distance (tablet & wider)
      if (travel > 80) {
        // Pinned: the burger opens over the pinned scroll (starts closed when the pin begins).
        const header = document.getElementById('header')?.offsetHeight || 0;
        const into = window.scrollY - (pageTopOf(burgerSection) - header);
        progress = Math.max(0, Math.min(1, into / (travel * 0.85)));
      } else {
        // Phones (no pin): opens while the burger itself travels up through the screen.
        const stageTop = pageTopOf(stage) - window.scrollY;
        progress = Math.max(0, Math.min(1, (vh * 0.78 - stageTop) / (vh * 0.5)));
      }
    } else progress = 1;
    // Piece by piece: gap k (between layer k-1 and k) opens in its own slice of the scroll.
    const n = pieces.length;
    const ease = (t) => t * t * (3 - 2 * t);
    const step = (k) => {                                     // k = 1 … n-1
      const start = (k - 1) / (n - 1) * 0.7;                   // staggered starts
      return ease(Math.max(0, Math.min(1, (progress - start) / 0.34)));
    };
    const gapOpen = pieces.map((_, k) => (k === 0 ? 0 : step(k)));
    stage.style.setProperty('--explode', progress.toFixed(3));
    // Each layer moves only a small distance: the extra gap above it is opened by its own step.
    const currentTops = compact.map((c, i) => {
      let t = c;
      for (let k = 1; k <= i; k += 1) t += ((separated[k] - separated[k - 1]) - (compact[k] - compact[k - 1])) * gapOpen[k];
      return t;
    });
    // The stage keeps the height of the fully opened burger and the stack stays centred in it,
    // so the burger never moves left/right, never grows taller than now and is never cut off.
    const fullHeight = stackHeight(separated, width);
    const offset = (fullHeight - stackHeight(currentTops, width)) / 2;
    if (fullHeight) stage.style.height = fullHeight.toFixed(1) + 'px';
    pieces.forEach((piece, i) => {
      piece.style.top = ((currentTops[i] ?? 0) * width + offset).toFixed(2) + 'px';
      // Label i appears as its layer separates (top bun with the first gap); reverse on the way back.
      const lab = reduceBurgerMotion ? 1 : (i === 0 ? gapOpen[1] : gapOpen[i]);
      piece.style.setProperty('--lab', lab.toFixed(3));
    });
    // Each label sits level with its own ingredient; if two would touch, the lower one is
    // nudged down just enough (measured), so they stay readable on every screen.
    const heights = pieces.map((piece) => labelHeight(piece));
    let prevCentre = -Infinity; let prevHalf = 0; let lowest = 0;
    pieces.forEach((piece, i) => {
      const centre = (currentTops[i] ?? 0) * width + offset + piece.offsetHeight / 2;
      const half = heights[i] / 2;
      const wanted = Math.max(centre, prevCentre + prevHalf + half + 6);
      piece.style.setProperty('--label-dy', (wanted - centre).toFixed(1) + 'px');
      prevCentre = wanted; prevHalf = half;
      lowest = Math.max(lowest, wanted + half);
    });
    const extra = Math.max(0, lowest - stage.offsetHeight);
    stage.style.marginBottom = extra ? `${Math.ceil(extra)}px` : '';
    stage.style.setProperty('--label-opacity', '1');
  }
  const measureCtx = document.createElement('canvas').getContext('2d');
  function labelHeight(piece) {
    const cs = getComputedStyle(piece, '::after');
    const text = (piece.dataset.name || '').trim();
    if (!text || cs.display === 'none') return 0;
    measureCtx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    try { measureCtx.letterSpacing = cs.letterSpacing; } catch (_) {}
    const maxW = parseFloat(cs.width) || 100;
    let lines = 1; let line = '';
    const words = (cs.textTransform === 'uppercase' ? `00\u2003${text}`.toUpperCase() : text).split(/\s+/);
    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (measureCtx.measureText(test).width > maxW && line) { lines += 1; line = word; } else line = test;
    });
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.25;
    return lines * lh;
  }
  const queueBurger = () => { if (!burgerFrame) burgerFrame = requestAnimationFrame(updateBurger); };
  if (!reduceBurgerMotion) window.addEventListener('scroll', queueBurger, {passive:true});
  window.addEventListener('resize', queueBurger);
  window.addEventListener('seven:screenchange', queueBurger);
  window.sevenOnLoad(queueBurger);
  // Layer images can be swapped in the dashboard: re-measure once each one loads.
  pieces.forEach((piece) => piece.querySelector('img')?.addEventListener('load', queueBurger));
  if (window.ResizeObserver) new ResizeObserver(queueBurger).observe(stage);
  updateBurger();
}

// Playlist items come from the dashboard (Playlist section). A YouTube link plays
// inside the page; any other link opens in a new tab.
const PLAYLIST_TONES = [['#202020', '#bdbdbd'], ['#292929', '#8b8b8b'], ['#1f1f1f', '#a3a3a3'], ['#343434', '#b5b5b5'], ['#242424', '#969696'], ['#191919', '#c0c0c0']];
const playlistAlbums = ((window.SEVEN_CONFIG?.get().playlist?.items) || [])
  .filter((item) => item && item.visible !== false)
  .map((item, i) => ({
    title: item.title || '',
    artist: item.artist || '',
    cover: window.SEVEN_CONFIG.safeMedia(item.cover),
    // Only real web links open (http/https); anything else is ignored.
    playlistUrl: /^https?:/i.test(window.SEVEN_CONFIG.safeHref(item.link, '')) ? window.SEVEN_CONFIG.safeHref(item.link, '') : '#',
    embedUrl: window.SEVEN_CONFIG.youtubeEmbed(item.link),
    colors: PLAYLIST_TONES[i % PLAYLIST_TONES.length]
  }));

// Instagram carousel: endless, continuous, swipeable (touch) and draggable (mouse).
// Each card opens its post on Instagram.
const instagramCarousel = document.querySelector('.instagram-feed__carousel');
if (instagramCarousel) {
  const track = instagramCarousel.querySelector('.instagram-feed__track');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Speed (px per second) comes from this screen's settings in screens/screens.js.
  const driftSpeed = () => window.SEVEN_SCREEN?.settings().instagramDrift ?? 28;
  let posts = [];
  let setWidth = 0;      // width of one full set of posts, including gaps
  let position = 0;      // distance travelled; wrapped into one set width when drawn
  let velocity = 0;      // px per frame after a flick, for a natural glide
  let target = null;     // keyboard/focus destination
  let hovering = false;
  let dragging = false;
  let resumeAt = 0;
  let lastTime = performance.now();

  const wrap = (value) => ((value % setWidth) + setWidth) % setWidth;
  // Automatic feed (content/instagram-feed.json) or hand-picked posts (content/media.json),
  // chosen by content/settings.json → instagramFeed.mode.
  const loadPosts = () => (window.SEVEN_CONFIG?.instagramPosts() || []);

  const makeCard = (post, number, total, isCopy) => {
    const card = document.createElement('a');
    card.className = 'instagram-feed__post';
    const postUrl = window.SEVEN_CONFIG.safeHref(post.url, '');
    card.href = /^https?:/i.test(postUrl) ? postUrl : 'https://www.instagram.com/seven.iraq/';
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.draggable = false;
    if (isCopy) { card.tabIndex = -1; card.setAttribute('aria-hidden', 'true'); }
    else card.setAttribute('aria-label', `${post.alt || 'SEVEN Instagram post'} — open on Instagram (${number} of ${total})`);
    const image = document.createElement('img');
    image.src = window.SEVEN_CONFIG.safeMedia(post.image);
    image.loading = 'lazy';
    image.alt = '';
    image.draggable = false;
    image.decoding = 'async';
    card.appendChild(image);
    return card;
  };

  const build = () => {
    posts = loadPosts();
    track.replaceChildren();
    instagramCarousel.hidden = posts.length === 0;
    if (!posts.length) return;
    const firstSet = posts.map((post, i) => makeCard(post, i + 1, posts.length, false));
    firstSet.forEach((card) => track.appendChild(card));
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    setWidth = firstSet.reduce((sum, card) => sum + card.getBoundingClientRect().width + gap, 0);
    if (!setWidth) return; // section hidden right now; it re-measures when shown
    // Enough copies on both sides that the edges are never empty at any width.
    const copies = Math.max(2, Math.ceil(instagramCarousel.clientWidth / setWidth) + 1);
    for (let c = 0; c < copies; c += 1) {
      posts.forEach((post, i) => track.appendChild(makeCard(post, i + 1, posts.length, true)));
      posts.forEach((post, i) => track.insertBefore(makeCard(post, i + 1, posts.length, true), track.firstChild));
    }
    track.dataset.lead = String(copies);
    if (snapMode()) position = nearest(position);
    draw();
  };

  const draw = () => {
    if (!setWidth) return;
    const lead = Number(track.dataset.lead) * setWidth;
    track.style.transform = `translate3d(${-(lead + wrap(position))}px,0,0)`;
  };

  // Phones & tablets: "sticky" carousel — posts snap into place one at a time
  // (2 on screen on phones, 3 on tablets) and it steps to the next post every few seconds.
  const snapMode = () => ['mobile', 'tablet'].includes(window.SEVEN_SCREEN?.type);
  const snapInset = () => parseFloat(getComputedStyle(instagramCarousel).getPropertyValue('--ig-inset')) || 0;
  const nearest = (pos, dir = 0) => {
    const step = cardStep(); const inset = snapInset();
    const k = (pos + inset) / step;
    const idx = dir > 0 ? Math.ceil(k - 0.15) : dir < 0 ? Math.floor(k + 0.15) : Math.round(k);
    return idx * step - inset;
  };
  let nextStepAt = performance.now() + 3500;
  const tick = (now) => {
    const dt = Math.min(64, now - lastTime) / 1000;
    lastTime = now;
    if (!dragging && setWidth && snapMode()) {
      const kbFocus = instagramCarousel.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
      if (target === null && Math.abs(nearest(position) - position) > 0.5) target = nearest(position); // always rest on a post edge
      if (target === null && !reduceMotion.matches && now > nextStepAt && now > resumeAt && !kbFocus) {
        target = nearest(position) + cardStep(); nextStepAt = now + 3500;
      }
      if (target !== null) {
        const diff = target - position;
        position += diff * Math.min(1, dt * 9);
        if (Math.abs(diff) < 0.5) { position = target; target = null; nextStepAt = Math.max(nextStepAt, now + 3500); }
      }
      draw();
      requestAnimationFrame(tick);
      return;
    }
    if (!dragging && setWidth) {
      if (target !== null) {
        const diff = target - position;
        position += diff * Math.min(1, dt * 9);
        if (Math.abs(diff) < 0.5) { position = target; target = null; resumeAt = now + 2500; }
      } else if (Math.abs(velocity) > 0.05) {
        position += velocity;
        velocity *= Math.pow(0.94, dt * 60);
      } else if (!hovering && !reduceMotion.matches && now > resumeAt && !instagramCarousel.contains(document.activeElement)) {
        position += driftSpeed() * dt;
      }
      draw();
    }
    requestAnimationFrame(tick);
  };

  // Pointer drag / swipe. Vertical page scrolling on phones is left untouched.
  let pointerId = null; let startX = 0; let startY = 0; let startPos = 0; let axis = null; let moved = 0;
  let samples = [];
  instagramCarousel.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointerId = event.pointerId; startX = event.clientX; startY = event.clientY; startPos = position;
    axis = null; moved = 0; velocity = 0; target = null; samples = [{ x: event.clientX, t: event.timeStamp }];
  });
  instagramCarousel.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointerId) return;
    const dx = event.clientX - startX; const dy = event.clientY - startY;
    if (!axis && Math.hypot(dx, dy) > 6) {
      axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      if (axis === 'x') { dragging = true; instagramCarousel.classList.add('is-dragging'); instagramCarousel.setPointerCapture(pointerId); }
      else { pointerId = null; return; }
    }
    if (axis !== 'x') return;
    moved = Math.max(moved, Math.abs(dx));
    position = startPos - dx;
    samples.push({ x: event.clientX, t: event.timeStamp });
    if (samples.length > 5) samples.shift();
    draw();
  });
  const release = (event) => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    if (!dragging) return;
    dragging = false;
    instagramCarousel.classList.remove('is-dragging');
    const first = samples[0]; const last = samples[samples.length - 1];
    const span = Math.max(1, last.t - first.t);
    velocity = -((last.x - first.x) / span) * 16; // px per frame
    if (Math.abs(velocity) > 60) velocity = Math.sign(velocity) * 60;
    resumeAt = performance.now() + 2200;
    if (snapMode()) {
      // Settle on the next/previous post in the swipe direction (one post per swipe).
      const dragged = position - startPos;
      const dir = Math.abs(dragged) > 30 || Math.abs(velocity) > 4 ? Math.sign(dragged || velocity) : 0;
      target = dir ? nearest(startPos) + dir * cardStep() : nearest(position);
      velocity = 0; nextStepAt = performance.now() + 5000;
    }
  };
  instagramCarousel.addEventListener('pointerup', release);
  instagramCarousel.addEventListener('pointercancel', release);
  // A drag must never count as a click on the post underneath it.
  instagramCarousel.addEventListener('click', (event) => {
    if (moved > 6) { event.preventDefault(); event.stopPropagation(); moved = 0; }
  }, true);
  instagramCarousel.addEventListener('dragstart', (event) => event.preventDefault());
  instagramCarousel.addEventListener('pointerenter', (event) => { if (event.pointerType === 'mouse') hovering = true; });
  instagramCarousel.addEventListener('pointerleave', () => { hovering = false; });

  // Keyboard: arrow keys step one post; tabbing to a post brings it into view.
  const cardStep = () => setWidth / Math.max(1, posts.length);
  instagramCarousel.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const base = target ?? position;
    target = Math.round(base / cardStep()) * cardStep() + (event.key === 'ArrowRight' ? 1 : -1) * cardStep();
  });
  instagramCarousel.addEventListener('focusin', (event) => {
    const card = event.target.closest('.instagram-feed__post');
    if (!card) return;
    const view = instagramCarousel.getBoundingClientRect(); const box = card.getBoundingClientRect();
    if (box.left < view.left || box.right > view.right) target = position + (box.left - view.left) - (view.width - box.width) / 2;
  });

  let resizeFrame = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      const progress = setWidth ? wrap(position) / setWidth : 0;
      build();
      position = progress * setWidth;
      if (snapMode()) position = nearest(position);
      draw();
    });
  });
  // Changes saved in the dashboard (in another tab) appear here straight away.
  window.addEventListener('storage', (event) => {
    if (!event.key || event.key === window.SEVEN_CONFIG?.storageKey) build();
  });

  build();
  // Images size the cards; rebuild once fonts/images settle so widths are exact.
  window.sevenOnLoad(() => { const p = setWidth ? wrap(position) / setWidth : 0; build(); position = p * setWidth; if (snapMode()) position = nearest(position); draw(); });
  window.addEventListener('seven:screenchange', () => { build(); if (snapMode()) position = nearest(position); draw(); });
  requestAnimationFrame(tick);
}

// Playlist: an endless glass-pill carousel.
// - Drifts slowly on its own; pauses while hovered, touched, dragged or focused.
// - Swipe (phones) or drag (mouse) with momentum, then it snaps so one
//   playlist sits centred ("focused": shown in full colour, others in grey).
// - Tap/click the centred playlist to play it; tap another to bring it to the centre.
// - Copies of the list sit on both sides, so it never reaches an end.
const playlistViewport = document.querySelector('.playlist__viewport');
if (playlistViewport && playlistAlbums.length) {
  const rail = playlistViewport.querySelector('.playlist__rail');
  const titleEl = document.querySelector('.playlist__track-title');
  const artistEl = document.querySelector('.playlist__track-artist');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const count = playlistAlbums.length;
  const driftSpeed = () => window.SEVEN_SCREEN?.settings().playlistDrift ?? 22; // px per second
  const RESUME_AFTER = 2600;   // ms of calm before drifting again
  let step = 0;                // one card + gap
  let cardWidth = 0;
  let setWidth = 0;
  let lead = 0;                // number of copied sets before the real set
  let position = 0;            // where the rail is, measured in "real set" pixels
  let target = null;           // snap destination
  let dragging = false;
  let hovering = false;
  let inView = true;
  let resumeAt = 0;
  let focused = -1;
  let playing = -1;
  let audioPlayer = null;
  let lastTime = performance.now();
  const mod = (n, m) => ((n % m) + m) % m;

  const generatedArt = (album) => {
    const initial = window.SEVEN_CONFIG.esc((album.title || '?').trim().charAt(0).toUpperCase());
    return `<span class="playlist__generated" style="background:radial-gradient(120% 90% at 30% 20%,${album.colors[1]}66,transparent 60%),linear-gradient(170deg,${album.colors[0]},${album.colors[1]})"></span><span class="playlist__monogram">${initial}</span>`;
  };
  const makeCard = (album, i, isCopy) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'playlist__card';
    card.dataset.i = i;
    if (isCopy) { card.tabIndex = -1; card.setAttribute('aria-hidden', 'true'); }
    else card.setAttribute('aria-label', `${album.title} — ${album.artist}`);
    card.innerHTML = `<span class="playlist__art">${album.cover ? `<img src="${window.SEVEN_CONFIG.esc(album.cover)}" alt="" draggable="false" loading="lazy" decoding="async">` : generatedArt(album)}</span><span class="playlist__play" aria-hidden="true"></span>`;
    return card;
  };

  const build = () => {
    rail.replaceChildren();
    const real = playlistAlbums.map((album, i) => makeCard(album, i, false));
    real.forEach((card) => rail.appendChild(card));
    cardWidth = real[0].offsetWidth; // layout width (ignores the focus scale effect)
    const gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
    step = cardWidth + gap;
    setWidth = step * count;
    if (!cardWidth) { step = 0; return; } // hidden right now (another section is open)
    lead = Math.ceil(playlistViewport.clientWidth / 2 / setWidth) + 1;
    for (let c = 0; c < lead; c += 1) {
      playlistAlbums.forEach((album, i) => rail.appendChild(makeCard(album, i, true)));
      for (let i = count - 1; i >= 0; i -= 1) rail.insertBefore(makeCard(playlistAlbums[i], i, true), rail.firstChild);
    }
    railCards = [...rail.children];
    focused = -1;
    draw();
  };

  const updateFocus = () => {
    const index = mod(Math.round(position / step), count);
    if (index === focused) return;
    focused = index;
    rail.querySelectorAll('.playlist__card').forEach((card) => {
      const on = Number(card.dataset.i) === index;
      card.classList.toggle('is-focused', on);
      if (!card.hasAttribute('aria-hidden')) card.setAttribute('aria-current', String(on));
    });
    const album = playlistAlbums[index];
    titleEl.textContent = album.title;
    artistEl.textContent = playing === index ? 'Now playing — tap to stop' : album.artist;
  };
  // Each cover's sharpness follows its distance from the centre every frame, so
  // the clear/focused look slides smoothly from cover to cover while swiping.
  // --f: 0 = centred (sharp, colour, scale 1.08) … 1 = away (blurred, grey, smaller).
  let railCards = [];
  const draw = () => {
    if (!step) return;
    const width = playlistViewport.clientWidth;
    const x = width / 2 - (lead * setWidth + mod(position, setWidth) + cardWidth / 2);
    rail.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
    for (let k = 0; k < railCards.length; k += 1) {
      const center = x + k * step + cardWidth / 2;
      if (center < -step || center > width + step) continue;
      const f = Math.min(1, Math.abs(center - width / 2) / step);
      const value = f.toFixed(3);
      if (railCards[k].dataset.f !== value) { railCards[k].dataset.f = value; railCards[k].style.setProperty('--f', value); }
    }
    updateFocus();
  };
  const snapFrom = (value) => Math.round(value / step) * step;

  const tick = (now) => {
    const dt = Math.min(64, now - lastTime) / 1000;
    lastTime = now;
    if (step && !dragging && inView) {
      if (target !== null) {
        const diff = target - position;
        position += diff * (1 - Math.exp(-dt * 7)); // smooth ease-out glide
        if (Math.abs(diff) < 0.4) { position = target; target = null; resumeAt = now + RESUME_AFTER; }
        draw();
      } else if (!hovering && !reduceMotion.matches && now > resumeAt && !playlistViewport.contains(document.activeElement)) {
        position += driftSpeed() * dt;
        draw();
      }
    }
    requestAnimationFrame(tick);
  };

  const play = (index) => {
    const album = playlistAlbums[index];
    if (playing === index) { // second tap stops it
      if (audioPlayer) audioPlayer.src = 'about:blank';
      playing = -1;
    } else if (album.embedUrl) {
      if (!audioPlayer) {
        audioPlayer = document.createElement('iframe');
        audioPlayer.className = 'playlist__audio';
        audioPlayer.title = 'SEVEN playlist audio';
        audioPlayer.allow = 'autoplay';
        document.body.appendChild(audioPlayer);
      }
      audioPlayer.src = album.embedUrl;
      playing = index;
    } else if (album.playlistUrl && album.playlistUrl !== '#') {
      window.open(album.playlistUrl, '_blank', 'noopener');
    }
    rail.querySelectorAll('.playlist__card').forEach((card) => card.classList.toggle('is-playing', Number(card.dataset.i) === playing));
    focused = -1; updateFocus();
  };

  // Touch / mouse dragging with momentum that lands on a card.
  let pointerId = null; let startX = 0; let startY = 0; let startPos = 0; let axis = null; let moved = 0; let samples = [];
  playlistViewport.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointerId = event.pointerId; startX = event.clientX; startY = event.clientY; startPos = target ?? position;
    position = startPos; target = null; axis = null; moved = 0; samples = [{ x: event.clientX, t: event.timeStamp }];
    resumeAt = performance.now() + 60000; // hold still while a finger is down
  });
  playlistViewport.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointerId) return;
    const dx = event.clientX - startX; const dy = event.clientY - startY;
    if (!axis && Math.hypot(dx, dy) > 6) {
      axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      if (axis === 'x') { dragging = true; playlistViewport.classList.add('is-dragging'); playlistViewport.setPointerCapture(pointerId); }
      else { pointerId = null; resumeAt = performance.now() + RESUME_AFTER; return; }
    }
    if (axis !== 'x') return;
    moved = Math.max(moved, Math.abs(dx));
    position = startPos - dx;
    samples.push({ x: event.clientX, t: event.timeStamp });
    if (samples.length > 6) samples.shift();
    draw();
  });
  const release = (event) => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    if (!dragging) { resumeAt = performance.now() + RESUME_AFTER; return; }
    dragging = false;
    playlistViewport.classList.remove('is-dragging');
    const first = samples[0]; const last = samples[samples.length - 1];
    const speed = (last.x - first.x) / Math.max(1, last.t - first.t); // px per ms
    const glide = Math.max(-step * 4, Math.min(step * 4, -speed * 260)); // momentum distance
    target = snapFrom(position + glide);
  };
  playlistViewport.addEventListener('pointerup', release);
  playlistViewport.addEventListener('pointercancel', release);
  playlistViewport.addEventListener('dragstart', (event) => event.preventDefault());
  playlistViewport.addEventListener('pointerenter', (event) => { if (event.pointerType === 'mouse') hovering = true; });
  playlistViewport.addEventListener('pointerleave', () => { hovering = false; resumeAt = Math.max(resumeAt, performance.now() + 900); });

  // Taps: centred card plays; any other card slides to the centre.
  playlistViewport.addEventListener('click', (event) => {
    if (moved > 6) { moved = 0; return; }
    const card = event.target.closest('.playlist__card');
    if (!card) return;
    const index = Number(card.dataset.i);
    const box = card.getBoundingClientRect(); const view = playlistViewport.getBoundingClientRect();
    const offset = box.left + box.width / 2 - (view.left + view.width / 2);
    if (Math.abs(offset) < step / 2 && index === focused) play(index);
    else target = snapFrom((target ?? position) + offset);
  });
  playlistViewport.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      target = snapFrom(target ?? position) + (event.key === 'ArrowRight' ? step : -step);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      play(focused);
    }
  });
  playlistViewport.addEventListener('focusin', () => { if (target === null) target = snapFrom(position); });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; lastTime = performance.now(); }).observe(playlistViewport);
  }
  let resizeFrame = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      const index = step ? Math.round(position / step) : 0;
      const oldStep = step;
      build();
      if (oldStep && step) { position = index * step + ((position - index * oldStep) / oldStep) * step; target = null; draw(); }
    });
  });

  build();
  requestAnimationFrame(tick);
}

// Cinematic scroll: the section at the centre of the screen is the "active" one:
// full size, fully bright and sharp. Sections above/below step back — slightly
// smaller, dimmer, softly blurred and drifting away from the centre — and come
// forward again as you scroll to them. Content, links and carousels are untouched;
// only transform/opacity/filter change, so page layout and scrolling stay normal.
(() => {
  // The marquee/photo band (#gallery) and the footer are never blurred, dimmed or shrunk.
  const scenes = [...document.querySelectorAll('.page-shell > section:not(#gallery)')];
  if (!scenes.length) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const look = () => window.SEVEN_SCREEN?.settings().cinematic || { enabled: true, scale: 0.03, opacity: 0.22, blur: 4 };
  document.body.classList.add('has-cinematic-scroll');
  const last = new Map();
  let frame = 0;

  const update = () => {
    frame = 0;
    const vh = window.innerHeight;
    const header = document.getElementById('header')?.getBoundingClientRect().height || 0;
    const centre = header + (vh - header) / 2;           // centre of the visible area under the header
    const reach = (vh - header) * 0.55;                  // distance over which a section steps back
    const focusMode = document.body.classList.contains('is-focus-mode');
    const fx = look();
    const maxBlur = fx.blur;
    scenes.forEach((scene) => {
      const r = scene.getBoundingClientRect();
      // Skip sections well off screen (nobody can see them) — saves work while scrolling.
      if (r.bottom < -vh * 0.5 || r.top > vh * 1.5) {
        if (last.get(scene) !== 'far') { last.set(scene, 'far'); applyFar(scene); }
        return;
      }
      // 0 when the screen centre is inside the section; grows as it moves away.
      const gap = centre < r.top ? r.top - centre : centre > r.bottom ? centre - r.bottom : 0;
      let t = Math.min(2, gap / reach);                  // 0 … 1 nearby … 2 far
      if (focusMode && scene.classList.contains('is-focused')) t = 0;
      const direction = centre < r.top ? 1 : -1;         // below the centre drifts down, above drifts up
      const n = Math.min(1, t);
      if (!fx.enabled) t = 0;
      const scale = 1 - fx.scale * t;                    // 1 → .97 nearby → .94 far
      let opacity = 1 - fx.opacity * t;                  // 1 → .78 → .56
      const blur = Math.min(maxBlur, maxBlur * 0.55 * t); // 0 → ~2px → 4px
      const shift = direction * 14 * n;
      if (focusMode && !scene.classList.contains('is-focused')) opacity = 0.06;
      const key = `${scale.toFixed(3)}|${opacity.toFixed(3)}|${blur.toFixed(2)}|${shift.toFixed(1)}`;
      if (last.get(scene) === key) return;
      last.set(scene, key);
      if (reduceMotion.matches) {
        scene.style.transform = ''; scene.style.filter = '';
        scene.style.opacity = String(Math.max(focusMode ? 0.06 : 0.6, opacity));
        return;
      }
      scene.style.transform = t ? `translate3d(0, ${shift.toFixed(1)}px, 0) scale(${scale.toFixed(4)})` : '';
      scene.style.opacity = opacity < 0.999 ? opacity.toFixed(3) : '';
      scene.style.filter = blur > 0.2 ? `blur(${blur.toFixed(2)}px)` : '';
      scene.style.borderRadius = t ? `${Math.round(22 * n)}px` : '';
      scene.classList.toggle('is-scene-active', t === 0);
    });
  };
  const applyFar = (scene) => {
    scene.classList.remove('is-scene-active');
    if (reduceMotion.matches) { scene.style.opacity = '0.6'; return; }
    const fx = look();
    if (!fx.enabled) { scene.style.transform = ''; scene.style.opacity = ''; scene.style.filter = ''; scene.style.borderRadius = ''; return; }
    scene.style.transform = `scale(${1 - fx.scale * 2})`; scene.style.opacity = String(1 - fx.opacity * 2);
    scene.style.filter = `blur(${fx.blur}px)`; scene.style.borderRadius = '22px';
  };
  const request = () => { if (!frame) frame = requestAnimationFrame(update); };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  reduceMotion.addEventListener?.('change', () => { last.clear(); request(); });
  // Menu focus mode toggles a body class; re-evaluate when it changes.
  new MutationObserver(request).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  window.sevenOnLoad(request);
  update();
})();

// Our Story photo strip (laptop & desktop): photos sit side by side in one endless
// horizontal band beside the story text. Drifts slowly; drag / swipe / arrow keys to move.
(() => {
  const strip = document.querySelector('.story-strip');
  if (!strip) return;
  const track = strip.querySelector('.story-strip__track');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const photos = ((window.SEVEN_CONFIG?.get().story?.photos) || []).filter((p) => p && p.visible !== false && window.SEVEN_CONFIG.safeMedia(p.image));
  if (!photos.length) { strip.hidden = true; return; }
  let setWidth = 0; let lead = 0; let position = 0; let velocity = 0; let target = null;
  let hovering = false; let dragging = false; let resumeAt = 0; let last = performance.now();
  const wrap = (v) => ((v % setWidth) + setWidth) % setWidth;
  const card = (p, copy) => {
    const fig = document.createElement('figure');
    fig.className = `story-strip__photo story-strip__photo--${p.fit === 'contain' ? 'contain' : 'cover'}`;
    if (copy) fig.setAttribute('aria-hidden', 'true');
    const img = document.createElement('img');
    img.src = window.SEVEN_CONFIG.safeMedia(p.image); img.loading = 'lazy'; img.alt = copy ? '' : (p.alt || ''); img.draggable = false; img.decoding = 'async';
    fig.appendChild(img);
    return fig;
  };
  const build = () => {
    track.replaceChildren();
    const first = photos.map((p) => card(p, false));
    first.forEach((f) => track.appendChild(f));
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    setWidth = first.reduce((sum, f) => sum + f.offsetWidth + gap, 0);
    if (!setWidth) return; // hidden on this screen type
    lead = Math.ceil(strip.clientWidth / setWidth) + 1;
    for (let c = 0; c < lead; c += 1) {
      photos.forEach((p) => track.appendChild(card(p, true)));
      photos.forEach((p) => track.insertBefore(card(p, true), track.firstChild));
    }
    draw();
  };
  const draw = () => { if (setWidth) track.style.transform = `translate3d(${-(lead * setWidth + wrap(position))}px,0,0)`; };
  const speed = () => (window.SEVEN_SCREEN?.settings().storyDrift ?? 24);
  const tick = (now) => {
    const dt = Math.min(64, now - last) / 1000; last = now;
    if (setWidth && !dragging) {
      if (target !== null) {
        position += (target - position) * (1 - Math.exp(-dt * 7));
        if (Math.abs(target - position) < 0.5) { position = target; target = null; resumeAt = now + 2500; }
      } else if (Math.abs(velocity) > 0.05) {
        position += velocity; velocity *= Math.pow(0.94, dt * 60);
      } else if (!hovering && !reduceMotion.matches && now > resumeAt) {
        position += speed() * dt;
      }
      draw();
    }
    requestAnimationFrame(tick);
  };
  let pid = null; let sx = 0; let sy = 0; let sp = 0; let axis = null; let samples = [];
  strip.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pid = e.pointerId; sx = e.clientX; sy = e.clientY; sp = position; axis = null; velocity = 0; target = null;
    samples = [{ x: e.clientX, t: e.timeStamp }];
  });
  strip.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pid) return;
    const dx = e.clientX - sx; const dy = e.clientY - sy;
    if (!axis && Math.hypot(dx, dy) > 6) {
      axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      if (axis === 'x') { dragging = true; strip.classList.add('is-dragging'); strip.setPointerCapture(pid); } else { pid = null; return; }
    }
    if (axis !== 'x') return;
    position = sp - dx; samples.push({ x: e.clientX, t: e.timeStamp }); if (samples.length > 5) samples.shift(); draw();
  });
  const release = (e) => {
    if (e.pointerId !== pid) return; pid = null;
    if (!dragging) return; dragging = false; strip.classList.remove('is-dragging');
    const a = samples[0]; const b = samples[samples.length - 1];
    velocity = Math.max(-60, Math.min(60, -((b.x - a.x) / Math.max(1, b.t - a.t)) * 16));
    resumeAt = performance.now() + 2200;
  };
  strip.addEventListener('pointerup', release);
  strip.addEventListener('pointercancel', release);
  strip.addEventListener('dragstart', (e) => e.preventDefault());
  strip.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hovering = true; });
  strip.addEventListener('pointerleave', () => { hovering = false; });
  strip.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const step = setWidth / photos.length;
    target = (target ?? position) + (e.key === 'ArrowRight' ? step : -step);
  });
  let frame = 0;
  window.addEventListener('resize', () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { const p = setWidth ? wrap(position) / setWidth : 0; build(); position = p * setWidth; draw(); }); });
  window.sevenOnLoad(build);
  build();
  requestAnimationFrame(tick);
})();

// Header: always visible. At the very top it floats on the hero video with no
// background; after ~48px of scrolling the frosted-glass layer fades in behind the
// same content, and back at the top only that layer fades out again.
// Readability: while there's no glass, the header samples the hero video right
// behind it and uses white content on dark frames, dark content on light frames.
(() => {
  const header = document.getElementById('header');
  if (!header) return;
  const hero = document.querySelector('.page-shell > .hero');
  const video = hero?.querySelector('video');
  const poster = hero?.querySelector('.hero__poster');
  const SHOW_AFTER = 48; // px scrolled before the glass appears
  const HIDE_AT = 2;     // px from the top at which it disappears again
  const DARK_SECTIONS = '.hero, .brand-showcase .gallery, .our-story, .site-footer';

  let scrolled = null;
  let heroIsDark = true; // the Seven hero footage is mostly dark; refined by sampling
  let frame = 0;

  // Is a dark section (or the dark hero) directly behind the header bar?
  const overDark = () => {
    const line = header.getBoundingClientRect().height / 2;
    return [...document.querySelectorAll(DARK_SECTIONS)].some((el) => {
      if (el.hidden) return false;
      const r = el.getBoundingClientRect();
      if (!(r.top <= line && r.bottom >= line && r.width > 0)) return false;
      return el === hero ? heroIsDark : true;
    });
  };

  const update = () => {
    frame = 0;
    const y = window.scrollY;
    let next = scrolled;
    if (!hero) next = y > HIDE_AT;      // pages without a hero: glass as soon as you scroll
    else {
      // The glass header appears once you've scrolled about halfway through the hero
      // (before that the header stays clear over the video with a white logo).
      const r = hero.getBoundingClientRect();
      next = -r.top >= r.height * 0.45;
    }
    if (next !== scrolled) { scrolled = next; header.classList.toggle('is-scrolled', scrolled); }
    // White content only while floating (no glass) over something dark — never over the open (white) menu.
    const menuOpen = document.body.classList.contains('menu-open');
    header.classList.toggle('is-light', !menuOpen && !scrolled && overDark());
    // Floating over the hero video (no glass yet): the three dots are always white.
    header.classList.toggle('is-over-hero', !!hero && !menuOpen && !scrolled);
  };
  const request = () => { if (!frame) frame = requestAnimationFrame(update); };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  window.addEventListener('pageshow', request);
  new MutationObserver(request).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  update();

  // Sample the strip of the hero picture that sits behind the header (object-fit: cover aware).
  if (!hero) return;
  const canvas = document.createElement('canvas');
  canvas.width = 48; canvas.height = 6;
  let ctx = null;
  try { ctx = canvas.getContext('2d', { willReadFrequently: true }); } catch (_) {}
  const sample = (source, sw, sh) => {
    if (!ctx || !sw || !sh) return;
    const box = hero.getBoundingClientRect();
    const bar = header.getBoundingClientRect().height;
    if (!box.width || !box.height) return;
    const scale = Math.max(box.width / sw, box.height / sh);       // cover
    const visW = box.width / scale, visH = box.height / scale;
    const sx = (sw - visW) / 2, sy = (sh - visH) / 2;
    const stripH = Math.min(visH, (bar / box.height) * visH);
    try {
      ctx.drawImage(source, sx, sy, visW, stripH, 0, 0, canvas.width, canvas.height);
      const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      const lum = sum / (d.length / 4) / 255;
      // Hysteresis so the colour doesn't flicker on mid-tone frames.
      // Over the hero video the logo, links and dots always stay white (no colour change with the footage).
      const dark = true;
      if (dark !== heroIsDark) { heroIsDark = dark; request(); }
    } catch (_) {
      // Canvas blocked (e.g. the page opened straight from disk): keep white over the hero.
      ctx = null;
    }
  };
  const tick = () => {
    if (!ctx) return;
    if (!scrolled && !document.hidden) {
      if (video && hero.classList.contains('is-video-playing') && video.readyState >= 2) sample(video, video.videoWidth, video.videoHeight);
      else if (poster?.complete) sample(poster, poster.naturalWidth, poster.naturalHeight);
    }
    window.setTimeout(tick, 400);
  };
  tick();
})();

// Note the moment a page of the site is left (link to another page, back button…). The loading
// intro on the home page uses it to skip itself when you come back from inside the site.
// A refresh still shows the intro (intro.js checks for that first).
window.addEventListener('pagehide', () => { try { localStorage.setItem('seven-left-at', String(Date.now())); } catch (e) {} });
