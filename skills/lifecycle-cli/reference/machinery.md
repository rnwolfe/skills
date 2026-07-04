# Machinery — verbatim templates for the lifecycle CLI

Load this when writing the code. Snippets are the Bun reference stack; translate
build/install/migrate commands to the target repo's runtime. `<tool>` / `<TOOL>` /
`<user>` are placeholders. Every external binary is read through a
`<TOOL>_CLI_*` env override so the CLI stays testable.

---

## Layout

```
apps/cli/src/
  index.ts          # dispatch: switch(argv[0]) → run<Cmd>()
  help.ts           # static HELP template strings
  commands/         # up down restart status logs install uninstall channel upgrade doctor prune
  lib/              # channel config exec health-probe journal state systemctl unit
  upgrade/          # precheck checkout deps migrate seed build-cli build-frontend probe
```

Build to a standalone binary and symlink onto PATH:
`bun build --compile --outfile dist/<tool> ./src/index.ts` → `~/.local/bin/<tool>`.

---

## Dispatch (`index.ts`) — hand-rolled, zero deps

```ts
#!/usr/bin/env bun
async function main(argv: string[]): Promise<number> {
  const cmd = argv[0];
  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") { console.log(HELP); return 0; }
  switch (cmd) {
    case "up":        return runUp();
    case "down":      return runDown();
    case "restart":   return runRestart();
    case "status":    return runStatus();
    case "logs":      return runLogs(argv.slice(1));
    case "install":   return runInstall(argv.slice(1));
    case "uninstall": return runUninstall();
    case "channel":   return runChannel(argv.slice(1));
    case "upgrade":   return runUpgrade(argv.slice(1));
    case "doctor":    return runDoctor(argv.slice(1));
    case "prune":     return runPrune(argv.slice(1));
    default: console.error(`unknown command: ${cmd}\n`); console.log(HELP); return 1;
  }
}
process.exit(await main(process.argv.slice(2)));
```

Each `parse<Cmd>Args` is a manual loop handling both spellings:

```ts
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--checkout") args.checkout = argv[++i];
  else if (a.startsWith("--checkout=")) args.checkout = a.slice("--checkout=".length);
  else if (a === "--dry-run") args.dryRun = true;
}
```

## exec helper (`lib/exec.ts`)

```ts
export async function run(argv: string[], opts?: { cwd?: string; env?: Record<string,string> }) {
  const p = Bun.spawn(argv, { cwd: opts?.cwd, env: { ...process.env, ...opts?.env },
                              stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text()]);
  return { exitCode: await p.exited, stdout, stderr };   // ENOENT → surface as 127
}
export async function whichBin(name: string) { const r = await run(["which", name]); return r.exitCode === 0 ? r.stdout.trim() : null; }
```

---

## Service unit — Linux (systemd user unit)

`~/.config/systemd/user/<tool>.service` (respect `$XDG_CONFIG_HOME`):

```ini
[Unit]
Description=<Tool> daemon
After=network-online.target

[Service]
Type=notify
NotifyAccess=all
WorkingDirectory=${checkout}
Environment=<TOOL>_HOME=${toolHome}
Environment=PATH=%h/.local/bin:%h/.local/share/mise/shims:%h/.bun/install/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=${bunBin} run --cwd ${checkout} start
Restart=always
RestartSec=2
TimeoutStartSec=60

[Install]
WantedBy=default.target
```

- `Type=notify`+`NotifyAccess=all` only if the daemon calls `sd_notify(READY=1)`
  (the real daemon is often a grandchild of the `bun run` chain, hence `all`).
  Otherwise `Type=simple` and drop `NotifyAccess`.
- `PATH` is hardcoded because user units don't inherit interactive PATH; include
  wherever the service's shelled-out tools live.
- `%h` is systemd's home specifier.

systemctl wrapper (`lib/systemctl.ts`): `systemctl --user <verb> <tool>`; treat
`/Unit .* could not be found|not loaded/i` as "not installed → run `<tool> install`"
(exit 2). Enable/disable via `enable --now` / `disable --now`; `daemon-reload`
after writing/removing the unit. `loginctl enable-linger <user>` so it survives
logout (gate behind `--yes`/prompt). Logs via `journalctl --user -u <tool>`
(`-n N --no-pager [--since]` captured; `-f` with inherited stdio).

## Service unit — macOS (launchd LaunchAgent)

`~/Library/LaunchAgents/com.<user>.<tool>.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.<user>.<tool></string>
  <key>ProgramArguments</key>
  <array><string>${bunBin}</string><string>run</string><string>start</string></array>
  <key>WorkingDirectory</key><string>${checkout}</string>
  <key>EnvironmentVariables</key><dict>
    <key><TOOL>_HOME</key><string>${toolHome}</string>
    <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${toolHome}/logs/<tool>.out.log</string>
  <key>StandardErrorPath</key><string>${toolHome}/logs/<tool>.err.log</string>
</dict></plist>
```

Verbs: `launchctl bootstrap gui/$UID <plist>` (load), `bootout` (unload),
`kickstart -k gui/$UID/com.<user>.<tool>` (restart). Abstract these behind the
same interface as the systemctl wrapper so command bodies never branch on OS.

---

## Channel resolution (`lib/channel.ts`)

```ts
const SEMVER_TAG = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].+)?$/;

async function resolveStable(remote: string) {
  const { stdout } = await run(["git", "ls-remote", "--tags", "--refs", remote]);
  const tags = stdout.split("\n")
    .map(l => l.match(/^([0-9a-f]+)\s+refs\/tags\/(.+)$/))
    .filter(Boolean)
    .map(m => ({ sha: m![1], tag: m![2] }))
    .filter(t => SEMVER_TAG.test(t.tag) && !/[-+]/.test(t.tag)); // skip pre-release/build
  tags.sort((a, b) => compareSemver(a.tag, b.tag));
  const top = tags.at(-1);
  return top && { channel: "stable", ref: top.tag, sha: top.sha };
}

async function resolveBranch(remote: string, branch: string) {
  await run(["git", "fetch", "--quiet", remote, branch]);
  const { stdout } = await run(["git", "rev-parse", "FETCH_HEAD"]);
  return { channel: branch === "main" ? "nightly" : "dev", ref: `${remote}/${branch}`, sha: stdout.trim() };
}
```

`readSubject(sha)` = `git log -1 --format=%s <sha>`; `shortSha` = first 8 chars.

---

## Upgrade pipeline (`commands/upgrade.ts`)

Resolve checkout (`--checkout` → config → parse unit `WorkingDirectory=`) and
`<TOOL>_HOME` (parse unit `Environment=<TOOL>_HOME=`) so migrate/seed hit the live
instance. Then, each step returns early with an `appendUpgradeLog({ok:false})` on
failure:

```
1  precheck   git status --porcelain=v1 -uall  (dirty → abort unless --force)
              fromSha  = git rev-parse HEAD
              lockPre  = git rev-parse HEAD:<lockfile>
2  resolve    channel → target.sha ; if === fromSha → "already on X", exit 0
              print  from → to (ref: subject) ; --dry-run stops here
3  checkout   on a branch:  git merge --ff-only --quiet <sha>   (stay on branch)
              else:         git checkout --quiet --detach <sha>
4  deps       lockPost = git rev-parse HEAD:<lockfile>
              if lockPre !== lockPost:  bun install --frozen-lockfile
5  migrate    bun run db:migrate     (env: live <TOOL>_HOME)
   seed       bun run seed           (idempotent)
6  build-cli  bun run --filter @<tool>/cli build     # ships upgrader fixes
   build-fe   bun run --filter @<tool>/pwa build     # BEFORE restart
7  restart    <unit restart>
   probe      probeUntilVersion(ref.startsWith("v") ? ref : shortSha(sha))
8  success    writeLastGood(sha) ; appendUpgradeLog({ok:true})
```

Detached-HEAD note: if the tool auto-merges runs into its own checkout, a detached
HEAD breaks that merge — hence prefer `merge --ff-only` when on a named branch.

Rollback recipe printed on any failure:
`git -C <checkout> checkout <shortSha(fromSha)> && <tool> restart`.

---

## Health probe (`lib/health-probe.ts`)

```ts
export async function probeHealth(timeoutMs = 1500) {
  const port = process.env.<TOOL>_CLI_PORT ?? readConfigPort() ?? "<default>";
  const url  = process.env.<TOOL>_CLI_HEALTH_URL ?? `http://127.0.0.1:${port}/health`;
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    const body = await res.json();                       // { status, version, uptime_ms, ... }
    return { ok: res.status === 200 && body.status === "ok", ...body };
  } catch (e) { return { ok: false, status: "unreachable", error: String(e) }; }
  finally { clearTimeout(t); }
}

export async function probeUntilVersion(expected: string, totalMs = 15000, intervalMs = 500) {
  const deadline = Date.now() + totalMs;               // NOTE: real code uses a monotonic loop
  while (Date.now() < deadline) {
    const h = await probeHealth();
    if (h.ok && versionMatches(h.version, expected)) return { ok: true, version: h.version };
    await Bun.sleep(intervalMs);
  }
  return { ok: false };
}
// versionMatches: exact, OR a >=7-char substring match either direction (tag vs sha7).
```

Server side, `version` = `git describe --tags --always --dirty` (cached once per
process), overridable by an explicit `APP_VERSION` env.

---

## doctor checks (`commands/doctor.ts`)

Each → `{ name, status: pass|warn|fail, detail }`, printed `✓/!/✗`:

1. runtime — `bun --version` (or node/go) present
2. `git --version`
3. unit file exists at the expected path
4. unit `is-active` === active
5. `/health` reachable & `status==="ok"` (show version, live workload)
6. config channel ∈ {stable,nightly,dev}
7. `git remote get-url <remote>` resolves (in `checkout`)
8. (Linux) `loginctl show-user <user> --property=Linger` === `Linger=yes`
9. bind host — warn if `127.0.0.1`/`localhost`/`::1` (LAN-unreachable)
10. datastore — open read-only, confirm migrations table present
11. pluggable per-integration checks — silent unless that integration is configured

Exit non-zero on any fail; on any warn when `--strict`.

---

## Config & state (`lib/config.ts`, `lib/state.ts`)

- `<TOOL>_HOME/config.yaml` (mode `0600`), `upgrade` block:
  `{ channel: stable, devBranch: dev, remote: origin, checkout: <path|null> }`.
  Round-trip the YAML document so sibling keys (auth token, port) survive.
- `<TOOL>_HOME/state/last-good.sha` — the rollback anchor (`writeLastGood`).
- `<TOOL>_HOME/state/upgrade-log.jsonl` — append `{ ts, from, to, channel, ok, error? }`.
- Resolve `<TOOL>_HOME` at call time: env → `~/.<tool>`. Never memoize at import.

---

## What was Factory-specific (parameterize these)

- **Names:** `factory` everywhere → `<tool>`; `~/.factory` → `<TOOL>_HOME`;
  `FACTORY_CLI_*` → `<TOOL>_CLI_*`; `isFactoryRepo` checks `package.json.name`.
- **Runtime:** Bun + a workspace monorepo (`@factory/cli`, `@factory/pwa`,
  `@factory/daemon`), lockfile `bun.lock`, scripts `start`/`db:migrate`/`seed`.
  Swap for the target's package manager and script names.
- **Two build products:** a daemon (`bun run start`) + a PWA static dist that must
  be built before start. No frontend → drop build-fe.
- **DB:** SQLite + Drizzle (`__drizzle_migrations`). Prune assumes a specific
  `runs ⋈ projects` schema with per-run worktrees and `factory/run-*` branches —
  that whole command only applies to tools with the same run-artifact shape.
- **Service model:** systemd user unit only in the original; this skill adds the
  launchd variant. `Type=notify` assumes `sd_notify`.
- **Self-hosting concern:** the FF-or-detach checkout logic exists because Factory
  auto-merges into its own checkout. Irrelevant for tools that don't.
- **Domain integration checks:** codex-auth / GitHub-App checks are Factory
  features → generalize to "pluggable extra doctor checks."
