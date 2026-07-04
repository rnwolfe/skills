# AGENTS.md — authoring skills in this registry

This repo is a harness-agnostic skill registry. Every skill is a `SKILL.md` under
`skills/<name>/`, installable via `npx skills add rnwolfe/skills --skill <name>`. When you
(an agent, e.g. a Heimdall run) are asked to scaffold a new skill here, follow these rules.

## The contract

1. **One directory per skill:** `skills/<kebab-name>/SKILL.md`. The `<name>` matches the
   `name:` frontmatter field. Supporting material goes in `reference/` or `scripts/`
   alongside it and is referenced by relative path from `SKILL.md`.

2. **Frontmatter is the trigger surface.** Every `SKILL.md` starts with YAML frontmatter:

   ```markdown
   ---
   name: <kebab-name>
   description: <one dense sentence: WHAT it does AND WHEN to use it, in the third person, with concrete trigger phrases>
   ---
   ```

   The `description` is how a harness decides whether to load the skill — write it as a
   precise trigger, not a summary. Name the situations, the phrasings a user would type,
   and what the skill produces. Avoid the first person.

3. **Harness-agnostic body.** Write instructions that hold for any capable coding agent —
   don't assume Claude Code specifics (no reliance on a particular tool name, slash
   command, or config path). If a step needs a tool, describe the capability, not the
   vendor. This is what lets one `SKILL.md` install cleanly across Claude Code, Codex,
   Cursor, OpenCode, etc.

4. **Lean by default.** The body is the always-loaded cost. Keep it to the decision
   procedure and the non-obvious rules; push long references, templates, and examples into
   `reference/` files the skill loads only when needed.

5. **Self-contained & idempotent.** A skill should not depend on repo-local state. If it
   writes files, it says where; if it runs commands, they're safe to re-run.

## When scaffolding from a Heimdall Watch insight

The insight carries the *ritual* the operator kept doing by hand and the *why*. Turn that
into: a `name` that reads as the capability, a `description` whose triggers match how the
operator would ask for it next time, and a body that captures the actual repeatable
procedure (not a one-off). Preserve the insight's provenance in a trailing comment or a
`reference/origin.md` so the skill's lineage is auditable.
