import { spawn, spawnSync } from "node:child_process";

export interface Driver {
  id: string;
  label: string;
  cmd: string;
  interactiveArgs: (prompt: string) => string[];
  headlessArgs: (prompt: string) => string[];
}

export const DRIVERS: Driver[] = [
  {
    id: "claude",
    label: "Claude Code",
    cmd: "claude",
    interactiveArgs: (p) => ["--dangerously-skip-permissions", p],
    headlessArgs: (p) => ["-p", "--dangerously-skip-permissions", p],
  },
  {
    id: "codex",
    label: "Codex",
    cmd: "codex",
    interactiveArgs: (p) => ["--dangerously-bypass-approvals-and-sandbox", p],
    headlessArgs: (p) => ["exec", "--dangerously-bypass-approvals-and-sandbox", p],
  },
];

export function detectDrivers(): Driver[] {
  const probe = process.platform === "win32" ? "where" : "which";
  return DRIVERS.filter(
    (d) => spawnSync(probe, [d.cmd], { stdio: "ignore" }).status === 0,
  );
}

export function runDriver(
  driver: Driver,
  prompt: string,
  headless: boolean,
): Promise<number> {
  const args = headless
    ? driver.headlessArgs(prompt)
    : driver.interactiveArgs(prompt);
  return new Promise((resolve) => {
    const child = spawn(driver.cmd, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("error", () => resolve(127));
    child.on("exit", (code) => resolve(code ?? 1));
  });
}
