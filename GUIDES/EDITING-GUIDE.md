# Editing guide — change anything on the website

All content lives in **six files** in the `content` folder. Change a file, commit,
and the website updates by itself in about **1–2 minutes**.

You can edit in two ways:

- **A. The admin page** — `https://sevenonly.com/admin.html` — forms, upload buttons,
  drag-to-reorder, preview. Best for everyday changes and photos.
- **B. Directly on github.com** — open the file, click the ✏️ pencil, change the
  text, **Commit changes**. Good for quick text/price fixes.

Both write the same files.

---

## Which file holds what

| I want to change… | File | Where in the file |
|---|---|---|
| A **price**, product name, description, ingredients | `content/menu.json` | `products.items` → the product |
| **Add / remove a product** | `content/menu.json` | copy / delete a `{ … }` block in `items` |
| Mark **sold out** / available | `content/menu.json` | `"available": false` / `true` |
| Homepage **Best Seller** section (burgers, photos) | `content/pages.json` | `bestSellers.items` |
| **Product order** | `content/menu.json` | order of the blocks in `items` (top = first) |
| **Add a category** (e.g. Drinks) / rename / reorder | `content/menu.json` | `products.categories` |
| A **product photo** | `content/menu.json` | `"image": "assets/…"` |
| **Instagram, WhatsApp, Facebook, TikTok, YouTube** links | `content/socials.json` | `links` |
| Phone, email, Contact Us text | `content/site.json` | `contact` |
| **Location** / map / directions | `content/site.json` | `location` |
| Header menu links, footer links, logo | `content/site.json` | `header`, `footer` |
| Hero title & video, Our Story, Franchise, Partners, Playlist, section titles | `content/pages.json` | section name |
| Homepage **photo slider** | `content/media.json` | `gallery.slides` |
| Hand-picked **Instagram posts** | `content/media.json` | `instagramPosts` |
| **Show/hide or reorder homepage sections** | `content/settings.json` | `sections` |
| Animation effects | `content/settings.json` | `design` |
| Automatic vs hand-picked Instagram | `content/settings.json` | `instagramFeed.mode` (`"auto"` or `"manual"`) |

Legal texts (Legal notices, Terms, Cookies) are written directly in
`legal-notices.html`, `terms.html`, `cookies.html` — edit them with the pencil too.
SEO text and social-preview image are in the `<head>` of each `.html` page
(`description`, `og:image` → `assets/share-image.jpg`).

---

## A menu product, explained

```json
{
  "category": "beef",
  "name": "THE TRUFFLE SMASH",
  "tagline": "Rich & earthy.",
  "description": "Double smashed patty with truffle mayo.",
  "ingredients": "Beef patty, Cheddar, Truffle mayo, Potato bun",
  "price": "10,000 IQD",
  "image": "assets/uploads/truffle.webp",
  "fit": "contain",
  "available": true,
  "visible": true
}
```

- `category` — must match an `id` in `categories` (`beef`, `chicken`, `sides`, `sauces`, `desserts`, or one you add).
- `price` — typed exactly as guests should see it. Empty `""` hides it.
- `ingredients` — separated by commas; shown as "Beef patty · Cheddar · …". Empty hides it.
- `fit` — `"contain"` for cut-out photos (transparent PNG/WebP), `"cover"` for normal photos.
- `available: false` — shows **SOLD OUT**, grey photo, price crossed out.
- Empty `tagline`, `description`, `ingredients`, `price` or `image` are simply not shown (an empty image shows the IMAGE box, as in the original design).
- `visible: false` — hides the product completely (keeps it in the file for later).
- A category with no visible products is hidden automatically.

**Add a category:** in `categories` add
`{ "id": "drinks", "name": "Drinks", "layout": "cards", "columns": 3, "visible": true }`
(`"layout": "list"` = text-only panel, good for sauces). Then give products `"category": "drinks"`.

## JSON rules (the only "programming" you need)

- Text goes inside **"double quotes"**. A quote inside text: `\"`.
- Items in a list are separated by **commas** — but **no comma after the last one**.
- `true` / `false` and numbers have **no quotes**.
- A new line inside text: `\n`.

If you make a mistake, **the live site is not broken**: the publishing robot checks
every file first and refuses to publish. GitHub then emails you, and the
**Actions** tab shows the exact file and line, e.g.
`content/menu.json is not valid JSON … (line 35 column 5)`. Fix it and commit again.

## Replacing a photo

- **Admin page:** click **UPLOAD** next to the photo, then **SAVE**. Photos are
  resized automatically.
- **github.com:** open the `assets` folder → **Add file → Upload files** → upload
  e.g. `classic.webp`. Then in the JSON file change the path to
  `"assets/classic.webp"`. File names are **case-sensitive** (`Classic.webp` ≠ `classic.webp`).
- Tips: WebP or JPG, under ~500 KB for photos; transparent WebP/PNG for burger cut-outs.
  Hero video: MP4 under ~20 MB.

## Social links

`content/socials.json`:

```json
{ "platform": "tiktok", "link": "https://www.tiktok.com/@seven.iraq", "visible": true }
```

The icons appear in the order of this list. `"visible": true` shows the icon; if its `link` is still empty the icon shows but does nothing when tapped. `"visible": false` hides it.
Platforms with icons: `instagram`, `facebook`, `tiktok`, `whatsapp`, `youtube`,
`snapchat`, `x`, `link`. WhatsApp: `https://wa.me/9647701525140` (number with
country code, no + or spaces) — or just type the number.

---

## The admin page (admin.html)

There is no password database any more. The admin uses a **GitHub token** that
only you have.

### Make the token (once)

1. github.com → profile picture → **Settings** → **Developer settings** (bottom left)
   → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Name: `SEVEN admin`. Expiration: e.g. 1 year (put a reminder in your calendar).
3. **Repository access** → **Only select repositories** → choose `seven-website`.
4. **Permissions → Repository permissions**:
   - **Contents: Read and write** (required)
   - **Actions: Read-only** (optional — lets the admin show "Live on the website")
5. **Generate token** and copy it (starts with `github_pat_`). GitHub shows it only once.

### Use it

1. Open `https://sevenonly.com/admin.html`.
2. Paste the token, check owner (your username) / repository / branch, **CONNECT**.
   Tick "Remember on this device" only on your own computer/phone.
3. Edit → **PREVIEW** to check (only you see it) → **SAVE & PUBLISH**.
4. The message says which files were saved; the live site updates in 1–2 minutes.
5. **Version history** lists previous saves — **RESTORE** puts one back.

Safety: the token stays in your browser, is sent only to `api.github.com`, and can
only touch this one repository. If a phone is lost: delete the token on GitHub
(same page as above) — it stops working immediately.
