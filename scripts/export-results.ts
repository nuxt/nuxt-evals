/**
 * Export eval results to JSON format for nuxt.com/evals
 *
 * Reads results (with built-in classifications from agent-eval) and
 * exports clean results to agent-results.json.
 *
 * Usage:
 *   pnpm run export-results [experiments...]
 *   pnpm run export-results  # exports from all experiments
 *
 * Output: agent-results.json (copy to nuxt/nuxt.com repo)
 */

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import {
  computeFingerprint,
  discoverFixtures,
  loadConfig,
  type ResolvedExperimentConfig,
} from '@vercel/agent-eval';

interface SummaryJson {
  totalRuns: number;
  passedRuns: number;
  meanDuration: number;
  valid?: boolean;
  fingerprint?: string;
}

interface RunResultJson {
  status: string;
}

interface AgentResult {
  evalPath: string;
  result: {
    success: boolean;
    duration: number;
    evalPath: string;
    timestamp: string;
    /** passedRuns / totalRuns. Under earlyExit: true this is censored
     * (runs stop at first pass), so it understates per-run reliability
     * for retried evals — firstRunSuccess is the unbiased signal. */
    passRate: number;
    passedRuns: number;
    totalRuns: number;
    /** Whether run-1 passed — an unbiased per-run sample under any earlyExit mode. */
    firstRunSuccess: boolean;
  };
}

interface ExportedData {
  metadata: {
    exportedAt: string;
    experiments: Array<{
      name: string;
      timestamp: string;
      modelName: string;
      agentHarness: string;
      avgDuration?: number;
      /** Fraction of evals whose first run passed (unbiased pass@1). */
      passAt1?: number;
      /** Mean per-eval passRate (censored under earlyExit: true). */
      avgPassRate?: number;
    }>;
  };
  results: Record<string, AgentResult[]>;
}

const MODEL_NAMES: Record<string, string> = {
  'claude-opus-4.6': 'Claude Opus 4.6',
  'claude-opus-4.7': 'Claude Opus 4.7',
  'claude-opus-4.8': 'Claude Opus 4.8',
  'claude-fable-5': 'Claude Fable 5',
  'claude-sonnet-4.5': 'Claude Sonnet 4.5',
  'claude-sonnet-4.6': 'Claude Sonnet 4.6',
  'claude-sonnet-5': 'Claude Sonnet 5',
  'cursor-composer-2.0': 'Cursor Composer 2.0',
  'cursor-composer-2.5': 'Cursor Composer 2.5',
  'gemini-3-pro-preview': 'Gemini 3 Pro Preview',
  'gemini-3.1-pro-preview': 'Gemini 3.1 Pro Preview',
  'gpt-5.3-codex-xhigh': 'GPT 5.3 Codex (xhigh)',
  'gpt-5.4-xhigh': 'GPT 5.4 (xhigh)',
  'gpt-5.5-pro': 'GPT 5.5 Pro',
  'kimi-k2.6': 'Kimi K2.6',
  'kimi-k2.7-code': 'Kimi K2.7 Code',
  'minimax-m2.7': 'MiniMax M2.7',
  'minimax-m3': 'MiniMax M3',
};

const HARNESS_NAMES: Record<string, string> = {
  'claude-code': 'Claude Code',
  'vercel-ai-gateway/claude-code': 'Claude Code',
  'codex': 'Codex',
  'vercel-ai-gateway/codex': 'Codex',
  'vercel-ai-gateway/opencode': 'OpenCode',
  'cursor': 'Cursor',
  'gemini': 'Gemini CLI',
};

const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d+Z$/;

/**
 * Recursively find all timestamp directories under a given path.
 * agent-eval may nest results under model subdirectories, e.g.:
 *   results/claude-sonnet-4.5/sonnet/<timestamp>/...
 *   results/kimi-k2.6/vercel/moonshotai/kimi-k2.6/<timestamp>/...
 */
async function findTimestampDirs(dir: string): Promise<string[]> {
  const results: string[] = [];
  let entries: string[];
  try {
    entries = (await readdir(dir)).filter((e) => !e.startsWith('.'));
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    if (TIMESTAMP_RE.test(entry)) {
      results.push(fullPath);
    } else {
      const info = await stat(fullPath);
      if (info.isDirectory()) {
        results.push(...(await findTimestampDirs(fullPath)));
      }
    }
  }
  return results;
}

function parseTimestamp(ts: string): string {
  const match = ts.match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})\.(\d+)Z$/
  );
  if (match) {
    return `${match[1]}T${match[2]}:${match[3]}:${match[4]}.${match[5]}Z`;
  }
  return ts;
}

/**
 * Whether run-1 of an eval passed, from run-1/result.json.
 * Falls back to the summary when run dirs are missing (older results):
 * under earlyExit: true, run-1 passed iff the harness stopped after one run.
 */
async function getFirstRunSuccess(
  evalDir: string,
  summary: SummaryJson
): Promise<boolean> {
  try {
    const raw = await readFile(join(evalDir, 'run-1', 'result.json'), 'utf-8');
    const result: RunResultJson = JSON.parse(raw);
    return result.status === 'passed';
  } catch {
    return summary.totalRuns === 1 && summary.passedRuns > 0;
  }
}

async function loadExperimentConfig(
  experiment: string
): Promise<ResolvedExperimentConfig | null> {
  try {
    const configPath = join(process.cwd(), 'experiments', `${experiment}.ts`);
    return await loadConfig(configPath);
  } catch {
    return null;
  }
}

/**
 * Compute the current fingerprint for every eval under evals/, using the same
 * hash as the harness (eval files + config fields that affect results).
 * Only stored results matching these fingerprints are exported — anything
 * else was produced by a different eval version or experiment config and
 * must not be mixed into agent-results.json.
 */
function computeCurrentFingerprints(
  config: ResolvedExperimentConfig
): Record<string, string> {
  const evalsDir = join(process.cwd(), 'evals');
  const fingerprints: Record<string, string> = {};
  // Same discovery rule as the harness: a fixture is a dir with a PROMPT.md
  for (const evalName of discoverFixtures(evalsDir)) {
    fingerprints[evalName] = computeFingerprint(join(evalsDir, evalName), config);
  }
  return fingerprints;
}

async function main(): Promise<void> {
  const resultsDir = join(process.cwd(), 'results');

  let experiments = process.argv.slice(2);

  if (experiments.length === 0) {
    // Auto-discover all experiments with results
    const allDirs = (await readdir(resultsDir)).filter((d) => !d.startsWith('.'));
    const withResults: string[] = [];
    for (const dir of allDirs) {
      const expDir = join(resultsDir, dir);
      const tsDirs = await findTimestampDirs(expDir);
      if (tsDirs.length > 0) {
        withResults.push(dir);
      }
    }
    experiments = withResults;
  }

  console.log(`Exporting from experiments: ${experiments.join(', ')}\n`);

  const exportedData: ExportedData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      experiments: [],
    },
    results: {},
  };

  for (const experiment of experiments) {
    const expDir = join(resultsDir, experiment);
    try {
      await stat(expDir);
    } catch {
      console.warn(`Experiment not found: ${experiment}`);
      continue;
    }

    const config = await loadExperimentConfig(experiment);
    if (!config) {
      console.warn(
        `Skipping ${experiment}: no experiments/${experiment}.ts config — cannot validate result fingerprints`
      );
      continue;
    }
    const currentFingerprints = computeCurrentFingerprints(config);

    // Find all timestamp directories (may be nested under model subdirs)
    const tsDirs = await findTimestampDirs(expDir);
    if (tsDirs.length === 0) continue;

    // Sort by timestamp, newest first
    const sortedTsDirs = tsDirs.sort((a, b) => {
      const tsA = a.split('/').pop()!;
      const tsB = b.split('/').pop()!;
      const da = new Date(parseTimestamp(tsA));
      const db = new Date(parseTimestamp(tsB));
      return db.getTime() - da.getTime();
    });

    const latestTimestamp = sortedTsDirs[0].split('/').pop()!;
    const agentResults: AgentResult[] = [];
    const seenEvals = new Set<string>();
    const staleEvals = new Set<string>();

    for (const tsDir of sortedTsDirs) {
      const timestamp = tsDir.split('/').pop()!;
      let evalDirs: string[];
      try {
        evalDirs = await readdir(tsDir);
      } catch {
        continue;
      }

      for (const evalDir of evalDirs) {
        if (evalDir.startsWith('.') || seenEvals.has(evalDir)) continue;

        const summaryPath = join(tsDir, evalDir, 'summary.json');
        try {
          const summaryRaw = await readFile(summaryPath, 'utf-8');
          const summary: SummaryJson = JSON.parse(summaryRaw);

          // Skip invalid results (infra/timeout failures)
          if (summary.valid === false) continue;

          // Skip results whose fingerprint doesn't match the current eval
          // content + experiment config — stale batches must never backfill.
          if (summary.fingerprint !== currentFingerprints[evalDir]) {
            staleEvals.add(evalDir);
            continue;
          }

          const firstRunSuccess = await getFirstRunSuccess(
            join(tsDir, evalDir),
            summary
          );

          agentResults.push({
            evalPath: evalDir,
            result: {
              success: summary.passedRuns > 0,
              duration: summary.meanDuration * 1000,
              evalPath: evalDir,
              timestamp: parseTimestamp(timestamp),
              passRate:
                summary.totalRuns > 0
                  ? summary.passedRuns / summary.totalRuns
                  : 0,
              passedRuns: summary.passedRuns,
              totalRuns: summary.totalRuns,
              firstRunSuccess,
            },
          });
          seenEvals.add(evalDir);
        } catch {
          // Skip evals without valid summary
        }
      }
    }

    const missingEvals = Object.keys(currentFingerprints).filter(
      (e) => !seenEvals.has(e)
    );
    if (missingEvals.length > 0) {
      console.warn(
        `${experiment}: ${missingEvals.length}/${Object.keys(currentFingerprints).length} evals have no current result (stale or never run) — re-run before exporting: ${missingEvals.join(', ')}`
      );
    } else if (staleEvals.size > 0) {
      console.log(
        `${experiment}: ignored stale batches for ${staleEvals.size} evals (current results found)`
      );
    }

    if (agentResults.length === 0) {
      console.warn(`No valid results for: ${experiment}`);
      continue;
    }

    const modelName = MODEL_NAMES[experiment] || experiment;
    const agentHarness = HARNESS_NAMES[config.agent] || config.agent;

    // Mean run duration in seconds (durations are stored in ms)
    const avgDuration =
      agentResults.reduce((sum, r) => sum + r.result.duration, 0) /
      agentResults.length /
      1000;

    const passAt1 =
      agentResults.filter((r) => r.result.firstRunSuccess).length /
      agentResults.length;
    const avgPassRate =
      agentResults.reduce((sum, r) => sum + r.result.passRate, 0) /
      agentResults.length;

    exportedData.metadata.experiments.push({
      name: experiment,
      timestamp: parseTimestamp(latestTimestamp),
      modelName,
      agentHarness,
      avgDuration,
      passAt1,
      avgPassRate,
    });

    exportedData.results[experiment] = agentResults.sort((a, b) =>
      a.evalPath.localeCompare(b.evalPath)
    );
  }

  // Count stats
  let totalSuccess = 0;
  let totalResults = 0;
  for (const results of Object.values(exportedData.results)) {
    for (const r of results) {
      totalResults++;
      if (r.result.success) totalSuccess++;
    }
  }

  // Reliability leaderboard (success ties broken by pass@1)
  const board = [...exportedData.metadata.experiments].map((exp) => {
    const results = exportedData.results[exp.name];
    const successRate =
      results.filter((r) => r.result.success).length / results.length;
    return { ...exp, successRate };
  });
  board.sort(
    (a, b) =>
      b.successRate - a.successRate || (b.passAt1 ?? 0) - (a.passAt1 ?? 0)
  );
  console.log('\nModel                       success   pass@1   avgPassRate');
  for (const exp of board) {
    console.log(
      `${exp.name.padEnd(28)}${(exp.successRate * 100).toFixed(0).padStart(6)}%${((exp.passAt1 ?? 0) * 100).toFixed(0).padStart(8)}%${((exp.avgPassRate ?? 0) * 100).toFixed(0).padStart(11)}%`
    );
  }

  const outputPath = join(process.cwd(), 'agent-results.json');
  await writeFile(outputPath, JSON.stringify(exportedData, null, 2));

  console.log('\n' + '-'.repeat(60));
  console.log(`Exported to: ${outputPath}`);
  console.log(`Total: ${totalResults} | Pass: ${totalSuccess} | Fail: ${totalResults - totalSuccess}`);
  console.log('-'.repeat(60));
}

main().catch(console.error);
