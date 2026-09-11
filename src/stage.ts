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

function onPath(cmd: string): boolean {
  const probe = process.platform === "win32" ? "where" : "which";
  return spawnSync(probe, [cmd], { stdio: "ignore" }).status === 0;
}

export function showDiff(orig: string, staged: string, target: string): void {
  const r = spawnSync(
    "git",
    ["diff", "--no-index", "--color=always", orig, staged],
    { encoding: "utf8" },
  );
  if (r.error || r.stdout === undefined) {
    console.log(fs.readFileSync(staged, "utf8"));
    return;
  }
  const stat = spawnSync(
    "git",
    ["diff", "--no-index", "--stat", orig, staged],
    { encoding: "utf8" },
  ).stdout?.trim().split("\n").pop();
  if (stat) console.log(stat.trim());
  // rewrite staging paths in the header to the real target path
  const out = r.stdout
    .replaceAll(orig, target)
    .replaceAll(staged, target);
  if (onPath("delta")) {
    spawnSync("delta", { input: out, stdio: ["pipe", "inherit", "inherit"] });
  } else {
    process.stdout.write(out);
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
