export type RuntimeOwnerIdentity = {
  pid: number;
  startedAt?: number;
};

export type RuntimeOwnerCleanupOptions = {
  readText?: (path: string) => Promise<string>;
  removeFile?: (path: string, options: { force: boolean }) => Promise<void>;
  isOwnerAlive?: (identity: RuntimeOwnerIdentity) => Promise<boolean>;
  platform?: NodeJS.Platform;
  allowInvalidOrphanRecovery?: boolean;
  settleInvalidLock?: () => Promise<void>;
};

export type RuntimeOwnerCleanupResult = {
  status:
    | "absent"
    | "already-absent"
    | "recovered-dead-owner"
    | "recovered-isolated-invalid-owner";
  lockPath: string;
};

export class RuntimeOwnerResidueError extends Error {
  readonly code: "RUNTIME_OWNER_RESIDUE";
  readonly lockPath: string;
  constructor(message: string, lockPath: string);
}

export function isIsolatedE2EDataRoot(
  dataRoot: string,
  env?: Record<string, string | undefined>,
): boolean;

export function recoverDeadRuntimeOwnerLock(
  dataRoot: string,
  options?: RuntimeOwnerCleanupOptions,
): Promise<RuntimeOwnerCleanupResult>;

export function runPlaywrightE2E(args?: string[]): Promise<number>;
