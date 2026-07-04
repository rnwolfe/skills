# Origin

This skill was scaffolded from a Heimdall (Factory) **Watch** synthesis insight,
2026-07-04.

## The insight

> The operator is instrumenting dwell's productized CLI "to manage upgrades,
> maintenance, install, etc. — just like we do for `~/dev/factory`", replicating
> the channel-based self-upgrade machinery by hand into each new tool. This is a
> recurring per-project ritual; worth generalizing so any new productized tool is
> born with the upgrade/install/maintenance surface instead of copying Factory's
> each time.

Kind: `pattern` — a recurring ritual the operator kept performing by hand.

## The source

Generalized from Factory's `apps/cli/` (`~/dev/factory`, `@factory/cli`): a
hand-rolled, dependency-free service-management CLI (`factory install | upgrade |
doctor | status | logs | prune | up | down | restart | uninstall | channel`) with
a systemd user unit, channel-based self-upgrade (stable = highest release tag),
and a `/health`-probe verify. The `SKILL.md` parameterizes the Factory-specific
bits (naming, Bun/workspace runtime, systemd-only service model, the run-artifact
DB schema `prune` assumes) and adds a launchd variant for the operator's macOS
hosts.

## Relationship to sibling skills

- **release / versioning flow** — owns tags + changelog + the in-app "what's new"
  modal. This skill *consumes* the tags it produces (channel `stable`). Kept
  separate so neither duplicates the other.
- **productionize-service** — one-time promotion of a working local service to a
  managed always-on prod service on a specific host. This skill instead gives the
  tool its *own portable* self-management CLI, usable on any host and able to
  self-upgrade on a channel.
