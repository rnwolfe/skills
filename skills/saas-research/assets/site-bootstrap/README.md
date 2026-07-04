# Site bootstrap (Phase 7)

Setup commands for the Astro Starlight presentation layer. Run once per
project, then use `bun scripts/sync.ts` to refresh the site after editing
`source/`.

## Prerequisites

- `bun` (or fall back to `npm` if bun unavailable; commands below use bun)
- `node` 20+ available on PATH

## One-time setup

```sh
# From the project root (the directory containing source/):
bun create astro@latest site -- --template starlight --typescript strict --no-install --no-git
cd site && bun install && cd ..

# Strip the starter content
rm -rf site/src/content/docs/*

# Optional: drop a custom CSS file for accent color tweaks
mkdir -p site/src/styles
cat > site/src/styles/custom.css << 'EOF'
:root {
  --sl-color-accent-low: #1a2a44;
  --sl-color-accent: #2563eb;
  --sl-color-accent-high: #93c5fd;
}
:root[data-theme='light'] {
  --sl-color-accent-low: #cfdcef;
  --sl-color-accent: #1d4ed8;
  --sl-color-accent-high: #1e3a8a;
}
.csv-scroll {
  overflow-x: auto;
  max-width: 100%;
  -webkit-overflow-scrolling: touch;
}
.csv-scroll table {
  min-width: 720px;
  font-size: 0.875rem;
}
EOF
```

## Configure the site

Replace `site/astro.config.mjs` with this template. The sidebar reflects the
`source/` shape and stays consistent across topics.

```js
// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://example.com',  // change to your domain before deploy
  integrations: [
    starlight({
      title: 'Research Report',  // sync.ts auto-overrides from README H1
      description: 'Decision-grade research report.',
      customCss: ['./src/styles/custom.css'],
      pagination: false,
      sidebar: [
        { label: 'Overview', link: '/' },
        { label: 'Methodology', link: '/methodology/' },
        {
          label: 'Finalists',
          autogenerate: { directory: 'finalists' },
          collapsed: false,
        },
        { label: 'Shortlist', link: '/shortlist/' },
        { label: 'Universe', autogenerate: { directory: '.' }, collapsed: true },
        { label: 'Rejected', link: '/rejected/' },
        { label: 'Scoring', link: '/scoring/' },
        {
          label: 'Raw research',
          autogenerate: { directory: 'raw' },
          collapsed: true,
        },
        { label: 'Notes', link: '/notes/' },
      ],
    }),
  ],
});
```

## Optional: site metadata override

Drop `source/.site-meta.json` if you want the homepage hero to show specific
text (the sync script reads it):

```json
{
  "title": "Custom Title",
  "description": "Custom hero description",
  "tagline": "Custom hero tagline line"
}
```

If absent, the sync script derives the title from `source/README.md` H1 and
generates a tagline from the finalist count.

## Generate site content

```sh
# From the project root:
bun scripts/sync.ts
```

This wipes `site/src/content/docs/`, repopulates from `source/`, and
validates internal links. Idempotent — safe to re-run after every source/
edit.

## Build and preview

```sh
cd site
bun run build      # produces site/dist/, no warnings if all is well
bun run dev        # local dev server at http://localhost:4321
bun astro preview  # preview the production build
```

## Mobile screenshot for the project README

```sh
# Start preview server first (in a background terminal or with run_in_background)
cd site && bun astro preview --host 127.0.0.1 --port 4321 &

# Then capture a 375px mobile screenshot:
google-chrome --headless --disable-gpu --no-sandbox \
  --remote-debugging-port=9222 \
  --hide-scrollbars about:blank &

# (Use Chrome DevTools Protocol to set device metrics for the mobile screenshot.)
```

## Deploy options

- **GitHub Pages**: `.github/workflows/deploy.yml` triggers on push to main;
  builds + uploads artifact + deploys to Pages
- **Vercel / Netlify**: point at `site/` as the project root; build command
  is `bun run build`, output is `dist/`
- **Cloudflare Pages**: same as Vercel/Netlify
- **Static hosting** (S3, R2, etc.): the `site/dist/` directory is
  fully-static; serve as-is

## Troubleshooting

- **Sync reports broken links** — check that markdown links in `source/`
  point to other source files using filenames (e.g., `[Notes](NOTES.md)`),
  not Starlight URLs. The sync script rewrites filenames → URLs at build
  time.
- **Build warnings about missing 404 page** — Starlight generates one
  automatically; this is informational, not a real warning.
- **Mobile screenshot has overflow** — verify the `csv-scroll` class is
  applied; large tables wrap in this div for horizontal scroll.
