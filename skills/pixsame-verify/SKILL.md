---
name: pixsame-verify
description: Check what an edit changed on the rendered page, and that nothing else changed, with `pixsame snap`. Use before and after editing anything that affects how a page looks (components, styles, layout, copy), instead of taking a screenshot and looking at it.
---

# Verify a visual change with pixsame

`pixsame snap` compares a page with how it looked before you started and prints what is different as text: which elements changed, what moved and by how much, and whether anything changed that you did not mean to change. It is exact where looking at two screenshots is not, and it costs far fewer tokens.

It needs the page reachable at an address (the project's dev server, a Storybook story's iframe address, or a `file://` path) and Chrome installed.

## Steps

1. **Before the first edit**, capture every page the edit can affect:

   ```bash
   npx pixsame snap http://localhost:3000/cart
   ```

   It prints "first capture saved". Add `--selector <css>` to capture one element, `--viewport 390x844` (repeatable) for other window sizes, `--storage-state <file>` for a page behind a login. Use the same options every time for the same page.

   If you already edited, the first capture is of the edited page and is no use. Say so to the user instead of pretending it was checked.

2. **Write down what you intend to change**, in one sentence, before editing: which element, what about it.

3. **Edit.** Wait for the dev server to rebuild.

4. **Capture again, naming the element you meant to change:**

   ```bash
   npx pixsame snap http://localhost:3000/cart --only '.checkout-button'
   ```

   - Exit code 0 and "no change": the edit had no visible effect. If it should have, the edit is wrong or the page is not the right one.
   - Exit code 0 and "all on … or caused by it": only that element changed, plus what it pushed aside. Read the lines and check they match your sentence from step 2.
   - Exit code 1: lines marked `OUTSIDE:` changed and were not meant to. Fix the edit, then run the same command again. Do not widen `--only` to make the line go away unless that element really was meant to change.
   - Exit code 2: the command or the setup is wrong; the message says what to do.

5. **Read every line.** Each is one fact. For a line that says pixels changed and the layout does not say why (a canvas, a picture), the command prints the paths of a before and an after crop: look at those two small images, not at a full screenshot.

6. **Repeat 3 to 5** until the output matches the intent. The comparison is always with the first capture, so the output shows the whole effect of your work so far.

7. **When done**, add the result to your summary or the pull request description:

   ```bash
   npx pixsame snap --report
   ```

   If a page should stay protected by a test from now on, run its `snap` command once more with `--keep`, then follow the `pixsame-write-tests` skill.

## Rules

- "No change" and "all on …" are proven from the pixels. Lines that name elements come from the page's layout and are checked against the pixels. Trust them over your own reading of a screenshot.
- Areas reported as "left out, it changes by itself" (a clock, a carousel) were not compared. If your edit is inside such an area, say that it could not be verified.
- A new commit starts over: the next `snap` is a first capture again. Capture before the next edit.
- `--reset` forgets the first capture of a page. Use it only when the "before" is wrong (the server was showing an error page), never to make a reported change disappear.
- Never claim a visual change was verified when you did not run the second capture, or when it exited with 1 or 2.
- `--json` gives the same facts as data when you need to process them.
