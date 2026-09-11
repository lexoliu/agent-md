import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export function looksLikeGitRef(src: string): boolean {
  return (
    /^[\w-]+\/[\w.-]+$/.test(src) ||
    src.startsWith("gh:") ||
    /^https?:\/\//.test(src) ||
    src.endsWith(".git")
  );
}

function gitUrl(src: string): string {
  if (src.startsWith("gh:")) return `https://github.com/${src.slice(3)}`;
  if (/^[\w-]+\/[\w.-]+$/.test(src)) return `https://github.com/${src}`;
  return src;
}

export function cloneSource(src: string, destDir: string): void {
  const url = gitUrl(src);
  const r = spawnSync("git", ["clone", "--depth", "1", url, destDir], {
    stdio: "inherit",
  });
  if (r.status !== 0) throw new Error(`git clone failed: ${url}`);
}

/**
 * Collect installable instruction files under a directory:
 * any SKILL.md within three levels, plus top-level *.md as a fallback.
 */
export function findPackages(dir: string): string[] {
  const found: string[] = [];
  const walk = (d: string, depth: number) => {
    if (depth > 3) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === ".git" || e.name === "node_modules") continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p, depth + 1);
      else if (e.isFile() && e.name.toLowerCase() === "skill.md") found.push(p);
    }
  };
  walk(dir, 0);
  if (found.length === 0) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isFile() && e.name.endsWith(".md")) found.push(path.join(dir, e.name));
    }
  }
  return found.sort();
}
