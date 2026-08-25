import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      rules: 'src/rules/index.ts',
      node: 'src/node/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    outDir: 'dist',
    target: 'es2022',
    splitting: true,
    treeshake: true,
    sourcemap: true,
    clean: false,
    external: [/^node:/],
  },
  {
    entry: { cli: 'src/cli.ts' },
    format: ['esm'],
    dts: false,
    outDir: 'dist',
    target: 'es2022',
    splitting: false,
    treeshake: true,
    sourcemap: true,
    clean: false,
    banner: { js: '#!/usr/bin/env node' },
    external: [/^node:/],
  },
]);
