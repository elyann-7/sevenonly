/* ==========================================================================
   SEVEN — screen types
   --------------------------------------------------------------------------
   Every visitor gets exactly ONE design, picked by their screen:

     mobile   phones                         narrower than 768px
     tablet   tablets (portrait & landscape) 768–1023px, or touch screens up to 1366px
     laptop   laptops                        1024–1439px
     desktop  desktop monitors               1440–1919px
     large    large desktop monitors         1920px and wider

   Laptop, desktop and large share the wide design (screens/wide.css); every
   type also has its own stylesheet (screens/<type>.css) and its own
   interaction settings below. Only the matching stylesheet is switched on,
   so designs never leak into each other. Content (text, images, links,
   products, sections…) always comes from the dashboard and is shared.
   ========================================================================== */
(() => {
  const TYPES = ['mobile', 'tablet', 'laptop', 'desktop', 'large'];

  /* Per-screen interaction settings (motion, speeds, effects).
     Filled in from each screen's design reference. */
  const SETTINGS = {
    mobile:  { cinematic: { enabled: false, scale: 0.03, opacity: 0.22, blur: 2.5 }, instagramDrift: 28, playlistDrift: 22, storyDrift: 24 },
    tablet:  { cinematic: { enabled: false, scale: 0.03, opacity: 0.22, blur: 4 },   instagramDrift: 28, playlistDrift: 22, storyDrift: 24 },
    laptop:  { cinematic: { enabled: false, scale: 0.03, opacity: 0.22, blur: 4 },   instagramDrift: 28, playlistDrift: 22, storyDrift: 24 },
    desktop: { cinematic: { enabled: false, scale: 0.03, opacity: 0.22, blur: 4 },   instagramDrift: 28, playlistDrift: 22, storyDrift: 24 },
    large:   { cinematic: { enabled: false, scale: 0.03, opacity: 0.22, blur: 4 },   instagramDrift: 28, playlistDrift: 22, storyDrift: 24 }
  };

  const touchOnly = window.matchMedia('(hover: none) and (pointer: coarse)');
  const detect = () => {
    // ?screen=tablet forces a design (used by the preview page).
    const forced = new URLSearchParams(location.search).get('screen');
    if (TYPES.includes(forced)) return forced;
    const w = window.innerWidth;
    if (w < 768) return 'mobile';
    if (w < 1024 || (touchOnly.matches && w <= 1366)) return 'tablet';
    if (w < 1440) return 'laptop';
    if (w < 1920) return 'desktop';
    return 'large';
  };

  let current = null;
  const apply = () => {
    const type = detect();
    if (type === current) return;
    const previous = current;
    current = type;
    document.documentElement.dataset.screen = type;
    // Switch on only this screen's stylesheet.
    document.querySelectorAll('link[data-screen-css]').forEach((link) => {
      link.media = link.dataset.screenCss.split(' ').includes(type) ? 'all' : 'not all';
    });
    if (previous) window.dispatchEvent(new CustomEvent('seven:screenchange', { detail: { type, previous } }));
  };

  window.SEVEN_SCREEN = {
    TYPES,
    get type() { return current; },
    settings: () => SETTINGS[current] || SETTINGS.laptop
  };
  apply();
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
  touchOnly.addEventListener?.('change', apply);
})();
