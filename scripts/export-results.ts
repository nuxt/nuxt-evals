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

interface SummaryJson {
  totalRuns: number;
  passedRuns: number;
  meanDuration: number;
  valid?: boolean;
}

interface AgentResult {
  evalPath: string;
  result: {
    success: boolean;
    duration: number;
    evalPath: string;
    timestamp: string;
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
    }>;
  };
  results: Record<string, AgentResult[]>;
}

const MODEL_NAMES: Record<string, string> = {
  'claude-opus-4.6': 'Claude Opus 4.6',
  'claude-sonnet-4.5': 'Claude Sonnet 4.5',
  'claude-sonnet-4.6': 'Claude Sonnet 4.6',
  'cursor-composer-1.5': 'Cursor Composer 1.5',
  'gemini-3-pro-preview': 'Gemini 3 Pro Preview',
  'gemini-3-pro-preview-gemini-cli': 'Gemini 3 Pro Preview',
  'devstral-2': 'Devstral 2',
  'gpt-5.3-codex-xhigh': 'GPT 5.3 Codex (xhigh)',
};

const HARNESS_NAMES: Record<string, string> = {
  'claude-code': 'Claude Code',
  'codex': 'Codex',
  'vercel-ai-gateway/opencode': 'OpenCode',
  'cursor': 'Cursor',
  'gemini': 'Gemini CLI',
};

const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d+Z$/;

/**
 * Recursively find all timestamp directories under a given path.
 * agent-eval may nest results under model subdirectories, e.g.:
 *   results/claude-sonnet-4.5/sonnet/<timestamp>/...
 *   results/devstral-2/vercel/mistral/devstral-2/<timestamp>/...
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

async function getAgentHarness(experiment: string): Promise<string> {
  try {
    const configPath = join('experiments', `${experiment}.ts`);
    const content = await readFile(configPath, 'utf-8');
    const match = content.match(/agent:\s*['"]([^'"]+)['"]/);
    if (match) {
      return HARNESS_NAMES[match[1]] || match[1];
    }
  } catch {
    // Config file may not exist for old results
  }
  return 'Unknown';
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

          agentResults.push({
            evalPath: evalDir,
            result: {
              success: summary.passedRuns > 0,
              duration: summary.meanDuration * 1000,
              evalPath: evalDir,
              timestamp: parseTimestamp(timestamp),
            },
          });
          seenEvals.add(evalDir);
        } catch {
          // Skip evals without valid summary
        }
      }
    }

    if (agentResults.length === 0) {
      console.warn(`No valid results for: ${experiment}`);
      continue;
    }

    const modelName = MODEL_NAMES[experiment] || experiment;
    const agentHarness = await getAgentHarness(experiment);

    exportedData.metadata.experiments.push({
      name: experiment,
      timestamp: parseTimestamp(latestTimestamp),
      modelName,
      agentHarness,
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

  const outputPath = join(process.cwd(), 'agent-results.json');
  await writeFile(outputPath, JSON.stringify(exportedData, null, 2));

  console.log('\n' + '-'.repeat(60));
  console.log(`Exported to: ${outputPath}`);
  console.log(`Total: ${totalResults} | Pass: ${totalSuccess} | Fail: ${totalResults - totalSuccess}`);
  console.log('-'.repeat(60));
}

main().catch(console.error);
