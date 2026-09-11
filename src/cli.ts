#!/usr/bin/env node
import {
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  multiselect,
  note,
  outro,
  select,
  text,
} from "@clack/prompts";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildPrompt, type PlannedTarget } from "./agent-prompt.js";
import { detectDrivers, runDriver, type Driver } from "./drivers.js";
import { cloneSource, findPackages, looksLikeGitRef } from "./source.js";
import { applyStaged, filesEqual, showDiff, snapshotTarget } from "./stage.js";
import { expandPath, presetTargets } from "./targets.js";

interface Args {
  source?: string;
  driver?: string;
  targets: string[];
  headless: boolean;
  yes: boolean;
}

const HELP = `agent-md — install instruction packages into AGENTS.md/CLAUDE.md

Usage:
  agent-md install <source> [options]

  <source>    local dir with SKILL.md / .md, a single .md file,
              a git URL, or owner/repo (gh:owner/repo) shorthand

Options:
  --driver <name>         skip the driver prompt (claude, codex, devin,
                          agy, grok — whichever are on PATH)
  --target <path>         target file, repeatable; skips target prompts
  --headless              run the agent non-interactively; conflicts are
                          kept-as-existing and recorded in the report
  --yes, -y               apply staged results without per-file confirmation
  --version               print version
  --help                  show this help
`;

function packageVersion(): string {
  const url = new URL("../package.json", import.meta.url);
  return JSON.parse(fs.readFileSync(url, "utf8")).version;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { targets: [], headless: false, yes: false };
  const rest = argv.slice(2);
  if (rest.includes("--help") || rest.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }
  if (rest.includes("--version")) {
    console.log(packageVersion());
    process.exit(0);
  }
  if (rest[0] === "install") rest.shift();
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--driver") args.driver = rest[++i];
    else if (a === "--target") args.targets.push(rest[++i]);
    else if (a === "--headless") args.headless = true;
    else if (a === "--yes" || a === "-y") args.yes = true;
    else if (!a.startsWith("-") && !args.source) args.source = a;
    else throw new Error(`unknown argument: ${a}`);
  }
  return args;
}

function bail(): never {
  cancel("Aborted.");
  process.exit(1);
}

function requireValue<T>(v: T | symbol): T {
  if (isCancel(v)) bail();
  return v as T;
}

async function main() {
  const args = parseArgs(process.argv);
  const cwd = process.cwd();
  intro("agent-md — install instruction packages into agent rule files");

  if (!args.source) {
    args.source = requireValue(
      await text({
        message: "Package source (local dir, .md file, git URL, or owner/repo):",
        validate: (v) => (v?.trim() ? undefined : "required"),
      }),
    );
  }

  // staging dir holds the resolved source, snapshots, and agent outputs
  const stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-md-"));
  const srcDir = path.join(stagingDir, "src");
  const origDir = path.join(stagingDir, "orig");
  const outDir = path.join(stagingDir, "out");
  fs.mkdirSync(srcDir, { recursive: true });
  fs.mkdirSync(origDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  // 1. resolve source → candidate package files
  const srcPath = expandPath(args.source, cwd);
  let contentDir: string;
  if (fs.existsSync(srcPath)) {
    contentDir = fs.statSync(srcPath).isDirectory()
      ? srcPath
      : path.dirname(srcPath);
  } else if (looksLikeGitRef(args.source)) {
    log.step(`Cloning ${args.source}`);
    cloneSource(args.source, srcDir);
    contentDir = srcDir;
  } else {
    throw new Error(`source not found: ${args.source}`);
  }

  const candidates =
    fs.existsSync(srcPath) && fs.statSync(srcPath).isFile()
      ? [srcPath]
      : findPackages(contentDir);
  if (candidates.length === 0) throw new Error("no SKILL.md or .md found in source");

  const contentFiles =
    candidates.length === 1
      ? candidates
      : requireValue(
          await multiselect({
            message: "Select packages to install",
            options: candidates.map((c) => ({
              value: c,
              label: path.relative(contentDir, c),
            })),
            required: true,
          }),
        );

  // 2. pick the driver agent
  const detected = detectDrivers();
  let driver: Driver | undefined;
  if (args.driver) {
    driver = detected.find((d) => d.id === args.driver);
    if (!driver) throw new Error(`driver not available on PATH: ${args.driver}`);
  } else if (detected.length === 1) {
    driver = detected[0];
  } else if (detected.length > 1) {
    driver = requireValue(
      await select({
        message: "Which agent should perform the merge?",
        options: detected.map((d) => ({ value: d, label: d.label })),
      }),
    );
  } else {
    throw new Error("no supported agent CLI found (need claude or codex)");
  }
  log.step(`Driver: ${driver.label}`);

  // 3. pick target files
  let targets: string[] = args.targets.map((t) => expandPath(t, cwd));
  if (targets.length === 0) {
    const presets = presetTargets(cwd);
    const picked = requireValue(
      await multiselect({
        message: "Install into which files?",
        options: [
          ...presets.map((t) => ({
            value: t.path,
            label: `${t.label} — ${t.path}${t.exists ? "" : " (new)"}`,
          })),
          { value: "__custom__", label: "Custom path…" },
        ],
        required: true,
      }),
    );
    targets = picked.filter((p) => p !== "__custom__");
    if (picked.includes("__custom__")) {
      while (true) {
        const p = requireValue(
          await text({ message: "Custom target path (empty to finish):" }),
        );
        if (!p.trim()) break;
        targets.push(expandPath(p.trim(), cwd));
      }
    }
  }
  if (targets.length === 0) throw new Error("no targets selected");

  const planned: PlannedTarget[] = targets.map((t, i) => ({
    target: t,
    staged: path.join(outDir, `${i}.md`),
  }));
  const snapshots = planned.map((p, i) =>
    snapshotTarget(p.target, origDir, i),
  );

  // 4. run the agent
  const reportPath = path.join(stagingDir, "report.md");
  const donePath = path.join(stagingDir, ".done");
  const prompt = buildPrompt({
    contentFiles,
    targets: planned,
    stagingDir: outDir,
    reportPath,
    donePath,
    headless: args.headless,
  });
  if (!args.headless) {
    note(
      `${driver.label} will run in bypass-permissions mode.\n` +
        "It may ask you questions if the target file conflicts with the package.\n" +
        "The session closes by itself once it reports DONE (or exit with Ctrl+D).",
    );
    const go = requireValue(
      await confirm({ message: `Launch ${driver.label}?` }),
    );
    if (!go) return outro("Aborted.");
  }
  const promptFile = path.join(stagingDir, "prompt.md");
  fs.writeFileSync(promptFile, prompt);
  const code = await runDriver(
    driver,
    prompt,
    promptFile,
    args.headless,
    donePath,
  );
  if (code !== 0) log.warn(`${driver.label} exited with code ${code}`);

  // 5. review staged output → consent → apply
  let applied = 0;
  for (let i = 0; i < planned.length; i++) {
    const { target, staged } = planned[i];
    if (!fs.existsSync(staged)) {
      log.warn(`no staged output for ${target} — skipped`);
      continue;
    }
    const orig = snapshots[i];
    const hadOriginal = fs.existsSync(target);
    if (hadOriginal && filesEqual(orig, staged)) {
      log.info(`${target}: already up to date`);
      continue;
    }
    if (hadOriginal && !filesEqual(orig, target)) {
      log.warn(`${target} was modified during the agent session; the diff below is against the pre-session snapshot`);
    }
    log.step(`Diff for ${target}`);
    showDiff(orig, staged, target);
    const ok =
      args.yes ||
      requireValue(await confirm({ message: `Apply to ${target}?` }));
    if (ok) {
      const bak = applyStaged(staged, target);
      log.success(`applied ${target}${bak ? ` (backup: ${bak})` : ""}`);
      applied++;
    } else {
      log.info(`skipped ${target}`);
    }
  }

  if (fs.existsSync(reportPath)) {
    note(fs.readFileSync(reportPath, "utf8").trim(), "Agent report");
  }
  outro(`Done — ${applied}/${planned.length} file(s) updated. Staging: ${stagingDir}`);
}

main().catch((e) => {
  log.error(e.message);
  process.exit(1);
});
