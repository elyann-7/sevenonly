# SEVEN Smash Burger — website

Static website for **sevenonly.com**, hosted free on **GitHub Pages**.
HTML + CSS + vanilla JavaScript. No PHP, no database, no Netlify.

## Where things are

| What | Where |
|---|---|
| All text, photos, links, menu, socials, settings | `content/*.json` (see `GUIDES/EDITING-GUIDE.md`) |
| Visual editor (optional) | `https://sevenonly.com/admin.html` |
| Pages | `index.html`, `menu.html`, `legal-notices.html`, `terms.html`, `cookies.html`, `404.html` |
| Design | `style.css`, `art-direction.css`, `scenes.css`, `menu.css`, `screens/*.css` |
| Photos, video, fonts, logos | `assets/` (admin uploads go to `assets/uploads/`) |
| Publishing robot | `.github/workflows/deploy.yml` |
| Content checker / Instagram sync | `tools/` |

## Guides

1. `GUIDES/PUBLISHING-GUIDE.md` — put the site on GitHub Pages (first time)
2. `GUIDES/GODADDY-DOMAIN.md` — connect sevenonly.com and turn on HTTPS
3. `GUIDES/EDITING-GUIDE.md` — change prices, products, photos, text, social links
4. `GUIDES/INSTAGRAM-SETUP.md` — optional automatic Instagram feed
5. `GUIDES/MAINTENANCE.md` — keeping everything running
6. `GUIDES/FEATURE-REPORT.md` — what was changed, tested, and what still needs you

## Preview on your computer

Double-click `index.html` — it works straight from the folder (it reads
`content/content-bundle.js`, a copy of the JSON files). If you edit the JSON
files on your computer, run `node tools/build-bundle.mjs` to refresh that copy
before previewing. On GitHub this copy is rebuilt automatically, so the live site
always shows the latest JSON.
