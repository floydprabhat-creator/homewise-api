import { closeDb } from '../db/index.js';
import { isJobName, jobs } from './registry.js';

// Run one job by hand: `pnpm job generate-occurrences`. Every job is idempotent.
const name = process.argv[2] ?? '';

if (!isJobName(name)) {
  console.error(`Unknown job "${name}". Jobs: ${Object.keys(jobs).join(', ')}`);
  process.exit(1);
}

try {
  console.log(name, await jobs[name]());
} finally {
  await closeDb();
}
