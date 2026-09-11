import { spawnSync } from "node:child_process";
import fs from "node:fs";
import pc from "picocolors";
import path from "node:path";

export function snapshotTarget(target: string, origDir: string, i: number): string {
  const snap = path.join(origDir, `${i}.md`);
  if (fs.existsSync(target)) {
    fs.copyFileSync(target, snap);
  } else {
    fs.writeFileSync(snap, "");
  }
  return snap;
}

function onPath(cmd: string): boolean {
  const probe = process.platform === "win32" ? "where" : "which";
  return spawnSync(probe, [cmd], { stdio: "ignore" }).status === 0;
}

function mdHighlight(s: string): string {
  if (/^#{1,6}\s/.test(s)) return pc.magenta(pc.bold(s));
  return s
    .replace(/`[^`\n]+`/g, (m) => pc.cyan(m))
    .replace(/\*\*[^*\n]+\*\*/g, (m) => pc.bold(m));
}

export function renderDiff(diff: string): string {
  const out: string[] = [];
  let oldN = 0;
  let newN = 0;
  let inHunk = false;
  for (const line of diff.split("\n")) {
    const h = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (h) {
      oldN = +h[1];
      newN = +h[2];
      inHunk = true;
      out.push(pc.dim("  ⋮"));
      continue;
    }
    if (!inHunk) continue;
    const mark = line[0];
    const content = line.slice(1);
    if (mark === "+") {
      out.push(
        ` ${pc.green(String(newN++).padStart(4))} ${pc.green("+")} ${mdHighlight(content)}`,
      );
    } else if (mark === "-") {
      out.push(
        ` ${pc.red(String(oldN++).padStart(4))} ${pc.red("-")} ${pc.dim(content)}`,
      );
    } else if (mark === " ") {
      out.push(
        ` ${pc.dim(String(newN++).padStart(4))}   ${mdHighlight(content)}`,
      );
      oldN++;
    } else if (mark === "\\") {
      out.push(pc.dim(`       ${content}`));
    }
  }
  return out.join("\n") + "\n";
}

export function showDiff(orig: string, staged: string, target: string): void {
  const r = spawnSync("git", ["diff", "--no-index", orig, staged], {
    encoding: "utf8",
  });
  if (r.error || r.stdout === undefined) {
    console.log(fs.readFileSync(staged, "utf8"));
    return;
  }
  const stat = spawnSync(
    "git",
    ["diff", "--no-index", "--stat", orig, staged],
    { encoding: "utf8" },
  )
    .stdout?.trim()
    .split("\n")
    .pop();
  if (stat) console.log(stat.trim());
  // rewrite staging paths in the header to the real target path
  const rewritten = r.stdout
    .replaceAll(orig, target)
    .replaceAll(staged, target);
  if (onPath("delta")) {
    spawnSync("delta", {
      input: rewritten,
      stdio: ["pipe", "inherit", "inherit"],
    });
  } else {
    process.stdout.write(renderDiff(rewritten));
  }
}

export function applyStaged(staged: string, target: string): string | null {
  let backup: string | null = null;
  if (fs.existsSync(target)) {
    backup = `${target}.bak`;
    fs.copyFileSync(target, backup);
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(staged, target);
  return backup;
}

export function filesEqual(a: string, b: string): boolean {
  if (!fs.existsSync(a) || !fs.existsSync(b)) return false;
  return fs.readFileSync(a).equals(fs.readFileSync(b));
}
