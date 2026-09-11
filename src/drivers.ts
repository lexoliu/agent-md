import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";

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
  /** Interactive sessions don't exit on their own after DONE. The merge agent
   * creates this file strictly after all other writes, so its existence is a
   * reliable completion signal. */
  doneMarkerFile?: string,
): Promise<number> {
  const args = headless
    ? driver.headlessArgs(prompt, promptFile)
    : driver.interactiveArgs(prompt, promptFile);
  return new Promise((resolve) => {
    const child = spawn(driver.cmd, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    let poller: NodeJS.Timeout | undefined;
    if (!headless && doneMarkerFile) {
      poller = setInterval(() => {
        if (!fs.existsSync(doneMarkerFile)) return;
        clearInterval(poller);
        setTimeout(() => child.kill("SIGTERM"), 1000);
        setTimeout(() => child.kill("SIGKILL"), 5000);
      }, 400);
    }
    child.on("error", () => {
      if (poller) clearInterval(poller);
      resolve(127);
    });
    child.on("exit", (code) => {
      if (poller) clearInterval(poller);
      resolve(code ?? 1);
    });
  });
}
