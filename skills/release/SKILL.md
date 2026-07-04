---
name: release
description: Cut a release for a Bun/Vite/tRPC-style project — propose a semver bump from conventional commits, write a Keep-a-Changelog entry, bump version(s) in lockstep, annotated-tag, and hand the push to the operator. Also the canonical reference for wiring the runtime "what's new" loop (changelog parser → API → version-gated modal) and a channel-based upgrade CLI into a new project. Use when asked to "cut a release", "tag a version", "bump the version", "update the changelog", "do a release", or to add release-notes / what's-new / self-upgrade machinery to an app.
---

# release

Cut a release as a tagged sha that downstream tooling resolves. This skill is the
generalized version of Factory's release flow — it works as-is for a Bun
workspaces + Vite + tRPC monorepo, and degrades sensibly for npm/pnpm, single-package
repos, or projects with no daemon/upgrade story.

Two things live here:

1. **The release workflow** (below) — what you run each release. Version bump,
   changelog, tag, push handoff.
2. **The runtime machinery** ([`reference/runtime-machinery.md`](reference/runtime-machinery.md))
   — the one-time scaffold that makes a changelog operator-visible (parser → API →
   version-gated "what's new" modal) and a channel-based upgrade CLI. Read/apply that
   only when a project asks for the what's-new modal or self-upgrade, not on every release.

This skill **plans and prepares** a release. It never pushes tags — pushing to a shared
remote is an operator-authorized action. Stop at "here are the push commands."

---

## Orient first

Before anything, learn the project's release conventions — don't assume Factory's:

- Is there a project-local release skill, `RELEASING.md`, or a release script in
  `package.json`/`Makefile`/CI? **Prefer the project's own tooling** if it exists; this
  skill is the fallback and the reference, not an override.
- Package manager: `bun` / `pnpm` / `npm` / `yarn` (check the lockfile). Use whatever the
  repo uses for the gate commands below.
- Single package or workspace monorepo? (root `package.json` `workspaces`, `pnpm-workspace.yaml`).
- Where is `version` the source of truth? Usually root `package.json`; sometimes a `VERSION`
  file or every workspace `package.json`.

If the project already has a strong release path, your job may just be to drive it. Say so.

## Preconditions — verify, and stop on any failure

1. On the release branch (usually `main`): `git rev-parse --abbrev-ref HEAD`. If not, stop
   and surface — the operator may want to merge first.
2. Working tree clean: `git status --porcelain` is empty. If not, stop and surface.
3. Up to date with the remote: `git fetch <remote>` succeeds and `git log <remote>/main..HEAD`
   is empty (no unpushed local-only history that would make the tag unreachable). Stop and surface otherwise.
4. The project's gates pass on the current sha. Run the **project's** gates, e.g. for Factory:
   `bun run typecheck && bun run check && bun test`. For other stacks substitute the real ones
   (`pnpm lint && pnpm typecheck && pnpm test`, `npm run build`, etc.). If any fail, stop and surface.

Never proceed silently past a failed precondition. The operator needs to know what's blocking.

## Step 0.5 — Docs freshness (if the repo has a docs site)

A release tag should ship docs that match the code — the tag is the natural drift checkpoint. If
there's a docs site (e.g. from `starlight-docs` / `harvest-docs`):

- Diff the public surface since the last tag:
  `git diff <last-tag>..HEAD --name-only -- <source dirs>`.
- If public surface changed (CLI, HTTP, config/env, exported APIs, schema), run the
  **`harvest-docs` skill in drift mode** to re-harvest only the affected pages, then rebuild the
  docs so the AI corpus (`llms.txt`) regenerates. (At minimum: rebuild + skim for drift.)
- **Commit the doc updates** (`docs: refresh for vNEW`) so they ship with the release and the tree
  is clean for the version-bump commit below.

Skip with a one-line note if there's no docs site, or nothing public-facing changed since the tag.

## Step 1 — Propose the version bump (judgment call, operator confirms)

Find the most recent release tag:

```sh
git describe --tags --abbrev=0 --match 'v*.*.*'
```

Non-zero exit → first release → start at `v0.1.0`.

Otherwise list every commit since that tag and categorize by conventional-commit prefix:

```sh
git log <last-tag>..HEAD --pretty=format:'%h %s'
```

- `feat:` / `feat(scope):` → **minor** (or major if clearly breaking)
- `fix:` / `fix(scope):` → **patch**
- `refactor:` / `chore:` / `docs:` / `test:` → **patch**
- `BREAKING CHANGE:` in body, or `!` after type (`feat!:`) → **major**

Pick the largest bump implied by any commit. **Surface your reasoning before bumping** —
this is a judgment call, not an automatic transform: "I see N commits — M feat, K fix; I'd
recommend a minor bump from vPREV to vNEW. Confirm?" If the operator pushes back, re-evaluate;
don't argue — they have context you don't.

(Pre-1.0 caveat: many projects keep breaking changes in minor bumps until 1.0. Respect the
project's existing cadence over strict semver.)

## Step 2 — Write the changelog entry

Append a new section to `CHANGELOG.md` at the repo root (Keep a Changelog format). Create the
file if absent (header below):

```markdown
## v<NEW_VERSION> — <YYYY-MM-DD>

### Added
- <one bullet per feat: — strip the prefix, capitalize, trailing period>

### Changed
- <refactor:/chore: that materially affect behavior or operator-visible surface>

### Fixed
- <one bullet per fix:>
```

Write for the operator/user, not the committer: lead each bullet with the user-visible change
(bold lead-in is nice — the parser in the reference supports it), not the commit subject verbatim.
Skip empty sections. Skip `docs:`/`test:` unless materially user-facing. Group by section, then
preserve commit (chronological) order within each.

First-ever entry also needs the file header:

```markdown
# Changelog

All notable changes to <PROJECT> are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/).
```

The exact header markup matters if the project parses this file for a what's-new modal — keep
`## vX.Y.Z — YYYY-MM-DD` headers and `### Section` / `- bullet` structure (see the parser regex
in the reference).

## Step 3 — Bump the version

Update the source of truth found during Orient:

- **Root `package.json`**: `"version": "<NEW_VERSION>"`.
- **Workspace monorepo (Factory default):** bump every `apps/*/package.json` and
  `packages/*/package.json` **in lockstep** — they ship together; independent versions are just
  drift. Only pin independently if the operator says so; don't ask preemptively.
- **Single-package / `VERSION` file:** update the one place.

If the PWA injects the version at build time (Vite `define: { __APP_VERSION__: ... }`), the
package.json bump is sufficient — the next build picks it up. No separate frontend edit.

## Step 4 — Commit

```sh
git add CHANGELOG.md package.json apps/*/package.json packages/*/package.json   # trim to what exists
git commit -m "chore(release): v<NEW_VERSION>"
```

Single commit, **no co-author trailer** (a release commit, not substantive work).

## Step 5 — Annotated tag

```sh
git tag -a v<NEW_VERSION> -m "v<NEW_VERSION>

<paste the changelog entry body — sections and bullets>"
```

Annotated (not lightweight) so the tag carries attribution and a date for `git describe` and
downstream tooling. The `v` prefix matters: channel resolvers match `v*.*.*`.

## Step 6 — Hand off to the operator

Print the push commands. **Do not run them.** Pushing a tag to a shared remote is operator-authorized.

```
release ready:
  git push <remote> main
  git push <remote> v<NEW_VERSION>

after push (if the project has an upgrade CLI):
  <project> upgrade          # upgrade the live deployment now
  <project> channel resolve  # confirm the new tag is the resolver target
```

---

## First-time changelog backfill

If `CHANGELOG.md` doesn't exist and there's tag history, backfill best-effort:

```sh
git tag -l 'v*.*.*' --sort=-version:refname
```

For each prior tag (oldest first) add a section from the commits between it and its predecessor.
Don't spend more than a few minutes — the goal is "history starts now," not a perfectly groomed
retroactive log.

## Failure modes

- **Precondition fails:** stop, surface, do not proceed.
- **Operator declines the bump:** re-evaluate with their feedback; don't push back.
- **Gate breaks mid-run:** abort and surface — it shouldn't have broken if preconditions passed.
- **`git tag` fails (tag exists):** surface immediately — never `--force` a release tag.
- **Project has its own release tooling:** drive that instead; this skill is the fallback.

## Wiring the runtime what's-new loop / upgrade CLI

When a project wants the changelog to actually *surface* to users (auto-opening "what's new"
modal on upgrade) or wants a `<project> upgrade` self-update command, that's a one-time scaffold —
see [`reference/runtime-machinery.md`](reference/runtime-machinery.md). It documents the full
Factory loop: build-time version constant → `/health` version → changelog parser → tRPC
`changelog.latest`/`all` → version-gated localStorage modal → channel-resolving upgrade CLI with
a `/health` version probe. Apply the pieces a given project needs; skip the rest.
