---
name: lifecycle-cli
description: >-
  Give a long-running, self-hosted tool its own lifecycle CLI — a single
  `<tool>` binary with install / upgrade / doctor / status / logs / restart /
  uninstall (and optional prune) subcommands, a managed service unit
  (systemd user unit on Linux, launchd plist on macOS), channel-based
  self-upgrade (stable = highest release tag, nightly/dev = branch tip), and a
  `/health`-probe that verifies the running version before an upgrade is called
  done. Use when the operator says "give this tool an install/upgrade CLI",
  "add self-upgrade", "channel-based upgrade command", "make it self-managing",
  "a factory-style CLI for this service", "born with the maintenance surface",
  or is about to hand-port a service-management CLI from another project. It
  implants the operational lifecycle surface; pair it with a release/versioning
  flow (tags + changelog) for the other half.
---

# lifecycle-cli

Implant an operational CLI so a self-hosted service can be **installed, run,
upgraded, diagnosed, and removed** by one command — and can pull its own updates
on a channel. This is the generalization of a hand-rolled, dependency-free
service CLI (Factory's `apps/cli/`): every new productized tool should be *born*
with this surface instead of the operator copying it in by hand each time.

**Scope boundary.** This skill owns the *operational* half — the CLI, the service
unit, self-upgrade, health verification. The *versioning* half — proposing a
semver bump, writing the changelog, cutting the annotated tag, the in-app
"what's new" modal — is a separate release flow. This CLI *consumes* the tags
that flow produces (channel `stable` resolves the highest one). Don't duplicate
the changelog/tag logic here; assume tags exist and reference the release flow.

Apply only to **long-running self-hosted services** (a daemon/server the operator
runs on their own box and wants to keep current). A stateless app that redeploys
from CI, or a one-shot CLI, doesn't need this — it needs at most version-as-a-fact.

---

## Orient first — detect the shape before writing anything

Read the target repo and answer these; they parameterize every step below:

- **Runtime & package manager** — Bun / Node+pnpm / Node+npm / Go / Python. The
  reference templates are Bun; translate the build/install/migrate commands to
  the repo's actual ones. Find the lockfile (drives the conditional-deps step).
- **Long-running process?** What starts the server (the `start` script / binary).
  If there's no daemon, this skill mostly doesn't apply.
- **Web frontend with a build step?** If yes, the frontend must be **rebuilt
  before the service restarts** (a static handler typically caches dist-exists at
  boot). If no frontend, drop the build-frontend step.
- **Datastore & migrations?** SQLite+Drizzle, Postgres, etc. Upgrade runs
  migrations; `doctor` probes schema health. If stateless, drop both.
- **Host OS / service manager** — Linux → **systemd user unit**; macOS → **launchd
  LaunchAgent plist**. Support whichever the operator's fleet uses (often both).
- **`/health` endpoint** — does the server expose one? If not, add it first
  (§1) — the whole upgrade-verify story depends on it.
- **Release conventions** — semver tags `v*.*.*`, the remote (`origin`), and the
  branch names for nightly (`main`) and dev (`dev`).

Pick a `<tool>` short name. Everything namespaces off it: the binary, the unit
(`<tool>.service` / `com.<user>.<tool>.plist`), the data home `<TOOL>_HOME`
(default `~/.<tool>`), env overrides `<TOOL>_CLI_*`, and the CLI's message prefix.

---

## The command surface to implant

One binary, subcommand-dispatched. This is the born-with surface:

| Command | Does |
|---|---|
| `up` / `down` / `restart` | start / stop / restart the service unit |
| `status` | unit state + a `/health` line (version, uptime, live workload) |
| `logs` | tail/follow the unit's journal (`-f`, `-n N`, `--since=`) |
| `install` | first-time setup: write+enable the unit, first build, first start |
| `uninstall` | disable+stop+remove the unit (data preserved) |
| `channel [stable\|nightly\|dev]` | show/set the upgrade channel; `resolve` dry-runs the target sha |
| `upgrade` | fetch → checkout → deps → migrate → build → restart → **probe** |
| `doctor` | preflight every dependency and invariant; `--strict` fails on warnings |
| `prune` *(optional)* | reclaim disk from terminal per-run artifacts; **dry-run by default** |

Then follow the standard procedure. Full verbatim templates (unit files, the
channel git commands, the upgrade pipeline, doctor checks, config/state layout)
live in [`reference/machinery.md`](reference/machinery.md) — load it when writing
the code. The body here is the decision procedure and the load-bearing rules.

---

## Standard procedure

### 1. Version as a first-class fact + `/health`
- Build-time constant for the frontend (Vite `define: { __APP_VERSION__ }`, Next
  `env`, or a generated `version.ts`) so the UI knows what it was built at.
- Runtime report on the server: `GET /health → { status, version, uptime_ms, … }`
  where `version` = `git describe --tags --always --dirty` (→ `v1.2.3`, or
  `v1.2.3-3-gabc1234`, or `abc1234-dirty`, or `dev` outside git), cached for the
  process lifetime. **This endpoint is the source of truth for "what is actually
  running"** — the upgrade verify (§6) matches against it.

### 2. Config + state homes
- CLI config at `<TOOL>_HOME/config.yaml` (mode `0600`): the `upgrade` block
  `{ channel: stable, devBranch: dev, remote: origin, checkout: <path|null> }`.
  Round-trip the YAML so unrelated keys (e.g. an auth token) survive a write.
- State at `<TOOL>_HOME/state/`: `last-good.sha` (rollback anchor) and
  `upgrade-log.jsonl` (append-only `{ ts, from, to, channel, ok, error? }`).
- Resolve `<TOOL>_HOME` at *call time* (env → default), never at module load.

### 3. Service unit (host-conditional)
- **Linux:** a **systemd user unit** at `~/.config/systemd/user/<tool>.service`.
  `Type=notify` + `NotifyAccess=all` iff the daemon emits `sd_notify READY=1`
  (else `Type=simple`). **Hardcode `PATH`** in the unit — user units don't inherit
  an interactive PATH, and the service often shells out to tools (`git`, agent
  CLIs) that live in `~/.local/bin`, mise shims, `~/.bun/bin`. `Restart=always`.
  `enable-linger` the user so it survives logout.
- **macOS:** a launchd LaunchAgent plist at
  `~/Library/LaunchAgents/com.<user>.<tool>.plist`, `RunAtLoad` + `KeepAlive`.
- Abstract the verbs (`start/stop/restart/is-active/enable/disable`) behind one
  function so command bodies don't branch on OS.
- **Bind the server to `0.0.0.0`, not `127.0.0.1`** — the operator reaches it from
  other devices on the LAN. `doctor` warns on a localhost-only bind.

### 4. Channel resolution
- **stable** → highest semver **release** tag: `git ls-remote --tags --refs
  <remote>`, keep `v?MAJOR.MINOR.PATCH`, **skip pre-release/build tags** (any `-`
  or `+`), semver-sort, take the max. No local fetch needed.
- **nightly** → tip of `main`; **dev** → tip of the configured dev branch:
  `git fetch --quiet <remote> <branch> && git rev-parse FETCH_HEAD`.
- Each resolves to `{ channel, ref, sha, subject }`. `channel resolve` prints this
  without acting (a dry run of what `upgrade` would target).

### 5. `install` (first run)
Detect the checkout; refuse if a unit already exists (unless `--force`); write
config; write + `daemon-reload` the unit; **build the frontend before first
start**; run migrations/seed; `enable --now`. Persist `checkout` to config so
later `upgrade`/`doctor` can find the repo without a flag.

### 6. `upgrade` orchestration — ordered, each step gated on the last
1. **Precheck:** working tree clean (`git status --porcelain`), else abort unless
   `--force`. Record `fromSha` and the current lockfile hash.
2. **Resolve** the channel → target sha. If already there, no-op and say so.
   `--dry-run` stops here after printing `from → to (ref: subject)`.
3. **Checkout** the sha. If on a named branch, prefer `merge --ff-only` to stay on
   the branch; else detached checkout. (A detached HEAD can break a self-hosting
   tool that auto-merges into its own checkout — see reference.)
4. **Deps — conditional:** reinstall **only if the lockfile changed** (compare the
   pre/post lockfile hash). Cheap skip otherwise.
5. **Migrate** (and idempotent **seed**) against the *live* `<TOOL>_HOME`.
6. **Rebuild the CLI itself**, then **build the frontend**. Rebuilding the CLI is
   what ships a fix *in the upgrader* — otherwise you forever run the old one. The
   frontend build must precede restart.
7. **Restart**, then **probe** (§ below). On success: `writeLastGood(sha)` +
   append an `ok:true` upgrade-log entry.
- **Rollback is operator-driven, not automatic:** every failing step appends an
  `ok:false` entry and prints the exact recipe —
  `git -C <checkout> checkout <fromSha7> && <tool> restart`. `last-good.sha` is the
  anchor.

### 6b. Health-probe verify — the upgrade isn't done until the new version answers
Poll `GET /health` (default ~500ms interval, ~15s budget) until `status=="ok"`
**and** the reported `version` matches the target (exact, or a ≥7-char sha
substring either direction — the daemon may report a tag or a sha7). Timeout →
treat the upgrade as failed and surface the rollback recipe. This probe is the
whole reason self-upgrade is trustworthy.

### 7. `doctor` — preflight every dependency and invariant
Run these, each `pass|warn|fail` with a one-line detail: runtime present (`bun
--version` / `node` / `go`); `git`; unit file exists; unit `is-active`; `/health`
reachable & ok; config channel is a valid enum; git remote resolves; (Linux)
linger enabled; **bind address not localhost-only**; datastore schema healthy
(migrations table present). Add pluggable checks for the tool's own integrations
(auth files, API creds) — silent unless that integration is configured. Exit
non-zero on any fail; on any warn under `--strict`.

### 8. `prune` (only if the tool produces per-run/ephemeral artifacts)
**Dry-run by default** — print a grouped preview with sizes; require `--apply` to
delete. Only touch **terminal-status** artifacts; keep anything a retry/salvage
path still needs; use a safety predicate before deleting refs (e.g.
`git merge-base --is-ancestor` before removing a branch). Never touch
operator-named branches.

### 9. `status` / `logs` / `up` / `down` / `restart`
Thin wrappers over the unit abstraction (§3) plus, for `status`, one `/health`
summary line. `logs` shells to `journalctl --user -u <tool>` (Linux) / `log
show`/plist stderr (macOS), inheriting stdio for native Ctrl-C on `--follow`.

---

## Load-bearing conventions (keep these, they're the opinionated core)

- **Hand-rolled dispatch, zero runtime deps.** `index.ts`: `switch(argv[0])`,
  each command a `parse<Cmd>Args(argv) → run<Cmd>(): Promise<number>` returning an
  exit code. Support both `--flag value` and `--flag=value`. Help is static
  template strings. Don't pull in a CLI framework for this.
- **Test seams for every external binary.** Read the binary name from
  `<TOOL>_CLI_SYSTEMCTL`, `_JOURNALCTL`, `_GIT`, `_PORT`, `_HEALTH_URL`, etc., so
  the CLI is testable without touching the real system. This is not optional — it
  is what makes the upgrade path coverable by tests.
- **`/health` is the arbiter of truth**, not the git sha you *think* you checked
  out. Probe-until-version, always.
- **Destructive commands are dry-run first, `--apply` to act.**
- **Resolve `checkout` and `<TOOL>_HOME` from the installed unit** when a flag
  isn't given (parse `WorkingDirectory=` / `Environment=<TOOL>_HOME=`), so the CLI
  operates on the *live* instance, not the cwd it happened to run from.

## Verify before calling it done
1. `<tool> install` on a clean box → unit installed, service active, `/health` ok.
2. `<tool> doctor` → all pass (or only expected warns).
3. `<tool> channel resolve` → prints the right target sha for each channel.
4. `<tool> upgrade --dry-run` → correct `from → to`; a real `upgrade` ends with
   `/health` reporting the new version; the upgrade-log has an `ok:true` line.
5. Kill the service mid-upgrade → the printed rollback recipe restores it.

See [`reference/machinery.md`](reference/machinery.md) for verbatim templates and
[`reference/origin.md`](reference/origin.md) for this skill's provenance.
