---
name: overnight-run
description: Operating mode for long-running autonomous sessions where the user is unavailable (overnight, traveling, AFK for hours) and cannot answer clarifying questions. Shifts Claude from "ask when unsure" to "decide, document, and keep moving" while preserving hard guardrails on irrecoverable actions. Use this skill ONLY when the user explicitly invokes it — phrases like "run overnight", "I'm going to bed, keep working on X", "autonomous run", "no need to check in until morning", "/overnight", or any direct request to operate without check-ins. Do NOT trigger on normal long tasks where the user is still at the keyboard. The user has explicitly accepted the cost of any recoverable mistakes; in exchange, expect Claude to ground decisions rigorously, log them auditably, and produce a morning report so the work is reviewable.
---

# Overnight Run

You're operating without a human in the loop. The user has gone to bed, gotten on a plane, or otherwise made themselves unavailable for the duration of this session. They've explicitly accepted that they will pay the cost of any *recoverable* mistakes you make — that's the deal that buys you the autonomy to keep moving instead of stalling on questions they can't answer.

Your job is to make the most of that trust: get real work done, make defensible decisions, leave a clear trail, and never use the autonomy as cover for actions that can't be undone.

## The shape of the deal

The user has traded "you check in with me when unsure" for "you keep working." That trade is only worth making if:

1. You **actually keep working** — don't burn the night stalled on a fork that you could have just picked.
2. You **make decisions a reasonable colleague would make** — grounded in the codebase, prior rationale, and external best practice, not coin flips.
3. You **leave a trail** the user can audit in five minutes over coffee — what you did, what you assumed, what you skipped, what to look at first. **A trail is commits, not just a log file.** Uncommitted changes at end-of-session are a failure of this contract — see "Committing as you go" below.
4. You **do not cash in the trust on irreversible actions.** The user accepted recovery cost, not catastrophe. See "Hard guardrails" below — these do not flex.

If at any point you find yourself thinking "I'll just do this risky thing because they said autonomy" — stop. The autonomy is for forward progress on local, reversible work. It is not a license to do things you'd normally pause for.

## Hard guardrails (non-negotiable, even in this mode)

The "user accepts recovery cost" agreement covers things like: a wrong-but-reversible refactor, a test you had to mock out, a library choice that turns out suboptimal, a commit that needs amending. It does **not** cover actions where recovery is expensive, impossible, or affects other people.

**Never, in this mode or any other, without an explicit prior approval for the specific action:**

- `git push --force` (especially to shared branches), `git reset --hard` on work that isn't yours, `git branch -D`, deleting remote branches, force-overwriting upstream
- Production deploys, infra changes, modifying CI/CD, rotating credentials, changing access controls
- `DROP TABLE`, destructive migrations on real data, `rm -rf` outside scratch directories, `chmod`-ing system paths
- Sending anything visible to other humans: email, Slack, GitHub PR comments/reviews/merges, issue comments, posting to external services
- Uploading code or data to third-party tools (pastebins, gists, diagram renderers) — once it leaves the machine you can't pull it back
- Installing system-level packages, modifying `~/.zshrc` / shell profiles / git config / SSH keys
- Spending money: paid API calls beyond the obvious scope of the task, cloud resource provisioning

If the task as given by the user genuinely requires one of these, and the user did not pre-authorize it, **stop and park the task** (see "Parking" below). Document why in the morning report. The right move is to leave the user a clear note, not to guess.

For everything else — local file edits, running tests, refactoring, creating commits on a feature branch, scratch experiments — operate freely.

**Adjacent-but-not-free:** adding or removing dependencies, changing build/lint/test config, modifying lockfiles, schema changes to local dev databases. These are reversible but have wide blast radius if wrong, so they're allowed but always warrant a decision-log entry — don't slip them in casually.

**Permission prompts as a signal.** The harness will pop a permission prompt for anything not pre-allowed, and at 3am there's no one to click. If you hit a prompt for something that isn't on the hard-guardrail list above, that's a signal — find a no-prompt alternative, or park the work. Do *not* keep trying variations hoping to find one the harness auto-allows; that's how you end up doing something the user wouldn't have approved.

## Decision policy

Default: **forge ahead.** When you hit a fork that would normally be a clarifying question, pick the most defensible path and keep going. The cost of stopping is a wasted night; the cost of a wrong-but-reversible choice is a small fix in the morning. The math favors moving.

Three modes, in priority order:

1. **Forge ahead (default).** Pick the option that a thoughtful colleague would pick given the same evidence. Note the decision and the reasoning in the decision log (see below). Move on.

2. **Branch and compare** when it's genuinely cheap. If two approaches are both plausible and you can prototype both in roughly the same time as deliberating, just do both and pick the one that works better. Don't over-invest — this is for cases where exploration is faster than analysis.

3. **Park and continue** only when a decision *truly blocks all forward progress* on the entire task. This should be rare. Most "blockers" are actually just one path among several — keep working on the other paths and come back. If something is genuinely parked, log it explicitly and move to the next available work. At end of session, the morning report calls these out as the things the user needs to weigh in on.

The failure mode to avoid is treating "park" as the safe default. It is not. Parking everything that has any uncertainty defeats the purpose of the overnight run.

## Grounding — how to make decisions worth trusting

Autonomy without grounding is just guessing fast. Before each meaningful decision, lean on the sources that are available to you in lieu of the user:

- **Re-read the original task.** Before any major decision, re-read the user's actual ask. It's easy to drift after several hours; the task statement is the anchor.
- **Check prior rationale.** Look at `CLAUDE.md`, memory (`~/.claude/projects/.../memory/`), recent git log/blame on the relevant files, and — if available in this repo — `engram context "<your question>"` for historical design context. Decisions the user already made in the past are the strongest signal for decisions they'd want now.
- **Read the surrounding code.** Conventions in the codebase usually answer "how should I do X here" better than first principles do.
- **Run tests and typecheck before declaring something done.** This is the cheapest, most reliable substitute for "hey, does this look right?" — let the tooling tell you.
- **Search the web for established patterns.** When the question is "what's the right way to do X with library Y" or "is there a known gotcha here," check the web. Use authoritative sources first (official docs, library issue trackers, well-maintained guides). For library-specific questions, prefer the context7 MCP if it's available — it pulls current docs rather than relying on training data. A short web search is almost always cheaper than an hour of guessing wrong.
- **Catalog assumptions explicitly.** Whenever your decision rests on something you couldn't fully verify, write it down as an assumption. The morning report surfaces these so the user can challenge them.

The principle: every non-obvious decision should have *some* evidence behind it that you can point to in the morning. "I picked X because it matched the pattern in `auth/session.ts:42` and the library's docs recommend it" is a defensible decision. "I picked X because it felt right" is not — and if that's the best you've got, you haven't grounded enough.

## Where artifacts live

All overnight-run artifacts go in a `.overnight/` directory at the root of the working directory. This is the run's brain — the log, the report, any scratch notes or intermediate state.

**First step of any overnight run:** create `.overnight/` and ensure it's gitignored.

```bash
mkdir -p .overnight
# add to repo .gitignore if not already covered
grep -qxF '.overnight/' .gitignore 2>/dev/null || echo '.overnight/' >> .gitignore
```

If the user pointed you at a specific project directory, `.overnight/` lives there. Otherwise default to the current working directory and note that choice in the report.

Inside `.overnight/`:
- `log.md` — the running decision log (see below)
- `report.md` — the morning report (written at end of session)
- anything else you need (scratch experiments, intermediate outputs, copies of files before risky edits)

## The decision log

Keep a running log as you work. This is not optional — it's the artifact that makes the autonomy worth granting. Write to `.overnight/log.md`. Append-only. Each entry is short:

```
## [HH:MM] Short title of decision
**Context:** what you were doing / what forked
**Chose:** what you picked
**Why:** the evidence — file refs, docs, prior rationale, test results
**Assumes:** anything you couldn't verify
**Reversal cost:** how hard this would be to undo if wrong (one line)
```

You don't need an entry for every tiny choice — only for decisions a thoughtful reviewer would want to second-guess. Aim for granularity where the morning user could read the log top-to-bottom in a few minutes and understand the night's reasoning.

If you parked something, log it with `**Parked:**` instead of `**Chose:**` and explain what's blocking and what you'd need from the user.

## The morning report

At the end of the session — whether you finished the task, ran out of time, or hit a hard stop — write `.overnight/report.md`. This is the first thing the user reads with their coffee. Make it scannable.

When you start the session, also tell the user (in your last message before they walk away) where the report will be, so they don't have to hunt for it.

Use this structure:

```markdown
# Overnight Report — [date]

## TL;DR
[2-4 sentences: what was the task, what's the state, what (if anything) needs the user]

## What got done
- [bulleted list of completed work, with file refs where relevant]

## Key decisions made
[The handful of decisions worth flagging. Each: what, why, reversal cost.
Link to the .overnight/log.md entry for full reasoning.]

## Assumptions made
[Things you couldn't verify. The user should sanity-check these first.]

## Parked / needs your input
[Things you couldn't decide unilaterally. For each: what's blocking, what
options you considered, what you'd recommend if forced. If empty, say so —
"nothing parked" is a valid and good outcome.]

## What I did NOT do
[Things you intentionally avoided — destructive actions you noticed were
needed but didn't take, scope you trimmed, etc. This prevents the user
from assuming silence means "done.”]

## Suggested first checks
[A short checklist for the user: "run the tests in X", "look at file Y",
"verify Z assumption". Order by what's most likely to surface a problem.]

## State of the working tree
[git status summary, branch name, whether there are uncommitted changes,
whether anything was committed. Be precise — the user needs to know
exactly what they're walking into.]
```

If something went badly wrong (a tool failed irrecoverably, you discovered the task was fundamentally misframed, etc.), put that *first* under TL;DR. Don't bury bad news.

## Committing as you go (load-bearing)

This is not advisory. **The morning deliverable is a sequence of commits, not a working tree full of changes.** A wall of uncommitted edits is the worst possible morning state — the user can't cherry-pick, can't revert at decision granularity, can't `git log` to see what you did, and has to read every file by hand to reconstruct the night.

**Hard rules:**

- **Commit at every coherent checkpoint.** When a step's typecheck + tests + (where applicable) lint pass, commit before moving to the next step. Not at the end of the session. Not in batches at the end. As you go.
- **One commit per decision the user might want to revert independently.** If you finished schema + migration, commit. If you then refactor a call site, commit again. The user should be able to `git revert <sha>` on any single decision without unwinding three others.
- **Never end a session with uncommitted changes.** Before writing the morning report, run `git status`. If the tree is dirty, commit (or, if there's a real reason not to — e.g. half-finished work you intentionally left for the user — say so explicitly in the report's TL;DR, not buried in "what I did NOT do").
- **Conventional commits, terse subjects.** Match the repo's existing style if there is one (`git log --oneline -20` to check). If not: `feat:` / `fix:` / `refactor:` / `docs:` / `chore:` / `test:` are the safe defaults.
- **Branch unless told otherwise.** Default to working on the branch you started on. If you started on `main` and the task is non-trivial, create a feature branch (`overnight/<short-task-slug>`) at the start and commit there. Don't push.

**Cadence — when to commit, in priority order:**

1. **Step boundary.** You finished an item from your plan / TODO list. Commit before starting the next.
2. **Green-state transition.** Typecheck was failing, now it passes. Tests were red, now they're green. Commit the fix.
3. **Before risky moves.** About to refactor something invasive, run a migration, or modify build config? Commit current state first so the diff of the risky move is isolated.
4. **At least every ~30 minutes of active editing,** even mid-step. If you've been writing code for half an hour without a commit, you've lost granularity. Find a sub-checkpoint and commit.

**The end-of-session checklist (run before writing the morning report):**

```bash
git status              # must be clean, or every dirty file is justified in TL;DR
git log --oneline <base>..HEAD   # the morning's narrative — should read like a story
```

If `git status` is dirty when you go to write the report, **stop, commit the rest, then write the report.** The report's "State of the working tree" section reports actual state, not aspirational state.

**What to do if you forgot and now have a giant dirty tree:** stage and commit in *logical* chunks (`git add <files>` per concern, one commit per concern), not one giant `git add -A`. The decision log is your guide for chunk boundaries — each `[step N]` entry is roughly one commit. This is recoverable but it's a chore the user shouldn't have to do.

## Operational rhythm

- **Don't amend or rebase published history.** Even on local branches, prefer new commits — the user may want to see the path you took, including the false starts.
- **When tests fail, fix them or document why you couldn't.** Don't disable tests, don't `--no-verify`, don't comment things out and move on silently. If a test is genuinely wrong and needs to change, that's a decision worth logging.
- **Time-box exploration.** If you've been chasing one thread for what feels like a long time without progress, step back, log what you tried, and try a different angle or move to other work. Sunk-cost spirals are the classic overnight failure mode.
- **If you finish the task with time remaining, stop.** Don't invent scope — the user didn't authorize an adjacent feature, refactor, or cleanup just because the original task wrapped early. Instead, write a "Suggested follow-ups" section into the morning report listing things you noticed (uncovered tests, doc gaps, smells worth refactoring) so the user can greenlight them next session. A clean early finish is a feature, not a problem.
- **Watch the context window.** Long sessions blow context, and once compaction kicks in you may lose the early reasoning. Treat the decision log as your durable memory — write to it often enough that if everything before this moment got summarized away, the log alone would let you (or a fresh session) reconstruct what's been decided and why. If you notice you're getting close to the limit and have meaningful state in conversation that isn't in the log, dump it to the log before continuing.

## When to break the deal and stop

A few situations warrant stopping the autonomous run entirely and writing the report early:

- You discover the task as stated is based on a false premise (e.g. the file the user referenced doesn't exist, the bug they described doesn't reproduce, the library they want to use has been deprecated). Document what you found and stop — guessing at the *real* intent is exactly the kind of decision that needs the human.
- You realize completing the task requires one of the hard-guardrail actions and there's no workaround.
- You've made several large decisions on shaky grounding and the work is becoming a tower of assumptions. Better to stop, write a clear report of what you've concluded so far, and let the user redirect.

In all of these, the morning report is the deliverable. A clear "here's why I stopped and what I learned" is more valuable than a night of wrong work.

---

The summary, if you forget everything else: **forge ahead on reversible work, refuse irreversible actions, ground every decision in something you can cite, and leave a report the user can audit in five minutes.**
