# Placement rationale (anti-bloat) + monorepo specifics

## The one rule
Starlight = Astro + a full render toolchain. If those deps land in the application's
`package.json`, install time and `node_modules` balloon, and the app's build graph gets
polluted. **Docs is always its own package with its own `package.json`.**

## By repo shape

### pnpm workspace monorepo
- Place at `apps/docs/` (or match the repo's app-folder convention: `packages/docs`, `sites/docs`).
- Ensure the location is covered by `pnpm-workspace.yaml` globs (`apps/*`, `packages/*`).
- Install deps scoped: `pnpm --filter docs add starlight-llms-txt`.
- Run scoped: `pnpm --filter docs dev` / `pnpm --filter docs build`.

### Turborepo / Nx
- `apps/docs/` plus a build task in the pipeline:
  - Turbo: add `"docs#build"` or rely on the generic `build` task; cache `docs/dist/**`.
  - Nx: a `docs` project with a `build` target; add to the `affected` graph.
- Benefit: docs builds get caching + only run when docs change.

### Single-package app repo (most common)
- Nested `docs/` with its **own** `package.json`, NOT registered as a workspace
  (the repo has no workspace machinery, so keep it standalone).
- Build it separately; never `pnpm add` Starlight into the app's root package.
- This is the cleanest isolation in a non-monorepo: the app install stays lean.

### Empty / docs-only repo
- Scaffold at root. The repo *is* the docs site.

## .gitignore (always)
Add, scoped to the docs dir:
```
docs/dist/
docs/.astro/
docs/node_modules/
```
Never commit build output or the generated `llms*.txt` (they regenerate on build).

## Serving without bloat
- Build → static `dist/`. No server runtime, no DB.
- Self-host: Caddy static file server + `expose <port> docs`.
- Continuous deploy: a git hook / cron on the host that pulls main, runs the scoped
  docs build, and atomically swaps `dist/` into the Caddy-served path. Because deploy =
  build, docs and `llms.txt` never drift.
