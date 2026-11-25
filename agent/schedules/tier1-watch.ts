import { defineSchedule } from 'eve/schedules';

/** Daily, before model-watch. Notices when an eval change left tier 1 with evals to run. */
export default defineSchedule({
  cron: '0 6 * * *',
  timezone: 'UTC',
  content: 'Load the tier1-watch skill and run it. Finish with one line: the issue you opened or updated, or that tier 1 is complete.',
});
