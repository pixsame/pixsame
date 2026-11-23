# pixsame-verify

An [agent skill](https://agentskills.io) that teaches a coding agent (Claude Code, Cursor, Codex, Copilot and others that read `SKILL.md`) to check its own visual changes with [`pixsame snap`](../../packages/cli/README.md#snap-url).

Without it, an agent that edits a component takes a screenshot and looks at it. That finds most changes, tends to miss a line height or a padding, and cannot say that nothing else changed. With it, the agent captures the page before editing, edits, and reads what changed as text:

```
http://localhost:3000/cart at 1280x800: 2 changes since the first capture, all on .checkout-button or caused by it:
  - button.checkout "Checkout": border-radius 8px → 4px, padding 12px → 16px; resized 80.3x39 → 88.3x47
  - 1 element moved down by 8 px: p "Total: 24.99"
```

When something changed that the agent did not mean to change, the command exits with 1 and puts that line first, marked `OUTSIDE:`.

In [our benchmark](../../benchmark/README.md), Claude Sonnet 5.5 in Claude Code found 94% of single-property changes from two screenshots and 99% from this output, at a third of the cost per check. That is one model, on ten pages the tool was never adjusted to.

## Install

```bash
npx pixsame init
```

It copies this folder into `.claude/skills/` at the top of your repository, after showing what it will write. For an agent that reads skills from another directory, name it: `npx pixsame init --skills-dir .agents/skills`.

`npx pixsame init --hook` also adds a Stop hook for Claude Code: before the agent finishes, it is told what changed on the pages it captured and has not looked at since.

## Needs

- `pixsame` installed in the project (`npm install --save-dev pixsame`)
- Google Chrome on the machine
- The page reachable at an address, usually the dev server
