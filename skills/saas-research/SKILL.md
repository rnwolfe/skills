---
name: saas-research
description: Decision-grade SaaS due-diligence workflow for solo and small-team operators choosing what to build next. Triangulates evidence from three legs — search keywords (Google autocomplete), SERP composition, and user sentiment (Hacker News, Reddit, G2/Capterra/Trustpilot review snippets, GitHub Issues, forums) — then scores candidates on a 6-dimension rubric weighted toward buyer intent and competition gap, writes actionable build-or-skip briefs for 5-10 finalists, and publishes everything as a mobile-readable Astro Starlight site. Use whenever the user asks for SaaS opportunity research, nano-SaaS / micro-SaaS / vertical-SaaS due diligence, "what should I build next", "find me a SaaS niche", "is this SaaS idea worth pursuing", "validate this SaaS opportunity", "scan SEO opportunities for a small SaaS", "build vs skip analysis for X", overnight SaaS research, or any multi-hour investigation that needs ranked, evidenced, build-ready briefs. Trigger this even when the user does not explicitly say "skill" — phrases like "research SaaS options around X", "find me a niche I could build for", "is there a paid product idea in Y", "evaluate building a tool for Z", "do due diligence on this SaaS idea", or "scan keyword opportunities for a one-person SaaS" all warrant invoking this skill. Output is always a canonical `source/` markdown directory plus a generated mobile-readable `site/` with finalists ranked, rejected candidates documented, and pain-language quotes cited inline. Skip this skill for: vendor adoption decisions (which SaaS to *buy*), academic literature reviews, generic market scans unrelated to a build decision, or any one-shot lookup that doesn't need the multi-phase structure.
---

# saas-research — SaaS due diligence, for solo and small-team operators

A long-running, decision-grade research workflow. Don't try to compress this into
a single turn — the value of the skill is in the *structure* (phase gates,
triangulated evidence, ranked finalists, rejection reasoning), and that structure
takes hours of agent time to execute well.

## Why this exists

A solo or small-team operator deciding what SaaS to build next gets fooled by
Google autocomplete (suggests demand that doesn't exist), thin SERPs ("looks
beatable" turns out to mean "nobody bothered because there's no money there"),
and "I'd use this" instincts (miscalibrated against the actual buyer). The
antidote is **triangulated evidence**: keywords + SERP + sentiment. This skill
forces all three legs and refuses to score finalists high without sentiment
quotes proving real user pain.

## Output shape (the deliverable)

Every run produces this structure:

```
<project>/
├── source/                          # canonical research artifact
│   ├── README.md                    # 5-minute executive summary (front page)
│   ├── 00-methodology.md            # what was done, what couldn't, sources
│   ├── 01-keyword-universe.csv      # the keyword universe with intent classification
│   ├── 02-shortlist.md              # promoted candidates with rationale
│   ├── 03-finalists/                # 5-10 deep briefs, ranked
│   │   ├── 01-{slug}.md
│   │   └── …
│   ├── 04-rejected.md               # what got dropped + why (as valuable as finalists)
│   ├── 04-scoring.md                # rubric scores and tiebreakers
│   ├── NOTES.md                     # decisions journal + skeptical-investor review
│   └── raw/
│       ├── dossier-{slug}.md        # per-candidate evidence dossiers (SERP + sentiment)
│       └── sentiment/
│           └── hn-{slug}.tsv        # raw HN harvest output
├── site/                            # Astro Starlight site generated from source/
└── scripts/
    └── sync.ts                      # source/ → site/ generator (provided)
```

**`source/` is truth. `site/` regenerates from `source/`.** Whenever the user
edits a brief, re-run `bun scripts/sync.ts`.

## When to NOT use this skill

- Vendor adoption decisions ("which Postgres host should I pick") — different
  shape; the user is a buyer, not a builder.
- Academic literature reviews.
- Generic market scans unrelated to a build decision.
- One-shot lookups ("what's the current pricing for Claude Sonnet?").
- Code-writing tasks.
- The user is exploring vaguely without a build decision in mind — say so and
  offer a plain web-search summary first.

## Workflow: 8 phases with gates

Phase −1 through 7. Each phase has a verifiable gate. If a phase blocks for >90
minutes, document the blocker in `NOTES.md` and continue with what you have.

### Phase −1: Interview (gate: operator profile + scope agreed)

Read `references/interview.md` and run it. By the end you should have:

- A one-sentence statement of the build decision being supported
- Operator profile: skill stack, distribution channels they have (or don't),
  time-to-revenue target
- Hard filters: audiences to reject outright (e.g., "no marketing-buyer
  products"), tech constraints, ethics filters
- Target finalist count (5-10 typical) and time budget (4-8 hours typical)
- Initial seed list (5-30 starting points, or accept "I don't have any —
  generate")
- The user's stated kill criteria for finalists

If the user is unsure on any of these, propose a default and let them redirect.

### Phase 0: Tooling check (gate: every data source you plan to use, verified)

Spot-check 3 queries against each data source. The triangulation requires three
legs, so test all three:

**Keyword leg:**
- `curl https://suggestqueries.google.com/complete/search?client=firefox&q=test`
  should return JSON.

**SERP leg:**
- WebSearch any test query — verify it returns 8-10 results.

**Sentiment leg (the new required leg):**
- `scripts/sentiment_harvest.sh "test query"` should produce a non-empty TSV
  from HN.
- `scripts/sentiment_reddit.sh "test query" /tmp/r "programming"` should
  produce a TSV with both `thread` and `comment` rows. If you see HTTP 429
  in stderr, raise `SLEEP_BETWEEN=2.5` for the run.
- WebSearch `site:g2.com mockoon` (or any well-known SaaS) — verify review
  snippets appear.
- `gh search issues "test"` — verify GitHub Issues access for OSS competitor
  pain.

Document each source's status in `source/NOTES.md` with `working` / `partial` /
`blocked`. The two scripted sources (HN + Reddit) cover the highest-signal
free, no-auth surface; if either is blocked in your harness, that's a
genuine failure to flag, not a routine fallback.

### Phase 1: Expansion (gate: 200-500 keyword candidates + sentiment baselines)

**1a. Keyword harvest.** Run `scripts/harvest_autocomplete.sh "<seed>" "<niche>"`
for every seed (parallel via xargs). Dedupe + intent-classify with
`scripts/build_universe.py` into `source/01-keyword-universe.csv`. Cap at
~350 rows so triage stays decision-grade.

**1b. Sentiment baseline.** For each seed, run *both* scripted harvesters
in parallel:

```sh
scripts/sentiment_harvest.sh "<seed>" source/raw/sentiment
scripts/sentiment_reddit.sh   "<seed>" source/raw/sentiment "<sub1,sub2,sub3>"
```

The Reddit subreddit list is critical — pass it whenever the seed has an
obvious audience (e.g., `"kubernetes,devops,sre"` for K8s ops tooling, or
`"webdev,javascript,reactjs"` for frontend tools). Sub-restricted Reddit
search is dramatically higher-signal than global; global is mostly noise.

Skim both TSVs briefly. A seed with zero HN signal in 5 years *and* zero
Reddit signal in the past year is a strong yellow flag (no community
discussion, likely low demand or wrong-audience target). Document any
flagged seeds in NOTES.

The two-source baseline is intentional. HN skews dev-tools; Reddit covers
SREs, ops, vertical SaaS buyers, and SMB users HN never sees. Triangulating
both prevents the demand mirage you'd get from either alone.

### Phase 2: Triage (gate: 30-50 candidates promoted with rationale)

Apply rubric filters in order (see `references/rubrics/saas-due-diligence.md`).
Promote to `source/02-shortlist.md` with one paragraph each: *why it survived,
initial product hypothesis, who currently occupies this space, which sentiment
sources to mine in Phase 3*.

### Phase 3: Per-candidate dossier (gate: 20-30 dossiers with all 9 sections)

Use `assets/dossier-template.md` for the schema. Each dossier covers nine
sections: Top-10 SERP, HN signal, Reddit signal, review-site sentiment,
competitor depth, pain-language patterns, trust signals, gap analysis,
verdict.

This phase is ~30-45 min per dossier (vs. 10-15 for SERP-only). Plan
accordingly: 20-25 thorough dossiers beat 30 shallow ones for scoring quality.

### Phase 4: Score and rank (gate: rubric scored, finalists chosen, sentiment caps applied)

Apply the 6-dimension rubric (see rubric file). Cutoff: 18/30. Deal-breakers:
1 on buyer intent or competition gap. **Sentiment-evidence caps:**

- Buyer intent ≤ 3 unless dossier has ≥1 user-pain quote
- Competition gap ≤ 3 unless dossier has ≥2 quotes from different sources

These caps are the difference between this skill and a SERP-only run. Honor
them; they're how you avoid the "should exist" trap.

Save scores to `source/04-scoring.md`. Anything scoring below cutoff or hitting
a deal-breaker goes to `source/04-rejected.md` with reason.

### Phase 5: Finalist briefs (gate: 5-10 briefs of 600+ words each)

Use `assets/brief-template.md` plus the SaaS-specific sections from the rubric.
Every brief cites at least one URL per ranking-gap claim and at least one user
quote per monetization claim.

### Phase 6: Executive summary (gate: README.md is usable as a 5-minute brief)

Use `assets/readme-template.md`. Top 3 picks with one-line rationale,
recommended next step (which finalist to validate first, why), stats,
navigation.

### Phase 7: Publish to site (gate: `bun run build` clean, all internal links resolve)

See `assets/site-bootstrap/README.md` for the Astro Starlight init commands.
Then `bun scripts/sync.ts` populates the site from `source/`. Validate links;
the sync script enforces this.

After build, capture a 375px-viewport screenshot of one finalist brief and
embed in the project root README.

## Skeptical-investor review (final gate before reporting done)

Re-read the top 3 finalists as a skeptical investor. For each, write to
`source/NOTES.md`:

- What's the most likely reason this fails? (Cite specific evidence.)
- What would I want to see in 30 days to keep going?
- What would make me kill it?

If you can't answer crisply, the brief isn't done. Update the source markdown,
re-run sync.

## Bundled scripts (provided, ready to use)

In `scripts/`:

- `harvest_autocomplete.sh "<seed>" "<niche>"` — Google autocomplete harvester.
  TSV out. Polite delays (~0.15s/query).
- `sentiment_harvest.sh "<query>"` — HN Algolia API → TSV sorted by score.
  Saves to `./sentiment/` by default; configure as `source/raw/sentiment/` for
  clean runs.
- `sentiment_reddit.sh "<query>" [out-dir] ["sub1,sub2,..."]` — Reddit
  `.json` endpoints (no auth, polite UA, ~1.2s between comment fetches).
  Emits TSV with both `thread` and `comment` rows sorted by score, plus a
  raw `.json`. Pass subreddit list whenever you know the audience.
- `build_universe.py` — dedupes + intent-classifies the autocomplete TSV into
  the keyword-universe CSV.
- `sync.ts` — universal: regenerates `site/src/content/docs/` from `source/`,
  rewrites internal markdown links to Starlight URLs, validates link integrity.

## Bundled assets

In `assets/`:

- `brief-template.md` — finalist brief skeleton (600-1000 words)
- `readme-template.md` — executive summary front-page skeleton
- `methodology-template.md` — "what we did, what we couldn't" skeleton
- `dossier-template.md` — the 9-section per-candidate evidence schema
- `site-bootstrap/README.md` — Astro Starlight init commands

## Working style

- **Commit per phase.** Conventional commits, one per gate. The user scans
  `git log` to track progress.
- **Cite evidence.** Every claim about a competing product / user / forum
  thread includes a URL or a citation. Qualitative tiers ("strong") need
  justification.
- **Honor user-shaped filters.** If the user said "I'm not in marketing",
  reject any candidate whose primary buyer is marketing — even if it scores
  well on other dimensions.
- **Document blockers.** When a sentiment source is blocked or a phase stalls,
  write it in NOTES. Then route around. The blocker itself is a finding.
- **Bias to fewer well-evidenced candidates over many shallow ones.** Brief
  says "5-10 finalists"; if only 5 score above cutoff with sentiment evidence,
  ship 5.
- **Avoid the four traps.** Each rubric file documents these — surface them
  explicitly when you see them in finalists.

## Output shapes

A complete run produces a `source/` markdown corpus with these shapes:

- `source/README.md` — executive summary
- `source/03-finalists/<slug>.md` — finalist brief (one per finalist)
- `source/04-rejected.md` — rejection documentation
- `source/raw/serp-<slug>.md` — per-candidate SERP dossier (this skill expands
  each to the 9-section form)
- `scripts/sync.ts` — sync script (bundled under `scripts/`)

**Calibration:** a representative overnight run produced 350 keywords → 50
shortlist → 32 dossiers → 8 finalists in ~3 hours of agent time using SERP-only
dossiers. This skill's 9-section dossiers run somewhat longer per dossier — plan
for that.

## Acceptance criteria

Tick before reporting done:

- [ ] `source/01-keyword-universe.csv` ≥ 200 rows
- [ ] `source/02-shortlist.md` ≥ 30 candidates with rationale
- [ ] `source/raw/dossier-*.md` exists for ≥ 20 candidates, each covering all
      9 sections
- [ ] `source/raw/sentiment/hn-*.tsv` exists for every shortlist candidate
      that scored above 18
- [ ] 5-10 finalist briefs in `source/03-finalists/`, each ≥ 600 words, each
      citing ≥1 URL per ranking claim and ≥1 user quote per monetization claim
- [ ] `source/04-rejected.md` documents what got dropped (with sentiment
      evidence shape captured)
- [ ] Top 3 finalists pass the skeptical-investor review
- [ ] `site/` builds cleanly with `bun run build`, zero warnings
- [ ] All internal links resolve (sync script enforces)
- [ ] `bun run sync` regenerates idempotently
- [ ] Mobile screenshot saved + embedded in project root README
