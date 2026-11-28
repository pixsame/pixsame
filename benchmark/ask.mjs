// One question to one model, as a coding agent would get it: Claude Code in
// headless mode, in a directory that holds the files of the question and
// nothing else, with no project or user instructions, skills, hooks or MCP
// servers.

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

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

// List prices in dollars per million tokens, input and output (thinking is
// billed as output), read on 2026-11-25. They are only used to print a cost;
// a model that is not here gets none.
const GEMINI_PRICES = {
  "gemini-4-carbon": [2, 10], // 4 and 20 from 2026-12-01
  "gemini-4-neon": [3, 15],
  "gemini-4-hydrogen": [1.5, 7.5],
  "gemini-3.8-flash": [0.75, 3.75], // 1.5 and 7.5 from 2027-01-01
  "gemini-3.5-flash-lite": [0.3, 2.5],
};

const TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp" };

/** Every file under `dir`, "before" ahead of "after", as paths from `dir`. */
const filesIn = (dir) =>
  fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) =>
      path.relative(dir, path.join(entry.parentPath ?? entry.path, entry.name)),
    )
    .sort((a, b) => {
      const key = (name) =>
        name.replace("before", "\u00000").replace("after", "\u00001");
      return key(a).localeCompare(key(b), "en", { numeric: true });
    });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Asks a Gemini model through the Gemini API (GEMINI_API_KEY). This is a bare
 * model call, not an agent: there is no tool to read with, so with `read`
 * every file in `cwd` is sent along, each after a line with its name.
 */
export const askGemini = async ({ cwd, prompt, model, read = false }) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { error: "GEMINI_API_KEY is not set" };
  const parts = [];
  if (read) {
    parts.push({
      text: "The files of the current directory follow, each after a line with its name.",
    });
    for (const name of filesIn(cwd)) {
      const bytes = fs.readFileSync(path.join(cwd, name));
      const type = TYPES[path.extname(name).toLowerCase()];
      parts.push({ text: `File: ${name}` });
      parts.push(
        type
          ? { inlineData: { mimeType: type, data: bytes.toString("base64") } }
          : { text: bytes.toString("utf8") },
      );
    }
  }
  parts.push({ text: prompt });
  const started = Date.now();
  let error = "no answer";
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) await wait(2000 * 2 ** attempt);
    let response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({ contents: [{ role: "user", parts }] }),
          signal: AbortSignal.timeout(300_000),
        },
      );
    } catch (failure) {
      error = String(failure);
      continue;
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      error = `${response.status}: ${body.error?.message ?? "error"}`.slice(0, 400);
      // too many requests, or the service is busy: worth another try
      if (response.status === 429 || response.status >= 500) continue;
      return { error };
    }
    const answer = (body.candidates?.[0]?.content?.parts ?? [])
      .filter((part) => !part.thought && typeof part.text === "string")
      .map((part) => part.text)
      .join("")
      .trim();
    if (!answer) {
      error = `no text: ${body.candidates?.[0]?.finishReason ?? body.promptFeedback?.blockReason ?? "empty"}`;
      continue;
    }
    const used = body.usageMetadata ?? {};
    const input = used.promptTokenCount ?? 0;
    const output =
      (used.candidatesTokenCount ?? 0) + (used.thoughtsTokenCount ?? 0);
    const price = GEMINI_PRICES[model];
    return {
      answer,
      // in the shape of Claude Code's usage, so that one scorer reads both
      usage: {
        input_tokens: input,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        output_tokens: output,
        thinking_tokens: used.thoughtsTokenCount ?? 0,
      },
      costUsd: price ? (input * price[0] + output * price[1]) / 1e6 : 0,
      turns: 1,
      durationMs: Date.now() - started,
      model: body.modelVersion ?? model,
    };
  }
  return { error };
};

/** Asks whichever model `model` names: a Gemini id goes to the Gemini API, anything else to Claude Code. */
export const ask = (question) =>
  question.model.startsWith("gemini")
    ? askGemini(question)
    : askClaude(question);

/** Runs `work` on every job, `concurrency` at a time. */
export const inParallel = async (jobs, concurrency, work) => {
  const todo = [...jobs];
  const one = async () => {
    for (let job = todo.shift(); job; job = todo.shift()) await work(job);
  };
  await Promise.all(Array.from({ length: concurrency }, one));
};
