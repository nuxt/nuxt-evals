import { defineSchedule } from 'eve/schedules';

/** Daily, before model-watch. Keeps the Evals Dashboard current, so eval changes on main show up as tier-1 work. */
export default defineSchedule({
  cron: '0 6 * * *',
  timezone: 'UTC',
  content: 'Call the dashboard tool to refresh the Evals Dashboard. Finish with one line: the issue and how many tier-1 evals are left.',
});
