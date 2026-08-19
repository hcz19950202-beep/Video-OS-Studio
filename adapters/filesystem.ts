import { mkdir, readFile, rename, writeFile, copyFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { FileSystemAdapter } from "@/adapters/contracts";

export class NodeFileSystemAdapter implements FileSystemAdapter {
  async exists(path: string): Promise<boolean> {
    try {
      await readFile(path);
      return true;
    } catch {
      return false;
    }
  }

  async readText(path: string): Promise<string> {
    return readFile(path, "utf8");
  }

  async ensureDir(path: string): Promise<void> {
    await mkdir(path, { recursive: true });
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

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  async readText(path: string): Promise<string> {
    const content = this.files.get(path);
    if (content === undefined) throw new Error(`File not found: ${path}`);
    return content;
  }

  async ensureDir(): Promise<void> {}

  async writeTextAtomic(path: string, content: string, backupPath?: string): Promise<void> {
    if (backupPath && this.files.has(path)) {
      this.files.set(backupPath, this.files.get(path)!);
    }
    this.files.set(path, content);
  }
}
