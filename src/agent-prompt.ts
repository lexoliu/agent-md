import fs from "node:fs";
import path from "node:path";

const TEMPLATE_URL = new URL("../prompts/merge-agent.md", import.meta.url);
const ADJUST_TEMPLATE_URL = new URL(
  "../prompts/adjust-agent.md",
  import.meta.url,
);

const INTERACTIVE_POLICY =
  "If the existing file contradicts the package and neither reading is strictly " +
  "better, ask the user directly with your question tool: offer keep-existing / " +
  "adopt-package / reconcile, with your recommendation first. Never silently " +
  "overwrite a conflicting rule.";

const HEADLESS_POLICY =
  "You cannot ask the user in this run. If the existing file contradicts the " +
  "package, keep the existing rule and record the conflict in the report.";

export interface PlannedTarget {
  target: string;
  staged: string;
}

export function buildPrompt(opts: {
  contentFiles: string[];
  targets: PlannedTarget[];
  stagingDir: string;
  reportPath: string;
  donePath: string;
  headless: boolean;
}): string {
  const template = fs.readFileSync(TEMPLATE_URL, "utf8");
  const map = opts.targets
    .map((t) => `- ${t.staged}  →  merges into ${t.target}`)
    .join("\n");
  const files = opts.contentFiles.map((f) => `- ${f}`).join("\n");
  return template
    .replace("{{CONTENT_FILES}}", files)
    .replace("{{TARGET_MAP}}", map)
    .replaceAll("{{STAGING_DIR}}", opts.stagingDir + path.sep)
    .replace("{{REPORT_PATH}}", opts.reportPath)
    .replace("{{DONE_FILE}}", opts.donePath)
    .replace(
      "{{CONFLICT_POLICY}}",
      opts.headless ? HEADLESS_POLICY : INTERACTIVE_POLICY,
    );
}

export function buildAdjustPrompt(opts: {
  contentFiles: string[];
  target: string;
  orig: string;
  staged: string;
  reportPath: string;
  donePath: string;
}): string {
  const template = fs.readFileSync(ADJUST_TEMPLATE_URL, "utf8");
  const files = opts.contentFiles.map((f) => `- ${f}`).join("\n");
  return template
    .replace("{{CONTENT_FILES}}", files)
    .replaceAll("{{ORIG}}", opts.orig)
    .replaceAll("{{STAGED}}", opts.staged)
    .replaceAll("{{TARGET}}", opts.target)
    .replace("{{REPORT_PATH}}", opts.reportPath)
    .replace("{{DONE_FILE}}", opts.donePath);
}
