import { execFile, spawn } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const START_TIME_TOLERANCE_MS = 5_000;
const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
const transientWindowsCode = (code) =>
  code === "EPERM" || code === "EACCES" || code === "EBUSY";

export class RuntimeOwnerResidueError extends Error {
  constructor(message, lockPath) {
    super(message);
    this.name = "RuntimeOwnerResidueError";
    this.code = "RUNTIME_OWNER_RESIDUE";
    this.lockPath = lockPath;
  }
}

const isProcessAlive = async (pid) => {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  if (pid === process.pid) return true;
  if (process.platform === "win32") {
    try {
      const { stdout } = await execFileAsync(
        "tasklist.exe",
        ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"],
        { windowsHide: true, timeout: 1_000, maxBuffer: 1024 * 1024 },
      );
      return stdout.split(/\r?\n/u).some((line) => line.includes(`"${pid}"`));
    } catch {
      return true;
    }
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code !== "ESRCH";
  }
};

const probeProcessStartedAt = async (pid) => {
  if (pid === process.pid) {
    return Math.max(1, Math.floor(Date.now() - process.uptime() * 1_000));
  }
  if (process.platform === "win32") {
    try {
      const script = `(Get-Process -Id ${pid} -ErrorAction Stop).StartTime.ToUniversalTime().ToString('o')`;
      const { stdout } = await execFileAsync(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-Command", script],
        { windowsHide: true, timeout: 2_000, maxBuffer: 1024 * 1024 },
      );
      const value = Date.parse(stdout.trim());
      return Number.isFinite(value) ? value : null;
    } catch {
      return null;
    }
  }
  try {
    const { stdout } = await execFileAsync("ps", ["-p", String(pid), "-o", "lstart="], {
      timeout: 1_000,
      maxBuffer: 1024 * 1024,
    });
    const value = Date.parse(stdout.trim());
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
};

const defaultIsProcessIdentityAlive = async ({ pid, startedAt }) => {
  if (!(await isProcessAlive(pid))) return false;
  if (startedAt === undefined) return true;
  const observedStartedAt = await probeProcessStartedAt(pid);
  if (observedStartedAt === null) return true;
  return Math.abs(observedStartedAt - startedAt) <= START_TIME_TOLERANCE_MS;
};

const parseLockRecord = (text) => {
  try {
    const value = JSON.parse(text);
    if (
      typeof value !== "object" ||
      value === null ||
      typeof value.token !== "string" ||
      !Number.isInteger(value.pid) ||
      value.pid <= 0 ||
      typeof value.createdAt !== "number" ||
      !Number.isFinite(value.createdAt)
    ) {
      return null;
    }
    if (
      value.processStartedAt !== undefined &&
      (typeof value.processStartedAt !== "number" ||
        !Number.isFinite(value.processStartedAt))
    ) {
      return null;
    }
    return {
      token: value.token,
      pid: value.pid,
      processStartedAt: value.processStartedAt,
      createdAt: value.createdAt,
    };
  } catch {
    return null;
  }
};

const sameOwner = (left, right) =>
  left.token === right.token &&
  left.pid === right.pid &&
  left.processStartedAt === right.processStartedAt;

const defaultReadText = (path) => readFile(path, "utf8");

const removeWithWindowsRetry = async (lockPath, removeFile, platform) => {
  let delayMs = 10;
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    try {
      await removeFile(lockPath, { force: false });
      return;
    } catch (error) {
      const code = error?.code;
      if (code === "ENOENT") return;
      if (platform !== "win32" || !transientWindowsCode(code) || attempt === 10) {
        throw error;
      }
      await sleep(delayMs);
      delayMs = Math.min(100, delayMs * 2);
    }
  }
};

export const recoverDeadRuntimeOwnerLock = async (dataRoot, options = {}) => {
  const lockPath = join(dataRoot, ".runtime-owner.lock");
  const readText = options.readText ?? defaultReadText;
  const removeFile = options.removeFile ?? rm;
  const isOwnerAlive = options.isOwnerAlive ?? defaultIsProcessIdentityAlive;
  const platform = options.platform ?? process.platform;

  let observedText;
  try {
    observedText = await readText(lockPath);
  } catch (error) {
    if (error?.code === "ENOENT") return { status: "absent", lockPath };
    throw error;
  }

  const observed = parseLockRecord(observedText);
  if (observed === null) {
    throw new RuntimeOwnerResidueError(
      "Browser shutdown left an invalid runtime-owner lock; refusing unsafe cleanup.",
      lockPath,
    );
  }

  if (
    await isOwnerAlive({
      pid: observed.pid,
      startedAt: observed.processStartedAt,
    })
  ) {
    throw new RuntimeOwnerResidueError(
      "Browser shutdown left a runtime-owner lock whose owner is still live or cannot be proven dead.",
      lockPath,
    );
  }

  let currentText;
  try {
    currentText = await readText(lockPath);
  } catch (error) {
    if (error?.code === "ENOENT") return { status: "already-absent", lockPath };
    throw error;
  }
  const current = parseLockRecord(currentText);
  if (current === null || !sameOwner(observed, current)) {
    throw new RuntimeOwnerResidueError(
      "Runtime-owner lock identity changed during cleanup; refusing to remove a replacement owner.",
      lockPath,
    );
  }

  await removeWithWindowsRetry(lockPath, removeFile, platform);
  return { status: "recovered-dead-owner", lockPath };
};

const resolvePlaywrightCli = () => {
  const packageEntry = fileURLToPath(import.meta.resolve("@playwright/test"));
  return join(dirname(packageEntry), "cli.js");
};

export const runPlaywrightE2E = async (args = process.argv.slice(2)) => {
  const child = spawn(process.execPath, [resolvePlaywrightCli(), "test", ...args], {
    stdio: "inherit",
    env: process.env,
  });

  const childResult = await new Promise((resolveChild) => {
    child.once("error", (error) => resolveChild({ code: 1, error }));
    child.once("exit", (code, signal) => resolveChild({ code, signal }));
  });

  let cleanupError;
  try {
    const dataRoot = resolve(process.env.VIDEO_OS_DATA_ROOT ?? ".video-os-data");
    const result = await recoverDeadRuntimeOwnerLock(dataRoot);
    if (result.status === "recovered-dead-owner") {
      console.log(`Recovered dead browser runtime-owner lock: ${result.lockPath}`);
    }
  } catch (error) {
    cleanupError = error;
    console.error(error);
  }

  if (childResult.error) console.error(childResult.error);
  if (cleanupError !== undefined) return 1;
  if (typeof childResult.code === "number") return childResult.code;
  if (childResult.signal) console.error(`Playwright exited via signal ${childResult.signal}.`);
  return 1;
};

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  process.exitCode = await runPlaywrightE2E();
}
