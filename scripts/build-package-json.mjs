// Generates the consumer-facing `dist/package.json`, run after `tsup`.
//
// The repository root manifest stays `"private": true` and keeps every dev-only field. None of
// that belongs in the tarball, so `dist/` is published as the package root with its own trimmed
// manifest generated here. Export paths that are `./dist/...` in the root manifest become `./...`
// here, because `dist/` *is* the package root once published. Bin targets drop the `./` prefix:
// npm 11 treats `./cli.js` as invalid and removes the `bin` entry on publish.
//
// CONTRIBUTING.md is deliberately not copied: it documents the internals of this repository, not
// the published package.
import { chmodSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(packageRoot, 'dist');

const rootPkg = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf-8'));

function stripDistPrefix(value) {
  return value.replace(/^\.\/dist\//, './');
}

function stripBinDistPrefix(value) {
  return value.replace(/^\.\/dist\//, '').replace(/^dist\//, '');
}

function rewritePaths(value) {
  if (typeof value === 'string') {
    return stripDistPrefix(value);
  }

  return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, rewritePaths(nested)]));
}

function rewriteBin(value) {
  if (typeof value === 'string') {
    return stripBinDistPrefix(value);
  }

  return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, rewriteBin(nested)]));
}

const distPkg = {
  name: rootPkg.name,
  version: rootPkg.version,
  description: rootPkg.description,
  keywords: rootPkg.keywords,
  license: rootPkg.license,
  author: rootPkg.author,
  repository: rootPkg.repository,
  bugs: rootPkg.bugs,
  homepage: rootPkg.homepage,
  engines: rootPkg.engines,
  type: rootPkg.type,
  sideEffects: rootPkg.sideEffects,
  main: stripDistPrefix(rootPkg.main),
  module: stripDistPrefix(rootPkg.module),
  types: stripDistPrefix(rootPkg.types),
  exports: {
    ...rewritePaths(rootPkg.exports),
    // Tooling resolves the manifest of its dependencies; without this subpath `exports` blocks it.
    './package.json': './package.json',
  },
  ...(rootPkg.bin ? { bin: rewriteBin(rootPkg.bin) } : {}),
  publishConfig: {
    access: 'public',
  },
};

const publishedDocs = ['README.md', 'CHANGELOG.md', 'LICENSE'];

writeFileSync(path.join(distDir, 'package.json'), `${JSON.stringify(distPkg, null, 2)}\n`);

for (const doc of publishedDocs) {
  copyFileSync(path.join(packageRoot, doc), path.join(distDir, doc));
}

chmodSync(path.join(distDir, 'cli.js'), 0o755);

console.log(`Generated dist/package.json and copied ${publishedDocs.join(', ')} into dist/.`);
