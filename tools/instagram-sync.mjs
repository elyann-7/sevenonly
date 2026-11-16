// SEVEN — automatic Instagram feed (runs inside GitHub Actions, never in the browser).
// Reads the latest posts with the official Instagram API (Instagram API with
// Instagram Login), saves the pictures next to the site and writes
// content/instagram-feed.json into the folder that is being published.
//
// Needs the repository secret INSTAGRAM_ACCESS_TOKEN (see GUIDES/INSTAGRAM-SETUP.md).
// The token stays in GitHub's encrypted secrets; it is never written to any file.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2] || '_site';
const token = process.env.INSTAGRAM_ACCESS_TOKEN;
const refresh = process.env.INSTAGRAM_REFRESH === '1';
const settings = JSON.parse(readFileSync('content/settings.json', 'utf8'));
const max = Math.min(30, Math.max(1, Number(settings.instagramFeed?.maxPosts) || 12));

if (!token) { console.log('No INSTAGRAM_ACCESS_TOKEN secret: the hand-picked posts in content/media.json are used.'); process.exit(0); }

const api = async (url) => {
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error?.message || `HTTP ${res.status}`);
  return body;
};

try {
  if (refresh) {
    // Long-lived tokens last 60 days; refreshing gives 60 more. The new token is
    // written to a file only inside the runner, for the next step to store as a secret.
    const r = await api(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`);
    writeFileSync(process.env.RUNNER_TEMP ? join(process.env.RUNNER_TEMP, 'ig-token') : '/tmp/ig-token', r.access_token);
    console.log(`Token refreshed (valid ${Math.round(r.expires_in / 86400)} more days).`);
  }
  const me = await api(`https://graph.instagram.com/me?fields=username&access_token=${encodeURIComponent(token)}`);
  const list = await api(`https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=${max}&access_token=${encodeURIComponent(token)}`);
  const dir = join(OUT, 'assets', 'instagram');
  mkdirSync(dir, { recursive: true });
  const posts = [];
  for (const m of list.data || []) {
    const src = m.media_type === 'VIDEO' ? m.thumbnail_url : m.media_url;
    if (!src || !m.permalink) continue;
    // Instagram picture links expire, so the picture is copied into the site.
    const img = await fetch(src);
    if (!img.ok) continue;
    const file = `assets/instagram/${m.id}.jpg`;
    writeFileSync(join(OUT, file), Buffer.from(await img.arrayBuffer()));
    const caption = String(m.caption || '').replace(/\s+/g, ' ').trim();
    posts.push({ id: m.id, image: file, url: m.permalink, alt: caption ? `SEVEN on Instagram: ${caption.slice(0, 120)}` : 'SEVEN Instagram post', date: m.timestamp, visible: true });
  }
  const feed = { _help: 'Written automatically by GitHub Actions. Do not edit by hand.', updated: new Date().toISOString(), account: me.username, posts };
  mkdirSync(join(OUT, 'content'), { recursive: true });
  writeFileSync(join(OUT, 'content', 'instagram-feed.json'), `${JSON.stringify(feed, null, 2)}\n`);
  console.log(`Instagram feed: ${posts.length} posts from @${me.username}.`);
} catch (err) {
  // Never stop the website from publishing because of Instagram: the site falls back to the hand-picked posts.
  console.log(`::warning::Instagram feed not updated: ${err.message}. The website shows the hand-picked posts instead. If the token expired, follow GUIDES/INSTAGRAM-SETUP.md → "Token expired".`);
}
