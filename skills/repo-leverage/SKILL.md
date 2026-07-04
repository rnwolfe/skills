---
name: repo-leverage
description: Run a full strategic leverage audit on any repository and produce an executable improvement plan across four lenses — technical innovation, defensibility/moat, profitability (or open-source health metrics), and product/adoption metrics. Use this skill whenever the user points Claude at a repo and asks to "improve", "audit", "grow", "harden the moat of", "make more profitable", "make more adoptable", "find leverage in", or "level up" a project — or asks what to build next, how to position a project, how to get more stars/users/revenue, or whether a project is worth continuing. Also use it for pre-open-sourcing readiness checks and build-in-public preparation. Designed for frontier-model (Fable 5 class) deep-context analysis; do not answer these questions ad hoc when this skill is available.
---

# Repo Leverage

Turn any repository into a prioritized, agent-executable plan that increases its technical distinctiveness, defensibility, economics, and adoption. This is an operating procedure, not a lecture: the output is evidence-backed, sequenced, and shippable — never generic advice.

## Why this skill exists

Most "improve my repo" analysis fails in one of three ways: it stays generic (advice that applies to any repo), it over-architects (proposing rewrites instead of leverage), or it evaluates code quality when the actual bottleneck is legibility, positioning, or distribution. This skill forces the analysis through a rubric, requires every claim to cite specific evidence from the repo, and requires every recommendation to name its smallest shippable version and a kill-gate.

## Frontier-model operating posture

This skill assumes a model that can hold an entire codebase, its history, and its market context in mind simultaneously. Exploit that deliberately:

- **Whole-repo synthesis before judgment.** Do not score anything until recon is complete. Conclusions formed from the README alone are worthless; the moat usually lives in a schema file, a data pipeline, or an integration nobody documented.
- **Multi-perspective passes.** After forming your own view, re-read your findings from four adversarial viewpoints: a competitor deciding whether to clone this, a buyer/user deciding whether to adopt it, a new contributor hitting the repo cold, and a skeptical staff engineer reviewing the plan. Revise anything that doesn't survive all four.
- **Self-critique pass.** Before writing deliverables, explicitly ask: which of my recommendations would be identical for any repo in this category? Delete or sharpen those — generic output is the primary failure mode.
- **Evidence discipline.** Every scored claim cites a file path, commit pattern, metric, or quoted line. Every unknown is marked `UNKNOWN` with the cheapest way to resolve it. Never invent metrics, star counts, or market sizes.

## The procedure

### Phase 0 — Mode detection

Classify the repo before anything else, because the success metrics differ:

- **Commercial product** — revenue is the scoreboard. Profitability lens uses pricing, unit economics, cost structure.
- **Open-source project** — adoption is the scoreboard. Profitability lens swaps to OSS health: stars/forks/downloads trajectory, contributor funnel, dependency adoption, sponsorship/monetization surface.
- **Personal/portfolio project** — legibility is the scoreboard. The dominant lever is usually making already-done work visible and credible, not adding features.
- **Internal tool** — leverage-per-user is the scoreboard: time saved, error reduction, bus factor.

State the detected mode and confirm with the user only if genuinely ambiguous. Hybrid modes are fine (e.g., open-source with commercial ambitions) — score both.

### Phase 1 — Deep recon

Gather evidence before forming opinions. Cover, at minimum:

- **Positioning surface**: README, docs site, taglines, examples, screenshots/demos. What claim does the project make, and does the code back it?
- **Architecture**: entry points, core abstractions, dependency graph, the "hard part" (the piece that took real thought vs. commodity glue).
- **Data & schemas**: schema files, formats, corpora, migrations. Data and format decisions are the most common hidden moat.
- **History**: `git log` for commit velocity, tempo, contributor concentration (bus factor), recency, breadth of change. History reveals whether this is alive, and what its author actually valued.
- **Quality signals**: tests, CI, release cadence, versioning, changelog, error handling depth.
- **Ecosystem signals** (when network is available or `gh` CLI exists): stars/forks/watchers trajectory, open:closed issue ratio, PR responsiveness, downstream dependents, comparable projects.
- **Operational reality**: deployment story, config surface, install friction, time-to-first-success for a cold user (actually walk the quickstart mentally — count the steps and the failure points).

Write recon notes as you go. Do not skip recon on small repos; small repos hide their leverage in what's *absent*.

### Phase 2 — Score the four lenses

Read `references/rubric.md` and score each lens 1–5 with cited evidence. The four lenses:

- **Technical innovation** — what here is genuinely novel or hard-won vs. commodity? Where is the accumulated judgment a copier couldn't shortcut?
- **Moat / defensibility** — data moats, schema/format gravity, integration depth, switching costs, community, distribution position, compounding assets.
- **Profitability / OSS health** (per detected mode) — monetization surface and unit economics, or contributor funnel and adoption trajectory.
- **Product metrics** — time-to-value, activation friction, retention hooks, legibility of the value proposition.

A low score is not a criticism; it's a map of where leverage is cheapest. Flag the single weakest lens with the highest ceiling — that's usually the spearhead.

### Phase 3 — Generate plays

Read `references/playbook.md`. For each weak dimension, select or invent candidate plays. Every play must specify:

- **Play**: one-line description.
- **Smallest shippable version**: what could merge this week. If the smallest version is still a multi-week project, the play is over-scoped — decompose it or cut it.
- **Kill-gate**: the observable signal, with a deadline, that says stop. ("If the benchmark page gets no inbound interest in 30 days, don't build the comparison suite.")
- **Evidence link**: which Phase 2 finding this addresses.
- **Compounding check**: does this create an asset that appreciates (data, format adoption, published benchmark, distribution channel), or is it a one-time push? Prefer compounding.

Generate more plays than you'll keep — then cut ruthlessly in Phase 4.

### Phase 4 — Prioritize and sequence

Score surviving plays on impact × confidence ÷ effort. Then sequence, respecting dependencies. Identify:

- **The spearhead**: the one move that, if it works, changes the repo's trajectory. Everything else supports or follows it.
- **Quick wins**: shippable in one session, no strategic risk (README rewrite, benchmark publication, quickstart repair, example gallery). These are candidates for immediate execution.
- **Explicit non-goals**: name at least three plausible-sounding moves you are recommending *against*, with reasons. This is where over-architecture goes to die.

### Phase 5 — Deliverables and (optional) execution

Produce two files at the repo root (or a path the user names):

- **`LEVERAGE.md`** — the audit: mode, lens scores with evidence, the spearhead thesis, non-goals. Written for a human skimming on a phone: verdict first, evidence after.
- **`LEVERAGE-BACKLOG.md`** — the plan: each play as an agent-executable task with acceptance criteria, smallest shippable version, and kill-gate. Written so a fresh Claude Code session could pick up any item cold.

Then offer to execute the quick wins immediately in the same session. If the user agrees, do them, commit with clear messages, and update the backlog. Never execute strategic (non-quick-win) plays without explicit go-ahead.

## Output structure for LEVERAGE.md

Use exactly this shape:

```
# Leverage Audit: <repo>

## Verdict
<3–5 sentences: mode, the spearhead thesis, expected trajectory if executed>

## Lens scores
<four lenses, score /5 each, 2–4 evidence bullets per lens citing files/commits/metrics>

## The spearhead
<the one move, why it dominates, its kill-gate>

## Quick wins
<shippable this session>

## Sequenced plays
<remaining plays in order, each with smallest shippable version + kill-gate>

## Non-goals
<what NOT to do and why>

## Unknowns
<marked UNKNOWNs from recon + cheapest resolution for each>
```

Formatting for all generated markdown: never use horizontal rules; never number headings.

## Anti-patterns (hard constraints)

- **No generic advice.** If a recommendation would appear in an audit of any repo in the category, it doesn't belong here unless the evidence shows this repo specifically lacks it.
- **No speculative rewrites.** Architecture changes are only recommendable when a scored finding shows the current architecture blocks a specific play.
- **No feature-first bias.** For most repos — especially portfolio and early OSS — legibility and distribution moves (README, demo, benchmark, examples, packaging) dominate new features. Check this before proposing to build anything.
- **No invented numbers.** Market sizes, adoption figures, and revenue projections without sources are marked as assumptions with sensitivity noted, or omitted.
- **No plan without kill-gates.** A play with no stopping condition is a commitment trap, not a plan.
- **Respect the repo's constraints.** Detect and honor existing conventions (stack, license, style, stated non-goals in docs) rather than importing your own preferences.

## Reference files

- `references/rubric.md` — the four-lens scoring rubric with per-mode variants and score anchors. Read during Phase 2.
- `references/playbook.md` — a library of concrete plays organized by weak dimension, each with smallest-shippable examples. Read during Phase 3.
