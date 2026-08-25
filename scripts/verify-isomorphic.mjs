// Fails the build if the isomorphic entry points reach for a Node built-in.
//
// The root and `./rules` entries must run unchanged in a browser, a Web Worker, a service worker
// and Node. Only `./node` (and the CLI) may import `node:*`.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(packageRoot, 'dist');

const NODE_ONLY_ENTRIES = ['node', 'cli'];
const NODE_BUILTIN_RE = /(?:from\s*|require\(\s*)['"]node:[^'"]+['"]/g;

function readEntryGraph(entryFile) {
  const seen = new Set();
  const queue = [entryFile];
  const files = [];

  while (queue.length > 0) {
    const current = queue.pop();

    if (seen.has(current)) {
      continue;
    }

    seen.add(current);

    let source;

    try {
      source = readFileSync(current, 'utf-8');
    } catch {
      continue;
    }

    files.push({ file: current, source });

    for (const match of source.matchAll(/(?:from\s*|require\(\s*)['"](\.[^'"]*)['"]/g)) {
      queue.push(path.resolve(path.dirname(current), match[1]));
    }
  }

  return files;
}

const distFiles = statSync(distDir, { throwIfNoEntry: false }) ? readdirSync(distDir) : [];

if (distFiles.length === 0) {
  console.error('dist/ is empty — run the build first.');
  process.exit(1);
}

const isomorphicEntries = distFiles.filter((file) => {
  if (!/\.(?:js|cjs)$/.test(file)) {
    return false;
  }

  const name = file.replace(/\.(?:js|cjs)$/, '');
  return !NODE_ONLY_ENTRIES.includes(name);
});

const violations = [];

for (const entry of isomorphicEntries) {
  for (const { file, source } of readEntryGraph(path.join(distDir, entry))) {
    for (const match of source.matchAll(NODE_BUILTIN_RE)) {
      violations.push(`${entry} -> ${path.relative(distDir, file)}: ${match[0]}`);
    }
  }
}

if (violations.length > 0) {
  console.error('Isomorphic entry points must not import Node built-ins:');
  for (const violation of violations) {
    console.error(`  ${violation}`);
  }
  process.exit(1);
}

console.log(`Verified ${isomorphicEntries.length} isomorphic entry point(s): no node:* imports.`);
