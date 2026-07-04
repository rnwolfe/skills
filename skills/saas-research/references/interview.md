# Phase −1: Operator interview

The interview captures the operator profile and the build decision shape. Every
downstream phase depends on getting these answers right; an off-target seed list
or fuzzy decision produces a polished-but-useless report. Don't skip.

## How to run the interview

Don't ask all questions at once. Lead with the **decision question** — the
answer often makes the rest obvious, so propose defaults for everything else
and only push back if the user disagrees.

If the user already gave you most of this in their initial prompt, extract
it, state your interpretation back, and ask only the gaps. Don't make them
re-answer.

## The question set

### 1. The build decision (mandatory)

> "What are you trying to decide? Phrase it as a sentence ending in a verb."
> Examples:
> - "Decide which nano-SaaS niche to build first."
> - "Validate whether `<specific idea>` is worth pursuing."
> - "Find me 5-10 keyword opportunities I could turn into a one-person SaaS."

If the user answers vaguely ("just exploring SaaS ideas"), this skill is
premature. Suggest a quick web-search summary first — the phase 0-7 structure
needs a real build decision to lean against.

### 2. Operator profile

This is what makes the rubric's "skill fit" dimension work. Without it, every
candidate scores 3 on skill fit by default and the rubric loses signal.

> "Tell me about your stack — what do you ship in fluently? What languages,
> frameworks, infrastructure layers? Where are you genuinely strong?"

> "What audiences can you write authoritatively for? (e.g., backend engineers,
> ML researchers, SREs, indie devs, startup CTOs.)"

> "What audiences should I reject outright, even if a candidate scores well?
> (e.g., marketers, designers, lawyers, non-technical SMB owners.)"

Capture these as **hard filters** — they apply ruthlessly in Phase 2 triage.

### 3. Distribution channels

> "What distribution channels do you actually have? (Twitter following, dev
> community presence, mailing list, HN account with karma, podcast, talks at
> events, etc.)"

> "Which channels do you NOT have? (We'll exclude any candidate that requires
> distribution you don't have access to — e.g., no community-launch SaaS if
> you're not in the community already.)"

Distribution constraints are the most ignored part of nano-SaaS planning. A
candidate that needs Twitter virality fails for a non-Twitter operator no
matter how good the rubric score is.

### 4. Time-to-revenue target

> "How fast do you need first paying customers? 30 days / 90 days / 6 months
> / 'whenever'?"

This shapes both the time-budget and the bias toward smaller MVPs vs. larger
products. A 90-day target rules out IaC translators (high build cost); a
6-month target keeps them in.

### 5. Finalist count + time budget

> "How many finalists do you want — usually 5 to 10. More finalists means
> shallower briefs; fewer means deeper ones."

> "Roughly how much agent time should I spend? 4-8 hours is typical for a
> proper triangulated run. The sentiment leg adds time vs. SERP-only — plan
> at least 6 hours if you want depth."

Defaults: 5-10 finalists, 6-8 hours.

### 6. Seeds

> "Give me 5-30 starting points / seed niches / seed topics. If you don't
> have any in mind, I'll generate a list and you can prune."

Seed examples that work well for SaaS due diligence:
- Specific dev workflows ("kubernetes operator authoring", "MCP server
  testing", "OpenAPI tooling")
- Infra/networking categories ("DNS records", "TLS certs", "webhook
  testing")
- AI/agent infrastructure ("LLM cost", "prompt evaluation", "agent
  observability")
- Niche calculators / converters ("AWS cost calculator for X", "OpenAPI
  to Postman")
- Technical writing / docs ("changelog generator", "ADR tools",
  "runbook templates")

If the user has no seeds: generate a draft list spanning the operator's
profile and bring it back for confirmation before expanding. Don't waste
expansion cycles on seeds the user hasn't seen.

### 7. Hard filters (audience / scope / ethics)

> "What kinds of candidates should I reject outright, even if they score
> well?"

Examples:
- "I'm not in marketing — reject anything where the buyer is a marketer"
- "Open-source-friendly only — anything with predatory pricing is out"
- "Must run on AWS / Cloudflare / VPS"
- "Must be SOC 2 path-able for enterprise sales later"
- "No AI-wrapper products"
- "Nothing that requires a community I'm not in"

Document these as the hard-filter list in `source/00-methodology.md`. Apply
in Phase 2 triage *first*, before any rubric scoring.

### 8. Kill criteria for finalists

> "What would make a finalist a kill? Even one of these is enough to reject."

This is forward-looking — the user's stated stop conditions for any of the
top picks. Save these to `source/NOTES.md` and surface them in the
skeptical-investor review at the end.

Common kill criteria:
- "Anthropic / OpenAI / a major platform vendor could ship this"
- "Requires distribution channel I don't have"
- "Buyer can't justify > $50/mo recurring"
- "MVP needs more than 3 weekends"
- "Free-tier expectation is unbreakable"

### 9. Output expectations

> "Should I publish to a generated site, or are markdown files in a folder
> enough?"

Default: yes, publish (Phase 7). The site adds ~30 minutes for a big
readability win on mobile.

## What to write down before starting Phase 0

After the interview, write a brief into `source/NOTES.md`:

```markdown
## Run setup

- **Build decision:** {one sentence ending in a verb}
- **Operator profile:**
  - Stack: {languages / frameworks / infra}
  - Audiences I write authoritatively for: {list}
  - Distribution channels I have: {list}
  - Distribution channels I don't have (and won't fake): {list}
- **Time-to-revenue target:** {30 days / 90 days / 6 months / open-ended}
- **Hard filters (apply in Phase 2 triage):**
  - {filter 1}
  - {filter 2}
- **Kill criteria for finalists:**
  - {criterion 1}
  - {criterion 2}
- **Target finalist count:** {N}
- **Time budget:** {hours}
- **Seeds (after user confirmation):**
  - {seed 1}
  - …
```

This is the contract for the run. Refer back at every phase gate.

## Common interview failure modes

- **Decision is too broad.** "Research SaaS opportunities" doesn't help.
  Push for the build decision: build *what* / for *whom* / by *when*?
- **Skill stack is fluffy.** "I know JavaScript" is too vague. Push for
  specifics: "I ship TypeScript on Bun and have shipped Cloudflare Workers
  apps in production." Specifics power skill-fit scoring.
- **Distribution constraints not surfaced.** Skipping question 3 is the
  most common failure mode. Without it, you'll spend hours on candidates
  the user has no path to launch.
- **Hard filters not surfaced.** Skipping question 7 means hours wasted on
  candidates the user would reject in 5 seconds.
- **Seeds reflect priors.** A user listing only the tools they already know
  predisposes the run to confirm their existing view. Add 5-10 seeds via
  competitive-landscape WebSearch to broaden.

## When the interview is done

Confirm the captured brief back to the user verbatim and ask "anything to
adjust before I start?" Then proceed to Phase 0.
