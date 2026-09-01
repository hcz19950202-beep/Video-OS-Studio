import { access, readFile, readdir, writeFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import * as prettier from "prettier";

const EXPECTED_PRETTIER_VERSION = "3.8.1";
const ROOT = process.cwd();
const write = process.argv.includes("--write");
const supportedExtensions = new Set([
  ".json",
  ".js",
  ".mjs",
  ".md",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);

const exists = async (path) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const collectDirectory = async (directory, output) => {
  if (!(await exists(directory))) return;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collectDirectory(path, output);
    else if (entry.isFile() && supportedExtensions.has(extname(entry.name))) output.add(path);
  }
};

const prettierPackage = JSON.parse(
  await readFile(join(ROOT, "node_modules", "prettier", "package.json"), "utf8"),
);
if (prettierPackage.version !== EXPECTED_PRETTIER_VERSION) {
  throw new Error(
    `H6 formatter version mismatch: expected ${EXPECTED_PRETTIER_VERSION}, found ${prettierPackage.version}.`,
  );
}

const config = JSON.parse(await readFile(join(ROOT, ".prettierrc.json"), "utf8"));
const files = new Set();

for (const directory of [".github/workflows", "tests/h6", "tests/e2e"]) {
  await collectDirectory(join(ROOT, directory), files);
}

const scriptsDir = join(ROOT, "scripts");
if (await exists(scriptsDir)) {
  for (const entry of await readdir(scriptsDir, { withFileTypes: true })) {
    if (
      entry.isFile() &&
      entry.name.startsWith("h6-") &&
      supportedExtensions.has(extname(entry.name))
    ) {
      files.add(join(scriptsDir, entry.name));
    }
  }
}

for (const path of ["package.json", ".prettierrc.json", "playwright.config.ts"]) {
  const absolute = join(ROOT, path);
  if (await exists(absolute)) files.add(absolute);
}

const changed = [];
for (const file of [...files].sort()) {
  const source = await readFile(file, "utf8");
  const formatted = await prettier.format(source, { ...config, filepath: file });
  if (
    !write &&
    formatted !== source &&
    relative(ROOT, file) === "tests/h6/route-contracts.test.ts"
  ) {
    console.error(`H6_FORMATTED_FILE_BEGIN\n${formatted}H6_FORMATTED_FILE_END`);
  }
  if (formatted === source) continue;
  if (write) await writeFile(file, formatted, "utf8");
  else changed.push(relative(ROOT, file));
}

if (changed.length) {
  console.error("H6 format check failed. Run `npm run format` for:");
  for (const file of changed) console.error(`- ${file}`);
  process.exitCode = 1;
} else {
  console.log(`H6 format ${write ? "write" : "check"} passed for ${files.size} files.`);
}
