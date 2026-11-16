# Connecting sevenonly.com (GoDaddy) to GitHub Pages

Do this **after** the site works at `https://YOUR-USERNAME.github.io/seven-website/`.
Replace `YOUR-USERNAME` below with your GitHub username (lower-case).

---

## Step 1 — (recommended) verify the domain on GitHub

This stops anyone else from ever claiming sevenonly.com on GitHub.

1. github.com → your profile picture → **Settings** → **Pages** (left menu, under "Code, planning, and automation").
2. **Add a domain** → type `sevenonly.com` → **Add domain**.
3. GitHub shows a **TXT record** like
   `_github-pages-challenge-YOUR-USERNAME` with a long value. Keep this page open.
4. Add that TXT record at GoDaddy (Step 3 below, "Add New Record" → Type **TXT**),
   wait a few minutes, then click **Verify** on GitHub.

## Step 2 — tell the repository its domain

1. Repository → **Settings** → **Pages**.
2. **Custom domain**: type `sevenonly.com` → **Save**.
   (The DNS check will fail until Step 3 is done — that is normal.)

> The repository also contains a `CNAME` file with `sevenonly.com`. With the
> "GitHub Actions" publishing source, GitHub uses the setting above; the file is
> kept as a reminder and as a backup. Don't put anything else in it.

## Step 3 — DNS records at GoDaddy

1. Sign in at **godaddy.com** → **My Products**.
2. Next to **sevenonly.com** click **DNS** (or **Manage DNS**).
3. **First, clean up** (very common cause of failure):
   - If GoDaddy **Forwarding** is switched on for the domain, remove it.
   - Delete any existing **A** record whose Name is **@** (often "Parked" or a
     GoDaddy Website Builder IP).
   - Delete any existing **CNAME** record whose Name is **www**.
   - If you used a GoDaddy website builder, disconnect it from the domain.
   - **Do NOT delete MX, TXT (SPF/DKIM) or other email records** — they keep
     `info@sevenonly.com` and `franchise@sevenonly.com` working.
4. **Add these records** (Add New Record):

| Type | Name | Value | TTL |
|---|---|---|---|
| A | @ | 185.199.108.153 | 1 hour |
| A | @ | 185.199.109.153 | 1 hour |
| A | @ | 185.199.110.153 | 1 hour |
| A | @ | 185.199.111.153 | 1 hour |
| CNAME | www | YOUR-USERNAME.github.io | 1 hour |

   Optional (IPv6, recommended):

| Type | Name | Value |
|---|---|---|
| AAAA | @ | 2606:50c0:8000::153 |
| AAAA | @ | 2606:50c0:8001::153 |
| AAAA | @ | 2606:50c0:8002::153 |
| AAAA | @ | 2606:50c0:8003::153 |

   The CNAME value is your **username**.github.io — **not** the repository name,
   and with no `https://`.

5. Save.

## Step 4 — wait and check

- DNS changes usually work within 30 minutes; sometimes up to 24–48 hours.
- Check at **dnschecker.org**: search `sevenonly.com` (type A) — you should see the
  four `185.199.x.153` addresses.
- Repository → **Settings → Pages** shows *"DNS check successful"*.
- `www.sevenonly.com` automatically redirects to `sevenonly.com`.

## Step 5 — HTTPS

1. **Settings → Pages** → tick **Enforce HTTPS**.
2. If the box is greyed out, GitHub is still creating the certificate — wait (up to
   24 hours) and refresh. If it stays grey: remove the custom domain, Save, add it
   again, Save.
3. Open **https://sevenonly.com** — the padlock should show.

## Troubleshooting

| Problem | Fix |
|---|---|
| "DNS check unsuccessful" | Old A/CNAME records or GoDaddy forwarding still there; or wait longer. |
| Site shows GoDaddy "Parked" page | The old `@` A record is still present — delete it. |
| `www` doesn't work | CNAME `www` → `YOUR-USERNAME.github.io` missing or wrong. |
| Email stopped working | An MX record was deleted — re-add it from your email provider's instructions. |
| 404 "There isn't a GitHub Pages site here" | Custom domain not saved in Settings → Pages, or the publish workflow hasn't run. |
