# skills

A harness-agnostic registry of [agent skills](https://agents.md) — each is a `SKILL.md`
(YAML frontmatter + markdown) under `skills/<name>/`. Install any of them into your agent
with [`npx skills`](https://github.com/vercel-labs/skills), which targets Claude Code,
Codex, Cursor, OpenCode, and dozens more:

```sh
# install one skill into the current project's agent
npx skills add rnwolfe/skills --skill <name>

# browse everything in this registry
npx skills add rnwolfe/skills
```

Because the registry is just a GitHub repo of `SKILL.md` files, a skill works the same
whether your agent reads `.claude/skills/`, `.agents/skills/`, or a Codex/Cursor path —
`npx skills` installs it to the right place per harness. That harness-agnosticism is the
whole point: author once here, run anywhere.

## Layout

```
skills/
  <skill-name>/
    SKILL.md          # required — frontmatter (name, description) + instructions
    reference/        # optional — supporting docs the skill loads on demand
    scripts/          # optional — helper scripts the skill invokes
```

## Authoring

See [`AGENTS.md`](./AGENTS.md) for the conventions every skill here follows (frontmatter
shape, description-as-trigger discipline, keeping the body lean). New skills are typically
scaffolded from a [Heimdall](https://github.com/rnwolfe/factory) Watch insight — a recurring
ritual the system noticed and proposed generalizing — but a hand-written `SKILL.md` that
follows the layout above is equally valid.

## Companion skills (from other registries)

This registry contains only skills authored here. Some skills I use every day live in
**other** registries — installing them from *their* source keeps attribution and upstream
updates intact, rather than vendoring copies here. If you want the full set I run, add these
too:

- **Video / motion** — [`heygen-com/hyperframes`](https://github.com/heygen-com/hyperframes):
  `hyperframes` (+ siblings), `general-video`, `motion-graphics`, `music-to-video`,
  `website-to-video`, `faceless-explainer`, `embedded-captions`, `talking-head-recut`, and more.
- **Skill discovery** — [`vercel-labs/skills`](https://github.com/vercel-labs/skills): `find-skills`.
- **Image generation** — [`gargantuax/openskills`](https://github.com/gargantuax/openskills): `nanobanana`.

```sh
npx skills add heygen-com/hyperframes
npx skills add vercel-labs/skills --skill find-skills
npx skills add gargantuax/openskills --skill nanobanana
```
