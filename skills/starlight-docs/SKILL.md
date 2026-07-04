---
name: starlight-docs
description: >-
  Scaffold and maintain a self-hosted Astro Starlight documentation site in the
  current repository, and wire the repo's agent file (CLAUDE.md / AGENTS.md /
  etc.) to keep docs fresh alongside commits and releases. Use when the user
  wants to "add docs", "set up a docs site", "scaffold Starlight", "create a
  documentation site", "add llms.txt", make docs AI-readable, or establish a
  docs-as-code workflow. Inspects the repo first (package manager, monorepo
  layout, existing docs, CI, agent files), decides non-bloating placement,
  applies design tokens, sets up easy LAN/self-host serving, and adds a docs
  freshness directive to the agent file.
---

# starlight-docs

Set up a free, self-hosted **Astro Starlight** documentation site that is well-integrated, visually distinctive, AI-readable (`llms.txt`), and kept up to date by a directive baked into the repo's agent file. Always **inspect before scaffolding** — placement and config depend on what the repo already is.

Assumed environment (this operator): Linux + zsh, mise-managed Node, `pnpm` default, self-host via Caddy + the `expose` CLI, dev servers bound to `0.0.0.0`. Detect and adapt if the repo says otherwise (npm/yarn/bun lockfile, Vercel/Netlify config, etc.).

---

## Phase 1 — Inspect the repo (gather facts, decide nothing yet)

Run these read-only checks and record the answers. Do NOT scaffold until Phase 2.

| Question | How to detect |
|---|---|
| Package manager | lockfile: `pnpm-lock.yaml`→pnpm, `bun.lockb`→bun, `yarn.lock`→yarn, `package-lock.json`→npm. Default pnpm. |
| Monorepo? | `pnpm-workspace.yaml`, `turbo.json`, `nx.json`, `lerna.json`, or `workspaces` in root `package.json`. |
| Existing docs? | `docs/`, `website/`, `apps/docs/`, `*.md` density, an existing Astro/Docusaurus/MkDocs config. |
| Existing site framework? | root `astro.config.*`, `next.config.*`, `vite.config.*` — informs whether docs should be a sibling or nested project. |
| CI present? | `.github/workflows/`, `.gitlab-ci.yml`. Determines where the docs build gate goes. |
| Agent file(s)? | `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.cursor/rules/*`, `.cursorrules`, `.github/copilot-instructions.md`. (Phase 7 target.) |
| Deploy target? | `vercel.json`, `netlify.toml`, Caddyfile, existing `expose` usage. Default: static `dist/` served by Caddy + `expose`. |
| Project identity | root `package.json` name/description, README title — reused for docs title + `llms.txt` description. |

Summarize findings back to the user in 4-6 bullets before proceeding.

---

## Phase 2 — Decide placement (avoid bloat)

**Core rule: docs deps must NEVER land in the application's `package.json`.** Starlight pulls in Astro + a render toolchain; mixing it into an app balloons install time and `node_modules`. Keep docs as an isolated package.

Decision table:

| Repo shape | Place docs at | Why |
|---|---|---|
| **pnpm/yarn/npm workspace monorepo** | `apps/docs/` (or `docs/` if `apps/` isn't the convention) as its own workspace package | Native isolation; shares lockfile, separate deps + build. Add to `pnpm-workspace.yaml` packages globs if needed. |
| **Turbo/Nx monorepo** | `apps/docs/` + a `docs#build` pipeline entry | Caching + task graph already exist; hook the docs build in. |
| **Single-package app repo** | nested `docs/` project with its **own** `package.json` (not a workspace) | Keeps app install lean; docs is a standalone Astro project you build separately. |
| **Empty/new repo or docs-only repo** | repo root | The repo *is* the docs site. |

Always:
- Add to `.gitignore`: `docs/dist/`, `docs/.astro/`, `docs/node_modules/` (adjust path to chosen location).
- Do NOT commit build output.
- One Astro project = one `package.json`. Don't hoist Starlight into the root app package.

State the chosen placement and the one-line reason before scaffolding.

---

## Phase 3 — Scaffold

From the chosen docs directory (examples assume `docs/` in a single-app repo; adjust for monorepo `apps/docs/`):

```bash
# Non-interactive scaffold into the chosen dir
pnpm create astro@latest docs -- --template starlight --no-install --no-git --skip-houston
cd docs
pnpm install
pnpm add starlight-llms-txt
```

In a workspace monorepo, prefer `pnpm --filter docs add starlight-llms-txt` after registering the package, and let the root install wire it.

Sanity: `pnpm dev --host 0.0.0.0` should serve on `0.0.0.0:4321`.

---

## Phase 4 — Wire `llms.txt` (AI-readability)

Edit `docs/astro.config.mjs`. Use `assets/astro.config.snippet.mjs` as the template. Key points:
- Set `site:` to the canonical deploy URL (required for correct `llms.txt` links) — e.g. `https://docs.<project>.example.com` or whatever domain the docs will be served from.
- Add `starlightLlmsTxt({ projectName, description, exclude: ['changelog','legal/**'] })`.
- Exclude changelog/legal so the AI corpus stays signal-dense.

Verify after a build: `pnpm build && ls dist/llms*.txt` → `llms.txt`, `llms-full.txt`, `llms-small.txt`.
Caveat to tell the user: the plugin emits static files; it does **not** stand up an MCP server (that's a Mintlify-only feature). MCP can be added later by pointing a RAG/MCP server at `llms-full.txt`.

---

## Phase 5 — Design tokens, organization, distinctiveness

**Organization (well-integrated):**
- `src/content.config.ts` — extend `docsSchema` with required `owner` and `lastReviewed` fields (used by the freshness workflow). See `assets/content.config.snippet.ts`.
- Sidebar: explicit spine for top-level sections + `autogenerate: { directory: ... }` for leaves, so new pages appear automatically but the structure stays intentional.
- Search: Starlight's built-in Pagefind is static + offline + free. Nothing to configure or host.
- Set `editLink.baseUrl` (→ git edit URL) and `lastUpdated: true`.

**Distinctiveness (tokens first, override only when needed):**
- Copy `assets/custom.css` to `docs/src/styles/custom.css`, register via `customCss: ['./src/styles/custom.css']`. Pick a brand accent ramp; set content width + title size + fonts.
- Self-host fonts with Fontsource (`@fontsource-variable/*`) — free, no CDN call.
- Theme code blocks via `expressiveCode` (highest-signal visual surface in dev docs).
- Reach for `components:` overrides (Hero/Header/Footer) ONLY when a token can't express it. Don't fork the theme.

Derive the accent color from the project's existing brand if one is detectable (logo, existing CSS vars, README badges); otherwise ask the user for a hex or pick a tasteful default and say so.

---

## Phase 6 — Easy serving

- **Dev:** `pnpm --filter docs dev --host 0.0.0.0` (or `pnpm dev --host 0.0.0.0` from the docs dir).
- **Build:** static `dist/`. Serve it behind any static file server / reverse proxy (Caddy, nginx, a tunnel) to give the docs a URL.
  - ⚠️ For a quick LAN/preview serve, serve the **static `dist/`** (Caddy / `python -m http.server --directory dist`), NOT `astro preview` behind a reverse proxy — Astro/Vite preview host-checks the `Host` header and returns **403** for a proxied domain.
- **CI gate:** install `assets/docs-ci.yml` to `.github/workflows/` (adapt path filters to the chosen docs dir). It runs `build` + `astro check` + a lychee link-check on every PR that touches docs, with `fetch-depth: 0` so `lastUpdated` git dates are correct.
- **Deploy = build:** ensure deploy rebuilds, so docs + `llms.txt` regenerate together and never drift. For self-host, a git hook / cron that pulls main, runs `pnpm --filter docs build`, and swaps `dist/` into the served path.

### GitHub Pages (free, when the repo is public)

A project Pages site lives at `https://<owner>.github.io/<repo>/` — a **sub-path**, which needs care:

1. **Set `site` + `base`** in `astro.config`: `site: 'https://<owner>.github.io'`, `base: '/<repo>'`.
2. **Base-prefix in-content links.** Starlight base-prefixes its own nav + assets, but **NOT
   hand-written absolute `/...` links in Markdown content** — they'd 404 under the sub-path. Add a
   rehype plugin so source links stay clean/portable (`/guides/x/`) but build correctly:
   ```js
   import { visit } from 'unist-util-visit'; // pnpm add -D unist-util-visit
   const BASE = '/<repo>';
   function rehypeBaseLinks() {
     return (tree) => visit(tree, 'element', (n) => {
       const h = n.tagName === 'a' && n.properties?.href;
       if (typeof h === 'string' && h.startsWith('/') && !h.startsWith('//') && !h.startsWith(BASE + '/') && h !== BASE)
         n.properties.href = BASE + h;
     });
   }
   // defineConfig({ base: BASE, markdown: { rehypePlugins: [rehypeBaseLinks] }, ... })
   ```
   Verify after build: `grep -rE 'href="/(guides|reference)/' dist/**/index.html | grep -v "/<repo>/"` should be empty.
   (A custom domain / user-or-org Pages site sits at root, so `base` is `/` and this isn't needed.)
   - ⚠️ **Frontmatter links bypass the rehype plugin** (it only sees Markdown *content*). Splash
     `hero.actions[].link`, and any link defined in frontmatter/config, **MUST include the base
     explicitly** (e.g. `link: /<repo>/invariants/`) or they 404. Sweep the splash page too:
     `grep -oE 'href="/[a-z][a-z-]*/"' dist/index.html | grep -v "/<repo>/"` should be empty.
3. **Deploy workflow:** `assets/pages-deploy.yml` (build via `withastro/action@v3` + `actions/deploy-pages@v4`).
   **Pin `node-version: 22` and `package-manager: pnpm@<lockfile-version>`** — `pnpm@latest` (v11)
   needs Node ≥22.13 and the action defaults to Node 20 → build fails. Add `"packageManager":
   "pnpm@<v>"` to the docs `package.json` for consistent resolution.
4. **Enable Pages:** `gh api -X POST repos/<owner>/<repo>/pages -f build_type=workflow` (source =
   GitHub Actions), then push to trigger. Verify the live URL + `…/<repo>/llms.txt` return 200.

---

## Phase 7 — Wire the agent file (keep docs fresh)

This is the durable half. Find the repo's agent file(s) from Phase 1 and **append** the docs-freshness directive from `assets/agent-directive.md` (fill in the real docs path and dev/build commands). Priority order if multiple exist — update the one the repo's tooling actually reads; if several are active (e.g. both `CLAUDE.md` and `AGENTS.md`), add a short pointer in each to the canonical one rather than duplicating.

If NO agent file exists, create `AGENTS.md` (broadest compatibility) at repo root containing the directive, or ask the user which file their tooling uses.

The directive must make these obligations concrete (not vague "keep docs updated"):
- **On public-surface changes** (API routes, CLI flags, config keys, env vars, public functions, schemas): update the matching docs page **in the same commit/PR** as the code change.
- **On releases:** update the changelog page, bump any version references in docs, and run the docs build so `llms.txt` regenerates.
- **New feature ⇒ new/edited docs page** before the PR is "done."
- Point at the exact docs dir and the dev/build commands so the agent can self-serve.
- Reference the `owner` / `lastReviewed` frontmatter convention for staleness triage.

Edit the file directly, then show the user the diff.

---

## Phase 8 — Verify & report

- `pnpm --filter docs build` succeeds; `dist/llms*.txt` present.
- `pnpm --filter docs dev --host 0.0.0.0` serves locally.
- `.gitignore` excludes docs build output.
- Agent file contains the freshness directive (show the appended block).

Report: placement chosen + why, what was scaffolded, the serving command, and the exact agent-file edit. Offer to `expose` it and to write a first real docs page from the project's README.

---

## Assets
- `assets/astro.config.snippet.mjs` — Starlight + llms.txt config template
- `assets/custom.css` — design-token starter
- `assets/content.config.snippet.ts` — schema with `owner` / `lastReviewed`
- `assets/docs-ci.yml` — GitHub Actions build + check + link-check gate
- `assets/agent-directive.md` — the docs-freshness block to append to CLAUDE.md / AGENTS.md
- `references/placement.md` — extended placement rationale + monorepo specifics
