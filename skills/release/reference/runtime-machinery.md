# Runtime machinery — the "what's new" loop and self-upgrade CLI

This is the one-time scaffold that turns a `CHANGELOG.md` into something users actually see, and
(optionally) lets a deployed instance upgrade itself to the latest released tag. It is the
generalized version of Factory's loop. Apply the pieces a project needs; the four pieces are
independent enough to adopt incrementally.

The loop, end to end:

```
release skill          →  CHANGELOG.md entry + annotated vX.Y.Z tag on main
package.json version   →  build-time constant in the frontend  +  /health version on the server
CHANGELOG.md           →  parsed server-side → tRPC changelog.latest / changelog.all
frontend               →  diff current version vs localStorage "last seen" → auto-open modal once
upgrade CLI            →  resolve highest vX.Y.Z tag → checkout → build → restart → probe /health
```

Each arrow is one of the pieces below. Reference paths are Factory's; adapt to the target repo.

---

## Piece 1 — Version as a first-class fact

**Source of truth:** root (and workspace) `package.json` `version`, bumped by the release skill.

**Frontend (build-time inject).** Vite `define` turns the package version into a compile-time
constant — no runtime fetch needed for the version the UI was built at.

```ts
// vite.config.ts
import pkg from "./package.json";
export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
});
```

```ts
// globals.d.ts
declare const __APP_VERSION__: string;
```

For non-Vite stacks: Next.js → `env: { NEXT_PUBLIC_APP_VERSION: pkg.version }` in `next.config`;
generic → write a `version.ts` in a prebuild step. The point is a single build-time constant.

**Server (runtime report).** The running process reports what sha it's actually on (which may be
ahead of any tag), via a `/health` endpoint. Factory: `apps/daemon/src/health.ts`.

```ts
function resolveVersion(): string {
  if (process.env.APP_VERSION) return process.env.APP_VERSION;     // explicit override wins
  if (cached !== null) return cached;
  try {
    const p = Bun.spawnSync({ cmd: ["git", "describe", "--tags", "--always", "--dirty"] });
    cached = p.exitCode === 0 ? (p.stdout.toString().trim() || "dev") : "dev";
  } catch { cached = "dev"; }
  return cached;                                                    // cached for process lifetime
}

// GET /health → { status, version: resolveVersion(), uptime_ms, ... }
```

`git describe --tags --always --dirty` yields `v0.24.0` on a clean tagged sha, `v0.24.0-3-gabc1234`
a few commits past, `abc1234-dirty` with local edits. The upgrade CLI's probe (Piece 4) matches on
this. Falls back to `"dev"` outside a git checkout.

---

## Piece 2 — Parse the changelog server-side

The server parses `CHANGELOG.md` and serves structured entries. Factory: `apps/daemon/src/changelog.ts`.

Walk up from cwd to find the file (a workspace-script process may chdir into a sub-package):

```ts
function findChangelogPath(startDir: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 8; i++) {
    const candidate = join(dir, "CHANGELOG.md");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}
```

Regex parser — these patterns are the contract the release skill's changelog format must satisfy:

```ts
const VERSION_HEADER_RE =
  /^##\s+v(?<version>\d+\.\d+\.\d+(?:[-\w.]*)?)(?:\s+[—-]\s+(?<date>\d{4}-\d{2}-\d{2}))?\s*$/;
const SECTION_HEADER_RE = /^###\s+(?<heading>.+?)\s*$/;
const BULLET_RE        = /^[-*]\s+(?<body>.+)$/;
const BOLD_LEAD_RE     = /^\*\*(?<lead>[^*]+?)\*\*\s*(?<rest>.*)$/;  // bold lead-in per bullet
```

Cache on file mtime so the process doesn't re-read on every request but still picks up edits:

```ts
let cache: { entries: Entry[]; mtimeMs: number; filePath: string } | null = null;
export function loadChangelog(startDir = process.cwd()): Entry[] {
  const filePath = findChangelogPath(startDir);
  if (!filePath) return [];
  const mtimeMs = Bun.file(filePath).lastModified || 0;
  if (cache && cache.filePath === filePath && cache.mtimeMs === mtimeMs) return cache.entries;
  const entries = parseChangelog(readFileSync(filePath, "utf8"));
  cache = { entries, mtimeMs, filePath };
  return entries;
}
```

Each `Entry` = `{ version, date, sections: { heading, bullets: { lead?, rest }[] }[] }`.

---

## Piece 3 — Serve it, and gate the modal on version

**API.** Two endpoints — newest entry for the modal, full history for a settings page. Factory:
`apps/daemon/src/routers/changelog.ts`.

```ts
export const changelogRouter = router({
  latest: protectedProcedure.query(() => loadChangelog()[0] ?? null),
  all:    protectedProcedure.query(() => loadChangelog()),
});
```

(Non-tRPC: two GET routes returning the same JSON.)

**Version-gated auto-open modal.** Compare the build-time constant to a `localStorage` "last seen".
Factory: `apps/pwa/src/components/release-notes-sheet.tsx`. The behavior that makes it feel right:

- **First install** (no stored value): silently record the version, **don't** open — a new user
  doesn't want a changelog for software they've never run.
- **Upgrade** (stored ≠ current): open once. Dismiss writes current → stored.
- **Local dev** (`vdev`): skip entirely so reloads don't nag.

```tsx
const LAST_SEEN_KEY = "app.lastSeenVersion";

export function ReleaseNotesSheet() {
  const [open, setOpen] = useState(false);
  const currentVersion = `v${__APP_VERSION__}`;

  useEffect(() => {
    if (typeof window === "undefined") return;        // SSR guard
    if (currentVersion === "vdev") return;            // untagged local dev — never auto-open
    const seen = window.localStorage.getItem(LAST_SEEN_KEY);
    if (seen === null) {                              // first install: record, stay silent
      window.localStorage.setItem(LAST_SEEN_KEY, currentVersion);
      return;
    }
    if (seen !== currentVersion) setOpen(true);       // upgraded since last visit: show once
  }, [currentVersion]);

  if (!open) return null;
  return <SheetBody onClose={() => {
    try { window.localStorage.setItem(LAST_SEEN_KEY, currentVersion); } catch {}  // best-effort
    setOpen(false);
  }} />;
}
```

Mount once at the app root. The body fetches `changelog.latest`. A `/settings/release-notes` route
fetches `changelog.all` for the full history. Persistence is intentionally client-side localStorage
— it's per-device cosmetic state, not worth a DB column or a user-settings round-trip.

---

## Piece 4 — Channel-resolving upgrade CLI (optional)

For a self-hosted/long-running deployment that should pull its own updates. Skip for stateless
deploys (Vercel/containers redeploy from CI instead). Factory: `apps/cli/src/`.

**Channel resolution.** `stable` = highest released tag; `nightly`/`dev` = a branch tip sha.
Factory: `apps/cli/src/lib/channel.ts`.

```ts
async function resolveStable(checkout: string, remote: string) {
  // git ls-remote --tags --refs <remote> → filter v*.*.* → semver sort → highest
  // (skip pre-release identifiers like v1.2.0-rc.1 for the stable channel)
}
async function resolveBranch(checkout: string, remote: string, branch: string) {
  // git fetch --quiet <remote> <branch> → resolve FETCH_HEAD to a sha
}
export function resolveChannel(channel, opts) {
  if (channel === "stable")  return resolveStable(opts.checkout, opts.remote);
  if (channel === "nightly") return resolveBranch(opts.checkout, opts.remote, "main");
  return resolveBranch(opts.checkout, opts.remote, opts.devBranch);
}
```

**Upgrade orchestration** (`upgrade.ts`), in order, each step gated on the previous:

1. Precheck (clean tree, gates pass) and record current sha for rollback.
2. `resolveChannel()` → target sha. If already on it, no-op and say so.
3. Checkout the sha.
4. `bun install` **only if the lockfile changed** (cheap skip otherwise).
5. Run DB migrations; seed any idempotent fixtures.
6. **Rebuild the CLI itself** so a bug fix in the upgrader ships — otherwise you're forever running
   the old upgrader.
7. Build the frontend (picks up the new `__APP_VERSION__`).
8. Restart the service (`systemctl --user restart <unit>`).
9. **Probe `/health` until `version` matches the expected tag/sha7** (poll ~500ms up to ~15s). On
   timeout, roll back to the recorded sha. This is what makes the upgrade trustworthy — it's not
   "done" until the new version is actually answering.

```ts
const expected = target.ref.startsWith("v") ? target.ref : shortSha(target.sha);
const probe = await probeUntilVersion(expected);   // matches tag or sha7 prefix from /health
if (!probe.ok) { /* surface, roll back */ }
```

**A `doctor` command** pairs well: check the package manager, git, the service unit (exists/active),
`/health` reachable, config valid, bind address not localhost-only (so phones can reach it). It reads
the *live* service's config, not just the dev checkout's.

---

## Adoption order

1. **Piece 1 + 2 + 3** give you the what's-new modal — the high-value, low-cost part. Most projects
   want exactly this and stop here.
2. **Piece 4** only if the project is a long-running self-hosted service that should self-update. A
   container/serverless app upgrades by redeploying from CI; it just needs Pieces 1–3 (and CI reads
   the same tag the release skill produces).

In all cases the release skill (the parent `SKILL.md`) is what feeds this loop: it produces the tag
the CLI resolves and the `CHANGELOG.md` entry the modal renders. Keep the changelog header format
aligned with the Piece 2 regex and the whole chain stays wired.
