// One question to one model, as a coding agent would get it: Claude Code in
// headless mode, in a directory that holds the files of the question and
// nothing else, with no project or user instructions, skills, hooks or MCP
// servers.

import { spawn } from "node:child_process";

/**
 * Asks `model` the `prompt` in `cwd`. With `read`, the agent may read the
 * files there (the Read tool only); without, it has no tools at all.
 * Resolves to the answer with its usage, or to `{ error }`.
 */
export const askClaude = ({ cwd, prompt, model, read = false }) =>
  new Promise((resolve) => {
    const child = spawn(
      "claude",
      [
        "-p",
        prompt,
        "--model",
        model,
        "--output-format",
        "json",
        "--safe-mode",
        "--tools",
        read ? "Read" : "",
        ...(read ? ["--allowedTools", "Read"] : []),
        "--strict-mcp-config",
        "--disable-slash-commands",
        "--no-session-persistence",
      ],
      { cwd, stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", (error) => resolve({ error: String(error) }));
    child.on("close", (code) => {
      try {
        const answer = JSON.parse(stdout);
        if (answer.is_error || answer.subtype !== "success") {
          return resolve({ error: answer.result ?? answer.subtype ?? "error" });
        }
        resolve({
          answer: answer.result,
          usage: answer.usage,
          costUsd: answer.total_cost_usd,
          turns: answer.num_turns,
          durationMs: answer.duration_ms,
          model: Object.keys(answer.modelUsage ?? {})[0],
        });
      } catch {
        resolve({ error: `exit ${code}: ${(stderr || stdout).slice(0, 400)}` });
      }
    });
  });

/** Runs `work` on every job, `concurrency` at a time. */
export const inParallel = async (jobs, concurrency, work) => {
  const todo = [...jobs];
  const one = async () => {
    for (let job = todo.shift(); job; job = todo.shift()) await work(job);
  };
  await Promise.all(Array.from({ length: concurrency }, one));
};
