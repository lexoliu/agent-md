import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface TargetChoice {
  label: string;
  path: string;
  exists: boolean;
}

export function presetTargets(cwd: string): TargetChoice[] {
  const home = os.homedir();
  const list = [
    {
      label: "Claude Code · global",
      path: path.join(home, ".claude", "CLAUDE.md"),
    },
    {
      label: "Claude Code · this project",
      path: path.join(cwd, "CLAUDE.md"),
    },
    {
      label: "Codex / AGENTS.md agents · global",
      path: path.join(home, ".codex", "AGENTS.md"),
    },
    {
      label: "AGENTS.md · this project",
      path: path.join(cwd, "AGENTS.md"),
    },
  ];
  return list.map((t) => ({ ...t, exists: fs.existsSync(t.path) }));
}

export function expandPath(p: string, cwd: string): string {
  const expanded = p.startsWith("~/")
    ? path.join(os.homedir(), p.slice(2))
    : p;
  return path.resolve(cwd, expanded);
}
