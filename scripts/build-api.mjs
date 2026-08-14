import { build } from 'esbuild'

await build({
  entryPoints: ['api/diligence/[...route].src.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'api/diligence/[...route].js',
  banner: { js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);' },
  external: [],
})

console.log('API function bundled successfully.')
