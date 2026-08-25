import { rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

for (const target of ['dist', 'coverage']) {
  rmSync(path.join(packageRoot, target), { recursive: true, force: true });
}
