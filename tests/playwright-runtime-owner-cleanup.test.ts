import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import {
  recoverDeadRuntimeOwnerLock,
  RuntimeOwnerResidueError,
} from "../scripts/run-playwright-e2e.mjs";

const makeRoot = () => mkdtemp(join(tmpdir(), "video-os-playwright-lock-"));
const lockPathFor = (root: string) => join(root, ".runtime-owner.lock");
const record = (overrides: Record<string, unknown> = {}) => ({
  token: "11111111-1111-4111-8111-111111111111",
  pid: 12345,
  processStartedAt: 1_788_000_000_000,
  createdAt: 1_788_000_000_100,
  ...overrides,
});

describe("Playwright runtime-owner residue cleanup", () => {
  it("removes a lock only after its recorded process identity is proven dead", async () => {
    const root = await makeRoot();
    const lockPath = lockPathFor(root);
    await writeFile(lockPath, `${JSON.stringify(record())}\n`, "utf8");

    await expect(
      recoverDeadRuntimeOwnerLock(root, {
        isOwnerAlive: vi.fn().mockResolvedValue(false),
      }),
    ).resolves.toMatchObject({ status: "recovered-dead-owner", lockPath });
    await expect(readFile(lockPath, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("refuses to remove a lock whose owner is still live or cannot be proven dead", async () => {
    const root = await makeRoot();
    const lockPath = lockPathFor(root);
    const contents = `${JSON.stringify(record())}\n`;
    await writeFile(lockPath, contents, "utf8");

    await expect(
      recoverDeadRuntimeOwnerLock(root, {
        isOwnerAlive: vi.fn().mockResolvedValue(true),
      }),
    ).rejects.toBeInstanceOf(RuntimeOwnerResidueError);
    await expect(readFile(lockPath, "utf8")).resolves.toBe(contents);
  });

  it("fails closed for invalid lock contents instead of treating them as disposable residue", async () => {
    const root = await makeRoot();
    const lockPath = lockPathFor(root);
    await writeFile(lockPath, "not-json\n", "utf8");

    await expect(
      recoverDeadRuntimeOwnerLock(root, {
        isOwnerAlive: vi.fn().mockResolvedValue(false),
      }),
    ).rejects.toBeInstanceOf(RuntimeOwnerResidueError);
    await expect(readFile(lockPath, "utf8")).resolves.toBe("not-json\n");
  });

  it("does not delete a replacement owner if lock identity changes after liveness probing", async () => {
    const oldRecord = record();
    const replacementRecord = record({
      token: "22222222-2222-4222-8222-222222222222",
      pid: 54321,
      processStartedAt: 1_788_000_001_000,
    });
    const readText = vi
      .fn()
      .mockResolvedValueOnce(`${JSON.stringify(oldRecord)}\n`)
      .mockResolvedValueOnce(`${JSON.stringify(replacementRecord)}\n`);
    const removeFile = vi.fn().mockResolvedValue(undefined);

    await expect(
      recoverDeadRuntimeOwnerLock("unused", {
        readText,
        removeFile,
        isOwnerAlive: vi.fn().mockResolvedValue(false),
      }),
    ).rejects.toBeInstanceOf(RuntimeOwnerResidueError);
    expect(removeFile).not.toHaveBeenCalled();
  });

  it("is a no-op when Browser shutdown leaves no runtime-owner lock", async () => {
    const root = await makeRoot();
    await expect(recoverDeadRuntimeOwnerLock(root)).resolves.toMatchObject({
      status: "absent",
      lockPath: lockPathFor(root),
    });
  });
});
