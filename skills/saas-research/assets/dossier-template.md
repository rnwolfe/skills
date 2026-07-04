# Dossier: {candidate keyword / niche}

> Replaces the SERP-only schema. Each candidate dossier is the body of evidence
> against which scoring happens. Without sentiment evidence, "buyer intent"
> and "competition gap" scores cap at 3 — see rubric.

## 1. Top 10 SERP

For each ranking page:

```
N. [Page title](url)
   - Type: tool / blog / docs / forum / product page / vendor funnel
   - Estimated DR: low / medium / high / very high (heuristic — note basis)
   - Content depth: thin / medium / deep
   - Last updated: {if visible}
   - Monetization: free / freemium / paid / ads / none
   - Quality of intent match: weak / okay / strong
   - Notes: {what it does well, what it lacks}
```

## 2. Hacker News signal

From `scripts/sentiment_harvest.sh "{keyword}"`. Capture top 5-10 hits. For
each: date, points, comment count, one-sentence summary, and either a key
quote (when it's a comment) or "Show HN" / "Launch HN" / discussion context
(when it's a story).

```
- 2025-10-08 (59pts, 8c) — Show HN: HyprMCP — analytics for MCP servers.
  Indicates MCP infra category is active. Founder cites pain: "testing was
  simple, but production-ready remote MCP was the next step."
- {date} ({points}pts, {comments}c) — {summary + quote/context}
```

If a HN hit reveals an incumbent gap, note it explicitly — that quote feeds
the gap analysis section below.

## 3. Reddit signal

From `scripts/sentiment_reddit.sh "<keyword>" ./sentiment "sub1,sub2,sub3"`.
Pass a comma-separated subreddit list whenever you know the audience —
sub-restricted search is dramatically higher-signal than global. The TSV
ships both `thread` and `comment` rows; comments are usually the better
quote source.

Capture top 3-5 threads + the strongest pain quote each (often pulled from
the comment rows under that thread). Format:

```
- r/kubernetes — "Why does every operator's docs suck?" (215 upvotes, 2025-08)
  Top comment quote: "I just want a tree view of CRDs. Why is this so hard?" (87 pts)
- r/{sub} — {title} ({score}, {date})
  Top comment quote: "{verbatim user pain}" ({pts} pts)
```

If the script returns 429s repeatedly, raise `SLEEP_BETWEEN=2.5` or lower
`THREAD_LIMIT=8` and re-run. If the niche has no Reddit presence at all,
that is itself evidence — note "no Reddit signal in past 12 months despite
sub-restricted search of {subs tried}" and use it in section 8 as a
demand-weakness flag, not just a gap in evidence.

## 4. Review-site sentiment

WebSearch the candidate's incumbent products on review platforms. Snippets
surface in the SERP even when full pages are paywalled.

```
WebSearch site:g2.com {incumbent}        # B2B SaaS reviews
WebSearch site:capterra.com {incumbent}  # SMB-focused reviews
WebSearch site:trustpilot.com {incumbent}  # consumer/SMB
WebSearch site:trustradius.com {incumbent}  # enterprise tech
```

For the top 1-3 incumbents in the SERP, capture aggregate signal:

```
- {Incumbent} (G2: 4.3/5, 1,842 reviews):
  - Top praise: "{summary of repeated positive themes}"
  - Top complaint: "{summary of repeated complaints — the gap quote}"
- {Incumbent} (Capterra: 4.7/5, 234 reviews):
  - Top praise: …
  - Top complaint: …
```

Repeated complaints across review platforms = the strongest gap signal we
have access to. They almost always point at concrete missing features or
pricing pain that a new entrant can attack.

## 5. Competitor depth (top 3 SERP-ranking products)

For each of the top 3 ranking commercial products (skipping docs / Wikipedia /
SO):

```
### {Product name} ({url})

- Pricing: {entry / mid / enterprise — actual numbers if visible}
- Hosting: SaaS / self-hosted / hybrid
- OSS: {license or "closed"}
- Last shipped: {date of latest release / blog post / commit}
- Customer evidence: {visible logos / case studies / "none"}
- GitHub activity (if OSS): {stars, last commit, contributor count}
- Funding signal: {seed / Series A / B+ / bootstrapped / unknown}
- One-sentence positioning: {what they say they do}
```

This is the ground-truth check on whether the SERP is "competitive" or just
"populated." A category with 5 well-funded SaaS at the top is brutal; a
category with 5 aging blog posts and one tiny indie tool is open.

## 6. Pain-language patterns

Direct quotes from the sentiment sources above showing where users are
frustrated with incumbents. **3-7 quotes minimum.** Each quote is sourced
(forum, review site, HN, etc.) and dated when possible.

```
- "Beeceptor is great but I can't replay webhooks in CI" — HN comment, 2025-09
- "Mockoon is desktop-only, our team needs a hosted shared mock" — G2 review, 2025
- "Why is webhook signature verification so hard? Every vendor does it differently" — r/webdev
```

These are the gap signals. If you can't produce 3-7, the "competition gap"
score is not yet defensible; either expand sentiment sources or score
conservatively (≤3).

## 7. Trust signals

Quick read on which incumbent has actual customer momentum:

```
- {Incumbent}: 14k GitHub stars, ⬆ 1.2k in last 6mo, 24 contributors, last release 2 weeks ago, 4 paid customers visible on landing page
- {Incumbent}: 800 reviews on G2, score 4.4, ⬆ 200 in last 6mo
- {Incumbent}: launched 2024-Q3, 1.2k stars, no public revenue/customer signal
```

Distinguish "loud incumbent" (lots of marketing, thin customer evidence)
from "real incumbent" (deep customer base + ongoing momentum).

## 8. Gap analysis

Synthesis of sections 1-7. The gap is the *specific feature, price-point,
audience, or positioning* that all the evidence points at as undeserved.

- What's missing from the top 10 ranking pages that real users (per sections
  2-4) say they want?
- Is the gap addressable by a focused tool, or does it require a platform-scale
  product?
- Is the gap something an incumbent could close in a sprint, or is it
  structural (architecture, audience, pricing model)?
- Could a tool + comparison-content combo dominate this gap?

This section answers: *if I built for this gap, why would I win?* If you can't
write a crisp paragraph, the gap isn't real — score conservatively.

## 9. Verdict

```
- Outrank-ability: brutal / hard / moderate / plausible / easy
- Estimated 6-month traffic if ranked top 3: tiny / low / medium / high
- Buyer intent (with sentiment evidence): weak / moderate / strong
- Competition gap (with sentiment evidence): closed / narrow / open / wide
- Time to plausibly rank: 3-6 / 6-12 / 12+ months
- Single most likely failure mode: {one sentence}
- Sentiment evidence sufficiency for scoring above 3: yes / no / partial
```

The last line is critical. **If sentiment evidence is "no" or "partial",
buyer-intent and comp-gap dimensions are capped at 3 in scoring** — see
`references/rubrics/saas-due-diligence.md`.
