# Leverage Rubric

Score each lens 1–5. Anchors below define what each score means so scores are comparable across repos and across audits. Every score requires cited evidence (file paths, commit patterns, quoted lines, metrics). When evidence is unavailable, score conservatively and record an UNKNOWN with the cheapest resolution path.

## Lens 1: Technical innovation

The question: what here would be genuinely hard for a competent copier to replicate quickly — not because the code is long, but because it embodies accumulated judgment, hard-won correctness, or a non-obvious insight?

**Score anchors**

- **1** — Commodity glue. Everything here is a tutorial-grade assembly of well-known parts. A copier with the README could rebuild it in a weekend.
- **2** — Competent assembly with one or two thoughtful decisions, but nothing a domain-experienced engineer wouldn't converge on independently.
- **3** — At least one component embodies real accumulated judgment: a non-obvious schema, a subtle correctness property, a tuned heuristic, an unusual-but-right architectural bet. A copier gets 80% fast and stalls on the last 20%.
- **4** — The hard part is central, not peripheral. The repo's core value depends on something that took extended iteration to get right (evidence: commit history showing repeated refinement of the same component, tests encoding non-obvious edge cases).
- **5** — Category-defining insight. The repo's approach would change how a knowledgeable reader thinks about the problem. Rare; do not award casually.

**What to look for**: the component with the densest commit history; tests that encode surprising edge cases; comments explaining *why* rather than *what*; schemas/formats with versioning and migration discipline; benchmarks against alternatives.

**Common miss**: innovation hiding in the *data* or *eval* layer rather than the code — a curated corpus, a taste rubric, a golden test set. These often score higher than the code around them.

## Lens 2: Moat / defensibility

The question: if this succeeds, what stops a better-resourced actor from taking the win? Moats compound; features don't.

**Score anchors**

- **1** — Nothing. Success would be immediately contestable; no asset here appreciates with use.
- **2** — Weak habit/convenience lock-in only (users would need a reason to leave, but switching is cheap).
- **3** — One real compounding asset: a schema/format others build against, accumulated user data that improves the product, an integration position, or a distribution channel (audience, SEO, marketplace listing).
- **4** — Multiple reinforcing assets, or one asset with genuine gravity (downstream dependents, an ecosystem of extensions, data that can't be re-collected).
- **5** — Structural position: network effects, protocol/standard status, or exclusive data. Rare.

**Moat inventory to check explicitly**: proprietary or curated data; schema/format adoption by others; depth of integrations (each integration is switching cost); community and contributor base; distribution position; operational knowledge encoded in runbooks/configs; brand/trust in a niche.

**Per-mode note**: for portfolio-mode repos, "moat" translates to *credibility assets* — evidence of sustained operation (commit cadence, uptime, real users even if n=1 household) is the moat against the sea of abandoned demo repos.

## Lens 3a: Profitability (commercial mode)

The question: is there a credible path from value delivered to money captured, and do the unit economics survive contact with scale?

**Score anchors**

- **1** — No monetization surface; value delivered is real but structurally uncapturable (or costs scale faster than any plausible revenue).
- **2** — A monetization idea exists but is untested and unpriced; cost structure unknown.
- **3** — Clear pricing surface (who pays, for what, roughly how much) with at least back-of-envelope unit economics; costs are measured or measurable.
- **4** — Willingness-to-pay evidence exists (waitlist, LOIs, comparable products' pricing, actual revenue); margin structure understood including the expensive paths (GPU, support, egress).
- **5** — Revenue with retention, and margins that improve with scale.

**What to look for**: cost hotspots in the code (per-request LLM calls, GPU jobs, storage growth); whether the expensive path is on the free tier; pricing/billing code or its absence; who the buyer actually is vs. who the user is.

## Lens 3b: OSS health (open-source mode)

The question: is the adoption flywheel spinning — and where does it stall?

**Score anchors**

- **1** — No external adoption signal; single contributor; no releases.
- **2** — Sporadic stars/forks but no dependents, no external issues/PRs — visibility without adoption.
- **3** — Evidence of real external use: issues from strangers, downstream dependents, package downloads with a pulse; release discipline exists.
- **4** — Contributor funnel functioning: external PRs merged, more than one recurring contributor, responsive maintainership (check median issue response time), docs good enough that people succeed without filing issues.
- **5** — Ecosystem status: plugins/extensions by others, cited by other projects, sustainable maintenance (funding, co-maintainers).

**The funnel to audit**: discover → try → succeed → depend → contribute. Find the leakiest stage. Usually it's *try → succeed*: count the actual steps in the quickstart and identify where a cold user fails.

## Lens 4: Product metrics

The question: how fast does a new user reach the moment where the product's value is undeniable, and what pulls them back?

**Score anchors**

- **1** — Value proposition not legible from the README; time-to-first-success unknown or >1 hour with failure points.
- **2** — Legible claim, but the quickstart has friction (missing prerequisites, environment assumptions, broken steps) — verified by actually tracing it.
- **3** — A cold user reaches first success in <15 minutes; at least one screenshot/demo/example shows the payoff before any setup is asked of them.
- **4** — Time-to-value is near-instant (hosted demo, playground, one-command run) and there's a retention hook: the product gets better with use, or embeds into a recurring workflow.
- **5** — Activation and retention are instrumented and improving; the product has an obvious habitual slot in its user's day/week.

**What to look for**: trace the quickstart step-by-step as a cold user; check whether the README shows outcome before mechanism; look for telemetry/analytics presence (and its privacy posture); identify the recurring trigger that brings a user back.

## Cross-lens synthesis

After scoring, answer these before moving to plays:

- Which lens is weakest *relative to its ceiling*? (A 2/5 moat on a project with a real data asset is a bigger opportunity than a 2/5 innovation score on commodity tooling.)
- Where do lenses conflict? (E.g., open-sourcing the hard part raises adoption but spends the moat — name the tradeoff explicitly.)
- What single asset, if built, would raise two or more lenses at once? Those are spearhead candidates.
