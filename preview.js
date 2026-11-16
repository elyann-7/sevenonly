/* SEVEN — all screens preview. Opened from the admin with ?preview=1 it shows unsaved changes. */
const previewQuery = new URLSearchParams(window.location.search).get('preview') === '1' ? '&preview=1' : '';
// Each frame is forced to one design (?screen=…) at a typical size for that screen type.
const SCREENS = [
  { type: 'mobile', label: 'Mobile', w: 390, h: 844 },
  { type: 'tablet', label: 'Tablet', w: 820, h: 1180 },
  { type: 'laptop', label: 'Laptop', w: 1366, h: 820 },
  { type: 'desktop', label: 'Desktop', w: 1536, h: 900 },
  { type: 'large', label: 'Large desktop', w: 2560, h: 1440 }
];
const frames = document.getElementById('frames');
const tabs = document.getElementById('tabs');
let only = null;
const render = () => {
  frames.replaceChildren();
  const list = only ? SCREENS.filter((s) => s.type === only) : SCREENS;
  const avail = Math.min(window.innerWidth - 40, only ? 1600 : 520);
  list.forEach((s) => {
    const scale = Math.min(1, avail / s.w);
    const fig = document.createElement('figure');
    fig.innerHTML = `<figcaption>${s.label} <span>${s.w}×${s.h}</span></figcaption><div class="frame" style="width:${Math.round(s.w * scale)}px;height:${Math.round(s.h * scale)}px"><iframe title="${s.label} preview" src="index.html?screen=${s.type}${previewQuery}" width="${s.w}" height="${s.h}" style="transform:scale(${scale})"></iframe></div>`;
    frames.append(fig);
  });
  tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.type || null) === only)));
};
[{ type: '', label: 'All' }, ...SCREENS].forEach((s) => {
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = s.label; b.dataset.type = s.type;
  b.addEventListener('click', () => { only = s.type || null; render(); });
  tabs.append(b);
});
render();
