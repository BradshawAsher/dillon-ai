import esbuild from 'esbuild';
import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const target = process.argv[2] || 'scripts/run-evals.ts';
const out = path.resolve('scripts', '.tmp-bundle.mjs');

esbuild.buildSync({
    entryPoints: [target],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: out,
    packages: 'external',
});

const res = spawnSync('node', [out], { stdio: 'inherit' });
process.exit(res.status || 0);
