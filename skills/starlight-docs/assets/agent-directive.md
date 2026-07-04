<!-- Append this block to the repo's agent file (CLAUDE.md / AGENTS.md / etc.).
     Replace <DOCS_DIR> and the commands with the real values. -->

## Documentation (keep it current — non-negotiable)

Docs live in `<DOCS_DIR>/` — an Astro Starlight site. Content is Markdown/MDX under
`<DOCS_DIR>/src/content/docs/`. The site also emits `llms.txt` / `llms-full.txt` for AI agents.

- Dev: `pnpm --filter docs dev --host 0.0.0.0`
- Build (regenerates `llms.txt`): `pnpm --filter docs build`

**Docs are part of "done." A change is not complete until its docs are updated in the SAME commit/PR.**

When you change any **public surface**, update the matching docs page in the same change:
- API routes / endpoints / request-response shapes
- CLI commands, flags, or output
- Config keys, environment variables, defaults
- Public functions / exported types / schemas
- Setup, install, or quickstart steps

When you **add a feature**: add or edit the relevant docs page before the PR is "done".

When you **cut a release**:
1. Update the changelog page with user-facing changes.
2. Bump any version references in docs.
3. Run `pnpm --filter docs build` so `llms.txt` regenerates and ships with the release.

**Conventions:**
- Each docs page has `owner` and `lastReviewed` frontmatter. Set/refresh `lastReviewed` when you meaningfully revise a page.
- Prefer editing an existing page over adding a near-duplicate; keep the sidebar spine intentional.
- If a code change has no doc impact, say so explicitly in the PR rather than silently skipping docs.
