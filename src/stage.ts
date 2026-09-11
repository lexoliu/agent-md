import { spawnSync } from "node:child_process";
import fs from "node:fs";
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

export function showDiff(orig: string, staged: string): void {
  const r = spawnSync(
    "git",
    ["diff", "--no-index", "--color=always", orig, staged],
    { stdio: "inherit" },
  );
  if (r.error || r.status === null) {
    // no git — fall back to printing the staged file
    console.log(fs.readFileSync(staged, "utf8"));
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
