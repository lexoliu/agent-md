# agent-md

Install instruction packages — skills or plain markdown rule sets — into a
coding agent's always-on rule files (`AGENTS.md`, `CLAUDE.md`, or any path you
choose). A coding agent performs the merge; you approve the diff before
anything is written.

## Why not install skills as skills

1. **Auditable.** Every change lands as a reviewed diff you approve — not a
   plugin directory you never read.
2. **No silent conflicts.** Skills plus existing `AGENTS.md` rules drift into
   contradiction. The merge agent reads your file, dedupes overlaps, and asks
   you when instructions genuinely conflict.
3. **No context reloads.** Rules in `AGENTS.md`/`CLAUDE.md` are loaded every
   session and survive compaction; skills must be re-fetched.

## Usage

```sh
npx agent-md install <source>
# or
bunx agent-md install <source>
```

`<source>` may be:

- a local directory containing a `SKILL.md` or markdown files
- a single `.md` file
- a git URL, `owner/repo`, or `gh:owner/repo` shorthand (shallow-cloned)

The installer asks which agent performs the merge — Claude Code, Codex, Devin,
Antigravity (`agy`), or Grok, whichever are on `PATH` — then which files to
install into — global (`~/.claude/CLAUDE.md`,
`~/.codex/AGENTS.md`), project (`./CLAUDE.md`, `./AGENTS.md`), or custom paths.
The agent merges the package into a staging directory — asking you about
conflicts inside its own session — then `agent-md` shows a diff per file and
applies only what you approve. Originals are backed up to `<file>.bak`.

### Flags

| Flag | Effect |
| --- | --- |
| `--driver <name>` | skip the driver prompt (`claude`, `codex`, `devin`, `agy`, `grok`) |
| `--target <path>` | target file, repeatable; skips target prompts |
| `--headless` | run the agent non-interactively (`claude -p`, `codex exec`, `devin -p`, `agy -p`, `grok --prompt-file`); conflicts are kept-as-existing and recorded in the report |
| `--yes`, `-y` | apply staged results without per-file confirmation |

## How it works

The agent never touches your real files. `agent-md` hands it a prompt
(`prompts/merge-agent.md`) instructing a minimal, voice-matched merge whose
only outputs are staging files and a decision report. After the session ends,
`agent-md` diffs each staged result against a pre-session snapshot of the
target and applies on your confirmation.

## Requirements

Node ≥ 18 (any npm-package runtime works: `npx` under Node, `bunx` under Bun),
`git`, and at least one supported agent CLI on `PATH` (`claude`, `codex`,
`devin`, `agy`, or `grok`).
