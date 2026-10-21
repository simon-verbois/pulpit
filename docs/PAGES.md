# Pulpit website

A single English-only page (`docs/index.html`) with `styles.css`, `site.js`, `favicon.svg` and the
images in `docs/screenshots/`. There is no build step, no runtime package, no analytics, and no
remote font or image request; the page works without JavaScript (the screenshot preview dialog is
an optional enhancement over plain image links). `docs/.nojekyll` makes GitHub Pages serve the
files as they are, so the Markdown documentation next to the site is not processed by Jekyll.

## Publishing

In **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, the default
branch and the **/docs** folder. The site is then published at
<https://simon-verbois.github.io/pulpit/>. Links between files are relative, so the project
prefix is preserved.

## Previewing

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory docs
```

Open <http://127.0.0.1:4173/>.

## Screenshots

`scripts/capture-screenshots.mjs` regenerates every image in `docs/screenshots/` from the local
development stack (see [`DEVELOPMENT.md`](DEVELOPMENT.md)) using Playwright:

```sh
node scripts/capture-screenshots.mjs
```

It expects the sample repositories `pulpit-sample-rpm` and `pulpit-sample-container`, and hides the
development banner. Review each image before committing: never include real hostnames,
credentials or customer data.
