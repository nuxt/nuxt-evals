import { defineSchedule } from 'eve/schedules';

/** Daily. Registers at most one new model per run, as a pull request. */
export default defineSchedule({
  cron: '0 7 * * *',
  timezone: 'UTC',
  content: 'Load the add-model skill and run it. Open at most one pull request, for the best candidate. Finish with one paragraph naming every model you considered and why each was registered, skipped or blocked.',
});
