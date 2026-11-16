# Instagram feed — how it works and how to make it automatic

## Two modes

| Mode | What visitors see | Setup |
|---|---|---|
| **Hand-picked** (works now) | The posts you list in `content/media.json → instagramPosts` (picture + link to the real post) | None |
| **Automatic** | Your latest real posts from @seven.iraq, refreshed every 6 hours | One-time Meta + GitHub setup below (free) |

`content/settings.json → instagramFeed.mode`:
- `"auto"` (default) — use the automatic feed when it has posts, otherwise the hand-picked posts.
- `"manual"` — always the hand-picked posts.

Right now the site shows the **2 real hand-picked posts** that were already on
the old site. Nothing is labelled "live" that isn't.

## Why there is a setup step

GitHub Pages only serves files — it cannot log in to Instagram. Instagram's old
no-review "Basic Display API" was shut down by Meta in December 2024. The
official way today is the **Instagram API with Instagram Login**, which needs:

- an Instagram **professional** account (Business or Creator — free to switch in the app),
- a free **Meta developer** app,
- an **access token** (valid 60 days, can be renewed).

The token is secret, so it must **never** be in the website files. It goes into
**GitHub Secrets** (encrypted). The publishing robot (GitHub Actions) uses it every
6 hours to download the latest posts and their pictures into the published site.
Visitors' browsers never see the token. No paid service is used.

## Setup (about 20–30 minutes, once)

Meta redesigns these screens often; the names below may differ slightly.

1. **Professional account.** Instagram app → Settings → *Account type and tools* →
   *Switch to professional account* (Business). Skip if already done.
2. **Meta developer account.** Go to **developers.facebook.com**, log in, *Get started*.
3. **Create an app.** *My Apps → Create app*. Choose the use case for
   **Instagram** (e.g. "Manage messaging & content on Instagram"). App type
   *Business* if asked. Name: `SEVEN website feed`.
4. In the app dashboard open **Instagram → API setup with Instagram login**.
5. Under **Generate access tokens** click **Add account**, log in as **@seven.iraq**,
   allow access. Then click **Generate token** next to the account and copy it.
   (The permission needed is only `instagram_business_basic` — read profile & media.)
   The app can stay in development mode: it only reads your own account.
6. **Store the token on GitHub:** repository → **Settings → Secrets and variables →
   Actions → New repository secret**
   - Name: `INSTAGRAM_ACCESS_TOKEN`
   - Secret: paste the token → **Add secret**.
7. **Run it:** **Actions** tab → **Publish website** → **Run workflow**. In the log,
   the step *Instagram feed* says e.g. `Instagram feed: 12 posts from @seven.iraq`.
   Open the website — the Instagram section now shows the latest posts.

## Keeping the token alive (60 days)

The workflow renews the token every Monday. To let it **save** the renewed token
automatically, add a second secret:

1. Make a fine-grained token (github.com → Settings → Developer settings →
   Fine-grained tokens) for **only this repository** with
   **Repository permissions → Secrets: Read and write**.
2. Repository → Settings → Secrets → Actions → New secret
   `SECRETS_ADMIN_TOKEN` = that token.

Without it, repeat steps 5–6 every ~50 days (set a calendar reminder).

**Token expired?** The site keeps working and quietly shows the hand-picked
posts. The Actions log shows a yellow warning. Generate a new token (step 5) and
replace the secret (step 6).

## Limits (honest)

- Updates every **6 hours** (and on every publish), not instantly.
- GitHub pauses scheduled workflows in a repository with **no commits for 60 days**
  and emails you; click **Enable workflow** in the Actions tab (any edit also keeps it active).
- Reels show their cover picture; clicking opens the reel on Instagram.
- Facebook/TikTok: the site links to the accounts. Their official embeds were not
  added on purpose: they load third-party scripts and tracking cookies, would
  need changes to the cookie policy, and don't match the SEVEN design.
