# Methodology

## What this report is

A SaaS due-diligence scan to support: {build decision in one sentence —
e.g., "decide which nano-SaaS niche to ship first"}. Built under these
constraints: {operator profile, time-to-revenue target, hard filters,
distribution channels from interview}. The premise: the answer comes from
*triangulated* evidence — keyword demand, SERP shape, and direct user
sentiment — not from intuition or "I'd use this".

The work was:

1. Seed expansion via Google autocomplete + sentiment harvest (HN Algolia,
   Reddit, review sites, GitHub Issues).
2. Triage by buyer-intent shape, SERP locks, and operator hard filters.
3. Per-candidate dossier covering SERP, HN, Reddit, reviews, competitor
   depth, pain-language patterns, trust signals, and gap analysis.
4. Six-dimension scoring (1-5 each, /30, cutoff 18) with sentiment-evidence
   caps on buyer-intent and competition-gap dimensions.
5. Finalist briefs with build estimate, content plan, risks, and a
   first-week post-launch bridge.

## What this report is *not*

- Not a feature spec or implementation plan — finalists are pre-MVP.
- Not exhaustive — limited by {time budget, blocked sources, seed list
  scope}.
- Not bias-free — the seed list and operator hard filters narrow the field
  by design. Document them so the reader can re-weight.

## Data sources used

| Source | What it gave us | Limitations |
|---|---|---|
| Google autocomplete | Keyword universe, intent suffixes | No volume data; suggestion bias toward popular |
| HN Algolia | Story + comment signal on incumbents and gaps | Skews dev-tools / infra audience |
| Reddit (via {actual path used}) | Pain quotes, incumbent complaints | Harness-blocked sometimes; mirror coverage uneven |
| Review sites (G2 / Capterra / etc.) | Aggregate scores + complaint themes | Snippet-only access without paid plans |
| GitHub Issues | Open-source competitor pain | Only OSS competitors |

## Data sources NOT used (and why)

- **{source}** — {why blocked / skipped, and what we substituted}
- **{source}** — same shape

Document explicitly. Reader trust depends on knowing what you couldn't do
and where the sentiment leg of the evidence triangle is thinner than ideal.

## Tier conventions

For qualitative tiers used in the dossier verdicts:

- **Outrank-ability:** brutal / hard / moderate / plausible / easy
- **6-month traffic if ranked top 3:** tiny / low / medium / high
- **Buyer intent:** weak / moderate / strong (capped at moderate without ≥1
  sentiment quote)
- **Competition gap:** closed / narrow / open / wide (capped at narrow
  without ≥2 quotes from different sources)
- **Time to plausibly rank:** 3-6 / 6-12 / 12+ months

## Scoring rubric

Six dimensions, 1-5 each. Sum out of 30. Cutoff at 18. Deal-breakers: 1 on
buyer intent or competition gap.

| Dimension | 1 | 5 |
|---|---|---|
| Buyer intent | Pure info-seeker, no pain quotes | Searcher has wallet out, pain quotes confirm urgency |
| Competition gap | DR-90+ sites + positive reviews | Thin / aging incumbents + repeated complaints |
| Volume sufficiency | <50/mo, single keyword | Cluster of 10+ keywords, long-tail variants |
| Skill fit | Outside operator's stack | Plays directly to operator's stack and audience |
| Build cost (inverted) | 6+ months to MVP | Single-weekend MVP, 2-3 weekends to paid tier |
| Recurring revenue plausibility | One-shot, free expectation | Recurring use, clear paid trigger at $20-100/mo |

**Sentiment-evidence caps:**
- Buyer intent ≤ 3 unless dossier has ≥1 user-pain quote.
- Competition gap ≤ 3 unless dossier has ≥2 quotes from different sources.

Tiebreak: competition gap > recurring revenue plausibility > 90-day-to-revenue read.

## Honest caveats

- Volumes are qualitative — Google autocomplete gives shape, not numbers.
- Sentiment leg is uneven across candidates — Reddit access varies, some
  niches have weak HN presence. Where sentiment is partial, scores are
  capped per the rubric and the verdict notes it.
- Build estimates are operator-relative — calibrated to {operator stack},
  not a generic developer.
- {Other caveat specific to this run}
