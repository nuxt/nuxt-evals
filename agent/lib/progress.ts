import { DASHBOARD_MARKER, passProgress, withRunningLine } from './dashboard';
import { githubApi, REPOSITORY } from './github';

/** How a sweep names itself on the dashboard. */
export interface ProgressLabel { what: string; model: number; models: number; passes: number }

/**
 * Rewrites the dashboard's running line with how far the sweep got, so the
 * maintainer can follow it there. Best effort: a failed update never fails the
 * sweep. Only imported inside a sweep step, never by the workflow body.
 */
export async function reportProgress(label: ProgressLabel, name: string, pass: number, log: string) {
  try {
    const { started, finished, passed } = passProgress(log);
    const time = new Date().toISOString().slice(11, 16);
    const model = label.models > 1 ? ` (model ${label.model} of ${label.models})` : '';
    const runs = started > 0 ? `, ${finished} of ${started} runs finished, ${passed} passed` : '';
    const line = `${label.what}: \`${name}\`${model}, pass ${pass} of ${label.passes}${runs}. Checked ${time} UTC.`;
    const issues = await githubApi<Array<{ number: number; body: string | null; pull_request?: unknown }>>('GET', `/repos/${REPOSITORY}/issues?state=open&per_page=100`);
    const dashboard = issues.find((issue) => !issue.pull_request && issue.body?.includes(DASHBOARD_MARKER));
    const body = dashboard?.body ? withRunningLine(dashboard.body, line) : null;
    if (dashboard && body) await githubApi('PATCH', `/repos/${REPOSITORY}/issues/${dashboard.number}`, { body });
  } catch (error) {
    console.warn(`Could not update the dashboard's progress: ${error instanceof Error ? error.message : error}`);
  }
}
