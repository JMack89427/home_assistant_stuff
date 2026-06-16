# Orchestrator Pipeline Reference

## Routing

| User trigger | Entry point |
|---|---|
| "design / plan / architect" | Architect only |
| "implement / build / add" | Full pipeline |
| "review / check / QA" | QA only |
| "document / update docs" | Tech Writer only |
| "suggest / analyze / what automations / automation ideas" | Automation Analyst only |
| "implement suggestion N" | Full pipeline (pass Analyst output as context) |
| "full pipeline" | All four in sequence |

## Pipeline Flow

### Standard implementation
User Request → Orchestrator → @architect → @implementor → @qa → @tech-writer

### Automation discovery
User Request → Orchestrator → @automation-analyst → (present findings) → await user selection → Full pipeline

Parallelization: @architect and @tech-writer may run concurrently when scope is already known.
@qa always runs after @implementor.
@automation-analyst always runs before the full pipeline when triggered by a discovery request.

## How to invoke a subagent

Use the Agent tool and reference agents by name — they live in `.claude/agents/` and
carry their own model assignment:

| Agent | Model | Purpose |
|---|---|---|
| `architect` | opus | Design docs, scope, entity analysis |
| `implementor` | sonnet | Production YAML authoring |
| `qa` | sonnet | Correctness review, checklist |
| `tech-writer` | haiku | Comments, changelog entries |
| `automation-analyst` | opus | Live HA analysis, automation suggestions |

## Orchestrator constraints
- Never write YAML or implementation code directly
- Halt and surface QA FAIL verdicts to the user before proceeding
- Synthesize all agent outputs into a final summary for the user
