import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { DASHBOARD_MARKER, DASHBOARD_TITLE, renderDashboard, runningLine, type DashboardState } from '../lib/dashboard';
import { BASE_BRANCH, githubApi, REPOSITORY } from '../lib/github';
import { OPEN_POLICY, run, syncBase } from '../lib/sandbox';
import { environment } from '../sandbox/sandbox';

interface Issue { number: number; body: string | null; html_url: string; pull_request?: unknown }
interface Pull { number: number; title: string; head: { ref: string; repo: { full_name: string } | null } }

export default defineTool({
  description: 'Refresh the Evals Dashboard issue on nuxt/nuxt-evals from the current state: tier-1 evals left to run, open registration pull requests, and what is running. Opens it when there is none. Rewriting it unchecks every box. Pass `running` when you start work from a checked box, and `running: null` when it is done.',
  inputSchema: z.object({
    running: z.string().max(200).nullable().optional().describe('One line on what is running now, like "Sweep of #71 started 11:00 UTC." null clears it. Omit to keep the current line.'),
  }),
  async execute({ running }, ctx) {
    const sandbox = await ctx.getSandbox(environment);
    await sandbox.setNetworkPolicy(OPEN_POLICY);
    await syncBase(sandbox, BASE_BRANCH);
    const tsx = 'node_modules/.bin/tsx scripts/sweep.ts plan --json';
    const plan = JSON.parse(await run(sandbox, tsx)) as { experiments: DashboardState['tier1'] };
    const smoke = JSON.parse(await run(sandbox, `${tsx} --smoke`)) as { experiments: unknown[] };

    const pulls = await githubApi<Pull[]>('GET', `/repos/${REPOSITORY}/pulls?state=open&per_page=100`);
    const registrations = pulls
      .filter((pull) => pull.head.repo?.full_name === REPOSITORY && pull.head.ref.startsWith('agent/add-'))
      .map(({ number, title }) => ({ number, title }));

    const issues = await githubApi<Issue[]>('GET', `/repos/${REPOSITORY}/issues?state=open&per_page=100`);
    const existing = issues.find((issue) => !issue.pull_request && issue.body?.includes(DASHBOARD_MARKER));

    const body = renderDashboard({
      tier1: plan.experiments,
      smokeModels: smoke.experiments.length,
      registrations,
      running: running === undefined ? runningLine(existing?.body ?? '') : running,
      updatedAt: new Date(),
    });
    const issue = existing
      ? await githubApi<Issue>('PATCH', `/repos/${REPOSITORY}/issues/${existing.number}`, { body })
      : await githubApi<Issue>('POST', `/repos/${REPOSITORY}/issues`, { title: DASHBOARD_TITLE, body });
    return {
      issue: issue.number,
      url: issue.html_url,
      tier1Evals: plan.experiments.reduce((sum, { evals }) => sum + evals, 0),
      registrations: registrations.map(({ number }) => number),
    };
  },
});
