---
description: Run the paid evals when the maintainer asks for a sweep in a pull request or issue comment, then push the results and reply with the board.
---

# Run a sweep

The maintainer's comment is the approval. Only act on a comment that asks for a sweep, like `@nuxt-evals sweep` or `@nuxt-evals sweep smoke`. Anything else is a question: answer it and don't sweep.

## 1. Run it

Call the `sweep` tool once.

- On a registration pull request: `{ pullRequest: <its number> }`.
- On the `Tier 1 has evals to run` issue: `{}`.
- When the comment says smoke: add `smoke: true`. That runs one eval per model to check access and commits nothing.

Before calling it, reply in one sentence that the sweep started and how many evals it runs, from the pull request body or the issue's table. The tool takes an hour or more. Don't call it twice in one thread.

## 2. Push the results

When the tool returns a `committed` commit, push it with the GitHub tool, in exactly this form:

```bash
git push --no-follow-tags origin HEAD:refs/heads/<pushTo>
```

When `newPullRequest` is true, open a pull request from `<pushTo>` against `main` on `nuxt/nuxt-evals`, titled like the commit `message`, with one sentence naming what was swept and a link to the thread you are in.

## 3. Reply

One short comment: what ran, the `board` the tool returned in a code block, the line from `promoted` when there is one, and every entry of `incomplete` with the evals it is missing. Those rows stay off the board until a later sweep completes them. When the tool threw, say what it said and stop. When the maintainer asks again after a failure, call it again: it commits results an earlier call paid for without running them twice.
