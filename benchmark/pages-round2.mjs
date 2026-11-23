// Round 2 pages: six more, written after the fixes that followed round 1
// (`pages-round1.mjs`). `pixsame snap` was changed again after seeing its
// results on these, so they are development pages too, not the final ones.
//
// Same shape as `pages.mjs`. A target's `kind` may also hold `container` (it
// lays out its children with a gap) and `item` (it is one of several children
// of a flex or grid container).

const BASE = `
  * { box-sizing: border-box; }
  html { font-size: 14px; }
  body { margin: 0; font-family: "Trebuchet MS", Tahoma, sans-serif; line-height: 1.45; color: var(--fg, #101418); background: var(--bg, #e9edf0); }
  a { color: var(--hot, #d6336c); text-decoration: underline; }
  h1 { font-size: 2rem; margin: 0 0 0.5rem; letter-spacing: -0.5px; }
  h2 { font-size: 1.3rem; margin: 0 0 0.4rem; }
  h4 { font-size: 1rem; margin: 0; }
  p { margin: 0 0 0.7rem; }
  header.bar { display: grid; grid-template-columns: 200px 1fr auto; align-items: center; padding: 10px 24px; background: var(--card, #fff); border-bottom: 3px solid var(--hot, #d6336c); }
  header.bar nav { display: flex; gap: 20px; }
  header.bar nav a { text-decoration: none; color: inherit; }
  .mark { font-weight: 700; font-size: 1.2rem; }
  main { width: 980px; margin: 24px auto; }
  .split { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }
  .box { background: var(--card, #fff); border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15); }
  .lined { border: 1px dashed var(--edge, #8a949e); border-radius: 6px; padding: 12px; }
  .flow { display: flex; flex-direction: column; gap: 12px; }
  .across { display: flex; gap: 10px; align-items: center; }
  .btn { display: inline-flex; align-items: center; height: 36px; padding: 0 16px; border-radius: 4px; border: 0; background: var(--hot, #d6336c); color: #fff; font-weight: 700; text-decoration: none; }
  .btn.quiet { background: var(--card, #fff); color: var(--fg, #101418); border: 1px solid var(--edge, #8a949e); }
  .chip { display: inline-block; padding: 2px 10px; border: 1px solid currentColor; border-radius: 99px; font-size: 0.85rem; color: var(--hot, #d6336c); }
  .dim { color: var(--dim, #5c6670); font-size: 0.9rem; }
  .sw { width: 40px; height: 22px; border-radius: 11px; background: var(--hot, #d6336c); flex: none; position: relative; }
  .sw.off { background: #b6bec6; }
  .sw::after { content: ""; position: absolute; top: 3px; right: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; }
  .sw.off::after { right: auto; left: 3px; }
  .push { margin-left: auto; }
  .num { font-family: "Courier New", monospace; }
  .icon { width: 28px; height: 28px; border-radius: 6px; background: var(--tint, #ffd6e4); flex: none; }
  hr { border: 0; height: 1px; background: var(--edge, #8a949e); margin: 14px 0; }
`;

const bar = (mark, links, right) =>
  `<header class="bar"><span class="mark">${mark}</span><nav>${links.map((l) => `<a href="#">${l}</a>`).join("")}</nav><span class="dim">${right}</span></header>`;

const page = (id, title, vars, body, targets) => ({
  id,
  title,
  targets,
  html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>${BASE}\n  :root { ${vars} }</style></head><body>${body}</body></html>`,
});

export const PAGES = [
  page(
    "settings",
    "Notification settings",
    "--hot: #2f6fed; --tint: #d9e6ff;",
    `${bar("Relay", ["Inbox", "Rules", "Settings"], "ines@example.org")}
    <main><h1 id="st-title">Notifications</h1><p class="dim" id="st-sub">Choose what reaches you, and where.</p>
    <div class="split"><div class="box flow" id="st-list">
      <div class="across" id="st-r1"><span class="icon"></span><div><h4 id="st-r1-h">Mentions</h4><span class="dim">When someone names you in a thread</span></div><span class="sw push" id="st-sw1"></span></div>
      <div class="across" id="st-r2"><span class="icon"></span><div><h4>Replies</h4><span class="dim" id="st-r2-d">Answers to messages you wrote</span></div><span class="sw push"></span></div>
      <div class="across" id="st-r3"><span class="icon"></span><div><h4>Weekly digest</h4><span class="dim">A summary every Monday morning</span></div><span class="sw off push" id="st-sw3"></span></div>
      <hr><div class="across" id="st-acts"><a class="btn" id="st-save" href="#">Save changes</a><a class="btn quiet" id="st-reset" href="#">Reset</a></div></div>
    <div class="flow"><div class="box" id="st-quiet"><h2>Quiet hours</h2><p class="dim">Nothing is sent between these times.</p><div class="lined num" id="st-hours">22:00 to 07:30</div></div>
      <div class="box" id="st-chan"><h2>Channels</h2><div class="across" id="st-chips" style="flex-wrap:wrap"><span class="chip">Email</span><span class="chip" id="st-push">Push</span><span class="chip">Desktop</span></div></div></div></div></main>`,
    [
      { selector: "#st-title", name: "the page heading", kind: ["text"] },
      { selector: "#st-save", name: 'the "Save changes" button', kind: ["text", "box", "item"] },
      { selector: "#st-quiet", name: 'the "Quiet hours" box', kind: ["box", "item"] },
      { selector: "#st-list", name: "the box with the list of settings", kind: ["box", "container"] },
      { selector: "#st-r2-d", name: 'the description under "Replies"', kind: ["text"] },
      { selector: "#st-hours", name: 'the "22:00 to 07:30" box', kind: ["text", "box"] },
      { selector: "#st-chips", name: "the row of channel chips", kind: ["container"] },
      { selector: "#st-r1", name: 'the "Mentions" row', kind: ["item"] },
      { selector: "#st-push", name: 'the "Push" chip', kind: ["text", "box", "item"] },
      { selector: "#st-sub", name: "the line under the heading", kind: ["text"] },
    ],
  ),
  page(
    "invoice",
    "Invoice",
    "--hot: #0f766e; --bg: #f2f2ee; --tint: #d5efec;",
    `${bar("Ledgerly", ["Invoices", "Clients", "Reports"], "Okafor & Daughters")}
    <main style="width:820px"><div class="box" id="iv-sheet"><div class="across" id="iv-head"><div><h1 id="iv-no">Invoice 2024-118</h1><span class="dim" id="iv-date">Issued 14 May 2024 · due in 30 days</span></div><span class="chip push" id="iv-state">Unpaid</span></div><hr>
      <div class="split" id="iv-parties" style="grid-template-columns:1fr 1fr"><div class="lined" id="iv-from"><h4>From</h4><p class="dim" style="margin:0">Okafor & Daughters Ltd<br>4 Canal Row, Leeds</p></div><div class="lined" id="iv-to"><h4>To</h4><p class="dim" style="margin:0">Brightwater Schools Trust<br>Accounts, Hull</p></div></div>
      <div class="flow" id="iv-lines" style="margin:18px 0;gap:8px"><div class="across" id="iv-l1"><span>Roof survey, two sites</span><span class="num push">£ 640.00</span></div><div class="across" id="iv-l2"><span id="iv-l2-t">Gutter repairs</span><span class="num push">£ 1,215.00</span></div><div class="across" id="iv-l3"><span>Travel</span><span class="num push" id="iv-l3-n">£ 48.60</span></div></div><hr>
      <div class="across"><strong>Total due</strong><strong class="num push" id="iv-total" style="font-size:1.4rem">£ 1,903.60</strong></div>
      <p class="dim" id="iv-terms" style="margin-top:14px">Payment by bank transfer. Late payments carry 2% a month.</p>
      <div class="across" id="iv-acts"><a class="btn" id="iv-send" href="#">Send reminder</a><a class="btn quiet" id="iv-pdf" href="#">Download PDF</a><a href="#" class="push" id="iv-void">Void invoice</a></div></div></main>`,
    [
      { selector: "#iv-no", name: "the invoice number heading", kind: ["text"] },
      { selector: "#iv-send", name: 'the "Send reminder" button', kind: ["text", "box", "item"] },
      { selector: "#iv-to", name: 'the "To" address box', kind: ["box", "item"] },
      { selector: "#iv-lines", name: "the list of invoice lines", kind: ["container"] },
      { selector: "#iv-terms", name: "the payment terms line", kind: ["text"] },
      { selector: "#iv-state", name: 'the "Unpaid" chip', kind: ["text", "box"] },
      { selector: "#iv-acts", name: "the row of buttons at the bottom", kind: ["container"] },
      { selector: "#iv-l2", name: 'the "Gutter repairs" line', kind: ["item"] },
      { selector: "#iv-total", name: "the total amount", kind: ["text"] },
      { selector: "#iv-from", name: 'the "From" address box', kind: ["box", "item"] },
    ],
  ),
  page(
    "event",
    "Event page",
    "--hot: #f59f00; --bg: #14161a; --fg: #f1f3f5; --card: #23272e; --edge: #4b5360; --dim: #aab2bd; --tint: #4a3b12;",
    `${bar("Low Tide Festival", ["Line-up", "Tickets", "Getting there"], "12 to 14 July")}
    <main><div class="box" id="ev-hero" style="padding:36px"><span class="chip" id="ev-tag">Three days by the sea</span><h1 id="ev-title" style="font-size:2.6rem;margin-top:10px">Music where the pier ends</h1><p id="ev-lead" style="max-width:560px">Forty acts on two stages, a night market and the last ferry home at one.</p><div class="across" id="ev-cta"><a class="btn" id="ev-buy" href="#" style="color:#14161a">Get tickets</a><a class="btn quiet" id="ev-prog" href="#">See the programme</a></div></div>
    <div class="across" id="ev-days" style="margin-top:20px;align-items:stretch;gap:16px">
      <div class="box" id="ev-fri" style="flex:1"><h2>Friday</h2><p class="dim">Doors at 17:00</p><div class="flow" id="ev-fri-acts" style="gap:6px"><span>Saltmarsh Choir</span><span id="ev-act2">The Lanterns</span><span>DJ Halyard</span></div></div>
      <div class="box" id="ev-sat" style="flex:1"><h2 id="ev-sat-h">Saturday</h2><p class="dim">Doors at 12:00</p><div class="flow" style="gap:6px"><span>Grey Seal Orchestra</span><span>Mina Fonseca</span><span>Night market till late</span></div></div>
      <div class="box" id="ev-sun" style="flex:1"><h2>Sunday</h2><p class="dim" id="ev-sun-d">Doors at 11:00</p><div class="flow" style="gap:6px"><span>Brass on the Beach</span><span>Closing set: Ebb</span></div><div class="lined" id="ev-note" style="margin-top:12px">Family tickets half price</div></div>
    </div></main>`,
    [
      { selector: "#ev-title", name: "the main headline", kind: ["text"] },
      { selector: "#ev-buy", name: 'the "Get tickets" button', kind: ["text", "box", "item"] },
      { selector: "#ev-sat", name: "the Saturday box", kind: ["box", "item"] },
      { selector: "#ev-days", name: "the row of the three day boxes", kind: ["container"] },
      { selector: "#ev-lead", name: "the paragraph under the headline", kind: ["text"] },
      { selector: "#ev-note", name: 'the "Family tickets half price" box', kind: ["text", "box"] },
      { selector: "#ev-fri-acts", name: "the list of Friday acts", kind: ["container"] },
      { selector: "#ev-act2", name: 'the act "The Lanterns"', kind: ["text", "item"] },
      { selector: "#ev-tag", name: 'the "Three days by the sea" chip', kind: ["text", "box"] },
      { selector: "#ev-fri", name: "the Friday box", kind: ["box", "item"] },
    ],
  ),
  page(
    "files",
    "File manager",
    "--hot: #7048e8; --tint: #e5dbff;",
    `${bar("Shelf", ["Files", "Shared", "Bin"], "3.2 GB of 15 GB")}
    <main><div class="across" id="fl-top" style="margin-bottom:14px"><h1 id="fl-path" style="margin:0">Projects / Harbour bridge</h1><a class="btn push" id="fl-up" href="#">Upload</a><a class="btn quiet" id="fl-new" href="#">New folder</a></div>
    <div class="split" style="grid-template-columns:1fr 260px"><div class="box flow" id="fl-list" style="gap:0;padding:8px 20px">
      <div class="across" id="fl-f1" style="padding:10px 0"><span class="icon"></span><span id="fl-f1-n">Survey photos</span><span class="dim push">Folder · 48 items</span></div>
      <div class="across" id="fl-f2" style="padding:10px 0;border-top:1px solid #d5dae0"><span class="icon"></span><span>load-calculations.xlsx</span><span class="dim num push" id="fl-f2-s">1.8 MB</span></div>
      <div class="across" id="fl-f3" style="padding:10px 0;border-top:1px solid #d5dae0"><span class="icon"></span><span>Tender, final.pdf</span><span class="chip" id="fl-f3-c">Shared</span><span class="dim num push">640 KB</span></div>
      <div class="across" id="fl-f4" style="padding:10px 0;border-top:1px solid #d5dae0"><span class="icon"></span><span>site-plan-rev4.dwg</span><span class="dim num push">12.4 MB</span></div>
    </div><div class="box" id="fl-info"><h2>Details</h2><p class="dim" id="fl-info-d">Select a file to see who can open it and when it last changed.</p><div class="lined" id="fl-quota"><h4>Storage</h4><span class="dim">21% used</span></div></div></div></main>`,
    [
      { selector: "#fl-path", name: "the folder path heading", kind: ["text"] },
      { selector: "#fl-up", name: 'the "Upload" button', kind: ["text", "box", "item"] },
      { selector: "#fl-info", name: 'the "Details" box', kind: ["box", "item"] },
      { selector: "#fl-top", name: "the row with the heading and the two buttons", kind: ["container"] },
      { selector: "#fl-info-d", name: 'the paragraph in the "Details" box', kind: ["text"] },
      { selector: "#fl-f3-c", name: 'the "Shared" chip', kind: ["text", "box", "item"] },
      { selector: "#fl-f2", name: 'the "load-calculations.xlsx" row', kind: ["box", "container", "item"] },
      { selector: "#fl-quota", name: 'the "Storage" box', kind: ["box"] },
      { selector: "#fl-f1-n", name: 'the name "Survey photos"', kind: ["text", "item"] },
    ],
  ),
  page(
    "wizard",
    "Setup wizard",
    "--hot: #c2255c; --bg: #fff5f7; --tint: #ffdeeb;",
    `<main style="width:640px;margin-top:48px"><div class="across" id="wz-steps" style="margin-bottom:18px;gap:14px"><span class="chip" id="wz-s1">1 Workspace</span><span class="chip" id="wz-s2" style="background:#c2255c;color:#fff">2 Team</span><span class="dim" id="wz-s3">3 Billing</span></div>
    <div class="box" id="wz-card"><h1 id="wz-title">Who is joining you?</h1><p class="dim" id="wz-help">Add people now or skip this and invite them later. Everyone starts as a member.</p>
      <div class="flow" id="wz-people"><div class="across lined" id="wz-p1"><span class="icon"></span><span id="wz-p1-n">kofi@example.org</span><span class="dim push">Member</span></div><div class="across lined" id="wz-p2"><span class="icon"></span><span>dilys@example.org</span><span class="dim push" id="wz-p2-r">Admin</span></div><div class="across lined" id="wz-add" style="border-style:dotted"><span class="dim">Add another email address</span></div></div>
      <div class="across" id="wz-nav" style="margin-top:20px"><a href="#" id="wz-back">Back</a><a class="btn quiet push" id="wz-skip" href="#">Skip for now</a><a class="btn" id="wz-next" href="#">Continue</a></div></div>
    <p class="dim" id="wz-foot" style="text-align:center;margin-top:16px">Step 2 of 3. Nothing is charged until you finish.</p></main>`,
    [
      { selector: "#wz-title", name: "the question heading", kind: ["text"] },
      { selector: "#wz-next", name: 'the "Continue" button', kind: ["text", "box", "item"] },
      { selector: "#wz-p2", name: 'the "dilys@example.org" row', kind: ["box", "item"] },
      { selector: "#wz-people", name: "the list of people", kind: ["container"] },
      { selector: "#wz-help", name: "the help text under the heading", kind: ["text"] },
      { selector: "#wz-s2", name: 'the "2 Team" step chip', kind: ["text", "box", "item"] },
      { selector: "#wz-nav", name: "the row of navigation buttons", kind: ["container"] },
      { selector: "#wz-card", name: "the main box", kind: ["box"] },
      { selector: "#wz-foot", name: "the line under the box", kind: ["text"] },
      { selector: "#wz-p1", name: 'the "kofi@example.org" row', kind: ["box", "item"] },
    ],
  ),
  page(
    "thread",
    "Comment thread",
    "--hot: #1c7ed6; --tint: #d0ebff;",
    `${bar("Commons", ["Topics", "Unanswered", "Members"], "Signed in as Rhea")}
    <main style="width:760px"><span class="chip" id="th-cat">Allotments</span><h1 id="th-title" style="margin-top:8px">Is it too late to sow broad beans?</h1><p class="dim" id="th-meta">Asked by Bram · 6 answers · 212 views</p>
    <div class="flow" id="th-posts" style="gap:14px">
      <div class="box" id="th-q"><p id="th-q-t">The frost came late this year and I missed the usual window. Is May worth a try or should I wait for autumn?</p><div class="across" id="th-q-acts"><a class="btn quiet" id="th-up" href="#">Useful · 14</a><a href="#" id="th-share">Share</a></div></div>
      <div class="box" id="th-a1" style="border-left:4px solid #1c7ed6"><div class="across" style="margin-bottom:8px"><span class="icon"></span><strong id="th-a1-who">Dilys</strong><span class="chip" id="th-a1-best">Accepted answer</span><span class="dim push">2 days ago</span></div><p id="th-a1-t">Sow now, but pick a quick variety and water well. You will get a smaller crop in August.</p></div>
      <div class="box" id="th-a2"><div class="across" style="margin-bottom:8px"><span class="icon"></span><strong>Chidi</strong><span class="dim push" id="th-a2-when">yesterday</span></div><p>Mine went in on the tenth of May last year and were fine. Blackfly is the bigger risk.</p></div>
    </div><div class="lined" id="th-reply" style="margin-top:16px;background:#fff"><span class="dim">Write an answer</span></div><div class="across" id="th-end" style="margin-top:10px"><a class="btn" id="th-post" href="#">Post answer</a><span class="dim" id="th-rule">Be kind. Say how you know.</span></div></main>`,
    [
      { selector: "#th-title", name: "the question title", kind: ["text"] },
      { selector: "#th-post", name: 'the "Post answer" button', kind: ["text", "box", "item"] },
      { selector: "#th-a2", name: "the answer by Chidi", kind: ["box", "item"] },
      { selector: "#th-posts", name: "the list of the question and its answers", kind: ["container"] },
      { selector: "#th-a1-t", name: "the text of the accepted answer", kind: ["text"] },
      { selector: "#th-a1-best", name: 'the "Accepted answer" chip', kind: ["text", "box", "item"] },
      { selector: "#th-q-acts", name: "the row of actions under the question", kind: ["container"] },
      { selector: "#th-reply", name: 'the "Write an answer" box', kind: ["box"] },
      { selector: "#th-meta", name: "the line under the title", kind: ["text"] },
      { selector: "#th-q", name: "the question box", kind: ["box", "item"] },
    ],
  ),
];
