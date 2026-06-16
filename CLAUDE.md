# Home Assistant Config — Project Charter

## Project Context
Full Home Assistant configuration for the Imperial Command Center. Includes:
- `ui-lovelace.yaml` — Lovelace dashboard (all views, custom imperial-cards)
- `packages/` — domain-specific HA config (climate, manufacturing, etc.)
- `automations.yaml`, `scripts.yaml`, `scenes.yaml` — automation logic
- `custom_components/` — HACS and custom integrations
- `configuration.yaml` — root HA config

The **Botanical Bay** view in `ui-lovelace.yaml` is the HA companion to GROW-SRE
(`/Users/jason/github/grow_sre`). Changes to grow room entities must be coordinated
with the grow_sre repo.

## Orchestration Model

This project uses a four-agent pipeline. You are the orchestrator. Do not implement
directly — spawn subagents using the Task tool, passing each the relevant persona
file from `.claude/` plus the accumulated context from prior agents.

See `.claude/pipeline.md` for routing rules and pipeline diagram.
