import { describe, expect, it, vi } from "vitest";

type CleanupResult = {
  status: string;
  lockPath: string;
};

type CleanupOptions = {
  readText?: (path: string) => Promise<string>;
  removeFile?: (path: string, options: { force: boolean }) => Promise<void>;
  isOwnerAlive?: (identity: { pid: number; startedAt?: number }) => Promise<boolean>;
  platform?: NodeJS.Platform;
  allowInvalidOrphanRecovery?: boolean;
  settleInvalidLock?: () => Promise<void>;
};

type PlaywrightRunnerModule = {
  RuntimeOwnerResidueError: new (message: string, lockPath: string) => Error & {
    code: "RUNTIME_OWNER_RESIDUE";
    lockPath: string;
  };
  isIsolatedE2EDataRoot: (dataRoot: string, env?: NodeJS.ProcessEnv) => boolean;
  recoverDeadRuntimeOwnerLock: (
    dataRoot: string,
    options?: CleanupOptions,
  ) => Promise<CleanupResult>;
};

const loadRunner = async () => {
  // @ts-ignore The Playwright launcher is intentionally a runtime ESM JavaScript module.
  return (await import("../scripts/run-playwright-e2e.mjs")) as PlaywrightRunnerModule;
};

describe("V2.5 C7 Playwright runtime-owner cleanup", () => {
  it("keeps invalid runtime-owner residue fail-closed outside an isolated E2E root", async () => {
    const { recoverDeadRuntimeOwnerLock } = await loadRunner();
    const removeFile = vi.fn(async () => undefined);

    await expect(
      recoverDeadRuntimeOwnerLock("/production-data", {
        readText: async () => "",
        removeFile,
        settleInvalidLock: async () => undefined,
      }),
    ).rejects.toMatchObject({
      code: "RUNTIME_OWNER_RESIDUE",
    });
    expect(removeFile).not.toHaveBeenCalled();
  });

  it("recovers only a stable invalid lock when isolated E2E recovery is explicit", async () => {
    const { recoverDeadRuntimeOwnerLock } = await loadRunner();
    const removeFile = vi.fn(async () => undefined);
    const readText = vi.fn(async () => "partial-owner-record");

    await expect(
      recoverDeadRuntimeOwnerLock("/isolated-e2e", {
        readText,
        removeFile,
        allowInvalidOrphanRecovery: true,
        settleInvalidLock: async () => undefined,
      }),
    ).resolves.toMatchObject({
      status: "recovered-isolated-invalid-owner",
    });
    expect(readText).toHaveBeenCalledTimes(2);
    expect(removeFile).toHaveBeenCalledTimes(1);
  });

  it("refuses to remove an invalid lock that changes while cleanup is settling", async () => {
    const { recoverDeadRuntimeOwnerLock } = await loadRunner();
    const removeFile = vi.fn(async () => undefined);
    const readText = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce("partial-owner-record")
      .mockResolvedValueOnce("different-partial-owner-record");

    await expect(
      recoverDeadRuntimeOwnerLock("/isolated-e2e", {
        readText,
        removeFile,
        allowInvalidOrphanRecovery: true,
        settleInvalidLock: async () => undefined,
      }),
    ).rejects.toMatchObject({
      code: "RUNTIME_OWNER_RESIDUE",
    });
    expect(removeFile).not.toHaveBeenCalled();
  });

  it("allows CI recovery only below RUNNER_TEMP unless isolation is explicit", async () => {
    const { isIsolatedE2EDataRoot } = await loadRunner();
    const runnerTemp = "/runner/temp";

    expect(
      isIsolatedE2EDataRoot("/runner/temp/video-os-e2e", {
        CI: "true",
        RUNNER_TEMP: runnerTemp,
      }),
    ).toBe(true);
    expect(
      isIsolatedE2EDataRoot(runnerTemp, {
        CI: "true",
        RUNNER_TEMP: runnerTemp,
      }),
    ).toBe(false);
    expect(
      isIsolatedE2EDataRoot("/runner/other", {
        CI: "true",
        RUNNER_TEMP: runnerTemp,
      }),
    ).toBe(false);
    expect(
      isIsolatedE2EDataRoot("/production-data", {
        VIDEO_OS_E2E_ISOLATED_DATA_ROOT: "1",
      }),
    ).toBe(true);
  });
});
