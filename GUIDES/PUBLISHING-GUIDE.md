# Publishing guide — GitHub Pages (first time)

Time needed: about 20 minutes. You need a free GitHub account (github.com → Sign up).

> **Important:** GitHub Pages is free for **public** repositories. A public
> repository means anyone can read the website's files — which is fine, because
> the website is public anyway. **No passwords or tokens are stored in these
> files.** Never paste a token into any file.

---

## 1. Create the repository

1. Sign in on **github.com**.
2. Top right **+** → **New repository**.
3. Repository name: `seven-website` (any name works).
4. Choose **Public**.
5. Leave "Add a README" **unticked**.
6. Click **Create repository**.

## 2. Upload the website files

Unzip `seven-github-pages.zip` on your computer first. You upload the **files
inside** the folder, not the ZIP itself.

### Option A — GitHub Desktop (recommended, easiest for future updates)

1. Install **GitHub Desktop** (desktop.github.com) and sign in.
2. On your new repository page on github.com click **Code → Open with GitHub Desktop**
   (or in GitHub Desktop: File → Clone repository → pick `seven-website`).
3. GitHub Desktop shows the (empty) local folder. Click **Show in Explorer / Show in Finder**.
4. Copy **everything** from the unzipped `seven-website` folder into that folder —
   including the hidden items `.github`, `.nojekyll` (see note below).
5. Back in GitHub Desktop: write a summary such as `First version`, click
   **Commit to main**, then **Publish branch** / **Push origin**.

> **Hidden files.** `.github` and `.nojekyll` start with a dot, so Windows/Mac may
> hide them. Mac Finder: press **Cmd + Shift + .** to show them.
> Windows Explorer: **View → Show → Hidden items**. The `.github` folder is
> essential — it contains the robot that publishes the site.

### Option B — upload in the browser

1. On the repository page click **uploading an existing file** (or **Add file → Upload files**).
2. Drag the folders and files from the unzipped folder into the page.
   GitHub accepts up to 100 files at a time — if it complains, upload
   `assets` first, commit, then upload the rest.
3. Click **Commit changes**.
4. Browsers usually **skip the hidden `.github` folder**. Check: does the repository
   now show a `.github` folder? If not:
   - **Add file → Create new file**
   - Name: type `.github/workflows/deploy.yml` (the slashes create the folders)
   - Open `GUIDES/deploy-workflow-copy.yml` from the ZIP, copy all of it, paste it in.
   - **Commit changes**.
   - Do the same for an empty file named `.nojekyll` (optional but recommended).

## 3. Turn on GitHub Pages

1. Repository → **Settings** → left menu **Pages**.
2. Under **Build and deployment → Source** choose **GitHub Actions**.
   (Not "Deploy from a branch".)
3. Go to the **Actions** tab. You will see **Publish website** running
   (if not: click **Publish website → Run workflow**). Green tick = published.
4. Back in **Settings → Pages** the address appears, e.g.
   `https://YOUR-USERNAME.github.io/seven-website/`. Open it — the site is live.

If the Actions run is red, click it: the step **Check the content files** says
exactly which file and line has a problem.

## 4. Connect sevenonly.com

Follow `GODADDY-DOMAIN.md`. Short version: in **Settings → Pages → Custom domain**
type `sevenonly.com` and **Save**, then add the DNS records at GoDaddy.

## 5. HTTPS

After the domain check is green, tick **Enforce HTTPS** in **Settings → Pages**.
GitHub creates the free certificate automatically (can take up to 24 hours).

## 6. Fill in the admin's repository (one time)

So the admin page knows where to save, open `content/settings.json` on GitHub
(pencil icon) and fill in:

```json
"github": { "owner": "YOUR-USERNAME", "repo": "seven-website", "branch": "main" }
```

(The admin also asks for these the first time and saves them itself.)

## 7. Publishing future updates

Every change committed to `main` — on github.com, with GitHub Desktop or with
the admin page — starts **Publish website** automatically. The live site updates
in about **1–2 minutes**. Nothing else to do.
