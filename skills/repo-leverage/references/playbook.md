# Play Library

Concrete plays organized by the weak dimension they address. These are starting points — adapt to the repo's evidence, and invent repo-specific plays freely. Every play you adopt must be rewritten with the repo's specifics: its smallest shippable version, its kill-gate, and the Phase 2 finding it addresses. Never copy a play verbatim into the backlog.

A recurring theme: for most repos the highest-ROI plays make *existing* value legible or compounding, rather than adding new capability. Check the legibility plays before the build plays.

## Raising technical innovation

- **Extract the hard part.** Identify the component with the most accumulated judgment and separate it into a named, documented, independently testable module (or package). Naming the hard part is how it becomes citable, benchmarkable, and defensible. Smallest version: a docs page that names and explains it.
- **Publish the benchmark.** If the repo makes a performance/quality/correctness claim, build the smallest honest benchmark against 1–2 alternatives and publish results with reproduction steps. A published benchmark converts private judgment into public asset. Kill-gate: if the numbers don't favor the repo, publish the finding internally and pivot the positioning instead — never publish a rigged benchmark.
- **Encode the edge cases.** Turn tribal knowledge (why the weird branch exists, what inputs break naive approaches) into a documented test corpus. This is often the fastest way to raise the copier's last-20% wall.
- **Write the design note.** A single well-written "why it works this way" document (decisions, rejected alternatives, constraints) makes the innovation legible to evaluators — hiring managers, adopters, contributors — who will never read the code.

## Building moat

- **Own a format.** If the repo has an internal schema/data format, spec it, version it, and document it as if others will build against it. Formats accrete gravity; APIs get replaced.
- **Compound the data.** Find where usage generates data (logs, corrections, ratings, telemetry) and start retaining it in a shape that improves the product. The earliest possible start matters more than the pipeline's sophistication. Smallest version: append-only JSONL with a schema comment.
- **Deepen one integration.** One integration done to operational depth (auth edge cases, retries, migration path) beats five shallow ones — depth is switching cost. Pick the integration the evidence says users already live in.
- **Build the distribution asset.** For OSS/portfolio: the repo itself is not distribution. Establish one channel that compounds — a comparison/benchmark page that ranks in search, a listing in the ecosystem's registry/awesome-list/marketplace, or a recurring content surface. Kill-gate: one channel, 60 days, measurable inbound or stop.
- **Convert operation into evidence.** For portfolio-mode repos: uptime, commit cadence, real usage stats, and incident writeups are the moat. Surface them (badges, an operations page, a "running in production since X" section) rather than adding features.

## Improving profitability (commercial mode)

- **Find the buyer.** Re-derive who actually pays (often not the user). Rewrite one page of positioning for the buyer. Smallest version: a pricing page draft, unpublished, pressure-tested against 3 comparable products' pricing.
- **Meter the expensive path.** Locate the cost hotspot (LLM calls, GPU, storage growth) in code and make sure it's measured per-user/per-request before it's priced. You cannot price what you don't meter.
- **Move the demo off the margin.** If the free tier includes the expensive path, restructure so the wow-moment is cheap to serve and the expensive path is behind the meter.
- **Charge for the moat, give away the commodity.** Open the parts competitors already have; monetize the part scored highest on Lens 1/2. If nothing scores high enough to charge for, that finding *is* the audit result — say so plainly.

## Improving OSS health (open-source mode)

- **Fix the leakiest funnel stage.** From the Lens 3b funnel audit, take the single leakiest stage and fix only that. Usually: quickstart repair (target <5 steps, <10 minutes, tested from a clean environment), or a hosted/zero-install demo.
- **Show the payoff first.** Restructure the README so the outcome (screenshot, GIF, output sample) appears before any installation instruction. Smallest version: one animated demo at the top.
- **Manufacture the first contribution.** Label 5–10 genuinely small issues, write a CONTRIBUTING.md that takes a stranger from clone to merged PR, and respond to the first external PRs within 24h. Kill-gate: if 90 days of good-first-issues yields zero external interest, the problem is discovery, not contribution friction — reallocate to distribution plays.
- **Release like you mean it.** Semantic versions, changelog, one-line install. Projects without releases read as abandoned regardless of commit activity.

## Improving product metrics

- **Trace and cut the quickstart.** Actually execute the cold-start path; count steps and failure points; cut steps until first success is under 10 minutes. This play has the best effort:impact ratio in the whole library and should be checked on every audit.
- **Install a retention hook.** Find the recurring trigger in the user's life the product can attach to (a weekly ritual, a recurring pain, an inbox). If no recurring trigger exists, flag it: the product may be a tool (fine) rather than a habit (different growth model) — don't force it.
- **Instrument activation.** Define the activation event ("user reaches X"), measure it, and put it somewhere it gets looked at. Smallest version: a counter and a weekly note.
- **Delete before adding.** If activation friction is high, removing options/config/steps usually beats adding onboarding. Propose deletions explicitly — they rarely propose themselves.

## Sequencing heuristics

- Legibility plays (README, demo, design note, benchmark) come before build plays — they're cheap, reversible, and they sharpen the thesis for everything after.
- Metering comes before pricing; pricing comes before growth spend.
- Never run two spearheads at once. One trajectory-changing bet, surrounded by quick wins.
- Any play still unshipped at its kill-gate date gets killed or explicitly re-chartered in the backlog — silence is not a decision.
