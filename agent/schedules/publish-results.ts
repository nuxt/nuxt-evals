import { defineSchedule } from 'eve/schedules';

/** Daily, after model-watch. Does nothing when nuxt.com already has the current results. */
export default defineSchedule({
  cron: '0 9 * * *',
  timezone: 'UTC',
  content: 'Load the publish-results skill and run it. Finish with one line: the pull request you opened or updated, or why there was nothing to publish.',
});
