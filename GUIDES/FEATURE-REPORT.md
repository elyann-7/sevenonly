# Feature verification report — SEVEN migration to GitHub Pages

Legend: ✅ tested and working · ⚙️ works, needs your account/setup · ⚠️ needs your content · 🌐 can only be confirmed after going live

## What was found in the original project

| Item | Purpose | What happened |
|---|---|---|
| `admin.php`, `api.php`, `install.php`, `content.php`, `app/*.php` | Online admin with login, saving to MySQL, uploads, version history | **Replaced** by `admin.html` + GitHub API (same editor, same features) |
| `database/schema.sql` (MySQL) | Content, menu rows, media, revisions, admins | **Replaced** by `content/*.json`; history = GitHub commits |
| `.htaccess`, `.user.ini`, `uploads/.htaccess` | Apache security headers, PHP upload limits | **Removed** (GitHub Pages ignores them). Security policy moved into a `<meta>` Content-Security-Policy on every page |
| Netlify | Old host (mentioned in Legal notices) | No Netlify files/config remained; legal text now names GitHub Pages |
| Contact forms | — | None existed (contact is phone/email/WhatsApp links), so no form backend was needed |

No Netlify functions, no third-party libraries or frameworks were in use — none added.

## Pages

| Page | Status |
|---|---|
| Home (`index.html`) — hero video, marquee, photo slider, Our Story, Our Menu (burger layers), Best Seller, Partners, Franchise, Location, Playlist, Instagram, Contact | ✅ |
| Menu (`menu.html`) | ✅ |
| Legal notices / Terms / Cookies | ✅ (hosting text updated) |
| 404 page | ✅ new, in SEVEN style |
| Screen preview (`preview.html`) | ✅ |
| Admin (`admin.html`) | ✅ tested against a simulated GitHub API; ⚙️ needs your token for real use |
| Blog, "How We Work", "Premium Burger", separate Partnership/Contact pages | **Did not exist** in the project — not invented. Partners, Franchise and Contact are homepage sections (all kept). |

## Content management

| Feature | Status |
|---|---|
| All content in `content/site.json`, `pages.json`, `menu.json`, `socials.json`, `media.json`, `settings.json` | ✅ |
| Change one value → appears after publish | ✅ tested (local server + admin save test) |
| Menu: add/remove/reorder products, prices, descriptions, photos | ✅ |
| Menu: **new** ingredients line | ✅ |
| Menu: **new** available / SOLD OUT | ✅ tested |
| Menu page design | ✅ pixel-identical to the original (mobile + desktop) |
| Menu: add categories, list or card layout | ✅ |
| Broken JSON never reaches the live site (checked before every publish) | ✅ tested with a deliberate mistake |
| Missing/mis-spelled image paths blocked before publish | ✅ tested |
| Admin: edit, upload photos/videos, preview, save (one commit), version history, restore, backup/import | ✅ simulated; ⚙️ needs your token |

## Social media & links

| Feature | Status |
|---|---|
| Instagram links → `instagram.com/seven.iraq` | ✅ |
| WhatsApp → `wa.me/9647701525140` | Ready in `content/socials.json` but **switched off** (it was not in the original design). Set `"visible": true` to add the icon |
| Facebook, TikTok, YouTube icons | ✅ original design; linked to `facebook.com/seven.iraq`, `tiktok.com/@seven.iraq`, `youtube.com/@seven.iraq` (same name as Instagram) — 🌐 tap each once after launch to confirm |
| Phone `tel:` and email `mailto:` links, franchise email | ✅ |
| Directions button + map → Google Maps "Grand Boulevard – Nergis Park, Sulaymaniyah" | ✅ link correct; 🌐 check the pin; for an exact pin paste a Google Maps share link in `site.json → location.mapsLink` |
| Internal navigation (header, 3-dot mobile menu, footer, section anchors, back links) | ✅ all 12 internal links + anchors tested |
| No `#` links remain (Facebook/TikTok/YouTube are icons without a link until you add one) | ✅ tested |

## Instagram feed

| Feature | Status |
|---|---|
| Hand-picked posts (real posts, link to Instagram) | ✅ showing now |
| Automatic feed via official Instagram API + GitHub Actions, token in GitHub Secrets | ✅ code tested with a simulated Instagram API; ⚙️ needs Meta app + token (`INSTAGRAM-SETUP.md`) |
| Automatic token renewal | ⚙️ optional second secret |
| Fallback if token expires | ✅ falls back to hand-picked posts, publish never fails |

## Things that need your content (placeholders, clearly identified)

| Item | Where |
|---|---|
| ⚠️ **All 22 menu products are still "Item Name / Short tagline / Short description"** with no prices or photos, exactly as in the original | `content/menu.json` (the publish log lists each one as a warning) |
| ⚠️ The 3 homepage Best Seller burgers share one photo | `content/pages.json → bestSellers.items` |
| ⚠️ **Playlist section is hidden** — its 6 items were placeholders with no links | add real YouTube/Spotify links in `content/pages.json → playlist.items`, then set `"visible": true` for `playlist` in `content/settings.json` |
| Empty "photo coming soon" slider slots | removed from the slider (add photos in `content/media.json → gallery.slides`) |

## Design, performance, SEO, security

| Item | Status |
|---|---|
| Branding, fonts (kept as supplied), layout, animations, intro | ✅ unchanged CSS; screenshots checked on mobile 390px, tablet 820px, desktop 1440px |
| No console errors, no missing files | ✅ |
| Hero video plays | ✅ (8 MB MP4) |
| SEO: titles, descriptions, canonical URLs, sitemap.xml, robots.txt, restaurant structured data | ✅ |
| Social preview image (WhatsApp/Facebook/Instagram link cards) `assets/share-image.jpg` 1200×630 | ✅ file; 🌐 confirm with Facebook Sharing Debugger after launch |
| Favicon / phone home-screen icon | ✅ new (seven red bars) |
| Content-Security-Policy, referrer policy, admin `noindex` | ✅ |
| No passwords, tokens or API keys in any file | ✅ scanned |
| Works when opened straight from the folder (double-click) as well as on the live site | ✅ tested |
| Fixed bug: menu product images had a broken `alt` attribute | ✅ |

## Only verifiable after you go live 🌐

- GitHub Actions publish run (workflow validated, but runs only on GitHub).
- sevenonly.com DNS, `www` redirect, HTTPS certificate.
- Admin saving to your real repository with your token.
- Instagram automatic feed with your real account.
- Google Map loading (blocked in my test environment's network; the map code is unchanged from the original).
