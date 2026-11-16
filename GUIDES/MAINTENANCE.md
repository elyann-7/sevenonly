# Maintenance — keeping the website running without a developer

## Everyday changes

- Prices, products, sold out, photos, text, social links → `EDITING-GUIDE.md`.
- Every commit publishes automatically (1–2 minutes). Check the **Actions** tab
  if something doesn't appear: green = published, red = a file has a mistake
  (the log names the file and line; the live site stays as it was).

## Seeing your change

GitHub Pages lets browsers keep files for up to 10 minutes. If you don't see a
change: wait a moment and refresh (phone: close and reopen the tab; computer:
Ctrl/Cmd + Shift + R).

## Undo a mistake

- **Admin page** → Version history → RESTORE.
- **github.com** → the file → **History** → open an older version → copy its
  content back with the pencil. (GitHub Desktop: right-click a commit → *Revert*.)

## Reminders to put in your calendar

| When | What |
|---|---|
| Before your admin token expires (e.g. yearly) | Make a new fine-grained token (EDITING-GUIDE → Admin page) |
| Every ~50 days (only if no `SECRETS_ADMIN_TOKEN`) | Replace the Instagram token (INSTAGRAM-SETUP) |
| Yearly | Renew the domain at GoDaddy (auto-renew recommended) |
| If GitHub emails "scheduled workflow disabled" | Actions tab → Publish website → Enable workflow |

## Adding a page

Copy `terms.html`, rename it (e.g. `catering.html`), change the title, description
and text inside `<article class="legal">`. Add a link to it in
`content/site.json` → `header.nav` or `footer.links`, and add it to `sitemap.xml`.

## Things to keep as they are

- `.github/workflows/deploy.yml` — the publishing robot.
- `CNAME` (`sevenonly.com`), `.nojekyll`, `site-config.js`, `tools/`.
- Keep the repository **public** (free Pages) and **never** put a token or password in a file.

## Size limits

GitHub warns about files over 50 MB and refuses files over 100 MB; a repository
should stay under ~1 GB. Keep videos under ~20 MB and photos under ~1 MB.
