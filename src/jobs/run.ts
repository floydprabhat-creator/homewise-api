import { closeDb } from '../db/index.js';
import { todayIST } from '../utils/dates.js';
import { isJobName, jobs } from './registry.js';

// Run one job by hand: `pnpm job generate-occurrences [YYYY-MM-DD]`. Every job is idempotent.
const name = process.argv[2] ?? '';
const today = process.argv[3] ?? todayIST();

if (!isJobName(name)) {
  console.error(`Unknown job "${name}". Jobs: ${Object.keys(jobs).join(', ')}`);
  process.exit(1);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
  console.error('The date must be YYYY-MM-DD');
  process.exit(1);
}

try {
  console.log(name, today, await jobs[name](today));
} finally {
  await closeDb();
}
