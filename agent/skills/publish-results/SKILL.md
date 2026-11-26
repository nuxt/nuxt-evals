---
description: Open or update the pull request on nuxt/nuxt.com that publishes the current agent-results.json, when it differs from what the site has.
---

# Publish results to nuxt.com

The site reads `public/agent-results.json` in `nuxt/nuxt.com`. The source is `agent-results.json` on `main` of `nuxt/nuxt-evals`. You copy the file, nothing else.

## 1. Compare

```bash
cd /workspace
curl -fsSL https://raw.githubusercontent.com/nuxt/nuxt-evals/main/agent-results.json -o /tmp/new.json
curl -fsSL https://raw.githubusercontent.com/nuxt/nuxt.com/main/public/agent-results.json -o /tmp/published.json
node scripts/results-diff.mjs /tmp/published.json /tmp/new.json
```

`changed: false` means the site is current. Report that and stop.

## 2. Look for an existing pull request

```bash
gh pr list --repo nuxt/nuxt.com --state open --head agent/evals-results --json number,title
gh pr list --repo nuxt/nuxt.com --state open --limit 200 --json number,title,headRefName,author,files
```

- The first lists yours, from `agent/evals-results`: you update it in step 3.
- In the second, one from anyone else that changes `public/agent-results.json` means a person is already publishing. Report its number and stop.

## 3. Push the file

The clone goes in `/workspace/.eve-publish`: the GitHub tool only runs inside `/workspace`, and that directory is ignored by the nuxt-evals checkout around it.

```bash
mkdir -p /workspace/.eve-publish && cd /workspace/.eve-publish
rm -rf nuxt.com
git clone --depth 1 --filter=blob:none --sparse https://github.com/nuxt/nuxt.com.git
cd nuxt.com
git sparse-checkout set --no-cone /public/agent-results.json
git checkout -B agent/evals-results
cp /tmp/new.json public/agent-results.json
git add public/agent-results.json
git commit -m "<title from results-diff>"
```

`git status --short` must have shown that one file and no other before the commit. When the branch already exists on the remote from an earlier run, fetch it first and commit on top of it, never force. Push with the GitHub tool, with exactly this form, the only one it accepts:

```bash
git push --no-follow-tags origin HEAD:refs/heads/agent/evals-results
```

Run it with `workingDirectory` set to `.eve-publish/nuxt.com` and `repository` set to `nuxt/nuxt.com`.

## 4. Open or update the pull request

Use the `title` that `results-diff.mjs` printed. Against `main` of `nuxt/nuxt.com`, not as a draft. When the pull request exists, edit its title to the new one.

Body: one sentence saying which results this publishes, and a link to the commits on `nuxt/nuxt-evals` that produced them (`https://github.com/nuxt/nuxt-evals/commits/main/agent-results.json`). Nothing else.
