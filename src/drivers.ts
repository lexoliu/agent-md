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
      "--respect-workspace-trust",
      "false",
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

export function runHeadless(
  driver: Driver,
  prompt: string,
  promptFile: string,
): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(driver.cmd, driver.headlessArgs(prompt, promptFile), {
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("error", () => resolve(127));
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

export interface Session {
  /** Resolves when the agent process exits (natural or killed). */
  exited: Promise<number>;
  dead: () => boolean;
  /** Freeze the session so we can render the review UI (SIGSTOP; on Windows
   * there is no suspend, so the process is terminated instead). */
  suspend: () => void;
  /** Bring a suspended session back so the user can keep chatting (SIGCONT). */
  resume: () => void;
  kill: () => void;
}

export function spawnInteractive(
  driver: Driver,
  prompt: string,
  promptFile: string,
): Session {
  const child = spawn(driver.cmd, driver.interactiveArgs(prompt, promptFile), {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  let dead = false;
  const exited = new Promise<number>((resolve) => {
    child.on("error", () => {
      dead = true;
      resolve(127);
    });
    child.on("exit", (code) => {
      dead = true;
      resolve(code ?? 1);
    });
  });
  const canSuspend = process.platform !== "win32";
  let savedTty: string | undefined;
  return {
    exited,
    dead: () => dead,
    suspend() {
      if (dead) return;
      child.kill(canSuspend ? "SIGSTOP" : "SIGTERM");
      // Snapshot the TUI's termios while it is still in effect, so resume()
      // can hand the pty back in the same mode — our own stty sane would
      // otherwise leave the resumed TUI reading a cooked terminal.
      if (canSuspend) {
        const r = spawnSync("stty", ["-g"], {
          stdio: ["inherit", "pipe", "inherit"],
          encoding: "utf8",
        });
        if (r.status === 0) savedTty = r.stdout.trim();
      }
    },
    resume() {
      if (dead || !canSuspend) return;
      if (savedTty) {
        spawnSync("stty", [savedTty], { stdio: "inherit" });
      }
      child.kill("SIGCONT");
    },
    kill() {
      if (!dead) child.kill("SIGKILL");
    },
  };
}

/** A TUI killed or suspended mid-frame can leave the terminal in alternate
 * screen, raw mode, mouse reporting, or with the pty line discipline stripped
 * of OPOST/ONLCR (\n stops returning to column 0 — output staircases). Call
 * this after the session leaves the foreground, before rendering our UI. */
export function restoreTerminal(): void {
  if (process.platform !== "win32") {
    // stty sane repairs the pty line discipline; escape sequences cannot.
    spawnSync("stty", ["sane"], { stdio: "inherit" });
  }
  process.stdout.write(
    "\x1b[!p" + // DECSTR: soft reset (modes, scroll region, SGR)
      "\x1b[?69l" + // left/right margin mode off (in case DECSTR misses it)
      "\x1b[r" + // scroll region = full screen
      "\x1b[?1049l" + // leave alternate screen
      "\x1b[?25h" + // show cursor
      "\x1b[0m" + // reset attributes
      "\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1006l" + // mouse off
      "\x1b[?2004l" + // bracketed paste off
      "\x1b[2J\x1b[H", // clear visible screen, cursor home
  );
  if (process.stdin.isTTY && process.stdin.isRaw) {
    process.stdin.setRawMode(false);
  }
}
