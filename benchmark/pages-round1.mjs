// Round 1 pages: ten more, written after `pixsame snap` was changed in
// response to the pilot on `pages.mjs`. They have their own styles and their
// own kinds of page. `pixsame snap` was changed again after seeing its results
// on these, so they are development pages, not the final ones.
//
// Same shape as `pages.mjs`. A target's `kind` may also hold `container`: an
// element that lays out its children with a gap.

const BASE = `
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; font: 15px/1.6 Verdana, Geneva, sans-serif; color: var(--ink, #22262b); background: var(--paper, #f6f5f1); }
  a { color: var(--link, #7a3ff2); }
  h1 { font: 700 30px/1.25 Georgia, serif; margin: 0 0 10px; }
  h2 { font: 700 20px/1.3 Georgia, serif; margin: 0 0 8px; }
  h3 { font-size: 15px; margin: 0 0 4px; }
  p { margin: 0 0 10px; }
  ul { margin: 0; padding: 0; list-style: none; }
  .top { display: flex; align-items: center; gap: 18px; padding: 12px 28px; background: var(--top, #22262b); color: #fff; }
  .top a { color: #fff; text-decoration: none; font-size: 13px; }
  .logo { font: 700 17px Georgia, serif; margin-right: auto; }
  .shell { max-width: 1040px; margin: 0 auto; padding: 28px; }
  .cols { display: flex; gap: 24px; align-items: flex-start; }
  .grow { flex: 1; min-width: 0; }
  .panel { padding: 16px 18px; background: var(--panel, #fff); border: 1px solid var(--line, #d9d6cc); border-radius: 4px; margin-bottom: 16px; }
  .stack { display: flex; flex-direction: column; gap: 10px; }
  .line { display: flex; gap: 12px; align-items: center; }
  .tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
  .pill { display: inline-block; padding: 1px 9px; border-radius: 3px; background: var(--pill, #ece4ff); color: var(--pilltext, #4a1fb8); font-size: 12px; }
  .small { font-size: 12px; color: var(--soft, #6b6f76); }
  .action { display: inline-block; padding: 8px 16px; border: 2px solid var(--link, #7a3ff2); border-radius: 20px; background: var(--link, #7a3ff2); color: #fff; font-size: 14px; text-decoration: none; }
  .action.plain { background: transparent; color: var(--link, #7a3ff2); }
  .field { display: block; width: 100%; padding: 8px 10px; border: 1px solid #a9a69c; border-radius: 3px; font: inherit; background: #fff; }
  .cap { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--soft, #6b6f76); margin-bottom: 3px; }
  .dot { width: 34px; height: 34px; border-radius: 50%; background: var(--link, #7a3ff2); flex: none; }
  .thumb { width: 100%; height: 90px; border-radius: 4px; background: var(--thumb, #cfd8e3); margin-bottom: 8px; }
  .rule { border: 0; border-top: 1px solid var(--line, #d9d6cc); margin: 14px 0; }
  .end { margin-left: auto; }
  .note { padding: 10px 14px; border-left: 4px solid var(--link, #7a3ff2); background: var(--panel, #fff); margin-bottom: 16px; }
  .foot { padding: 18px 28px; font-size: 12px; color: var(--soft, #6b6f76); }
`;

const top = (logo, links) =>
  `<div class="top"><span class="logo">${logo}</span>${links.map((l) => `<a href="#">${l}</a>`).join("")}</div>`;

const page = (id, title, vars, body, targets) => ({
  id,
  title,
  targets,
  html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>${BASE}\n  :root { ${vars} }</style></head><body>${body}</body></html>`,
});

export const PAGES = [
  page(
    "blog",
    "Blog index",
    "--link: #b3401a;",
    `${top("Field Notes", ["Essays", "Archive", "About"])}
    <div class="shell"><h1 id="title">Notes from a small workshop</h1>
    <p id="intro" style="max-width:620px">Short pieces on tools, wood and the mistakes worth keeping. A new one most Sundays.</p>
    <div class="cols" style="margin-top:20px"><div class="grow stack" id="posts">
      <div class="panel" id="p1" style="margin:0"><h2>Sharpening is half the work</h2><p class="small">12 May · 6 min read</p><p>A dull chisel hides every other problem. Start there.</p><a href="#" id="more1">Read the essay</a></div>
      <div class="panel" id="p2" style="margin:0"><h2>What the offcuts bin teaches</h2><p class="small">5 May · 4 min read</p><p>Keep the failures where you can see them for a month.</p><a href="#">Read the essay</a></div>
      <div class="panel" id="p3" style="margin:0"><h2>Glue is not a plan</h2><p class="small">28 April · 8 min read</p><p>Joints that hold without it hold better with it.</p><a href="#">Read the essay</a></div>
    </div><div style="width:240px;flex:none"><div class="panel" id="about"><h3>About</h3><p class="small">Written by Mara Lindqvist from a shed in Uppsala.</p><a class="action plain" id="sub" href="#">Subscribe</a></div>
    <div class="panel"><h3>Topics</h3><div class="line" id="topics" style="flex-wrap:wrap;gap:6px"><span class="pill">tools</span><span class="pill">joinery</span><span class="pill">finishing</span><span class="pill">mistakes</span></div></div></div></div></div>
    <div class="foot">Field Notes. No tracking, no comments.</div>`,
    [
      { selector: "#title", name: "the page heading", kind: ["text"] },
      {
        selector: "#p2",
        name: 'the "What the offcuts bin teaches" post card',
        kind: ["box"],
      },
      {
        selector: "#sub",
        name: 'the "Subscribe" button',
        kind: ["text", "box"],
      },
      {
        selector: "#posts",
        name: "the list of post cards",
        kind: ["container"],
      },
      {
        selector: "#intro",
        name: "the introduction under the heading",
        kind: ["text"],
      },
      {
        selector: "#topics",
        name: "the row of topic tags",
        kind: ["container"],
      },
      {
        selector: "#about",
        name: 'the "About" box in the sidebar',
        kind: ["box"],
      },
    ],
  ),
  page(
    "checkout",
    "Checkout",
    "--link: #0d6e6e; --paper: #fbfbfa;",
    `${top("Brass & Reed", ["Shop", "Repairs", "Basket (2)"])}
    <div class="shell"><h1>Checkout</h1><div class="line" id="steps" style="margin-bottom:18px"><span class="pill" id="s1">1 Address</span><span class="pill">2 Delivery</span><span class="small">3 Payment</span></div>
    <div class="cols"><div class="grow"><div class="panel" id="addr"><h2>Delivery address</h2>
      <div class="cols" id="names" style="gap:12px"><div class="grow"><span class="cap">First name</span><input class="field" value="Tomasz"></div><div class="grow"><span class="cap">Last name</span><input class="field" value="Brandt"></div></div>
      <div style="margin-top:10px"><span class="cap" id="street-cap">Street</span><input class="field" id="street" value="Hafenstrasse 14"></div>
      <div class="cols" style="gap:12px;margin-top:10px"><div style="width:120px"><span class="cap">Postcode</span><input class="field" value="20457"></div><div class="grow"><span class="cap">City</span><input class="field" value="Hamburg"></div></div></div>
      <div class="note" id="hint">Orders placed before 14:00 leave the workshop the same day.</div>
      <a class="action" id="next" href="#">Continue to delivery</a> <a href="#" id="back" style="margin-left:14px">Back to basket</a></div>
    <div style="width:300px;flex:none"><div class="panel" id="order"><h2>Your order</h2><div class="stack" id="items"><div class="line"><span>Alto sax reeds, box of 10</span><span class="end">€ 28.00</span></div><div class="line"><span>Cork grease</span><span class="end">€ 4.50</span></div></div><hr class="rule"><div class="line"><strong>Total</strong><strong class="end" id="total">€ 32.50</strong></div></div></div></div></div>`,
    [
      {
        selector: "#next",
        name: 'the "Continue to delivery" button',
        kind: ["text", "box"],
      },
      {
        selector: "#order",
        name: 'the "Your order" box',
        kind: ["box"],
      },
      { selector: "#total", name: "the total amount", kind: ["text"] },
      {
        selector: "#items",
        name: "the list of order lines",
        kind: ["container"],
      },
      {
        selector: "#hint",
        name: "the note about same-day dispatch",
        kind: ["text", "box"],
      },
      {
        selector: "#names",
        name: "the row with the first and last name fields",
        kind: ["container"],
      },
      { selector: "#s1", name: 'the "1 Address" step', kind: ["text", "box"] },
      { selector: "#back", name: 'the "Back to basket" link', kind: ["text"] },
    ],
  ),
  page(
    "board",
    "Task board",
    "--link: #2456c7; --paper: #eef1f5; --line: #c9d0da;",
    `${top("Slate", ["Boards", "Calendar", "People"])}
    <div class="shell" style="max-width:1160px"><div class="line" style="margin-bottom:16px"><h1 style="margin:0" id="name">Website relaunch</h1><span class="pill" id="sprint">Sprint 14</span><a class="action end" id="add" href="#">Add task</a></div>
    <div class="cols" id="lanes" style="gap:16px">
      <div class="grow"><h3 id="h-todo">To do · 3</h3><div class="stack" id="todo"><div class="panel" id="t1" style="margin:0"><p>Write the pricing copy</p><span class="small">Due Friday · Ines</span></div><div class="panel" style="margin:0"><p>Pick three customer quotes</p><span class="small">No date · Omar</span></div><div class="panel" style="margin:0"><p>Redirect map for old URLs</p><span class="small">Due 3 June · Ines</span></div></div></div>
      <div class="grow"><h3>In progress · 2</h3><div class="stack"><div class="panel" id="t4" style="margin:0"><p>Build the header component</p><span class="small" id="t4-meta">Due today · Kofi</span></div><div class="panel" style="margin:0"><p>Image compression pass</p><span class="small">Due Monday · Omar</span></div></div></div>
      <div class="grow"><h3>Done · 2</h3><div class="stack"><div class="panel" style="margin:0"><p id="t6-text">Agree on the sitemap</p><span class="small">Closed 20 May</span></div><div class="panel" id="t7" style="margin:0"><p>Set up the staging server</p><span class="small">Closed 18 May</span></div></div></div>
    </div></div>`,
    [
      { selector: "#name", name: "the board title", kind: ["text"] },
      {
        selector: "#t4",
        name: 'the "Build the header component" task card',
        kind: ["box"],
      },
      { selector: "#add", name: 'the "Add task" button', kind: ["text", "box"] },
      {
        selector: "#todo",
        name: 'the stack of cards in the "To do" column',
        kind: ["container"],
      },
      { selector: "#sprint", name: 'the "Sprint 14" tag', kind: ["text", "box"] },
      { selector: "#lanes", name: "the row of three columns", kind: ["container"] },
      {
        selector: "#t6-text",
        name: 'the text "Agree on the sitemap"',
        kind: ["text"],
      },
      {
        selector: "#t1",
        name: 'the "Write the pricing copy" task card',
        kind: ["box"],
      },
    ],
  ),
  page(
    "inbox",
    "Inbox",
    "--link: #a3246b; --paper: #fff; --panel: #faf7f9;",
    `${top("Pigeon", ["Inbox", "Sent", "Drafts", "Settings"])}
    <div class="shell"><div class="cols"><div style="width:320px;flex:none"><div class="line" style="margin-bottom:10px"><h2 style="margin:0">Inbox</h2><span class="pill end" id="unread">3 unread</span></div>
      <ul class="stack" id="list" style="gap:8px">
        <li class="panel" id="m1" style="margin:0"><div class="line"><strong id="m1-from">Hanna Okafor</strong><span class="small end">09:12</span></div><span class="small">Re: Venue for the autumn meetup</span></li>
        <li class="panel" id="m2" style="margin:0"><div class="line"><strong>Billing</strong><span class="small end">Tue</span></div><span class="small">Your receipt for May</span></li>
        <li class="panel" style="margin:0"><div class="line"><strong>Jules Perrin</strong><span class="small end">Mon</span></div><span class="small">Slides, second draft</span></li>
        <li class="panel" style="margin:0"><div class="line"><strong>Library</strong><span class="small end">12 May</span></div><span class="small">Two items are due back</span></li>
      </ul></div>
    <div class="grow"><div class="panel" id="msg"><h2 id="subject">Re: Venue for the autumn meetup</h2><div class="line" id="sender" style="margin-bottom:12px"><span class="dot"></span><div><strong>Hanna Okafor</strong><br><span class="small">to you, Jules</span></div></div>
      <p id="body1">The old print hall can take eighty people and has the projector we need. They want an answer by the end of the week.</p><p>I would say yes. The other place has no lift.</p>
      <div class="line" id="acts" style="margin-top:14px"><a class="action" id="reply" href="#">Reply</a><a class="action plain" href="#">Forward</a><a href="#" class="end" id="archive">Archive</a></div></div></div></div></div>`,
    [
      { selector: "#subject", name: "the subject of the open message", kind: ["text"] },
      { selector: "#reply", name: 'the "Reply" button', kind: ["text", "box"] },
      {
        selector: "#m2",
        name: 'the "Billing" message in the list',
        kind: ["box"],
      },
      { selector: "#list", name: "the list of messages", kind: ["container"] },
      {
        selector: "#body1",
        name: "the first paragraph of the open message",
        kind: ["text"],
      },
      { selector: "#unread", name: 'the "3 unread" badge', kind: ["text", "box"] },
      {
        selector: "#acts",
        name: "the row of buttons under the message",
        kind: ["container"],
      },
      { selector: "#msg", name: "the open message box", kind: ["box"] },
    ],
  ),
  page(
    "schedule",
    "Week schedule",
    "--link: #1f7a3a; --paper: #f3f6f1; --pill: #dff3e4; --pilltext: #14572a;",
    `${top("Greenhouse Rota", ["This week", "Swaps", "Team"])}
    <div class="shell"><div class="line" style="margin-bottom:14px"><h1 style="margin:0" id="week">Week 22, 27 May to 2 June</h1><a class="action plain end" id="prev" href="#">Previous</a><a class="action" id="nextw" href="#">Next week</a></div>
    <div class="note" id="alert">Two shifts on Saturday still need cover.</div>
    <div class="tiles" id="days">
      <div class="panel" id="mon"><h3>Monday</h3><p class="small">Watering</p><span class="pill">Asha</span></div>
      <div class="panel" id="tue"><h3 id="tue-h">Tuesday</h3><p class="small">Seed trays</p><span class="pill">Bram</span></div>
      <div class="panel"><h3>Wednesday</h3><p class="small">Market stall</p><span class="pill" id="wed-who">Asha, Dilys</span></div>
      <div class="panel"><h3>Thursday</h3><p class="small">Compost turn</p><span class="pill">Chidi</span></div>
      <div class="panel"><h3>Friday</h3><p class="small">Watering</p><span class="pill">Bram</span></div>
      <div class="panel" id="sat"><h3>Saturday</h3><p class="small" id="sat-task">Open day, two shifts</p><span class="small">Nobody yet</span></div>
      <div class="panel"><h3>Sunday</h3><p class="small">Closed</p></div>
    </div><p class="small" id="legend" style="margin-top:6px">Swaps need a day's notice. Ask Dilys for the keys.</p></div>`,
    [
      { selector: "#week", name: "the week heading", kind: ["text"] },
      { selector: "#tue", name: "the Tuesday box", kind: ["box"] },
      { selector: "#nextw", name: 'the "Next week" button', kind: ["text", "box"] },
      { selector: "#days", name: "the grid of days", kind: ["container"] },
      {
        selector: "#alert",
        name: "the notice about Saturday shifts",
        kind: ["text", "box"],
      },
      {
        selector: "#wed-who",
        name: 'the "Asha, Dilys" tag on Wednesday',
        kind: ["text", "box"],
      },
      { selector: "#legend", name: "the line of small print under the grid", kind: ["text"] },
      { selector: "#sat", name: "the Saturday box", kind: ["box"] },
    ],
  ),
  page(
    "login",
    "Sign in",
    "--link: #5b3fd1; --paper: #1d1b26; --ink: #ecebf3; --panel: #2a2738; --line: #474359; --soft: #a5a2b8;",
    `<div class="shell" style="max-width:420px;padding-top:70px"><div class="logo" id="mark" style="font-size:24px;margin-bottom:18px">Nightjar</div>
    <div class="panel" id="card"><h1 id="hello" style="font-size:24px">Welcome back</h1><p class="small" id="sub">Sign in to pick up where you left off.</p>
      <div class="stack" id="fields" style="margin:14px 0"><div><span class="cap">Email</span><input class="field" id="email" value="rhea@example.org"></div><div><span class="cap" id="pw-cap">Password</span><input class="field" type="password" value="hunter2hunter2"></div></div>
      <div class="line" id="row"><a class="action" id="go" href="#">Sign in</a><a href="#" id="forgot" class="end" style="color:#b9a8ff">Forgot password?</a></div></div>
    <div class="note" id="status" style="color:#22262b;background:#f1eefc">Signing in with a passkey is now available.</div>
    <p class="small" id="new" style="text-align:center">New here? <a href="#" style="color:#b9a8ff">Create an account</a></p></div>`,
    [
      { selector: "#hello", name: 'the "Welcome back" heading', kind: ["text"] },
      { selector: "#go", name: 'the "Sign in" button', kind: ["text", "box"] },
      { selector: "#card", name: "the sign-in box", kind: ["box"] },
      {
        selector: "#fields",
        name: "the stack of the two form fields",
        kind: ["container"],
      },
      { selector: "#sub", name: "the line under the heading", kind: ["text"] },
      {
        selector: "#status",
        name: "the notice about passkeys",
        kind: ["text", "box"],
      },
      { selector: "#email", name: "the email field", kind: ["box"] },
      { selector: "#forgot", name: 'the "Forgot password?" link', kind: ["text"] },
    ],
  ),
  page(
    "product",
    "Product page",
    "--link: #c2410c; --thumb: #e7d7c5;",
    `${top("Kiln & Clay", ["Mugs", "Bowls", "Seconds", "Basket"])}
    <div class="shell"><p class="small" id="crumbs">Mugs / Stoneware / Speckled mug</p><div class="cols" style="gap:32px"><div style="width:420px;flex:none"><div class="thumb" id="photo" style="height:300px"></div><div class="line" id="shots" style="gap:8px"><div class="thumb" style="width:80px;height:60px;margin:0"></div><div class="thumb" style="width:80px;height:60px;margin:0"></div><div class="thumb" style="width:80px;height:60px;margin:0"></div></div></div>
    <div class="grow"><h1 id="pname">Speckled stoneware mug</h1><div class="line" style="margin-bottom:10px"><strong id="price" style="font-size:22px">£ 24.00</strong><span class="pill" id="stock">In stock</span></div>
      <p id="desc">Thrown by hand and fired twice. Holds 350 ml and sits well in the hand. No two are quite alike.</p>
      <ul class="stack" id="specs" style="gap:4px;margin-bottom:16px"><li>Dishwasher safe</li><li>Lead-free glaze</li><li id="spec3">Made in Stoke-on-Trent</li></ul>
      <div class="line" id="buy"><a class="action" id="addb" href="#">Add to basket</a><a class="action plain" id="wish" href="#">Save for later</a></div>
      <div class="panel" id="ship" style="margin-top:18px"><h3>Delivery</h3><p class="small" style="margin:0">Free over £ 40. Sent in recycled card within two working days.</p></div></div></div></div>`,
    [
      { selector: "#pname", name: "the product name", kind: ["text"] },
      {
        selector: "#addb",
        name: 'the "Add to basket" button',
        kind: ["text", "box"],
      },
      { selector: "#ship", name: 'the "Delivery" box', kind: ["box"] },
      { selector: "#specs", name: "the list of three product facts", kind: ["container"] },
      { selector: "#desc", name: "the product description", kind: ["text"] },
      { selector: "#stock", name: 'the "In stock" tag', kind: ["text", "box"] },
      { selector: "#buy", name: "the row of the two buttons", kind: ["container"] },
      { selector: "#photo", name: "the large product picture", kind: ["box"] },
      { selector: "#price", name: "the price", kind: ["text"] },
    ],
  ),
  page(
    "team",
    "Team directory",
    "--link: #0e7490; --paper: #f4f7f8;",
    `${top("Harbour Studio", ["Work", "Team", "Contact"])}
    <div class="shell"><h1 id="heading">The people you will work with</h1><p id="lede" style="max-width:600px">Eleven of us, in two cities. Here are the ones you will hear from first.</p>
    <div class="tiles" id="people" style="grid-template-columns:repeat(3,1fr);margin-top:18px">
      <div class="panel" id="c1"><div class="line"><span class="dot"></span><div><h3 id="c1-name">Noor Haddad</h3><span class="small">Design lead</span></div></div><p class="small" style="margin:10px 0 0">Asks the awkward question early.</p></div>
      <div class="panel" id="c2"><div class="line"><span class="dot" id="c2-dot"></span><div><h3>Piotr Zielinski</h3><span class="small" id="c2-role">Engineering</span></div></div><p class="small" style="margin:10px 0 0">Keeps the build under a minute.</p></div>
      <div class="panel" id="c3"><div class="line"><span class="dot"></span><div><h3>Ama Boateng</h3><span class="small">Research</span></div></div><p class="small" style="margin:10px 0 0">Has talked to more users than all of us.</p></div>
      <div class="panel"><div class="line"><span class="dot"></span><div><h3>Leif Nyberg</h3><span class="small">Delivery</span></div></div><p class="small" style="margin:10px 0 0">Your first call when dates move.</p></div>
      <div class="panel"><div class="line"><span class="dot"></span><div><h3>Sun-hee Park</h3><span class="small">Content</span></div></div><p class="small" style="margin:10px 0 0">Cuts every sentence by a third.</p></div>
      <div class="panel" id="c6"><h3>You?</h3><p class="small">We hire twice a year.</p><a class="action plain" id="jobs" href="#">See open roles</a></div>
    </div></div><div class="foot" id="foot">Harbour Studio, Rotterdam and Leeds.</div>`,
    [
      { selector: "#heading", name: "the page heading", kind: ["text"] },
      { selector: "#c2", name: "the card of Piotr Zielinski", kind: ["box"] },
      { selector: "#jobs", name: 'the "See open roles" button', kind: ["text", "box"] },
      { selector: "#people", name: "the grid of people", kind: ["container"] },
      { selector: "#lede", name: "the paragraph under the heading", kind: ["text"] },
      { selector: "#c1-name", name: 'the name "Noor Haddad"', kind: ["text"] },
      { selector: "#c6", name: 'the "You?" card', kind: ["box"] },
      { selector: "#foot", name: "the footer line", kind: ["text"] },
    ],
  ),
  page(
    "changelog",
    "Changelog",
    "--link: #6d28d9; --paper: #fdfcfb;",
    `${top("Quill", ["Docs", "Changelog", "Status"])}
    <div class="shell" style="max-width:820px"><h1 id="cl-title">What changed</h1><p class="small" id="cl-sub">Every release, newest first. Breaking changes are marked.</p>
    <div class="stack" id="releases" style="gap:18px;margin-top:18px">
      <div class="panel" id="r1" style="margin:0"><div class="line"><h2 style="margin:0" id="r1-v">2.4.0</h2><span class="pill" id="r1-tag">Latest</span><span class="small end">21 May</span></div><ul class="stack" id="r1-list" style="gap:4px;margin-top:10px"><li>Tables can be pasted from a spreadsheet.</li><li id="r1-b">Export keeps footnotes in order.</li><li>Search no longer skips headings.</li></ul></div>
      <div class="panel" id="r2" style="margin:0"><div class="line"><h2 style="margin:0">2.3.2</h2><span class="small end">2 May</span></div><ul class="stack" style="gap:4px;margin-top:10px"><li>Fixed a crash when a note had no title.</li><li>Faster start on large notebooks.</li></ul></div>
      <div class="panel" id="r3" style="margin:0"><div class="line"><h2 style="margin:0">2.3.0</h2><span class="pill" id="r3-tag" style="background:#fde2e2;color:#9b1c1c">Breaking</span><span class="small end">11 April</span></div><p id="r3-note" style="margin:10px 0 0">The sync format changed. Update every device before you open a shared notebook.</p></div>
    </div><p style="margin-top:18px"><a class="action plain" id="older" href="#">Older releases</a></p></div>`,
    [
      { selector: "#cl-title", name: "the page heading", kind: ["text"] },
      { selector: "#r2", name: "the box of release 2.3.2", kind: ["box"] },
      { selector: "#older", name: 'the "Older releases" button', kind: ["text", "box"] },
      { selector: "#releases", name: "the list of release boxes", kind: ["container"] },
      {
        selector: "#r3-note",
        name: "the paragraph in release 2.3.0",
        kind: ["text"],
      },
      { selector: "#r1-tag", name: 'the "Latest" tag', kind: ["text", "box"] },
      {
        selector: "#r1-list",
        name: "the list of changes in release 2.4.0",
        kind: ["container"],
      },
      { selector: "#r1", name: "the box of release 2.4.0", kind: ["box"] },
      { selector: "#cl-sub", name: "the line under the heading", kind: ["text"] },
    ],
  ),
  page(
    "results",
    "Search results",
    "--link: #1d4ed8; --paper: #fff; --panel: #f7f8fa;",
    `${top("Atlas Library", ["Catalogue", "My loans", "Help"])}
    <div class="shell"><div class="line" id="bar" style="margin-bottom:16px"><input class="field" id="q" value="tidal energy" style="max-width:440px"><a class="action" id="find" href="#">Search</a><span class="small end" id="hits">42 results</span></div>
    <div class="cols"><div style="width:210px;flex:none"><div class="panel" id="filters"><h3>Format</h3><ul class="stack" id="formats" style="gap:4px"><li>Book (31)</li><li id="f-art">Article (9)</li><li>Map (2)</li></ul><hr class="rule"><h3>Year</h3><p class="small" style="margin:0">1990 to 2024</p></div></div>
    <div class="grow stack" id="found" style="gap:14px">
      <div class="panel" id="h1" style="margin:0"><h2 id="h1-t">Tidal power: a history of the Severn schemes</h2><p class="small">R. Castellan · 2011 · Book</p><p style="margin:0">Why a barrage was proposed nine times and built none.</p></div>
      <div class="panel" id="h2" style="margin:0"><h2>Energy from the sea</h2><p class="small" id="h2-meta">M. Adeyemi, L. Ross · 2019 · Book</p><p style="margin:0">An engineer's survey of wave, tidal and thermal methods.</p><span class="pill" id="h2-avail" style="margin-top:8px">Available now</span></div>
      <div class="panel" id="h3" style="margin:0"><h2>Tidal stream turbines in shallow channels</h2><p class="small">Journal of Marine Engineering · 2022 · Article</p><p style="margin:0" id="h3-sum">Field measurements from two sites in Orkney.</p></div>
    </div></div></div>`,
    [
      {
        selector: "#h1-t",
        name: "the title of the first result",
        kind: ["text"],
      },
      { selector: "#h2", name: 'the "Energy from the sea" result', kind: ["box"] },
      { selector: "#find", name: 'the "Search" button', kind: ["text", "box"] },
      { selector: "#found", name: "the list of results", kind: ["container"] },
      { selector: "#hits", name: 'the "42 results" count', kind: ["text"] },
      { selector: "#filters", name: "the filter box on the left", kind: ["box"] },
      {
        selector: "#h2-avail",
        name: 'the "Available now" tag',
        kind: ["text", "box"],
      },
      { selector: "#bar", name: "the search row at the top", kind: ["container"] },
      {
        selector: "#h3-sum",
        name: "the summary of the third result",
        kind: ["text"],
      },
    ],
  ),
];
