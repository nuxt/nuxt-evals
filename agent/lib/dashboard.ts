/**
 * The Evals Dashboard: one issue on nuxt/nuxt-evals, in the spirit of
 * Renovate's Dependency Dashboard. It lists what the agent can run and the
 * maintainer checks a box to run it. The agent rewrites the whole body after
 * each change, which also unchecks the boxes.
 */

export const DASHBOARD_TITLE = 'Evals Dashboard';
/** Marks the issue as the dashboard, so a title edit doesn't lose it. */
export const DASHBOARD_MARKER = '<!-- nuxt-evals:dashboard -->';

/** What a box asks for. The id lives in an HTML comment next to the box. */
export type DashboardAction =
  | { id: 'sweep-tier1' }
  | { id: 'smoke-tier1' }
  | { id: `sweep-pr-${number}`; pullRequest: number }
  | { id: 'run-model-watch' }
  | { id: 'run-publish-results' };

const BOX = /^ - \[([ xX])\] <!-- ([a-z0-9-]+) -->/gm;

function boxes(body: string): Map<string, boolean> {
  const found = new Map<string, boolean>();
  for (const match of body.matchAll(BOX)) found.set(match[2], match[1] !== ' ');
  return found;
}

export function parseAction(id: string): DashboardAction | null {
  if (id === 'sweep-tier1' || id === 'smoke-tier1' || id === 'run-model-watch' || id === 'run-publish-results') return { id };
  const pull = id.match(/^sweep-pr-(\d+)$/);
  return pull ? { id: id as `sweep-pr-${number}`, pullRequest: Number(pull[1]) } : null;
}

/** The boxes checked in `after` that were unchecked in `before`, in the order they appear. */
export function newlyChecked(before: string, after: string): DashboardAction[] {
  const previous = boxes(before);
  return [...boxes(after)]
    .filter(([id, checked]) => checked && previous.get(id) === false)
    .flatMap(([id]) => parseAction(id) ?? []);
}

export interface DashboardState {
  /** Tier-1 experiments with evals to run, from `sweep plan --json`. */
  tier1: Array<{ name: string; evals: number; missing: string[] }>;
  /** How many models a tier-1 smoke run covers. */
  smokeModels: number;
  /** Open registration pull requests. */
  registrations: Array<{ number: number; title: string }>;
  /** What is running right now, or null. */
  running: string | null;
  updatedAt: Date;
}

const RUNNING = /<!-- running -->\n(.*)\n<!-- \/running -->/;

/** The running line of a dashboard body, kept across refreshes until a sweep clears it. */
export function runningLine(body: string): string | null {
  const line = body.match(RUNNING)?.[1]?.trim();
  return line && line !== '_Nothing._' ? line : null;
}

export function renderDashboard(state: DashboardState): string {
  const box = (id: string, label: string) => ` - [ ] <!-- ${id} -->${label}`;
  const total = state.tier1.reduce((sum, { evals }) => sum + evals, 0);
  const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

  const tier1 = state.tier1.length === 0
    ? 'Every tier-1 model has a current result for every eval.'
    : [
        '| Experiment | Evals to run |',
        '|---|---|',
        ...state.tier1.map(({ name, evals, missing }) => `| \`${name}\` | ${evals}${missing.length <= 4 ? `: ${missing.join(', ')}` : ''} |`),
        '',
        box('sweep-tier1', `Run the missing evals (${plural(total, 'eval')})`),
      ].join('\n');

  const registrations = state.registrations.length === 0
    ? 'No registration pull request is open.'
    : state.registrations.map(({ number, title }) => box(`sweep-pr-${number}`, `Sweep #${number}: ${title}`)).join('\n');

  return [
    DASHBOARD_MARKER,
    'The nuxt-evals agent keeps this issue current. Check a box to run it: only the maintainer\'s checks count, and every eval run costs money. The agent unchecks the box when it starts, says what is running below, and replies here when it is done.',
    '',
    '## Running',
    '',
    '<!-- running -->',
    state.running ?? '_Nothing._',
    '<!-- /running -->',
    '',
    '## Tier 1',
    '',
    'Evals that tier-1 models have not run at their current version, usually after an eval change.',
    '',
    tier1,
    '',
    '## Registrations',
    '',
    'New models the agent registered. A sweep runs every eval for the model and commits the results to its pull request.',
    '',
    registrations,
    '',
    '## Other',
    '',
    box('smoke-tier1', `Smoke test: one eval per tier-1 model (${plural(state.smokeModels, 'model')}), nothing is committed`),
    box('run-model-watch', 'Check the AI Gateway catalog for new models now'),
    box('run-publish-results', 'Publish the results to nuxt.com now'),
    '',
    '---',
    '',
    `Updated ${state.updatedAt.toISOString().slice(0, 16).replace('T', ' ')} UTC.`,
    '',
  ].join('\n');
}
