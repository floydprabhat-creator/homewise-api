import { defineConfig } from 'tsup';

// `pnpm start` runs dist/server.js; the deploy runs dist/db/migrate.js before it.
export default defineConfig({
  entry: { server: 'src/server.ts', 'db/migrate': 'src/db/migrate.ts' },
  format: 'esm',
  target: 'node22',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // Dependencies stay in node_modules; only our code is bundled.
  skipNodeModulesBundle: true,
});
