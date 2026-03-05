#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const TEST_RE = /\.(test|spec)\.(?:[cm]?[jt]sx?|vue|svelte)$/;
const IGNORE_DIRS = new Set([
  ".git",
  ".hg",
  ".svn",
  ".cache",
  ".next",
  ".nuxt",
  ".turbo",
  "__snapshots__",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "temp",
  "tmp",
]);

function parseArgs(argv) {
  const args = {
    targetDir: ".",
    limit: 5,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--target-file") {
      args.targetFile = argv[++index];
    } else if (arg === "--target-dir") {
      args.targetDir = argv[++index];
    } else if (arg === "--limit") {
      args.limit = Number.parseInt(argv[++index], 10);
    } else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else {
      fail(`Unknown argument: ${arg}`);
    }
  }

  if (!args.targetFile) {
    fail("--target-file is required");
  }

  if (!Number.isInteger(args.limit) || args.limit < 1) {
    fail("--limit must be an integer greater than 0");
  }

  return args;
}

function printUsage() {
  console.log(`Find nearby and recent frontend test files.

Usage:
  node scripts/discover-test-examples.mjs --target-file <path> --target-dir <path>

Options:
  --target-file  Component or feature file being tested, relative to project root
  --target-dir   Package/workspace directory containing the target file
  --limit        Maximum files per category and recommendation list (default: 5)`);
}

function fail(message) {
  console.error(message);
  process.exit(2);
}

function displayPath(filePath) {
  const relative = path.relative(process.cwd(), filePath);
  const shown = relative && !relative.startsWith("..") ? relative : filePath;
  return shown.split(path.sep).join("/");
}

function isTestFile(filePath) {
  return TEST_RE.test(path.basename(filePath));
}

function shouldSkip(filePath) {
  return filePath.split(path.sep).some((part) => IGNORE_DIRS.has(part));
}

function sortByPath(files) {
  return [...new Set(files)].sort((left, right) =>
    displayPath(left).localeCompare(displayPath(right)),
  );
}

function iterTestFiles(scope, { recursive = true } = {}) {
  if (!fs.existsSync(scope)) {
    return [];
  }

  const stat = fs.statSync(scope);
  if (!stat.isDirectory()) {
    return isTestFile(scope) ? [scope] : [];
  }

  if (!recursive) {
    return sortByPath(
      fs
        .readdirSync(scope, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => path.join(scope, entry.name))
        .filter((filePath) => isTestFile(filePath) && !shouldSkip(filePath)),
    );
  }

  const files = [];
  const stack = [scope];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || shouldSkip(current)) {
      continue;
    }

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.has(entry.name)) {
          stack.push(entryPath);
        }
      } else if (entry.isFile() && isTestFile(entryPath)) {
        files.push(entryPath);
      }
    }
  }

  return sortByPath(files);
}

function runGit(args, { encoding = "utf8" } = {}) {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding,
    stdio: ["ignore", "pipe", "ignore"],
  });

  if (result.error) {
    return null;
  }

  return result;
}

function inGitRepo() {
  const result = runGit(["rev-parse", "--is-inside-work-tree"]);
  return result?.status === 0 && result.stdout.trim() === "true";
}

function fileTimestamp(filePath) {
  try {
    return Math.floor(fs.statSync(filePath).mtimeMs / 1000);
  } catch {
    return 0;
  }
}

function gitTimestampMap(files) {
  if (files.length === 0 || !inGitRepo()) {
    return null;
  }

  const wanted = new Set(files.map((filePath) => displayPath(filePath)));
  const result = runGit([
    "log",
    "--format=%at",
    "--name-only",
    "--",
    ...wanted,
  ]);
  if (!result || result.status !== 0) {
    return null;
  }

  const timestamps = new Map();
  let currentTimestamp = 0;

  for (const line of result.stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    if (/^\d+$/.test(trimmed)) {
      currentTimestamp = Number.parseInt(trimmed, 10);
      continue;
    }

    if (currentTimestamp && wanted.has(trimmed) && !timestamps.has(trimmed)) {
      timestamps.set(trimmed, currentTimestamp);
      if (timestamps.size === wanted.size) {
        break;
      }
    }
  }

  return timestamps;
}

function recentCandidates(files, limit) {
  const gitTimestamps = gitTimestampMap(files);
  return files
    .map((filePath) => ({
      path: filePath,
      reason: "recent package/workspace test",
      timestamp: gitTimestamps?.get(displayPath(filePath)) ?? fileTimestamp(filePath),
    }))
    .sort((left, right) => {
      if (left.timestamp !== right.timestamp) {
        return right.timestamp - left.timestamp;
      }
      return displayPath(right.path).localeCompare(displayPath(left.path));
    })
    .slice(0, limit);
}

function nearestCandidates(targetFile, limit) {
  const targetParent = path.dirname(targetFile) || ".";
  const targetStem = path.parse(targetFile).name;
  const searches = [
    [targetParent, `${targetStem}.test.`, "same component name", false],
    [targetParent, `${targetStem}.spec.`, "same component name", false],
    [path.join(targetParent, "__tests__"), `${targetStem}.test.`, "__tests__ same component name", true],
    [path.join(targetParent, "__tests__"), `${targetStem}.spec.`, "__tests__ same component name", true],
  ];

  const selected = [];
  const seen = new Set();

  for (const [scope, nameFragment, reason, recursive] of searches) {
    for (const filePath of iterTestFiles(scope, { recursive })) {
      const key = displayPath(filePath);
      if (seen.has(key)) {
        continue;
      }
      if (path.basename(filePath).startsWith(nameFragment)) {
        selected.push({ path: filePath, reason });
        seen.add(key);
      }
    }
  }

  for (const [scope, reason] of [
    [targetParent, "same directory"],
    [path.join(targetParent, "__tests__"), "__tests__ beside target"],
  ]) {
    const recursive = path.basename(scope) === "__tests__";
    for (const filePath of iterTestFiles(scope, { recursive })) {
      const key = displayPath(filePath);
      if (seen.has(key)) {
        continue;
      }
      selected.push({ path: filePath, reason });
      seen.add(key);
    }
  }

  return selected.slice(0, limit);
}

function uniqueCandidates(groups, limit) {
  const selected = [];
  const seen = new Set();

  for (const group of groups) {
    for (const candidate of group) {
      const key = displayPath(candidate.path);
      if (seen.has(key)) {
        continue;
      }
      selected.push(candidate);
      seen.add(key);
      if (selected.length >= limit) {
        return selected;
      }
    }
  }

  return selected;
}

function formatDate(timestamp) {
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

function printGroup(title, candidates, { includeDates = false } = {}) {
  console.log(`${title}:`);
  if (candidates.length === 0) {
    console.log("  (none)");
    return;
  }

  for (const candidate of candidates) {
    let suffix = candidate.reason;
    if (includeDates && candidate.timestamp) {
      suffix = `${suffix}; last commit ${formatDate(candidate.timestamp)}`;
    }
    console.log(`  - ${displayPath(candidate.path)} (${suffix})`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const targetFile = path.normalize(args.targetFile);
  const targetDir = path.normalize(args.targetDir);

  if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
    fail(`Target directory does not exist: ${targetDir}`);
  }

  let scopeUsed = targetDir;
  let scopedTests = iterTestFiles(scopeUsed);

  if (scopedTests.length === 0 && targetDir !== ".") {
    const rootTests = iterTestFiles(".");
    if (rootTests.length > 0) {
      scopedTests = rootTests;
      scopeUsed = ".";
    }
  }

  const nearby = nearestCandidates(targetFile, args.limit);
  const recent = recentCandidates(scopedTests, args.limit);
  const recommended = uniqueCandidates([nearby, recent], args.limit);

  console.log(`Target file: ${displayPath(targetFile)}`);
  console.log(`Scope used: ${displayPath(scopeUsed)}`);
  console.log("");
  printGroup("Recommended files to read", recommended, { includeDates: true });
  console.log("");
  printGroup("Nearby tests", nearby);
  console.log("");
  printGroup("Recent package/workspace tests", recent, { includeDates: true });

  if (recommended.length === 0) {
    console.log("");
    console.log("No existing test files found. Use references/framework-defaults.md.");
  }
}

main();
