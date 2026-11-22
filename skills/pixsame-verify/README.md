# pixsame-verify

An [agent skill](https://agentskills.io) that teaches a coding agent (Claude Code, Cursor, Codex, Copilot and others that read `SKILL.md`) to check its own visual changes with [`pixsame snap`](../../packages/cli/README.md#snap-url).

Without it, an agent that edits a component takes a screenshot and looks at it, which misses most small changes and cannot tell that nothing else changed. With it, the agent captures the page before editing, edits, and reads what changed as text:

```
http://localhost:3000/cart at 1280x800: 2 changes since the first capture, all on .checkout-button or caused by it:
  - look changed on button "Checkout"; resized 97x42 → 105x50
  - 1 element moved down by 8 px: p "Total: 24.99"
```

When something changed that the agent did not mean to change, the command exits with 1 and puts that line first, marked `OUTSIDE:`.

## Install

Copy this folder into your project's skills directory:

```bash
mkdir -p .claude/skills
cp -r node_modules/pixsame/skills/pixsame-verify .claude/skills/
```

Other agents read skills from their own directory (`.cursor/skills`, `.agents/skills`); the folder is the same.

## Needs

- `pixsame` installed in the project (`npm install --save-dev pixsame`)
- Google Chrome on the machine
- The page reachable at an address, usually the dev server
