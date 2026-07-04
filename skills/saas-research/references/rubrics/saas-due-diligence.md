# Rubric: SaaS due diligence

For deciding which SaaS to build. The user is a solo or small-team operator
deciding among nano-SaaS / micro-SaaS / vertical-SaaS opportunities. The
deliverable is a ranked set of finalists with build-or-skip recommendations
backed by *triangulated* evidence: keywords, SERP, and user sentiment.

Calibration: a representative run produced 350 keywords → 50 shortlist → 32
dossiers → 8 finalists.

## The evidence triangle (non-negotiable)

Real SaaS due diligence requires three legs of evidence, not one:

1. **Keyword evidence** — does the search demand exist? (Phase 1 expansion)
2. **SERP evidence** — who currently ranks; what's the competition shape?
   (Phase 3 dossier)
3. **Sentiment evidence** — what do real users say is broken about
   incumbents, or what do they wish existed? (Phase 1 sentiment harvest +
   Phase 3 dossier sections 2-7)

A finalist scoring high on only the first two legs is a guess. Every
high-scoring finalist needs at least one direct user-pain quote pointing at
a gap an incumbent has left open. **No quote, no high score** — see scoring
caps below.

## Phase 1 expansion strategy

### 1a. Keyword harvest

```sh
scripts/harvest_autocomplete.sh "<seed phrase>" "<niche-label>"
```

Pulls Google autocomplete via `suggestqueries.google.com/complete/search`.
One seed → 200-500 unique completions across letter + intent suffixes. Run
all seeds in parallel; dedupe + classify with `scripts/build_universe.py`
into `source/01-keyword-universe.csv`.

### 1b. Sentiment harvest (the new required leg)

Two scripted sources cover the bulk of the sentiment leg. Run both per seed
niche (and again per top shortlist candidate):

```sh
scripts/sentiment_harvest.sh "<seed or candidate>"
scripts/sentiment_reddit.sh   "<seed or candidate>" ./sentiment "sub1,sub2,sub3"
```

- **HN harvester** — pulls Hacker News via the public Algolia API. Output
  is a TSV sorted by score. HN skews dev-tools / infra; that's its bias.
- **Reddit harvester** — pulls threads from `www.reddit.com/.../search.json`
  plus top comments from `{permalink}.json`. No auth required, but a clear
  bot User-Agent is mandatory (default in the script). Output is a TSV
  with one row per thread + per top comment, sorted by score.
  - Pass a comma-separated subreddit list as the third arg whenever you
    know the audience (e.g., `"kubernetes,devops,sre"`). Sub-restricted
    search is dramatically higher-signal than global; global Reddit search
    pulls mostly off-topic threads with shared keywords.
  - Anonymous Reddit JSON is rate-limited around 60 req/min. The script
    sleeps 1.2s between comment fetches by default. If you hit 429,
    raise `SLEEP_BETWEEN` or lower `THREAD_LIMIT`.
  - Comments are where the pain quotes live. The TSV's `comment` rows are
    your primary citation source for the dossier's section 6.

Run both scripts before opening dossiers. They cover the two highest-signal
free sources without auth. The remaining sources stay agent-driven:

| Source | How to reach it |
|---|---|
| G2 / Capterra / TrustRadius / Trustpilot | WebSearch with `site:` filter — snippets surface star ratings + quote excerpts even when full pages are paywalled |
| Indie Hackers | WebSearch `site:indiehackers.com {q}` |
| GitHub Issues | `gh search issues "{q}"` via gh CLI for open-source competitor pain |
| Stack Overflow | WebSearch `site:stackoverflow.com {q}` for technical pain |
| Product Hunt comments | WebSearch `site:producthunt.com {q}` (limited value — mostly hype) |
| Bluesky / X | WebSearch only; APIs may be auth-gated |

Run the Phase 0 access check on each agent-driven source before committing
to use it. Document any blocked sources in `source/NOTES.md` and route
around — but flag the gap in scoring.

## Phase 2 triage filters (apply in order)

1. Drop pure-informational queries ("what is X", "how does Y work").
2. Drop queries with locked SERPs (Wikipedia + DR-90+ vendor docs dominate).
3. Drop queries whose primary buyer is non-technical (marketers, designers,
   non-technical SMB owners — unless the user said otherwise in the
   interview).
4. Drop misfits against operator hard filters from the interview ("must run
   on AWS", "OSS only", etc.).
5. **Keep** buyer-intent patterns: "best X for Y", "X tool", "X online", "X
   converter / validator / generator / checker / calculator", "alternative
   to X".
6. **Keep** specific-niche queries — `kubernetes operator testing framework`
   beats `kubernetes testing`.
7. **Keep** queries that already have visible HN / Reddit / review-site
   sentiment, even if SERP is partially closed — sentiment-evidenced gaps
   often beat SERP-only "open" candidates.

## Phase 3 dossier (per `source/raw/dossier-{slug}.md`)

Use `assets/dossier-template.md` — 9 sections. The dossier replaces the
SERP-only schema from older runs. Every dossier needs sentiment evidence
to support scores above 3 on intent or competition gap.

The labor budget per dossier is higher than SERP-only: plan ~30-45 min
each, not 10-15. **This means fewer dossiers but each is more
decision-grade.** Aim for 20-25 dossiers, not 30+, unless time allows.

## Phase 4 scoring rubric

Six dimensions, 1-5 each. Sum out of 30. **Cutoff: 18.** Deal-breakers: 1
on buyer intent or competition gap. Sentiment-evidence caps apply (below).

| Dimension | 1 | 5 |
|---|---|---|
| Buyer intent | Pure info-seeker, no pain quotes | Searcher has wallet out, pain quotes confirm urgency |
| Competition gap | Top-10 dominated by DR-90+ sites + reviews are positive | Thin / aging incumbents + repeated complaints in sentiment |
| Volume sufficiency | <50 searches/mo or one-tail keyword | Cluster of 10+ keywords, multiple long-tail variants |
| Skill fit | Outside operator's stack | Plays directly to operator's stack and writing voice |
| Build cost (inverted) | 6+ months to MVP | Single-weekend MVP, 2-3 weekends to paid tier |
| Recurring revenue plausibility | One-shot tool, weak monetization, free expectation only | Recurring use, real pain, clear paid trigger at $20-100/mo |

### Sentiment-evidence caps (the new rule)

- **Buyer intent ≤ 3** unless the dossier has at least 1 direct user-pain
  quote (HN, Reddit, review, GitHub Issue) showing real demand.
- **Competition gap ≤ 3** unless the dossier has at least 2 quotes from
  different sources showing repeated complaints about incumbents.

The reasoning: keyword volume + thin SERP can be a *mirage* (low intent,
unmonetizable). Sentiment evidence is what tells you the demand is real and
not a Google Suggest artifact.

### Tiebreakers

On equal totals: (1) competition gap (higher = wins), (2) recurring revenue
plausibility, (3) honest 90-day-to-revenue read.

## Phase 5 brief skeleton (per `source/03-finalists/{rank}-{slug}.md`)

Use `assets/brief-template.md` plus these saas-due-diligence-specific
sections:

- Target keyword (primary + 3-5 secondary)
- Search intent (one paragraph)
- The product, in one paragraph (what + free + paid + price)
- **Why this can rank** — gap analysis from the dossier, with at least one
  cited URL per claim
- **Why this can monetize** — sentiment-evidenced pain that justifies the
  paid trigger, with at least one cited user quote
- Build estimate (MVP scope, stack, hours, monthly running cost @ 100 users)
- Content plan (landing page, 5-10 articles, internal linking)
- Risks (top 3, including incumbent-launches-this if real, with cited basis)
- Comparable products (2-3 with pricing, distribution, weakness vs your
  positioning)
- First-week post-launch plan (the bridge — SEO is slow)

## Anti-patterns to flag explicitly

When you see these in finalists, name them in the brief:

- **The "should exist" trap.** "There's no good X for Y" usually means
  there's no demand. The sentiment leg of the triangle is the antidote — if
  nobody complains about the absence, nobody wants the thing.
- **The "I'd use this" trap.** Solo operators have miscalibrated "I'd pay"
  instincts. Sentiment from *other people* is what de-biases.
- **The "obvious gap" illusion.** If the gap is so obvious, ask why no
  incumbent has filled it. Often: low ceiling, brutal margins, or the gap
  is a mirage. Sentiment quotes should explain *why* incumbents haven't
  filled it (e.g., "the existing players are enterprise-priced; nobody
  serves the SMB tier").
- **The "easy SEO" mirage.** Thin SERPs sometimes mean low competition;
  sometimes mean low intent. If you can't find sentiment evidence of
  demand, it's the latter.
- **The "Google could ship this" risk.** For any AI-adjacent or
  vendor-platform-adjacent finalist, ask explicitly whether the platform
  vendor could absorb the feature in a quarter. If yes, name the risk.
- **The "VC-funded incumbent" wall.** Sentiment helps here — well-funded
  SaaS often have *also-ran* product quality despite the funding. If reviews
  show repeated complaints, the wall is more porous than the funding
  implies.

## Documenting rejections

Every rejection goes to `source/04-rejected.md` with:

- The cluster name and keyword scope
- The SERP evidence shape
- The sentiment evidence shape (or absence — "no HN signal in 5 years" is
  itself evidence)
- The specific anti-pattern triggered
- A "what would change my mind" line so future-Ryan knows what new evidence
  could revive the candidate

The rejection log is as valuable as the finalists. Don't shortcut it.
