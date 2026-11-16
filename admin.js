/* SEVEN admin (GitHub Pages edition): a schema-driven editor for every
   content/*.json file. There is no server: this page talks straight to the
   GitHub API with a personal access token that only you hold.

   - The token is kept in THIS browser only (session, or "remember" = this
     device). It is never written into the repository or sent anywhere except
     api.github.com.
   - SAVE writes the changed JSON files to the repository in ONE commit.
     GitHub Actions then publishes the site (usually within 1–2 minutes).
   - UPLOAD puts photos/videos in assets/uploads/ in the repository.
   - Version history = the repository's commit history for content/. */
(() => {
  const CFG = window.SEVEN_CONFIG;
  const API = 'https://api.github.com';
  const TOKEN_KEY = 'seven-admin-github';
  const FEED_FILE = 'content/instagram-feed.json';
  const $id = (id) => document.getElementById(id);

  /* ---------- connection (token + repository) ---------- */
  const readConn = () => {
    try { return JSON.parse(sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || 'null'); } catch { return null; }
  };
  const storeConn = (conn, remember) => {
    try {
      sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY);
      (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, JSON.stringify(conn));
    } catch { /* storage blocked: the token lives only until the page closes */ }
  };
  const forgetConn = () => { try { sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY); } catch { /* blocked */ } };
  let conn = readConn();

  // Guess owner/repo on <user>.github.io/<repo>/ addresses; on sevenonly.com they
  // come from content/settings.json → github, or are typed in once.
  const guessRepo = () => {
    const m = location.hostname.match(/^([\w-]+)\.github\.io$/i);
    if (!m) return {};
    const first = location.pathname.split('/').filter(Boolean)[0];
    return { owner: m[1], repo: first && !/\.html$/.test(first) ? first : `${m[1]}.github.io` };
  };

  const gh = async (path, { method = 'GET', body, raw = false } = {}) => {
    let res;
    try {
      res = await fetch(API + path, {
        method, cache: 'no-store',
        headers: { Authorization: `Bearer ${conn.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined
      });
    } catch { throw new Error('No connection to GitHub. Check your internet and try again.'); }
    if (raw) return res;
    let data = {};
    try { data = await res.json(); } catch { /* empty */ }
    if (res.status === 401) { signedOut(); throw new Error('GitHub did not accept the token (expired or wrong). Connect again.'); }
    if (res.status === 403 || res.status === 404) throw new Error(`GitHub refused (${res.status}): ${data.message || ''}. Check that the token has "Contents: Read and write" for ${conn.owner}/${conn.repo}.`);
    if (res.status === 409) throw new Error('Someone else saved at the same moment. Reload this page and try again.');
    if (!res.ok) throw new Error(data.message || `GitHub answered ${res.status}.`);
    return data;
  };
  const repoPath = () => `/repos/${encodeURIComponent(conn.owner)}/${encodeURIComponent(conn.repo)}`;
  const enc = (path) => path.split('/').map(encodeURIComponent).join('/');
  const b64ToText = (b64) => new TextDecoder().decode(Uint8Array.from(atob(String(b64).replace(/\s/g, '')), (c) => c.charCodeAt(0)));
  const bytesToB64 = (bytes) => { let out = ''; const step = 0x8000; for (let i = 0; i < bytes.length; i += step) out += String.fromCharCode.apply(null, bytes.subarray(i, i + step)); return btoa(out); };

  // The text of every content file as it is in the repository (to save only what changed, and keep each file's "_help").
  let repoText = {};
  const readFile = async (path, ref) => {
    const res = await gh(`${repoPath()}/contents/${enc(path)}?ref=${encodeURIComponent(ref || conn.branch)}`, { raw: true });
    if (res.status === 404) return null;
    if (res.status === 401) { signedOut(); throw new Error('GitHub did not accept the token.'); }
    if (!res.ok) throw new Error(`Could not read ${path} from GitHub (${res.status}).`);
    const data = await res.json();
    if (data.content) return b64ToText(data.content);
    // Files over 1 MB: fetch the raw blob.
    const blob = await gh(`${repoPath()}/git/blobs/${data.sha}`);
    return b64ToText(blob.content);
  };
  const loadFromRepo = async (ref) => {
    const files = [...Object.keys(CFG.FILES), FEED_FILE];
    const texts = await Promise.all(files.map((f) => readFile(f, ref)));
    const parsed = {}; const bad = [];
    files.forEach((f, i) => {
      if (texts[i] == null) return;
      try { parsed[f] = JSON.parse(texts[i]); } catch (e) { bad.push(`${f} (${e.message})`); }
    });
    if (bad.length) throw new Error(`These files contain a mistake and cannot be read: ${bad.join(', ')}. Fix them on github.com first (usually a missing comma or quote).`);
    return { texts: Object.fromEntries(files.map((f, i) => [f, texts[i]])), parsed, content: CFG.joinContent(parsed) };
  };
  const helpOf = (text) => { try { const v = JSON.parse(text); return v && v._help; } catch { return undefined; } };
  const fileText = (file, data) => {
    const help = helpOf(repoText[file] || '');
    return `${JSON.stringify(help ? { _help: help, ...data } : data, null, 2)}\n`;
  };

  // Commit several files at once (Git Data API): one commit, one deploy.
  const commitFiles = async (changes, message) => {
    const ref = await gh(`${repoPath()}/git/ref/heads/${enc(conn.branch)}`);
    const parent = await gh(`${repoPath()}/git/commits/${ref.object.sha}`);
    const tree = await gh(`${repoPath()}/git/trees`, { method: 'POST', body: { base_tree: parent.tree.sha, tree: changes.map((c) => ({ path: c.path, mode: '100644', type: 'blob', content: c.text })) } });
    const commit = await gh(`${repoPath()}/git/commits`, { method: 'POST', body: { message, tree: tree.sha, parents: [ref.object.sha] } });
    await gh(`${repoPath()}/git/refs/heads/${enc(conn.branch)}`, { method: 'PATCH', body: { sha: commit.sha } });
    return commit;
  };

  // Same interface the editor used with the old PHP api.php.
  const api = async (action, { body, form, onProgress } = {}) => {
    if (action === 'save' || action === 'restore-content') {
      const files = CFG.splitContent(body.content);
      const changes = Object.entries(files).map(([path, data]) => ({ path, text: fileText(path, data) })).filter((c) => c.text !== repoText[c.path]);
      if (!changes.length) return { ok: true, content: body.content, unchanged: true };
      // Keep content/content-bundle.js (used when the site is opened from a folder) in step.
      const bundleFiles = {};
      Object.entries(files).forEach(([path, data]) => { const t = changes.find((c) => c.path === path)?.text ?? repoText[path] ?? fileText(path, data); bundleFiles[path] = JSON.parse(t); });
      if (repoText['content/instagram-feed.json']) { try { bundleFiles['content/instagram-feed.json'] = JSON.parse(repoText['content/instagram-feed.json']); } catch { /* skip */ } }
      changes.push({ path: 'content/content-bundle.js', text: `/* Generated from content/*.json — do not edit. Edit the .json files instead. */\nwindow.SEVEN_CONTENT_BUNDLE = ${JSON.stringify(bundleFiles)};\n` });
      const commit = await commitFiles(changes, `Admin: ${body.note || 'update content'}`);
      changes.forEach((c) => { repoText[c.path] = c.text; });
      changes.splice(changes.findIndex((c) => c.path === 'content/content-bundle.js'), 1);
      watchDeploy(commit.sha);
      return { ok: true, content: body.content, commit: commit.sha, files: changes.map((c) => c.path) };
    }
    if (action === 'upload') {
      const file = form.get('file');
      const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+(?=\.)/g, '').slice(-60) || 'file';
      const path = `assets/uploads/${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36).slice(-4)}-${safe}`;
      if (file.size > 90 * 1048576) throw new Error('That file is bigger than GitHub allows through the browser (about 90 MB). Compress it first — under 20 MB is best for the website.');
      const content = bytesToB64(new Uint8Array(await file.arrayBuffer()));
      // XMLHttpRequest so a progress bar can be shown.
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', `${API}${repoPath()}/contents/${enc(path)}`);
        xhr.setRequestHeader('Authorization', `Bearer ${conn.token}`);
        xhr.setRequestHeader('Accept', 'application/vnd.github+json');
        xhr.setRequestHeader('Content-Type', 'application/json');
        if (onProgress) xhr.upload.addEventListener('progress', (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); });
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status}). ${(() => { try { return JSON.parse(xhr.responseText).message; } catch { return ''; } })()}`)));
        xhr.onerror = () => reject(new Error('No connection to GitHub. Check your internet and try again.'));
        xhr.send(JSON.stringify({ message: `Admin: upload ${safe}`, content, branch: conn.branch }));
      });
      return { ok: true, url: path, preview: URL.createObjectURL(file) };
    }
    if (action === 'revisions') {
      const list = await gh(`${repoPath()}/commits?path=content&sha=${encodeURIComponent(conn.branch)}&per_page=30`);
      return { ok: true, revisions: list.map((c) => ({ id: c.sha, note: c.commit.message.split('\n')[0], created_at: c.commit.author.date, by: c.commit.author.name })) };
    }
    if (action === 'restore') {
      const old = await loadFromRepo(body.id);
      const res = await api('save', { body: { content: old.content, note: `restore version ${body.id.slice(0, 7)}` } });
      return { ...res, content: old.content };
    }
    throw new Error(`Unknown action ${action}`);
  };

  // After a save: show the GitHub Actions deploy status (needs "Actions: Read" on the token; skipped otherwise).
  const deployEl = () => $id('deploy-status');
  const watchDeploy = (sha, tries = 0) => {
    const el = deployEl(); if (!el) return;
    if (tries === 0) el.textContent = 'Publishing… the live site updates in about 1–2 minutes.';
    if (tries > 40) return;
    window.setTimeout(async () => {
      try {
        const res = await gh(`${repoPath()}/actions/runs?head_sha=${sha}&per_page=5`, { raw: true });
        if (!res.ok) { el.textContent = 'Publishing… the live site updates in about 1–2 minutes (see the Actions tab on GitHub).'; return; }
        const run = (await res.json()).workflow_runs?.[0];
        if (!run || run.status !== 'completed') { el.textContent = `Publishing… (${run ? run.status.replace('_', ' ') : 'waiting for GitHub'})`; watchDeploy(sha, tries + 1); return; }
        el.textContent = run.conclusion === 'success' ? `Live on the website · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : `Publishing FAILED (${run.conclusion}). Open GitHub → Actions to see why: ${run.html_url}`;
      } catch { /* status is only informative */ }
    }, tries === 0 ? 8000 : 6000);
  };

  let signedOutShown = false;
  const signedOut = () => {
    if (signedOutShown) return; signedOutShown = true;
    try { if (window.SEVEN_ADMIN_STATE) localStorage.setItem('seven-admin-recover', JSON.stringify(window.SEVEN_ADMIN_STATE())); } catch { /* full */ }
    forgetConn();
    alert('GitHub did not accept the token any more (expired or removed). Connect again — your unsaved changes are kept in this browser.');
    window.location.reload();
  };

  /* ---------- connect screen ---------- */
  const connectView = $id('connect-view');
  const editorView = $id('editor-view');
  const showConnect = async (message) => {
    connectView.hidden = false; editorView.hidden = true;
    const f = $id('connect-form');
    let fromSettings = {};
    try { const r = await fetch('content/settings.json', { cache: 'no-cache' }); fromSettings = (await r.json()).github || {}; } catch { /* offline */ }
    const guess = { ...guessRepo(), ...Object.fromEntries(Object.entries(fromSettings).filter(([, v]) => v)) };
    f.owner.value = conn?.owner || guess.owner || '';
    f.repo.value = conn?.repo || guess.repo || '';
    f.branch.value = conn?.branch || guess.branch || 'main';
    $id('connect-message').textContent = message || '';
    f.onsubmit = async (e) => {
      e.preventDefault();
      const next = { token: f.token.value.trim(), owner: f.owner.value.trim(), repo: f.repo.value.trim(), branch: f.branch.value.trim() || 'main' };
      if (!next.token || !next.owner || !next.repo) return;
      $id('connect-message').textContent = 'Checking with GitHub…';
      conn = next;
      try {
        const repo = await gh(repoPath());
        if (!repo.permissions || !repo.permissions.push) throw new Error('This token can read the repository but cannot save to it. Give it "Contents: Read and write".');
        storeConn(conn, f.remember.checked);
        f.token.value = '';
        start();
      } catch (err) { conn = null; $id('connect-message').textContent = err.message; }
    };
  };

  const start = async () => {
    connectView.hidden = true; editorView.hidden = false;
    $id('connected-as').textContent = `${conn.owner}/${conn.repo} · ${conn.branch}`;
    let loaded;
    try { loaded = await loadFromRepo(); } catch (err) {
      if (/token|refused/i.test(err.message)) { forgetConn(); showConnect(err.message); return; }
      $id('save-status').textContent = 'Could not load'; $id('publish-message').textContent = err.message; return;
    }
    repoText = loaded.texts;
    // Remember the repository in settings.json, so the next connect fills it in.
    if (!loaded.content.github || !loaded.content.github.owner) loaded.content.github = { owner: conn.owner, repo: conn.repo, branch: conn.branch };
    startEditor(loaded.content, api, signedOut);
  };

  document.addEventListener('DOMContentLoaded', () => { if (conn && conn.token) start(); else showConnect(); });
  if (document.readyState !== 'loading') { if (conn && conn.token) start(); else showConnect(); }

  window.SEVEN_ADMIN_DISCONNECT = () => { forgetConn(); window.location.reload(); };
})();

/* ===================== the editor ===================== */
const startEditor = (initialContent, api, signedOut) => {
  const CFG = window.SEVEN_CONFIG;
  // What is in the repository right now — the editor starts from this.
  let state = initialContent;
  let savedJson = JSON.stringify(state);
  window.SEVEN_ADMIN_STATE = () => state;

  /* ---------- what can be edited ---------- */
  const SOCIAL_OPTIONS = Object.entries(CFG.SOCIAL_NAMES).map(([value, label]) => ({ value, label }));
  const SCHEMA = [
    { id: 'sections', title: 'Homepage sections', note: 'Drag or use the arrows to change the order of sections on the homepage. Untick “Show” to hide a whole section.',
      fields: [{ path: 'sections', type: 'list', fixed: true, itemName: 'Section', titleKey: 'label', fields: [] }] },
    { id: 'header', title: 'Header & menu', note: '“Menu items” appear in the full-screen menu (three-dot button). “Desktop header links” appear across the centre of the header on laptop & desktop screens.', fields: [
      { path: 'header.logo', label: 'Logo', type: 'image' },
      { path: 'header.nav', label: 'Menu items', type: 'list', itemName: 'Menu item', titleKey: 'label', newItem: { label: 'New item', link: '#home', visible: true },
        fields: [{ key: 'label', label: 'Text', type: 'text' }, { key: 'link', label: 'Link', type: 'text', hint: 'A section (#our-story, #franchise, #our-location, #contact, #playlist, #instagram, #best-sellers, #our-menu), menu.html, or a web address.' }] },
      { path: 'header.desktopNav', label: 'Desktop header links (laptop & desktop)', type: 'list', itemName: 'Header link', titleKey: 'label', newItem: { label: 'New link', link: '#home', visible: true },
        fields: [{ key: 'label', label: 'Text', type: 'text' }, { key: 'link', label: 'Link', type: 'text', hint: 'A section (#home, #our-story, #contact …), menu.html, or a web address.' }] }
    ] },
    { id: 'hero', title: 'Hero video', fields: [
      { path: 'hero.title', label: 'Title', type: 'textarea', rows: 2, hint: 'A new line makes a line break.' },
      { path: 'hero.video', label: 'Video', type: 'video', hint: 'Upload an MP4 (best under 20 MB so it starts quickly on phones), or type a path such as assets/hero-video.mp4, or paste a link to an .mp4 file.' },
      { path: 'hero.poster', label: 'Image shown while the video loads', type: 'image' },
      { path: 'hero.asideText', label: 'Supporting line beside the button (laptop & desktop) — leave empty for none', type: 'textarea', rows: 2 },
      { path: 'hero.buttonText', label: 'Button text (laptop & desktop)', type: 'text', hint: 'Leave empty to hide the button.' },
      { path: 'hero.buttonLink', label: 'Button link (laptop & desktop)', type: 'text' }
    ] },
    { id: 'gallery', title: 'Marquee & photo slider', fields: [
      { path: 'marquee', label: 'Scrolling words', type: 'list', itemName: 'Word', titleKey: 'text', newItem: { text: 'NEW WORDS', visible: true }, fields: [{ key: 'text', label: 'Text', type: 'text' }] },
      { path: 'gallery.delay', label: 'Time on each photo (milliseconds)', type: 'number', min: 1000, step: 100, hint: '2000 = 2 seconds.' },
      { path: 'gallery.slides', label: 'Photos', type: 'list', itemName: 'Photo', titleKey: 'alt', newItem: { image: '', alt: 'New photo', visible: true },
        fields: [{ key: 'image', label: 'Photo', type: 'image', hint: 'Leave empty to show “Photo coming soon”.' }, { key: 'alt', label: 'Description (for accessibility)', type: 'text' }] }
    ] },
    { id: 'story', title: 'Our Story', fields: [
      { path: 'story.title', label: 'Title', type: 'text' },
      { path: 'story.paragraphs', label: 'Paragraphs', type: 'list', itemName: 'Paragraph', titleKey: 'text', newItem: { text: 'New paragraph.', visible: true }, fields: [{ key: 'text', label: 'Text', type: 'textarea', rows: 4 }] },
      { path: 'story.photos', label: 'Photos sliding beside the story (laptop & desktop)', type: 'list', itemName: 'Photo', titleKey: 'alt', newItem: { image: '', alt: 'New photo', fit: 'cover', visible: true },
        fields: [{ key: 'image', label: 'Photo', type: 'image' }, { key: 'alt', label: 'Description (for accessibility)', type: 'text' },
          { key: 'fit', label: 'Fit', type: 'select', options: [{ value: 'cover', label: 'Fill the frame (photos)' }, { value: 'contain', label: 'Show whole image (cut-outs / PNG)' }] }] }
    ] },
    { id: 'menuTeaser', title: 'Our Menu (burger layers)', fields: [
      { path: 'menuTeaser.title', label: 'Title', type: 'text' },
      { path: 'menuTeaser.text', label: 'Text', type: 'textarea', rows: 3, hint: 'A new line = line break on larger screens.' },
      { path: 'menuTeaser.buttonText', label: 'Button text', type: 'text', hint: 'Leave empty to hide the button.' },
      { path: 'menuTeaser.buttonLink', label: 'Button link', type: 'text' },
      { path: 'menuTeaser.layers', label: 'Burger layers (top to bottom)', type: 'list', fixed: true, noHide: true, noReorder: true, itemName: 'Layer', titleKey: 'label',
        fields: [{ key: 'image', label: 'Layer image (transparent PNG)', type: 'image' }, { key: 'label', label: 'Label', type: 'text' }, { key: 'alt', label: 'Description (for accessibility)', type: 'text' }] }
    ] },
    { id: 'bestSellers', title: 'Best Seller', fields: [
      { path: 'bestSellers.title', label: 'Title', type: 'text' },
      { path: 'bestSellers.intro', label: 'Text beside the title (laptop & desktop)', type: 'textarea', rows: 3, hint: 'Optional.' },
      { path: 'bestSellers.buttonText', label: 'Button text (laptop & desktop)', type: 'text', hint: 'Leave empty to hide the button.' },
      { path: 'bestSellers.buttonLink', label: 'Button link (laptop & desktop)', type: 'text' },
      { path: 'bestSellers.items', label: 'Burgers', type: 'list', itemName: 'Burger', titleKey: 'name', newItem: { name: 'NEW BURGER', image: 'assets/best-seller-burger.webp', link: '', visible: true },
        fields: [{ key: 'name', label: 'Name', type: 'text' }, { key: 'image', label: 'Image', type: 'image' },
          { key: 'description', label: 'Description (laptop & desktop)', type: 'textarea', rows: 2, hint: 'Optional.' },
          { key: 'price', label: 'Price (laptop & desktop)', type: 'text', hint: 'Optional, e.g. 9,000 IQD.' },
          { key: 'link', label: 'Link (optional)', type: 'text' }] }
    ] },
    { id: 'partners', title: 'Our Partners', fields: [
      { path: 'partners.title', label: 'Title', type: 'text' },
      { path: 'partners.text', label: 'Text', type: 'textarea', rows: 4 },
      { path: 'partners.logos', label: 'Partner logos', type: 'list', itemName: 'Partner', titleKey: 'name', newItem: { name: 'New partner', image: '', link: '', style: '', visible: true },
        fields: [{ key: 'name', label: 'Name', type: 'text' }, { key: 'image', label: 'Logo', type: 'image' }, { key: 'link', label: 'Link (optional)', type: 'text' }] }
    ] },
    { id: 'franchise', title: 'Franchise', fields: [
      { path: 'franchise.title', label: 'Title', type: 'text' },
      { path: 'franchise.subtitle', label: 'Subtitle', type: 'text' },
      { path: 'franchise.text', label: 'Text', type: 'textarea', rows: 5 },
      { path: 'franchise.buttonText', label: 'Email button text', type: 'text', hint: 'Usually the email address. Leave empty to hide the email button.' },
      { path: 'franchise.buttonLink', label: 'Email button link', type: 'text', hint: 'e.g. mailto:franchise@sevenonly.com' },
      { path: 'franchise.phoneLabel', label: 'Text above the email & phone buttons', type: 'text', hint: 'e.g. Send your inquiries. The phone button uses the Contact Us phone.' }
    ], note: 'The “Franchise enquiries” phone line uses the phone number from Contact Us — change it there and both places update.' },
    { id: 'location', title: 'Location', fields: [
      { path: 'location.title', label: 'Title', type: 'textarea', rows: 2 },
      { path: 'location.place', label: 'Place shown on the map', type: 'text', hint: 'What Google Maps should find, e.g. “Grand Boulevard - Nergis Park, Sulaymaniyah”.' },
      { path: 'location.mapsLink', label: 'Google Maps link (optional)', type: 'text', hint: 'Paste a “Share” link from Google Maps to send taps to an exact pin. Empty = directions to the place above.' },
      { path: 'location.zoom', label: 'Map zoom (10–20)', type: 'number', min: 10, max: 20, step: 1 },
      { path: 'location.address', label: 'Address beside the map (laptop & desktop)', type: 'textarea', rows: 3 },
      { path: 'location.buttonText', label: 'Directions button text (laptop & desktop)', type: 'text', hint: 'Leave empty to hide the button.' }
    ], preview: 'map' },
    { id: 'playlist', title: 'Playlist', fields: [
      { path: 'playlist.title', label: 'Title', type: 'text' },
      { path: 'playlist.lead', label: 'Bold line', type: 'textarea', rows: 2 },
      { path: 'playlist.copy', label: 'Text', type: 'textarea', rows: 3 },
      { path: 'playlist.showCaption', label: 'Show the title & subtitle under the covers', type: 'checkbox' },
      { path: 'playlist.showPlayButton', label: 'Show the small play icon on the centred cover', type: 'checkbox' },
      { path: 'playlist.items', label: 'Playlist items', type: 'list', itemName: 'Item', titleKey: 'title', newItem: { title: 'NEW PLAYLIST', artist: '', link: '', cover: '', visible: true },
        fields: [{ key: 'title', label: 'Title', type: 'text' }, { key: 'artist', label: 'Subtitle / artist', type: 'text' }, { key: 'link', label: 'Link', type: 'text', hint: 'A YouTube link plays on the page; Spotify/Apple Music links open in a new tab.' }, { key: 'cover', label: 'Cover image', type: 'image' }] }
    ] },
    { id: 'instagram', title: 'Instagram Feed', note: 'Hand-picked posts: upload the post picture and paste the post link (open the post on Instagram → ⋯ → Copy link).', fields: [
      { path: 'instagram.title', label: 'Title', type: 'text' },
      { path: 'instagram.note', label: 'Line above the button', type: 'text', hint: 'e.g. Follow the flavor. Find us on Instagram.' },
      { path: 'instagram.buttonText', label: 'Button text', type: 'text', hint: 'e.g. @SEVEN.IRAQ' },
      { path: 'instagram.buttonLink', label: 'Button link', type: 'text' },
      { path: 'instagramFeed.mode', label: 'Which posts to show', type: 'select', options: [{ value: 'auto', label: 'Automatic feed when it is set up (falls back to the hand-picked posts)' }, { value: 'manual', label: 'Always the hand-picked posts below' }], hint: 'The automatic feed needs the Instagram setup in GUIDES/INSTAGRAM-SETUP.md. Until then the hand-picked posts are shown.' },
      { path: 'instagramFeed.maxPosts', label: 'Number of posts', type: 'number', min: 1, max: 30, step: 1 },
      { path: 'instagramPosts', label: 'Hand-picked posts', type: 'list', itemName: 'Post', titleKey: 'alt', newItem: () => ({ id: `ig-${Date.now().toString(36)}`, image: '', url: 'https://www.instagram.com/seven.iraq/', alt: 'SEVEN Instagram post', visible: true }),
        fields: [{ key: 'image', label: 'Image', type: 'image' }, { key: 'url', label: 'Instagram post link', type: 'text' }, { key: 'alt', label: 'Short description', type: 'text' }] }
    ] },
    { id: 'contact', title: 'Contact Us', fields: [
      { path: 'contact.title', label: 'Title', type: 'text' },
      { path: 'contact.leadBold', label: 'Bold first line', type: 'text' },
      { path: 'contact.lead', label: 'Text', type: 'textarea', rows: 3 },
      { path: 'contact.phone', label: 'Phone', type: 'text', hint: 'Also shown as the “Franchise enquiries” line in the Franchise section. Leave empty to hide it in both places.' },
      { path: 'contact.email', label: 'Email', type: 'text' },
      { path: 'contact.findUsImage', label: '“Find us on” lettering', type: 'image' },
    ] },
    { id: 'socials', title: 'Social media', note: 'Every social button on the website. A button only appears when it has a link and “Show” is ticked. WhatsApp: paste the number (e.g. +964 770 152 5140) or a wa.me link.', fields: [
      { path: 'socials.links', label: 'Social links', type: 'list', itemName: 'Social link', titleKey: 'platform', newItem: { platform: 'instagram', link: '', visible: true },
        fields: [{ key: 'platform', label: 'Platform', type: 'select', options: SOCIAL_OPTIONS }, { key: 'link', label: 'Link', type: 'text', hint: 'Full address, e.g. https://www.tiktok.com/@yourname' }] },
      { path: 'socials.handle', label: 'Handle text (under the icons)', type: 'text' },
      { path: 'socials.handleLink', label: 'Handle link', type: 'text' }
    ] },
    { id: 'footer', title: 'Footer', fields: [
      { path: 'footer.logo', label: 'Footer logo', type: 'image' },
      { path: 'footer.links', label: 'Footer links', type: 'list', itemName: 'Link', titleKey: 'label', newItem: { label: 'New link', link: '#home', visible: true }, fields: [{ key: 'label', label: 'Text', type: 'text' }, { key: 'link', label: 'Link', type: 'text' }] },
      { path: 'footer.legal', label: 'Legal links', type: 'list', itemName: 'Link', titleKey: 'label', newItem: { label: 'New link', link: '#', visible: true }, fields: [{ key: 'label', label: 'Text', type: 'text' }, { key: 'link', label: 'Link', type: 'text' }] },
      { path: 'footer.copyright', label: 'Copyright line', type: 'text' }
    ] },
    { id: 'design', title: 'Design & effects', note: 'Switch each effect on or off, per screen size. Use PREVIEW to try them, then SAVE to make them live.', fields: [
      { path: 'design.reveal', label: 'Section reveal (headings & text slide in)', type: 'select', options: [{ value: 'all', label: 'On — every screen' }, { value: 'wide', label: 'Laptop & desktop only' }, { value: 'small', label: 'Phones & tablets only' }, { value: 'off', label: 'Off' }] },
      { path: 'design.magnetic', label: 'Magnetic buttons & menu links (mouse only)', type: 'select', options: [{ value: 'all', label: 'On — every screen' }, { value: 'wide', label: 'Laptop & desktop only' }, { value: 'small', label: 'Phones & tablets only' }, { value: 'off', label: 'Off' }] },
      { path: 'design.parallax', label: 'Slow image movement while scrolling', type: 'select', options: [{ value: 'all', label: 'On — every screen' }, { value: 'wide', label: 'Laptop & desktop only' }, { value: 'small', label: 'Phones & tablets only' }, { value: 'off', label: 'Off' }] },
      { path: 'design.progressLine', label: 'Thin red scroll-progress line', type: 'select', options: [{ value: 'all', label: 'On — every screen' }, { value: 'wide', label: 'Laptop & desktop only' }, { value: 'small', label: 'Phones & tablets only' }, { value: 'off', label: 'Off' }] },
      { path: 'design.grain', label: 'Subtle grain texture', type: 'select', options: [{ value: 'all', label: 'On — every screen' }, { value: 'wide', label: 'Laptop & desktop only' }, { value: 'small', label: 'Phones & tablets only' }, { value: 'off', label: 'Off' }] },
      { path: 'design.menuFooter', label: 'Small line under the three-dot menu links', type: 'text', hint: 'Leave empty to hide.' }
    ] },
    { id: 'products', title: 'Menu page (categories & items)', note: 'Each category is one section of the menu page: number, big title, short line, then its items. Rename, reorder (arrows or drag), hide or add categories. “Image cards” shows items as cards with a photo; “Text list” shows names and descriptions in one panel (good for sauces). Use “Show category” to edit one category at a time. Empty image = clean placeholder. Best images: transparent PNG cut-outs.', fields: [
      { path: 'products.title', label: 'Page title', type: 'text' },
      { path: 'products.intro', label: 'Intro text', type: 'textarea', rows: 3 },
      { path: 'products.showIndex', label: 'Show the big category list (Beef, Chicken…) under the intro', type: 'checkbox' },
      { path: 'products.categories', label: 'Categories', type: 'list', itemName: 'Category', titleKey: 'name',
        newItem: () => ({ id: `cat-${Date.now().toString(36)}`, name: 'New category', layout: 'cards', columns: 3, visible: true }),
        onChange: () => refreshProducts(),
        fields: [
          { key: 'name', label: 'Title', type: 'text' },
          { key: 'layout', label: 'Layout', type: 'select', options: [{ value: 'cards', label: 'Image cards' }, { value: 'list', label: 'Text list (no images)' }] },
          { key: 'columns', label: 'Per row on laptop & desktop', type: 'select', options: [{ value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' }], hint: 'Tablets show up to 3, phones 2.' }
        ] },
      { path: 'products.items', label: 'Menu items', type: 'list', itemName: 'Item', titleKey: 'name',
        filterKey: 'category', filterOptions: () => categoryOptions(), filterLabel: 'Show category',
        titleFn: (item) => { const cat = (state.products.categories || []).find((c) => c.id === item.category); return cat ? cat.name : ''; },
        newItem: () => ({ category: (state.products.categories[0] || {}).id || 'beef', name: 'NEW ITEM', tagline: '', description: '', ingredients: '', price: '', image: '', fit: 'contain', available: true, visible: true }),
        fields: [
          { key: 'category', label: 'Category', type: 'select', options: () => categoryOptions() },
          { key: 'image', label: 'Image', type: 'image', hint: 'Leave empty for the placeholder. Not shown in “Text list” categories.' },
          { key: 'fit', label: 'Image fit', type: 'select', options: [{ value: 'contain', label: 'Show whole image (cut-outs / PNG)' }, { value: 'cover', label: 'Fill the frame (photos)' }] },
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'tagline', label: 'Tagline (small capitals)', type: 'text', hint: 'e.g. “For a little hunger.” Leave empty to hide.' },
          { key: 'description', label: 'Description', type: 'textarea', rows: 2, hint: 'Leave empty to hide.' },
          { key: 'ingredients', label: 'Ingredients', type: 'text', hint: 'Separate with commas, e.g. Beef patty, Cheddar, Pickles, SEVEN sauce. Leave empty to hide.' },
          { key: 'price', label: 'Price', type: 'text', hint: 'Type it exactly as guests should see it, e.g. 7,000 IQD. Leave empty to hide.' },
          { key: 'available', label: 'Available (untick = shows SOLD OUT)', type: 'checkbox' }
        ] }
    ] }
  ];

  const categoryOptions = () => (state.products?.categories || []).map((c) => ({ value: c.id, label: `${c.name}${c.visible === false ? ' (hidden)' : ''}` }));
  let refreshProducts = () => {};

  /* ---------- state helpers ---------- */
  const getPath = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), state);
  const setPath = (path, value) => {
    const keys = path.split('.'); const last = keys.pop();
    const target = keys.reduce((o, k) => (o[k] ??= {}), state);
    target[last] = value;
  };
  const statusEl = document.getElementById('save-status');
  const saveButtons = [document.getElementById('save-button'), document.getElementById('publish-button')];
  const resetButton = document.getElementById('reset-button');
  const isDirty = () => JSON.stringify(state) !== savedJson;
  let saving = false;
  const setStatus = (text, kind = '') => {
    statusEl.textContent = text;
    statusEl.classList.toggle('is-error', kind === 'error');
    statusEl.classList.toggle('is-dirty', kind === 'dirty');
  };
  const refreshStatus = () => {
    const dirty = isDirty();
    saveButtons.forEach((b) => { if (b) b.disabled = saving || !dirty; });
    if (resetButton) resetButton.disabled = saving || !dirty;
    if (saving) return;
    if (dirty) setStatus('Unsaved changes', 'dirty');
    else setStatus('No unsaved changes');
  };
  let previewTimer = 0;
  // Called after every edit: marks unsaved changes and updates the private preview.
  const persist = () => {
    refreshStatus();
    window.clearTimeout(previewTimer);
    previewTimer = window.setTimeout(() => { CFG.save(state); refreshStatus(); }, 300);
  };

  /* ---------- small DOM helpers ---------- */
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, '');
      else if (v !== false && v != null) el.setAttribute(k, v);
    });
    kids.flat().forEach((kid) => kid != null && el.append(kid.nodeType ? kid : document.createTextNode(kid)));
    return el;
  };
  let uid = 0;
  const nextId = () => `f${(uid += 1)}`;

  // Photos are resized in the browser (fast uploads, light pages), then uploaded.
  const RESIZABLE = /^image\/(jpeg|png|webp)$/;
  const prepareImage = (file) => new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) { reject(new Error('Please choose an image file.')); return; }
    if (file.type === 'image/svg+xml') { reject(new Error('SVG files cannot be uploaded. Save it as PNG (transparent) or JPG and upload that.')); return; }
    if (file.type === 'image/gif') { resolve(file); return; }   // keep animation
    if (!RESIZABLE.test(file.type)) { reject(new Error('Please choose a JPG, PNG, WebP or GIF image.')); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('That image could not be read.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That image could not be opened.'));
      img.onload = () => {
        const keepAlpha = /png|webp/.test(file.type);
        const max = keepAlpha ? 1600 : 2000;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        // Already small enough: upload the original file untouched (best quality).
        if (scale === 1 && file.size < 1.5 * 1024 * 1024) { resolve(file); return; }
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!keepAlpha) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const type = keepAlpha ? 'image/webp' : 'image/jpeg';
        canvas.toBlob((blob) => {
          if (!blob) { resolve(file); return; }
          // Browsers without WebP export give PNG — still fine.
          const ext = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';
          resolve(new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'photo'}.${ext}`, { type: blob.type }));
        }, type, keepAlpha ? 0.9 : 0.85);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  const uploadFile = (file, onProgress) => {
    const form = new FormData();
    form.append('file', file, file.name);
    return api('upload', { form, onProgress });
  };

  /* ---------- field editors ---------- */
  const field = (def, get, set) => {
    const id = nextId();
    const wrap = h('div', { class: `field field--${def.type}` });
    const append = wrap.append.bind(wrap);
    wrap.append = (...nodes) => append(...nodes.filter((n) => n != null));
    const label = h('label', { for: id }, def.label || '');
    const hint = def.hint ? h('p', { class: 'hint' }, def.hint) : null;
    const value = get();
    if (def.type === 'textarea') {
      wrap.append(label, h('textarea', { id, rows: def.rows || 3, oninput: (e) => { set(e.target.value); persist(); } }, value ?? ''), hint);
    } else if (def.type === 'number') {
      wrap.append(label, h('input', { id, type: 'number', min: def.min, max: def.max, step: def.step || 1, value: value ?? '', oninput: (e) => { set(Number(e.target.value)); persist(); } }), hint);
    } else if (def.type === 'checkbox') {
      const box = h('input', { id, type: 'checkbox', checked: !!value, onchange: (e) => { set(e.target.checked); persist(); } });
      wrap.append(h('label', { class: 'check-field', for: id }, box, ' ', def.label || ''), hint);
    } else if (def.type === 'select') {
      const opts = typeof def.options === 'function' ? def.options() : def.options;
      const select = h('select', { id, onchange: (e) => { set(e.target.value); persist(); } }, opts.map((o) => h('option', { value: o.value, selected: String(o.value) === String(value) }, o.label)));
      wrap.append(label, select, hint);
    } else if (def.type === 'image') {
      const isData = String(value || '').startsWith('data:');
      const thumb = h('img', { class: 'field-thumb', alt: '', src: CFG.safeMedia(value) || '' });
      thumb.hidden = !value;
      const input = h('input', { id, type: 'text', value: isData ? '' : (value || ''), placeholder: isData ? 'Uploaded image (paste a link or path to replace it)' : 'assets/photo.jpg or https://…' });
      const file = h('input', { type: 'file', accept: 'image/*', hidden: true });
      const apply = (v) => { set(v); thumb.src = CFG.safeMedia(v) || ''; thumb.hidden = !v; persist(); };
      const note = h('p', { class: 'upload-note', role: 'status' });
      const uploadBtn = h('button', { type: 'button', class: 'small-button', onclick: () => file.click() }, 'UPLOAD');
      input.addEventListener('input', () => apply(input.value.trim()));
      file.addEventListener('change', async () => {
        const chosen = file.files[0];
        file.value = '';
        if (!chosen) return;
        uploadBtn.disabled = true;
        note.classList.remove('is-error');
        note.textContent = 'Preparing…';
        try {
          const ready = await prepareImage(chosen);
          const done = await uploadFile(ready, (p) => { note.textContent = `Uploading… ${Math.round(p * 100)}%`; });
          input.value = done.url; input.placeholder = 'assets/photo.jpg or https://…';
          apply(done.url);
          if (done.preview) thumb.src = done.preview;
          note.textContent = 'Uploaded to GitHub — press SAVE to use it on the website.';
        } catch (err) { note.textContent = err.message; note.classList.add('is-error'); }
        uploadBtn.disabled = false;
      });
      const row = h('div', { class: 'image-row' }, thumb, h('div', { class: 'image-inputs' }, input, h('div', { class: 'image-buttons' },
        uploadBtn,
        h('button', { type: 'button', class: 'small-button', onclick: () => { input.value = ''; input.placeholder = 'assets/photo.jpg or https://…'; note.textContent = ''; apply(''); } }, 'CLEAR')), note), file);
      wrap.append(label, row, hint);
    } else if (def.type === 'video') {
      const input = h('input', { id, type: 'text', value: value ?? '', placeholder: 'assets/hero-video.mp4 or https://…' });
      const file = h('input', { type: 'file', accept: 'video/mp4,video/webm', hidden: true });
      const note = h('p', { class: 'upload-note', role: 'status' });
      const bar = h('progress', { class: 'upload-progress', max: 100, value: 0, hidden: true });
      const uploadBtn = h('button', { type: 'button', class: 'small-button', onclick: () => file.click() }, 'UPLOAD VIDEO');
      input.addEventListener('input', () => { set(input.value.trim()); persist(); });
      file.addEventListener('change', async () => {
        const chosen = file.files[0];
        file.value = '';
        if (!chosen) return;
        if (!/^video\/(mp4|webm)$/.test(chosen.type)) { note.textContent = 'Please choose an MP4 (or WebM) video.'; note.classList.add('is-error'); return; }
        uploadBtn.disabled = true; bar.hidden = false; bar.value = 0;
        note.classList.remove('is-error');
        note.textContent = `Uploading ${(chosen.size / 1048576).toFixed(1)} MB…`;
        try {
          const done = await uploadFile(chosen, (p) => { bar.value = Math.round(p * 100); });
          input.value = done.url; set(done.url); persist();
          note.textContent = 'Uploaded to GitHub — press SAVE to use it on the website.';
        } catch (err) { note.textContent = err.message; note.classList.add('is-error'); }
        uploadBtn.disabled = false; bar.hidden = true;
      });
      wrap.append(label, input, h('div', { class: 'image-buttons' }, uploadBtn), bar, note, file, hint);
    } else {
      wrap.append(label, h('input', { id, type: 'text', value: value ?? '', oninput: (e) => { set(e.target.value); persist(); } }), hint);
    }
    return wrap;
  };

  const listEditor = (def) => {
    const box = h('div', { class: 'list-editor' });
    const title = h('div', { class: 'list-head' }, h('h3', {}, def.label || ''), h('span', { class: 'list-count' }));
    const ol = h('ol', { class: 'list-items' });
    let dragFrom = null;
    const items = () => getPath(def.path) || [];
    const itemTitle = (item, i) => {
      const raw = def.titleKey ? item[def.titleKey] : '';
      const text = def.titleKey === 'platform' ? (CFG.SOCIAL_NAMES[raw] || raw) : raw;
      const tag = def.titleFn ? def.titleFn(item) : '';
      return `${def.itemName || 'Item'} ${i + 1}${tag ? ` · ${tag}` : ''}${text ? ` — ${String(text).replace(/\s+/g, ' ').slice(0, 60)}` : ''}`;
    };
    // Optional filter (food shots by category).
    let filter = '';
    const filterSelect = def.filterKey ? h('select', { class: 'list-filter', 'aria-label': def.filterLabel || 'Filter', onchange: (e) => { filter = e.target.value; render(); } }) : null;
    const fillFilter = () => {
      if (!filterSelect) return;
      const opts = def.filterOptions();
      if (filter && !opts.some((o) => o.value === filter)) filter = '';
      filterSelect.replaceChildren(h('option', { value: '' }, 'All'), ...opts.map((o) => h('option', { value: o.value, selected: o.value === filter }, o.label)));
    };
    const changed = () => { persist(); if (def.onChange) def.onChange(); };
    const move = (from, to) => {
      const list = items();
      if (to < 0 || to >= list.length || from === to) return;
      const [it] = list.splice(from, 1); list.splice(to, 0, it);
      changed(); render();
    };
    const render = () => {
      const list = items();
      fillFilter();
      const inView = (item) => !filter || item[def.filterKey] === filter;
      const pool = list.filter(inView);
      const shown = pool.filter((x) => x.visible !== false).length;
      title.querySelector('.list-count').textContent = def.noHide ? `${pool.length}` : `${shown} of ${pool.length} shown`;
      ol.replaceChildren(...list.map((item, i) => [item, i]).filter(([item]) => inView(item)).map(([item, i]) => {
        const head = h('div', { class: 'item-head' },
          def.noReorder ? null : h('span', { class: 'drag-handle', 'aria-hidden': 'true', title: 'Drag to reorder' }, '⋮⋮'),
          h('strong', { class: 'item-title' }, itemTitle(item, i)));
        const controls = h('div', { class: 'item-controls' });
        if (!def.noHide) {
          const cb = h('input', { type: 'checkbox', checked: item.visible !== false, onchange: (e) => { item.visible = e.target.checked; changed(); render(); } });
          controls.append(h('label', { class: 'show-toggle' }, cb, ' Show'));
        }
        if (!def.noReorder) {
          controls.append(
            h('button', { type: 'button', class: 'small-button', 'aria-label': `Move ${itemTitle(item, i)} up`, disabled: i === 0, onclick: () => move(i, i - 1) }, '↑'),
            h('button', { type: 'button', class: 'small-button', 'aria-label': `Move ${itemTitle(item, i)} down`, disabled: i === list.length - 1, onclick: () => move(i, i + 1) }, '↓'));
        }
        if (!def.fixed) {
          controls.append(h('button', { type: 'button', class: 'small-button small-button--danger', onclick: () => {
            if (!confirm(`Remove ${itemTitle(item, i)}?`)) return;
            list.splice(i, 1); changed(); render();
          } }, 'REMOVE'));
        }
        const body = def.fields.length ? h('div', { class: 'item-body' }, def.fields.map((f) => field(f, () => item[f.key], (v) => {
          item[f.key] = v;
          if (f.key === def.titleKey || f.key === def.filterKey) li.querySelector('.item-title').textContent = itemTitle(item, i);
          if (f.key === def.titleKey && def.onChange) { window.clearTimeout(li.refresh); li.refresh = window.setTimeout(def.onChange, 400); }
        }))) : null;
        const li = h('li', { class: `list-item${item.visible === false ? ' is-hidden' : ''}`, draggable: def.noReorder ? false : 'true' }, h('div', { class: 'item-bar' }, head, controls), body);
        if (!def.noReorder) {
          li.addEventListener('dragstart', (e) => { if (e.target.closest('input, textarea, select, button')) { e.preventDefault(); return; } dragFrom = i; li.classList.add('is-dragging'); e.dataTransfer.effectAllowed = 'move'; });
          li.addEventListener('dragend', () => { dragFrom = null; li.classList.remove('is-dragging'); });
          li.addEventListener('dragover', (e) => { if (dragFrom !== null) { e.preventDefault(); li.classList.add('is-target'); } });
          li.addEventListener('dragleave', () => li.classList.remove('is-target'));
          li.addEventListener('drop', (e) => { e.preventDefault(); li.classList.remove('is-target'); if (dragFrom !== null) move(dragFrom, i); });
        }
        return li;
      }));
    };
    if (filterSelect) title.append(h('label', { class: 'list-filter-label' }, `${def.filterLabel || 'Filter'} `, filterSelect));
    box.append(title, ol);
    if (!def.fixed) {
      box.append(h('button', { type: 'button', class: 'add-button', onclick: () => {
        const fresh = typeof def.newItem === 'function' ? def.newItem() : JSON.parse(JSON.stringify(def.newItem || { visible: true }));
        if (def.filterKey && filter) fresh[def.filterKey] = filter;
        items().push(fresh); changed(); render();
        ol.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        ol.lastElementChild?.querySelector('input:not([type=checkbox]), textarea')?.focus();
      } }, `+ ADD ${String(def.itemName || 'item').toUpperCase()}`));
    }
    render();
    box.rerender = render;
    return box;
  };

  /* ---------- build the editor ---------- */
  const editor = document.getElementById('editor');
  const toc = document.getElementById('editor-toc');
  const build = () => {
    editor.replaceChildren();
    toc.replaceChildren();
    SCHEMA.forEach((section, index) => {
      const details = h('details', { class: 'editor-section', id: `edit-${section.id}`, open: index === 0 ? true : false },
        h('summary', {}, h('h2', {}, section.title)),
        section.note ? h('p', { class: 'hint section-note' }, section.note) : null,
        section.fields.map((f) => {
          if (f.type !== 'list') return field(f, () => getPath(f.path), (v) => setPath(f.path, v));
          const ed = listEditor(f);
          if (f.path === 'products.items') refreshProducts = () => ed.rerender();
          return ed;
        }));
      if (section.preview === 'map') {
        const link = h('a', { class: 'small-link', target: '_blank', rel: 'noopener', href: CFG.mapsDirections(state.location) }, 'TEST THE MAP LINK ↗');
        details.append(link);
        details.addEventListener('input', () => { link.href = CFG.mapsDirections(state.location); });
      }
      editor.append(details);
      toc.append(h('a', { href: `#edit-${section.id}`, onclick: () => { details.open = true; } }, section.title));
    });
  };
  build();

  /* ---------- save / discard ---------- */
  const publishMsg = document.getElementById('publish-message');
  const time = (d) => d.toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const save = async (note = 'Saved') => {
    if (saving) return;
    saving = true; refreshStatus();
    setStatus('Saving…');
    const sending = JSON.stringify(state);
    try {
      const res = await api('save', { body: { content: state, note: note === 'Saved' ? 'update content' : note } });
      savedJson = sending;   // edits made while saving stay unsaved
      CFG.save(state);
      try { localStorage.removeItem('seven-admin-recover'); } catch { /* blocked */ }
      saving = false; refreshStatus();
      if (!isDirty()) setStatus(`Saved · ${time(new Date())}`);
      publishMsg.textContent = res.unchanged ? 'Nothing changed — no new version needed.' : `Saved to GitHub ${time(new Date())} (${res.files.join(', ')}). The live site updates in about 1–2 minutes.`;
      loadRevisions();
      return true;
    } catch (err) {
      saving = false; refreshStatus();
      setStatus('Not saved — see message', 'error');
      publishMsg.textContent = `Not saved: ${err.message}`;
      return false;
    }
  };
  saveButtons.forEach((b) => b && b.addEventListener('click', () => save()));
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (isDirty()) save(); }
  });
  window.addEventListener('beforeunload', (e) => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });
  resetButton.addEventListener('click', () => {
    if (!confirm('Discard all changes you have not saved?')) return;
    state = JSON.parse(savedJson); CFG.save(state); build(); refreshStatus();
    publishMsg.textContent = 'Unsaved changes discarded.';
  });

  /* ---------- version history ---------- */
  const revList = document.getElementById('revision-list');
  const loadRevisions = async () => {
    try {
      const { revisions } = await api('revisions');
      if (!revisions.length) { revList.replaceChildren(h('li', { class: 'hint' }, 'No saved versions yet.')); return; }
      revList.replaceChildren(...revisions.map((r, i) => h('li', { class: 'revision' },
        h('span', { class: 'revision-when' }, time(new Date(r.created_at))),
        h('span', { class: 'revision-note' }, `${i === 0 ? `${r.note} · current` : r.note}${r.by ? ` — ${r.by}` : ''}`),
        i === 0 ? null : h('button', { type: 'button', class: 'small-button', onclick: async (e) => {
          if (isDirty() && !confirm('You have unsaved changes. Restoring will throw them away. Continue?')) return;
          if (!confirm(`Put the website back to the version from ${time(new Date(r.created_at))}?`)) return;
          e.target.disabled = true;
          try {
            const res = await api('restore', { body: { id: r.id } });
            state = res.content; savedJson = JSON.stringify(state);
            CFG.save(state); build(); refreshStatus();
            publishMsg.textContent = `Restored the version from ${time(new Date(r.created_at))}. The live site updates in about 1–2 minutes.`;
            loadRevisions();
          } catch (err) { alert(err.message); e.target.disabled = false; }
        } }, 'RESTORE'))));
    } catch (err) { revList.replaceChildren(h('li', { class: 'hint' }, err.message)); }
  };

  /* ---------- backup / import ---------- */
  document.getElementById('export-button').addEventListener('click', () => {
    const stamp = new Date().toISOString().slice(0, 10);
    const body = `${JSON.stringify(CFG.splitContent(state), null, 2)}\n`;
    const url = URL.createObjectURL(new Blob([body], { type: 'application/json' }));
    const a = h('a', { href: url, download: `seven-content-backup-${stamp}.json` });
    document.body.append(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  });
  const importFile = document.getElementById('import-file');
  document.getElementById('import-button').addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', async () => {
    try {
      const text = await importFile.files[0].text();
      const json = text.trim().startsWith('{') ? text : text.slice(text.indexOf('=') + 1).trim().replace(/;\s*$/, '');
      const data = JSON.parse(json);
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
      // A backup made here ({ "content/site.json": {...}, ... }) or an old dashboard backup (one object).
      state = Object.keys(data).some((k) => k.startsWith('content/')) ? CFG.joinContent(data) : CFG.merge(state, data);
      CFG.save(state); build(); refreshStatus();
      publishMsg.textContent = 'Imported into the editor. Check it with PREVIEW, then press SAVE to publish it.';
      document.getElementById('publish-title').scrollIntoView({ behavior: 'smooth' });
    } catch { alert('That file could not be read. Choose a backup made by this admin page.'); }
    importFile.value = '';
  });

  /* ---------- account ---------- */
  document.getElementById('logout-button').addEventListener('click', () => {
    if (isDirty() && !confirm('You have unsaved changes. Disconnect anyway?')) return;
    savedJson = JSON.stringify(state);
    CFG.reset();
    window.SEVEN_ADMIN_DISCONNECT();
  });

  /* ---------- start ---------- */
  // Unsaved work kept from an expired session.
  try {
    const kept = localStorage.getItem('seven-admin-recover');
    if (kept) {
      localStorage.removeItem('seven-admin-recover');
      if (kept !== savedJson && confirm('You have unsaved changes from before you were signed out. Load them back into the editor?')) {
        state = JSON.parse(kept); build();
      }
    }
  } catch { /* storage blocked */ }
  CFG.save(state);
  refreshStatus();
  loadRevisions();
};
