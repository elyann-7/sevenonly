/* ==========================================================================
   SEVEN — website content & page builder (GitHub Pages edition)
   --------------------------------------------------------------------------
   NOTHING TO EDIT IN THIS FILE. All text, photos, links, menu items and
   settings live in the JSON files of the /content folder:

     content/site.json      header menu, contact details, location, footer
     content/pages.json     every homepage section (hero, story, franchise…)
     content/menu.json      menu categories and products (prices, photos…)
     content/socials.json   Instagram, WhatsApp, Facebook, TikTok… links
     content/media.json     photo slider + hand-picked Instagram posts
     content/settings.json  section order, effects, Instagram feed mode
     content/instagram-feed.json  written automatically by GitHub Actions

   Edit them on github.com (pencil icon) or with the admin page (admin.html).
   After a commit, GitHub publishes the site again (about one minute).

   How a page loads: this script fetches the JSON files, builds the page,
   then loads the page's other scripts (listed in data-then on its tag).
   Preview: pages opened with ?preview=1 from the admin show unsaved changes
   (kept in your browser only).
   ========================================================================== */

/* Run fn once the page has fully loaded — also when that already happened
   (the page scripts are loaded after the content, so 'load' may be past). */
window.sevenOnLoad = (fn) => {
  if (document.readyState === 'complete') setTimeout(fn, 0);
  else window.addEventListener('load', fn, { once: true });
};

(() => {
  // Unsaved admin changes, shown only on pages opened with ?preview=1.
  const PREVIEW_KEY = 'seven-preview-content';

  /* Which part of the content lives in which file. The admin uses the same map
     to save each part back to its own file. */
  const FILES = {
    'content/site.json': ['header', 'contact', 'location', 'footer'],
    'content/pages.json': ['hero', 'marquee', 'story', 'menuTeaser', 'bestSellers', 'partners', 'franchise', 'playlist', 'instagram'],
    'content/menu.json': ['products'],
    'content/socials.json': ['handle', 'handleLink', 'links'],
    'content/media.json': ['gallery', 'instagramPosts'],
    'content/settings.json': ['sections', 'design', 'instagramFeed', 'github']
  };
  // socials.json is kept under one key ("socials") inside the page content.
  const NESTED = { 'content/socials.json': 'socials' };
  const FEED_FILE = 'content/instagram-feed.json';

  /* Empty shape of the content, so a missing or broken file never stops the page. */
  const SKELETON = {
    sections: [], design: {}, instagramFeed: { mode: 'auto', maxPosts: 12 }, github: {},
    header: { logo: '', nav: [], desktopNav: [] },
    hero: {}, marquee: [], gallery: { slides: [] }, story: { paragraphs: [], photos: [] },
    menuTeaser: { layers: [] }, bestSellers: {}, partners: { logos: [] }, franchise: {},
    location: {}, playlist: { items: [] }, instagram: {}, instagramPosts: [],
    contact: {}, socials: { links: [] }, footer: { links: [], legal: [] },
    products: { categories: [], items: [] }, instagramFeedData: { posts: [] }
  };

  /* ---------------- loading & saving ---------------- */
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  // Objects merge key by key; lists are replaced whole.
  const merge = (base, over) => {
    if (!isObj(base) || !isObj(over)) return over === undefined ? clone(base) : clone(over);
    const out = clone(base);
    Object.keys(over).forEach((k) => { out[k] = isObj(base[k]) && isObj(over[k]) ? merge(base[k], over[k]) : clone(over[k]); });
    return out;
  };
  const stripHelp = (o) => { const c = { ...o }; delete c._help; return c; };

  /* Split one content object into { file: data } (used by the admin to save). */
  const splitContent = (content) => {
    const out = {};
    Object.entries(FILES).forEach(([file, keys]) => {
      const src = NESTED[file] ? (content[NESTED[file]] || {}) : content;
      out[file] = {};
      keys.forEach((k) => { if (src[k] !== undefined) out[file][k] = clone(src[k]); });
    });
    return out;
  };
  /* Join { file: data } back into one content object. */
  // Adds missing keys from the skeleton without changing the order of the file's own keys.
  const fill = (data, skel) => {
    if (!isObj(data) || !isObj(skel)) return data === undefined ? clone(skel) : data;
    const out = { ...data };
    Object.keys(skel).forEach((k) => { out[k] = k in data ? fill(data[k], skel[k]) : clone(skel[k]); });
    return out;
  };
  const joinContent = (files) => {
    let c = {};
    Object.keys(FILES).forEach((file) => {
      const data = files[file];
      if (!isObj(data)) return;
      c = NESTED[file] ? merge(c, { [NESTED[file]]: stripHelp(data) }) : merge(c, stripHelp(data));
    });
    if (isObj(files[FEED_FILE])) c.instagramFeedData = stripHelp(files[FEED_FILE]);
    return fill(c, SKELETON);
  };

  const isPreview = () => {
    try { return new URLSearchParams(window.location.search).get('preview') === '1'; } catch { return false; }
  };
  const readPreview = () => {
    if (!isPreview()) return null;
    try { const raw = localStorage.getItem(PREVIEW_KEY); const v = raw ? JSON.parse(raw) : null; return isObj(v) ? v : null; } catch { return null; }
  };
  const getPublished = () => (isObj(window.SEVEN_PUBLISHED_CONTENT) ? window.SEVEN_PUBLISHED_CONTENT : clone(SKELETON));
  // The published content (what visitors see). get() adds unsaved preview changes.
  const getPublishedContent = () => clone(getPublished());
  const get = () => {
    const preview = readPreview();
    if (preview) delete preview.instagramFeedData;   // the live feed is never replaced by the editor's copy
    return preview ? merge(getPublished(), preview) : getPublished();
  };
  // The admin keeps a copy of unsaved changes here so ?preview=1 pages can show them.
  const save = (content) => { try { localStorage.setItem(PREVIEW_KEY, JSON.stringify(content)); return true; } catch { return false; } };
  const reset = () => { try { localStorage.removeItem(PREVIEW_KEY); } catch { /* storage blocked */ } };
  const hasDraft = () => !!readPreview();

  /* Fetch every content file (in parallel). Files that fail are reported in the
     console and skipped, so one mistake never blanks the whole site. */
  const loadContent = async (base = '') => {
    const names = [...Object.keys(FILES), FEED_FILE];
    const bundle = (window.SEVEN_CONTENT_BUNDLE && typeof window.SEVEN_CONTENT_BUNDLE === 'object') ? window.SEVEN_CONTENT_BUNDLE : {};
    // Opened straight from a folder (file://): browsers block reading .json files,
    // so the copy in content/content-bundle.js is used instead.
    if (location.protocol === 'file:' && Object.keys(bundle).length) {
      console.info('SEVEN: opened from a folder — using content/content-bundle.js. Run "node tools/build-bundle.mjs" after editing JSON files locally.');
      return joinContent(bundle);
    }
    const results = await Promise.all(names.map(async (file) => {
      try {
        const res = await fetch(base + file, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return [file, await res.json()];
      } catch (err) {
        if (isObj(bundle[file])) return [file, bundle[file]];   // offline / blocked: use the bundled copy
        if (file !== FEED_FILE) console.error(`SEVEN: could not read ${file} — ${err.message}. Check the file on GitHub (a missing comma or quote is the usual cause).`);
        return [file, null];
      }
    }));
    window.SEVEN_CONTENT_ERRORS = results.filter(([f, v]) => v === null && f !== FEED_FILE).map(([f]) => f);
    return joinContent(Object.fromEntries(results));
  };

  /* ---------------- safe links & media ----------------
     Every link or file address that comes from the editor/content passes through
     these, so a value such as "javascript:…" can never run code on the site.
     Links: page/section links (menu.html, #contact, /path), http(s), mailto:, tel:.
     Media: site files (assets/…), http(s), and images uploaded in the editor
     (data:image/… or blob:). Anything else becomes "#" (links) or "" (media). */
  const SCHEME = /^([a-z][a-z0-9+.-]*):/i;
  const clean = (v) => String(v ?? '').trim();
  // Browsers ignore tabs/new lines/control characters inside a scheme ("java\tscript:"), so check without them.
  const schemeOf = (v) => { const m = v.replace(/[\u0000-\u0020\u007f-\u009f]+/g, '').match(SCHEME); return m ? m[1].toLowerCase() : ''; };
  const safeHref = (value, fallback = '#') => {
    const v = clean(value);
    if (!v) return fallback;
    const scheme = schemeOf(v);
    if (!scheme) return v.startsWith('\\') ? fallback : v;      // relative link (menu.html, #id, /path, ?q)
    return ['http', 'https', 'mailto', 'tel'].includes(scheme) ? v : fallback;
  };
  const safeMedia = (value, { images = true } = {}) => {
    const v = clean(value);
    if (!v) return '';
    const scheme = schemeOf(v);
    if (!scheme) return v.startsWith('\\') ? '' : v;
    if (scheme === 'http' || scheme === 'https' || scheme === 'blob') return v;
    if (images && scheme === 'data' && /^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml)[;,]/i.test(v)) return v;
    return '';
  };

  /* ---------------- helpers ---------------- */
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lines = (v, brClass = '') => esc(v).replace(/\n/g, brClass ? `<br class="${brClass}"> ` : '<br>');
  const shown = (list) => (Array.isArray(list) ? list.filter((x) => x && x.visible !== false) : []);
  const isExternal = (href) => /^https?:\/\//i.test(clean(href));
  const linkAttrs = (href) => { const safe = safeHref(href); return `href="${esc(safe)}"${isExternal(safe) ? ' target="_blank" rel="noopener noreferrer"' : ''}`; };
  const onHome = () => !!document.querySelector('.page-shell');
  // On other pages, "#section" links point back to the homepage.
  const pageLink = (href) => (!onHome() && /^#/.test(href || '') ? `index.html${href}` : href);
  const $ = (sel) => document.querySelector(sel);
  const setText = (el, value, brClass) => { if (el) el.innerHTML = lines(value, brClass); };
  const mapsEmbed = (loc) => `https://maps.google.com/maps?q=${encodeURIComponent(loc.place || '')}&z=${Number(loc.zoom) || 16}&output=embed`;
  const mapsDirections = (loc) => (/^https?:/i.test(safeHref(loc.mapsLink, '')) ? clean(loc.mapsLink) : null) || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(loc.place || '')}`;
  const youtubeEmbed = (link) => {
    const m = String(link || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
    return m ? `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&playsinline=1&rel=0&controls=0` : '';
  };
  const SOCIAL_ICONS = {
    instagram: 'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5Zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5ZM17.5 6a1.1 1.1 0 1 1-1.1 1.1A1.1 1.1 0 0 1 17.5 6Z',
    facebook: 'M13.5 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.7V3.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1V10H8v3h2.4v8h3.1Z',
    tiktok: 'M16.7 3c.3 2.1 1.5 3.4 3.3 3.5v3.1c-1.2 0-2.3-.4-3.3-1.1v6.6c0 4.6-5 6-7.9 3.3-2.9-2.8-1.8-7.9 2.1-8.8v3.2c-1 .6-1.2 1.8-.7 2.6.8 1.3 3.3.9 3.3-1.3V3h3.2Z',
    youtube: 'M21.6 7.2a3 3 0 0 0-2.1-2.1C17.7 4.6 12 4.6 12 4.6s-5.7 0-7.5.5A3 3 0 0 0 2.4 7.2 31 31 0 0 0 2 12a31 31 0 0 0 .4 4.8 3 3 0 0 0 2.1 2.1c1.8.5 7.5.5 7.5.5s5.7 0 7.5-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 22 12a31 31 0 0 0-.4-4.8ZM10 15.5v-7l6 3.5-6 3.5Z',
    snapchat: 'M12 2.5c3 0 5.2 2.3 5.2 5.3v2.3c.5.3 1.2.2 1.7 0 .6-.2 1.1.5.7 1-.5.6-1.6.9-2.2 1.1.4 1.6 1.9 3 3.5 3.5.5.2.4.9-.1 1.1-.9.3-1.6.4-2 .6-.2.4-.1 1.1-.7 1.1-.8 0-1.6-.4-2.7 0-1 .4-1.8 1.5-3.4 1.5s-2.4-1.1-3.4-1.5c-1.1-.4-1.9 0-2.7 0-.6 0-.5-.7-.7-1.1-.4-.2-1.1-.3-2-.6-.5-.2-.6-.9-.1-1.1 1.6-.5 3.1-1.9 3.5-3.5-.6-.2-1.7-.5-2.2-1.1-.4-.5.1-1.2.7-1 .5.2 1.2.3 1.7 0V7.8c0-3 2.2-5.3 5.2-5.3Z',
    whatsapp: 'M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 2a8 8 0 1 1-4.1 14.9l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 0 1 12 4Zm-3.3 3.8c-.2 0-.5 0-.7.3-.3.3-1 .9-1 2.3s1 2.7 1.2 2.9c.1.2 2 3.1 4.9 4.3 2.4 1 2.9.8 3.4.7.5 0 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4l-.4-.3-2-1c-.3-.1-.5-.1-.7.1l-.9 1.1c-.2.2-.3.2-.6.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6Z',
    x: 'M17.8 3h3.1l-6.8 7.8 8 10.2h-6.3l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.9 3h6.4l4.4 5.9L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z',
    link: 'M10.6 13.4a4 4 0 0 1 0-5.7l3-3a4 4 0 0 1 5.7 5.7l-1.5 1.5-1.4-1.4 1.5-1.5a2 2 0 0 0-2.9-2.9l-3 3a2 2 0 0 0 0 2.9l-1.4 1.4Zm2.8-2.8a4 4 0 0 1 0 5.7l-3 3a4 4 0 0 1-5.7-5.7l1.5-1.5 1.4 1.4-1.5 1.5a2 2 0 0 0 2.9 2.9l3-3a2 2 0 0 0 0-2.9l1.4-1.4Z'
  };
  const SOCIAL_NAMES = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', youtube: 'YouTube', snapchat: 'Snapchat', whatsapp: 'WhatsApp', x: 'X', link: 'Website' };


  /* Social links from content/socials.json. WhatsApp also accepts just a phone
     number (it becomes a wa.me chat link). Empty or "#" links are skipped. */
  const socialLinks = (c) => shown(c.socials && c.socials.links).map((s) => {
    let href = clean(s.link);
    if (s.platform === 'whatsapp' && href && !schemeOf(href) && /^[+\d\s()-]+$/.test(href)) href = `https://wa.me/${href.replace(/\D/g, '')}`;
    return { ...s, href: href && href !== '#' ? safeHref(href, '') : '' };
  });

  /* Instagram posts for the homepage carousel.
     settings.json → instagramFeed.mode: "auto" uses the automatic feed
     (content/instagram-feed.json, filled by GitHub Actions) when it has posts,
     otherwise the hand-picked posts in content/media.json; "manual" always uses
     the hand-picked posts. */
  const instagramPosts = (c = get()) => {
    const mode = (c.instagramFeed && c.instagramFeed.mode) || 'auto';
    const max = Math.max(1, Number(c.instagramFeed && c.instagramFeed.maxPosts) || 12);
    const feed = (c.instagramFeedData && Array.isArray(c.instagramFeedData.posts)) ? c.instagramFeedData.posts : [];
    const list = mode === 'auto' && feed.length ? feed : (c.instagramPosts || []);
    return list.filter((p) => p && p.visible !== false && safeMedia(p.image)).slice(0, max);
  };

  /* ---------------- page builder ---------------- */
  const renderNav = (c) => {
    const list = $('#menu ul');
    if (!list) return;
    const here = location.pathname.split('/').pop() || 'index.html';
    list.innerHTML = shown(c.header.nav).map((item) => {
      const href = pageLink(item.link);
      const current = !onHome() && href === here ? ' aria-current="true"' : '';
      return `<li><a ${linkAttrs(href)}${current}>${esc(item.label)}</a></li>`;
    }).join('');
    const logo = $('#logo');
    if (logo && safeMedia(c.header.logo)) logo.src = safeMedia(c.header.logo);
    const inline = $('.header-nav ul');
    if (inline) {
      const items = shown(c.header.desktopNav).length ? shown(c.header.desktopNav) : shown(c.header.nav);
      inline.innerHTML = items.map((item) => {
        const href = pageLink(item.link);
        const current = !onHome() && href === here ? ' aria-current="true"' : '';
        return `<li><a ${linkAttrs(href)}${current}>${esc(item.label)}</a></li>`;
      }).join('');
    }
  };

  const renderHome = (c) => {
    // Section order & visibility
    const shell = $('.page-shell');
    const menuEl = $('#menu');
    let anchor = menuEl;
    c.sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (!el) return;
      el.hidden = s.visible === false;
      anchor.after(el);
      anchor = el;
    });

    // Hero
    setText($('#hero h1'), c.hero.title);
    setText($('.hero-aside__text'), c.hero.asideText);
    const heroBtn = $('.hero-aside__button');
    if (heroBtn) { heroBtn.textContent = c.hero.buttonText || ''; heroBtn.setAttribute('href', safeHref(c.hero.buttonLink, 'menu.html')); heroBtn.hidden = !c.hero.buttonText; }
    $('.hero-aside')?.toggleAttribute('hidden', !c.hero.asideText && !c.hero.buttonText);
    const video = $('#hero video');
    if (video) {
      video.removeAttribute('poster');
      const source = video.querySelector('source');
      const videoSrc = safeMedia(c.hero.video, { images: false });
      if (source && videoSrc && source.getAttribute('src') !== videoSrc) { source.src = videoSrc; video.load(); }
    }

    // Marquee
    const words = shown(c.marquee);
    const group = (hidden) => `<div class="brand-marquee__group"${hidden ? ' aria-hidden="true"' : ''}>${words.map((w) => `<span class="brand-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span>${esc(w.text)}</span>`).join('')}</div>`;
    const track = $('.brand-marquee__track');
    if (track) { track.innerHTML = group(false) + group(true); $('.brand-marquee').setAttribute('aria-label', words.map((w) => w.text).join(', ')); }
    $('.brand-marquee')?.toggleAttribute('hidden', !words.length);

    // Photo slider
    // Only slides with a real photo are shown (no "photo coming soon" placeholders).
    const slides = shown(c.gallery.slides).filter((s) => safeMedia(s.image));
    const gTrack = $('.gallery__track');
    if (gTrack) {
      gTrack.innerHTML = slides.map((s, i) => s.image
        ? `<figure class="gallery__slide" aria-label="Slide ${i + 1} of ${slides.length}"><img src="${esc(safeMedia(s.image))}" alt="${esc(s.alt)}" draggable="false" decoding="async"${i ? ' loading="lazy"' : ''}></figure>`
        : `<figure class="gallery__slide gallery__slide--placeholder" aria-label="Slide ${i + 1} of ${slides.length}, photo coming soon"><span>PHOTO COMING SOON</span></figure>`).join('');
      $('.gallery').hidden = !slides.length;
    }

    // Our Story
    setText($('#our-story-title'), c.story.title);
    const copy = $('.our-story__copy');
    if (copy) {
      const paras = shown(c.story.paragraphs);
      copy.innerHTML = paras.map((p) => `<p>${lines(p.text)}</p>`).join('');
    }

    // Our Menu (burger layers)
    setText($('#burger-story-title'), c.menuTeaser.title);
    setText($('.burger-story__heading p'), c.menuTeaser.text, 'desktop-break');
    const explore = $('.burger-story__button');
    if (explore) { explore.innerHTML = `<span class="burger-story__button-text">${esc(c.menuTeaser.buttonText || '')}</span>`; explore.setAttribute('href', safeHref(c.menuTeaser.buttonLink, 'menu.html')); explore.hidden = !c.menuTeaser.buttonText; }
    document.querySelectorAll('.burger-story__piece').forEach((piece, i) => {
      const layer = c.menuTeaser.layers[i];
      if (!layer) return;
      piece.dataset.name = layer.label || '';
      const img = piece.querySelector('img');
      if (img) { img.src = safeMedia(layer.image); img.alt = layer.alt || layer.label || ''; }
    });

    // Best sellers
    setText($('#best-sellers-title'), c.bestSellers.title);
    setText($('.best-sellers__intro-text'), c.bestSellers.intro);
    $('.best-sellers__intro-text')?.toggleAttribute('hidden', !c.bestSellers.intro);
    const bsBtn = $('.best-sellers__button');
    if (bsBtn) { bsBtn.textContent = c.bestSellers.buttonText || ''; bsBtn.setAttribute('href', safeHref(c.bestSellers.buttonLink, 'menu.html')); bsBtn.hidden = !c.bestSellers.buttonText; }
    const cards = $('.best-sellers__cards');
    if (cards) cards.innerHTML = shown(c.bestSellers.items).map((b) => {
      const extra = (b.description ? `<p class="best-sellers__desc">${lines(b.description)}</p>` : '') + (b.price ? `<p class="best-sellers__price">${esc(b.price)}</p>` : '');
      const inner = `<img src="${esc(safeMedia(b.image))}" alt="${esc(b.name)}" loading="lazy" decoding="async"><h3>${esc(b.name)}</h3>${extra}`;
      return `<article class="best-sellers__card">${b.link ? `<a ${linkAttrs(b.link)} class="best-sellers__link">${inner}</a>` : inner}</article>`;
    }).join('');

    // Partners
    setText($('#partners-title'), c.partners.title);
    setText($('.partners__inner > p'), c.partners.text);
    const logos = $('.partners__logos');
    if (logos) {
      const list = shown(c.partners.logos);
      logos.setAttribute('aria-label', `Our partners: ${list.map((l) => l.name).join(' and ')}`);
      logos.innerHTML = list.map((l) => {
        const img = `<img class="partners__logo${l.style ? ` partners__logo--${esc(l.style)}` : ''}" src="${esc(safeMedia(l.image))}" alt="${esc(l.name)}" loading="lazy" decoding="async">`;
        return l.link ? `<a ${linkAttrs(l.link)}>${img}</a>` : img;
      }).join('');
    }

    // Franchise
    setText($('#franchise-title'), c.franchise.title);
    setText($('.franchise h3'), c.franchise.subtitle);
    setText($('.franchise__copy'), c.franchise.text);
    // Contact pills: email (from the franchise button link) + phone (= the Contact Us phone).
    const mailLink = safeHref(c.franchise.buttonLink, '');
    const mailAddr = mailLink.replace(/^mailto:/i, '').split('?')[0];
    let mailText = String(c.franchise.buttonText || '').trim();
    if (!mailText || /send your inquiry/i.test(mailText)) mailText = mailAddr;   // older wording → just the address
    const mailPill = $('.franchise__pill--mail');
    if (mailPill) {
      mailPill.setAttribute('href', mailLink || '#');
      mailPill.querySelector('.franchise__pill-text').textContent = mailText.toLowerCase();
      mailPill.hidden = !mailText;
    }
    const phone = String(c.contact.phone || '').trim();
    const phonePill = $('.franchise__pill--phone');
    if (phonePill) {
      phonePill.hidden = !phone;
      phonePill.querySelector('.franchise__pill-text').textContent = phone;
      phonePill.setAttribute('href', `tel:${phone.replace(/[^\d+]/g, '')}`);
    }
    let contactLabel = c.franchise.phoneLabel ?? 'Send your inquiries';
    if (/^franchise enquiries$/i.test(String(contactLabel).trim())) contactLabel = 'Send your inquiries';
    setText($('.franchise__contact-label'), contactLabel);
    $('.franchise__contact-label')?.toggleAttribute('hidden', !contactLabel);
    $('.franchise__contact')?.toggleAttribute('hidden', !mailText && !phone);

    // Location: live Google map; the whole map opens directions in Google Maps.
    setText($('#location-title'), c.location.title);
    const map = $('.location__map');
    if (map) {
      const embed = mapsEmbed(c.location);
      const frame = map.querySelector('iframe');
      map.setAttribute('href', mapsDirections(c.location));
      map.setAttribute('aria-label', `Open ${c.location.place} in Google Maps for directions`);
      if (frame && frame.getAttribute('src') !== embed) frame.setAttribute('src', embed);
    }
    setText($('.location__address'), c.location.address);
    const locBtn = $('.location__button');
    if (locBtn) { locBtn.textContent = c.location.buttonText || ''; locBtn.setAttribute('href', mapsDirections(c.location)); locBtn.hidden = !c.location.buttonText; }

    // Playlist (the carousel itself is built by script.js from SEVEN_CONFIG)
    setText($('#playlist-title'), c.playlist.title);
    setText($('.playlist__lead'), c.playlist.lead, 'desktop-break');
    setText($('.playlist__copy'), c.playlist.copy, 'desktop-break');
    const caption = $('.playlist__caption');
    if (caption) caption.hidden = !c.playlist.showCaption;
    $('.playlist')?.classList.toggle('playlist--no-play', c.playlist.showPlayButton === false);

    // Instagram
    setText($('#instagram-title'), c.instagram.title);
    const igBtn = $('.instagram-feed__button');
    // Older one-line button text is split: the sentence becomes the note, only the @handle stays in the button.
    let igText = String(c.instagram.buttonText || ''); let igNote = c.instagram.note;
    const igMatch = igText.match(/^(.*?)\s*(@[\w.]+)\s*$/);
    if (igMatch && igMatch[1]) { igText = igMatch[2]; if (igNote == null || igNote === '') igNote = igMatch[1]; }
    if (igBtn) { igBtn.textContent = igText; igBtn.setAttribute('href', safeHref(c.instagram.buttonLink)); igBtn.hidden = !igText; }
    setText($('.instagram-feed__note'), igNote || '');
    $('.instagram-feed__note')?.toggleAttribute('hidden', !igNote);

    // Contact
    setText($('#contact-title'), c.contact.title);
    const lead = $('.contact__lead');
    if (lead) lead.innerHTML = `${c.contact.leadBold ? `<strong>${esc(c.contact.leadBold)}</strong><br>` : ''}${lines(c.contact.lead)}`;
    const details = $('.contact__details');
    if (details) {
      const bits = [];
      if (c.contact.phone) bits.push(`<a href="tel:${esc(c.contact.phone.replace(/[^\d+]/g, ''))}">${esc(c.contact.phone)}</a>`);
      if (c.contact.email) bits.push(`<a href="mailto:${esc(c.contact.email)}">${esc(c.contact.email)}</a>`);
      details.innerHTML = bits.join('<span aria-hidden="true">|</span>');
      details.hidden = !bits.length;
    }
    const findUs = $('.contact__find-us-art');
    if (findUs && safeMedia(c.contact.findUsImage)) findUs.src = safeMedia(c.contact.findUsImage);
    const socials = $('.contact__social-links');
    // Social buttons: content/socials.json. Only accounts with a real link are shown.
    if (socials) socials.innerHTML = socialLinks(c).map((s) => {
      const name = SOCIAL_NAMES[s.platform] || 'Link';
      // No link yet: the icon stays (original design) but is not clickable.
      if (!s.href) return `<a role="link" aria-disabled="true" aria-label="SEVEN on ${esc(name)} (coming soon)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${SOCIAL_ICONS[s.platform] || SOCIAL_ICONS.link}"/></svg></a>`;
      return `<a ${linkAttrs(s.href)} aria-label="SEVEN on ${esc(name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${SOCIAL_ICONS[s.platform] || SOCIAL_ICONS.link}"/></svg></a>`;
    }).join('');
    const handle = $('.contact__handle');
    if (handle) { handle.textContent = c.socials.handle || ''; handle.setAttribute('href', safeHref(c.socials.handleLink)); handle.hidden = !c.socials.handle; }
  };

  const renderFooter = (c) => {
    const nav = $('.site-footer__nav');
    if (!nav) return;
    nav.innerHTML = shown(c.footer.links).map((l) => `<a ${linkAttrs(pageLink(l.link))}>${esc(l.label)}</a>`).join('');
    const legal = $('.site-footer__legal');
    if (legal) legal.innerHTML = shown(c.footer.legal).map((l) => `<a ${linkAttrs(l.link)}>${esc(l.label)}</a>`).join('');
    const copy = $('.site-footer__copyright');
    if (copy) copy.textContent = c.footer.copyright;
    const logo = $('.site-footer__logo img');
    if (logo && safeMedia(c.footer.logo)) logo.src = safeMedia(c.footer.logo);
  };

  /* Menu page: one section per category — number, big title, short line, then
     image cards (or a text-only panel). Reveal motion lives in menu.js. */
  // Price as typed in the editor (e.g. "7,000 IQD"); nothing is shown when it is empty.
  const priceTag = (p) => (clean(p.price) ? `<p class="menu-item__price">${esc(clean(p.price))}</p>` : '');
  // Small label on a product that is not available: SOLD OUT (available: false).
  const badges = (p) => {
    const b = [];
    if (p.available === false) b.push('<span class="menu-badge menu-badge--soldout">Sold out</span>');
    return b.length ? `<div class="menu-badges">${b.join('')}</div>` : '';
  };
  // Ingredients typed as "Beef patty, Cheddar, Pickles" are shown as "Beef patty · Cheddar · Pickles".
  const ingredientsTag = (p) => {
    const list = (Array.isArray(p.ingredients) ? p.ingredients : String(p.ingredients || '').split(',')).map((x) => clean(x)).filter(Boolean);
    return list.length ? `<p class="menu-item__ingredients"><span class="visually-hidden">Ingredients: </span>${list.map(esc).join(' · ')}</p>` : '';
  };
  const renderMenuPage = (c) => {
    const wrap = $('.menu-sections');
    if (!wrap) return;
    setText($('.menu-page__heading h1'), c.products.title);
    setText($('.menu-page__heading p'), c.products.intro, 'desktop-break');
    const items = shown(c.products.items);
    // Categories with no visible products are left out.
    const cats = shown(c.products.categories).filter((cat) => items.some((p) => p.category === cat.id));
    // Product index (lookbook style): big category names that glide to each section.
    const index = c.products.showIndex === true && cats.length > 1 ? `<nav class="menu-index" aria-label="Menu categories"><ol>${cats.map((cat) => {
      return `<li><a href="#${esc(cat.id)}"><span class="menu-index__name">${esc(cat.name)}</span></a></li>`;
    }).join('')}</ol></nav>` : '';
    wrap.innerHTML = index + cats.map((cat) => {
      const list = items.filter((p) => p.category === cat.id);
      const cols = Math.min(4, Math.max(2, Number(cat.columns) || 3));
      const head = `
        <header class="menu-cat__head" data-reveal>
          <div><h2 class="menu-cat__title">${esc(cat.name)}</h2></div>
        </header>`;
      const state = (p) => (p.available === false ? ' is-soldout' : '');
      if (cat.layout === 'list') {
        return `<section class="menu-cat menu-cat--list" id="${esc(cat.id)}" aria-label="${esc(cat.name)}">${head}
          <div class="menu-panel" data-reveal><div class="menu-panel__inner" style="--cols:${cols}">
            ${list.map((p) => `<div class="menu-panel__item${state(p)}"><h3>${esc(p.name)}</h3>${badges(p)}${p.description ? `<p>${esc(p.description)}</p>` : ''}${ingredientsTag(p)}${priceTag(p)}</div>`).join('')}
          </div></div></section>`;
      }
      return `<section class="menu-cat" id="${esc(cat.id)}" aria-label="${esc(cat.name)}">${head}
        <div class="menu-cards${list.length > cols ? ' menu-cards--wrap' : ''}" style="--cols:${cols}">
          ${list.map((p, i) => `
          <article class="menu-item${state(p)}" data-reveal style="--d:${i % cols}">
            <div class="menu-item__media">${badges(p)}${safeMedia(p.image)
              ? `<img src="${esc(safeMedia(p.image))}" decoding="async" alt="${esc(p.name)}" loading="lazy" class="menu-item__img menu-item__img--${p.fit === 'cover' ? 'cover' : 'contain'}">`
              : `<span class="menu-item__placeholder" role="img" aria-label="${esc(p.name)} image placeholder"><i></i><b>IMAGE</b></span>`}</div>
            <div class="menu-item__body">
              <h3 class="menu-item__name">${esc(p.name)}</h3>
              ${p.tagline ? `<p class="menu-item__tag">${esc(p.tagline)}</p>` : ''}
              ${p.description ? `<p class="menu-item__desc">${esc(p.description)}</p>` : ''}
              ${ingredientsTag(p)}
              ${priceTag(p)}
            </div>
          </article>`).join('')}
        </div></section>`;
    }).join('');
    document.dispatchEvent(new CustomEvent('seven:menu-rendered'));
  };

  const apply = () => {
    const c = get();
    renderNav(c);
    if (onHome()) renderHome(c);
    renderFooter(c);
    renderMenuPage(c);
    return c;
  };

  window.SEVEN_CONFIG = { safeHref, safeMedia, esc, get, save, reset, hasDraft, apply, merge, youtubeEmbed, mapsEmbed, mapsDirections, SOCIAL_NAMES, SOCIAL_ICONS, storageKey: PREVIEW_KEY, getPublishedContent, isPreview, instagramPosts, FILES, splitContent, joinContent, loadContent, SKELETON };

  /* Load the scripts named in data-then, one after another, in order. */
  const me = document.currentScript;
  const loadNext = (list) => {
    if (!list.length) { document.dispatchEvent(new CustomEvent('seven:ready')); return; }
    const s = document.createElement('script');
    s.src = list[0];
    s.onload = s.onerror = () => loadNext(list.slice(1));
    document.body.appendChild(s);
  };
  const then = (me?.dataset.then || '').split(/\s+/).filter(Boolean);

  if (document.body.classList.contains('dashboard-page')) return;   // the admin loads content itself
  loadContent().then((content) => {
    window.SEVEN_PUBLISHED_CONTENT = content;
    try { apply(); } catch (err) { console.error('SEVEN: could not build the page', err); }
    document.documentElement.classList.add('seven-content-ready');
    loadNext(then);
  });
})();
