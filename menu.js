/* SEVEN — menu page reveal (menu.html only).
   Headings and cards fade up as they scroll into view; inside each card the
   food slides up into its frame. Links like menu.html#sauces open on that category. */
(() => {
  const wrap = document.querySelector('.menu-sections');
  if (!wrap) return;
  let observer = null;
  const init = () => {
    observer?.disconnect();
    const targets = [...wrap.querySelectorAll('[data-reveal]')];
    if (!('IntersectionObserver' in window)) { targets.forEach((el) => el.classList.add('is-in')); return; }
    observer = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); observer.unobserve(en.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach((el) => observer.observe(el));
  };
  init();
  document.addEventListener('seven:menu-rendered', init);
  window.sevenOnLoad(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    const target = id && document.getElementById(id);
    if (target && target.classList.contains('menu-cat')) target.scrollIntoView();
  });
  // Changes saved in the dashboard (another tab) show up straight away.
  window.addEventListener('storage', (e) => {
    if (e.key === window.SEVEN_CONFIG?.storageKey) window.SEVEN_CONFIG.apply();
  });
})();
