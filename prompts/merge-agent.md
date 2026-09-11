You are integrating an instruction package into the user's agent configuration
file(s) (AGENTS.md / CLAUDE.md style rule files that stay loaded in every session).

## Inputs

Content package — read every file listed. For SKILL.md files, the YAML
frontmatter is metadata: install the body, not the frontmatter.
{{CONTENT_FILES}}

Targets — for each row, write the complete merged result to the staging output
path. The target is the user's existing file: READ it, NEVER write to it.
{{TARGET_MAP}}

All staging outputs live under {{STAGING_DIR}}(already exists). After all outputs
are written, append one line per target to {{REPORT_PATH}} summarizing each
decision (e.g. "merged into existing 'Workflow' section", "created new file",
"conflict: kept existing X over package Y").

## Merge rules

1. Minimal diff. Preserve the user's existing rules, structure, voice, and
   language exactly; change only what the package requires. Never reformat,
   reorder, or rewrite unrelated content.
2. Place the package rules where they fit best: merge into an existing section
   on the same topic if there is one, otherwise add a new section at a sensible
   position. Render the rules in the file's own conventions, not as a literal
   paste of the package.
3. If the existing file already covers a rule, reconcile wording instead of
   duplicating.
4. {{CONFLICT_POLICY}}
5. A target that does not exist yet is created from the merged content alone.

## When you finish

Write every staging output, update the report, then — as your last action —
create an empty file at {{DONE_FILE}} to signal completion, print DONE, and
stop. The .done file must be created only after all other writes are complete.
