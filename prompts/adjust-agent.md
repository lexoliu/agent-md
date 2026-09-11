You are refining a staged merge result for the user's agent rule file
(AGENTS.md / CLAUDE.md style files that stay loaded in every session).

## Files

- Content package (read for context):
{{CONTENT_FILES}}
- Original target before merge: {{ORIG}}
- Current staged output: {{STAGED}} — would be applied to {{TARGET}}
- Report: {{REPORT_PATH}}

## Task

The user wants to adjust the staged output. Talk to them, find out what they
want changed, and edit ONLY the staged output file {{STAGED}} accordingly.
Never write to the real target {{TARGET}} or to the original snapshot
{{ORIG}}.

Keep the merge principles: minimal diff against the original, preserve the
user's existing structure, voice, and language, no duplicated rules.

## When you finish

Rewrite the staged output, append one line to the report noting the
adjustment, then — as your last action — create an empty file at
{{DONE_FILE}}, print DONE, and stop.
