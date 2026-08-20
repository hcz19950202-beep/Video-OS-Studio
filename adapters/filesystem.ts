import { access, copyFile, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { dirname, posix as posixPath } from "node:path";
import type { FileSystemAdapter } from "@/adapters/contracts";

export class NodeFileSystemAdapter implements FileSystemAdapter {
  async exists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }

  async readText(path: string): Promise<string> {
    return readFile(path, "utf8");
  }

  async readBinary(path: string): Promise<Uint8Array> {
    return new Uint8Array(await readFile(path));
  }

  async ensureDir(path: string): Promise<void> {
    await mkdir(path, { recursive: true });
  }

  async listDirectories(path: string): Promise<string[]> {
    if (!(await this.exists(path))) return [];
    const entries = await readdir(path, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  }

  async writeBinary(path: string, content: Uint8Array): Promise<void> {
    await this.ensureDir(dirname(path));
    await writeFile(path, content);
  }

  async writeTextAtomic(path: string, content: string, backupPath?: string): Promise<void> {
    await this.ensureDir(dirname(path));
    if (backupPath && (await this.exists(path))) {
      await this.ensureDir(dirname(backupPath));
      await copyFile(path, backupPath);
    }
    const tempPath = `${path}.tmp`;
    await writeFile(tempPath, content, "utf8");
    await rename(tempPath, path);
  }
}

export class InMemoryFileSystemAdapter implements FileSystemAdapter {
  readonly files = new Map<string, string>();
  readonly binaryFiles = new Map<string, Uint8Array>();

  private key(path: string): string {
    return posixPath.normalize(path.replaceAll("\\", "/"));
  }

  async exists(path: string): Promise<boolean> {
    const key = this.key(path);
    if (this.files.has(key) || this.binaryFiles.has(key)) return true;
    const prefix = key.endsWith("/") ? key : `${key}/`;
    return [...this.files.keys(), ...this.binaryFiles.keys()].some((item) => item.startsWith(prefix));
  }

  async readText(path: string): Promise<string> {
    const content = this.files.get(this.key(path));
    if (content === undefined) throw new Error(`File not found: ${path}`);
    return content;
  }

  async readBinary(path: string): Promise<Uint8Array> {
    const content = this.binaryFiles.get(this.key(path));
    if (content === undefined) throw new Error(`Binary file not found: ${path}`);
    return content;
  }

  async ensureDir(): Promise<void> {}

  async listDirectories(path: string): Promise<string[]> {
    const root = this.key(path).replace(/\/$/, "");
    const prefix = `${root}/`;
    const directories = new Set<string>();
    for (const key of [...this.files.keys(), ...this.binaryFiles.keys()]) {
      if (!key.startsWith(prefix)) continue;
      const first = key.slice(prefix.length).split("/")[0];
      if (first) directories.add(first);
    }
    return [...directories];
  }

  async writeBinary(path: string, content: Uint8Array): Promise<void> {
    this.binaryFiles.set(this.key(path), new Uint8Array(content));
  }

  async writeTextAtomic(path: string, content: string, backupPath?: string): Promise<void> {
    const targetKey = this.key(path);
    if (backupPath && this.files.has(targetKey)) {
      this.files.set(this.key(backupPath), this.files.get(targetKey)!);
    }
    this.files.set(targetKey, content);
  }
}
