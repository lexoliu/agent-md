import { spawn, spawnSync } from "node:child_process";

export interface Driver {
  id: string;
  label: string;
  cmd: string;
  /** Launch an interactive session; the agent asks the user itself. */
  interactiveArgs: (prompt: string, promptFile: string) => string[];
  /** Run one non-interactive turn; conflicts are kept-as-existing. */
  headlessArgs: (prompt: string, promptFile: string) => string[];
}

export const DRIVERS: Driver[] = [
  {
    id: "claude",
    label: "Claude Code",
    cmd: "claude",
    interactiveArgs: (p) => ["--dangerously-skip-permissions", p],
    headlessArgs: (p) => ["-p", p, "--dangerously-skip-permissions"],
  },
  {
    id: "codex",
    label: "Codex",
    cmd: "codex",
    interactiveArgs: (p) => [
      "--dangerously-bypass-approvals-and-sandbox",
      p,
    ],
    headlessArgs: (p) => [
      "exec",
      "--dangerously-bypass-approvals-and-sandbox",
      p,
    ],
  },
  {
    id: "devin",
    label: "Devin",
    cmd: "devin",
    interactiveArgs: (_p, f) => [
      "--permission-mode",
      "dangerous",
      "--prompt-file",
      f,
    ],
    headlessArgs: (p) => [
      "-p",
      p,
      "--permission-mode",
      "dangerous",
      "--respect-workspace-trust",
      "false",
    ],
  },
  {
    id: "agy",
    label: "Antigravity",
    cmd: "agy",
    interactiveArgs: (p) => [
      "--dangerously-skip-permissions",
      `--prompt-interactive=${p}`,
    ],
    headlessArgs: (p) => [
      "--dangerously-skip-permissions",
      "--print-timeout=15m",
      `-p=${p}`,
    ],
  },
  {
    id: "grok",
    label: "Grok",
    cmd: "grok",
    interactiveArgs: (p) => ["--always-approve", p],
    headlessArgs: (_p, f) => ["--always-approve", "--prompt-file", f],
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
  promptFile: string,
  headless: boolean,
): Promise<number> {
  const args = headless
    ? driver.headlessArgs(prompt, promptFile)
    : driver.interactiveArgs(prompt, promptFile);
  return new Promise((resolve) => {
    const child = spawn(driver.cmd, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("error", () => resolve(127));
    child.on("exit", (code) => resolve(code ?? 1));
  });
}
