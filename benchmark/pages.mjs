// The pages of the benchmark: ten small, self-contained pages of the kinds a
// coding agent edits (a landing page, a pricing table, a form, a dashboard…).
// No network, no web fonts, no scripts: a page renders the same every time.
//
// Each page names its `targets`: the elements a change is applied to, with the
// words a person would use for them. `kind` says what can sensibly change on
// it: `text` (it has text of its own) and/or `box` (it draws a box).

const BASE = `
  * { box-sizing: border-box; }
  body { margin: 0; font: 16px/1.5 Arial, Helvetica, sans-serif; color: #1c1c1e; background: var(--bg, #fff); }
  a { color: var(--accent, #0b57d0); text-decoration: none; }
  h1 { font-size: 34px; line-height: 1.2; margin: 0 0 12px; }
  h2 { font-size: 22px; line-height: 1.3; margin: 0 0 8px; }
  h3 { font-size: 17px; margin: 0 0 6px; }
  p { margin: 0 0 12px; }
  .nav { display: flex; align-items: center; gap: 24px; padding: 14px 32px; border-bottom: 1px solid #dcdce0; background: #fff; }
  .brand { font-weight: 700; font-size: 18px; margin-right: auto; }
  .wrap { max-width: 1080px; margin: 0 auto; padding: 32px; }
  .btn { display: inline-block; padding: 10px 18px; border-radius: 6px; border: 1px solid var(--accent, #0b57d0); background: var(--accent, #0b57d0); color: #fff; font-size: 15px; font-weight: 700; }
  .btn.ghost { background: transparent; color: var(--accent, #0b57d0); }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .card { padding: 18px; border: 1px solid #dcdce0; border-radius: 10px; background: #fff; }
  .muted { color: #5f6368; font-size: 14px; }
  .tag { display: inline-block; padding: 2px 8px; border-radius: 12px; background: #e8f0fe; color: #174ea6; font-size: 12px; font-weight: 700; }
  .row { display: flex; gap: 20px; align-items: flex-start; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e3e3e8; font-size: 14px; }
  th { background: #f4f4f7; }
  label { display: block; font-size: 14px; font-weight: 700; margin-bottom: 4px; }
  input, select, textarea { width: 100%; padding: 9px 10px; border: 1px solid #b9b9c0; border-radius: 6px; font: inherit; margin-bottom: 14px; background: #fff; }
  .side { width: 220px; flex: none; padding: 16px; background: #f4f4f7; border-radius: 10px; }
  .side a { display: block; padding: 6px 0; }
  .main { flex: 1; min-width: 0; }
  .footer { margin-top: 32px; padding: 20px 32px; border-top: 1px solid #dcdce0; color: #5f6368; font-size: 13px; }
  .stat { font-size: 30px; font-weight: 700; }
  .bar { height: 10px; border-radius: 5px; background: #e3e3e8; overflow: hidden; }
  .bar > i { display: block; height: 100%; background: var(--accent, #0b57d0); }
  .avatar { width: 56px; height: 56px; border-radius: 50%; background: var(--accent, #0b57d0); flex: none; }
  .banner { padding: 12px 16px; border-radius: 8px; background: #fef7e0; border: 1px solid #f1d58a; margin-bottom: 20px; }
`;

const nav = (brand, links) =>
  `<div class="nav"><span class="brand">${brand}</span>${links.map((l) => `<a href="#">${l}</a>`).join("")}</div>`;

const page = (id, title, vars, body, targets) => ({
  id,
  title,
  targets,
  html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>${BASE}\n  :root { ${vars} }</style></head><body>${body}</body></html>`,
});

export const PAGES = [
  page(
    "landing",
    "Landing page",
    "--accent: #0b57d0;",
    `${nav("Northwind", ["Product", "Pricing", "Docs", "Sign in"])}
    <div class="wrap"><h1 id="headline">Ship invoices in minutes, not days</h1>
    <p class="lead" style="font-size:18px;max-width:640px">Northwind turns a spreadsheet of orders into branded invoices and chases the late ones for you.</p>
    <p><a class="btn" id="cta" href="#">Start free trial</a> <a class="btn ghost" id="demo" href="#">Watch demo</a></p>
    <div class="grid" style="margin-top:28px">
      <div class="card" id="f1"><h3>Import anything</h3><p class="muted">CSV, Excel or a pasted table. Columns are matched for you.</p></div>
      <div class="card" id="f2"><h3>Get paid sooner</h3><p class="muted">Reminders go out on your schedule, in your words.</p></div>
      <div class="card" id="f3"><h3>Close the month</h3><p class="muted">Export to your ledger with one click.</p></div>
    </div></div><div class="footer">© Northwind Trading. Made for small teams.</div>`,
    [
      { selector: "#headline", name: "the main headline", kind: ["text"] },
      {
        selector: "#cta",
        name: 'the "Start free trial" button',
        kind: ["text", "box"],
      },
      {
        selector: "#f2",
        name: 'the "Get paid sooner" feature card',
        kind: ["box"],
      },
      {
        selector: ".lead",
        name: "the paragraph under the headline",
        kind: ["text"],
      },
      {
        selector: "#demo",
        name: 'the "Watch demo" button',
        kind: ["text", "box"],
      },
    ],
  ),
  page(
    "pricing",
    "Pricing",
    "--accent: #0a7d55;",
    `${nav("Lumen", ["Features", "Pricing", "Support"])}
    <div class="wrap"><h1>Simple pricing</h1><p class="muted" id="sub">Every plan includes unlimited projects. Cancel any time.</p>
    <div class="grid">
      <div class="card" id="plan-free"><h2>Free</h2><p class="stat">$0</p><p class="muted">For trying things out</p><a class="btn ghost" href="#">Choose Free</a></div>
      <div class="card" id="plan-team"><span class="tag" id="popular">Most popular</span><h2>Team</h2><p class="stat" id="team-price">$29</p><p class="muted">Per member, per month</p><a class="btn" id="choose-team" href="#">Choose Team</a></div>
      <div class="card" id="plan-ent"><h2>Enterprise</h2><p class="stat">Custom</p><p class="muted">Single sign-on and audit logs</p><a class="btn ghost" href="#">Contact sales</a></div>
    </div></div><div class="footer">Prices exclude tax.</div>`,
    [
      {
        selector: "#team-price",
        name: 'the "$29" price of the Team plan',
        kind: ["text"],
      },
      { selector: "#plan-team", name: "the Team plan card", kind: ["box"] },
      {
        selector: "#choose-team",
        name: 'the "Choose Team" button',
        kind: ["text", "box"],
      },
      {
        selector: "#popular",
        name: 'the "Most popular" badge',
        kind: ["text", "box"],
      },
      {
        selector: "#sub",
        name: 'the line under the "Simple pricing" heading',
        kind: ["text"],
      },
    ],
  ),
  page(
    "products",
    "Product list",
    "--accent: #b3470e; --bg: #fbfaf8;",
    `${nav("Fernhill Coffee", ["Beans", "Gear", "Subscriptions", "Cart (2)"])}
    <div class="wrap"><h1>Whole bean coffee</h1>
    <div class="grid">
      ${[
        ["p1", "Ethiopia Guji", "Blueberry, jasmine", "$18.00"],
        ["p2", "Colombia Huila", "Caramel, red apple", "$16.50"],
        ["p3", "Kenya Nyeri", "Blackcurrant, lime", "$19.00"],
        ["p4", "Brazil Cerrado", "Hazelnut, cocoa", "$14.00"],
        ["p5", "Guatemala Antigua", "Orange, toffee", "$17.00"],
        ["p6", "Decaf Sugarcane", "Brown sugar, plum", "$16.00"],
      ]
        .map(
          ([id, n, d, p]) =>
            `<div class="card" id="${id}"><div style="height:90px;border-radius:8px;background:#e9dccb;margin-bottom:12px"></div><h3>${n}</h3><p class="muted">${d}</p><p><b class="price">${p}</b></p><a class="btn" href="#">Add to cart</a></div>`,
        )
        .join("")}
    </div></div>`,
    [
      {
        selector: "#p2 h3",
        name: 'the "Colombia Huila" product name',
        kind: ["text"],
      },
      {
        selector: "#p3",
        name: 'the "Kenya Nyeri" product card',
        kind: ["box"],
      },
      {
        selector: "#p1 .btn",
        name: 'the "Add to cart" button of Ethiopia Guji',
        kind: ["text", "box"],
      },
      {
        selector: "#p5 .price",
        name: 'the "$17.00" price of Guatemala Antigua',
        kind: ["text"],
      },
      {
        selector: "#p4 .muted",
        name: 'the "Hazelnut, cocoa" tasting notes',
        kind: ["text"],
      },
    ],
  ),
  page(
    "article",
    "Article",
    "--accent: #7a3cc2;",
    `${nav("The Fieldnotes", ["Essays", "Archive", "About"])}
    <div class="wrap" style="max-width:760px"><span class="tag" id="topic">Engineering</span>
    <h1 id="title">Why our deploys got boring</h1>
    <p class="muted" id="byline">By Dana Okafor · 6 minute read</p>
    <p id="intro">A year ago every release was an event. Someone watched the graphs, someone else kept a rollback ready, and nobody planned anything for the afternoon.</p>
    <h2>Small batches</h2>
    <p>We stopped shipping on Thursdays and started shipping whenever a change was ready. The average release went from forty commits to three.</p>
    <blockquote id="quote" style="margin:0 0 12px;padding:12px 16px;border-left:4px solid #7a3cc2;background:#f5effc">The safest release is the one small enough to read.</blockquote>
    <h2>What we kept</h2>
    <p>The checklist stayed. It is shorter now, and most of it runs by itself.</p>
    <p><a class="btn" id="subscribe" href="#">Subscribe</a></p></div>`,
    [
      { selector: "#title", name: "the article title", kind: ["text"] },
      { selector: "#quote", name: "the block quote", kind: ["text", "box"] },
      { selector: "#intro", name: "the first paragraph", kind: ["text"] },
      {
        selector: "#subscribe",
        name: 'the "Subscribe" button',
        kind: ["text", "box"],
      },
      {
        selector: "#topic",
        name: 'the "Engineering" badge above the title',
        kind: ["text", "box"],
      },
    ],
  ),
  page(
    "dashboard",
    "Dashboard",
    "--accent: #0b6e8f; --bg: #f4f6f8;",
    `${nav("Pulse", ["Overview", "Reports", "Alerts", "Settings"])}
    <div class="wrap"><h1>Overview</h1>
    <div class="grid">
      <div class="card" id="k1"><p class="muted">Active users</p><p class="stat" id="users">12,480</p><div class="bar"><i style="width:72%"></i></div></div>
      <div class="card" id="k2"><p class="muted">Conversion</p><p class="stat">3.9%</p><div class="bar" id="conv-bar"><i style="width:39%"></i></div></div>
      <div class="card" id="k3"><p class="muted">Churn</p><p class="stat">1.2%</p><div class="bar"><i style="width:12%"></i></div></div>
    </div>
    <div class="card" style="margin-top:20px"><h2 id="recent">Recent alerts</h2>
      <table><tr><th>When</th><th>Service</th><th>Status</th></tr>
      <tr><td>09:14</td><td>Checkout API</td><td><span class="tag" id="ok">Resolved</span></td></tr>
      <tr><td>08:52</td><td>Search</td><td><span class="tag">Resolved</span></td></tr>
      <tr id="row3"><td>07:30</td><td>Email queue</td><td><span class="tag" style="background:#fde7e9;color:#a50e0e">Open</span></td></tr></table>
    </div></div>`,
    [
      {
        selector: "#users",
        name: 'the "12,480" active users number',
        kind: ["text"],
      },
      { selector: "#k2", name: "the Conversion card", kind: ["box"] },
      {
        selector: "#ok",
        name: 'the first "Resolved" badge in the alerts table',
        kind: ["text", "box"],
      },
      {
        selector: "#recent",
        name: 'the "Recent alerts" heading',
        kind: ["text"],
      },
      {
        selector: "#conv-bar",
        name: "the progress bar in the Conversion card",
        kind: ["box"],
      },
    ],
  ),
  page(
    "form",
    "Sign-up form",
    "--accent: #c2185b;",
    `${nav("Tandem", ["Log in"])}
    <div class="wrap" style="max-width:520px"><h1>Create your account</h1>
    <div class="banner" id="notice">Invited by a teammate? Use the email address the invite was sent to.</div>
    <label for="n" id="name-label">Full name</label><input id="n" value="Priya Raman">
    <label for="e">Work email</label><input id="e" value="priya@example.com">
    <label for="r">Role</label><select id="r"><option>Designer</option></select>
    <p class="muted" id="terms">By continuing you agree to the terms of service.</p>
    <p><a class="btn" id="submit" href="#">Create account</a> <a id="cancel" href="#" style="margin-left:12px">Cancel</a></p></div>`,
    [
      {
        selector: "#submit",
        name: 'the "Create account" button',
        kind: ["text", "box"],
      },
      {
        selector: "#notice",
        name: "the yellow notice above the form",
        kind: ["text", "box"],
      },
      {
        selector: "#name-label",
        name: 'the "Full name" label',
        kind: ["text"],
      },
      { selector: "#e", name: "the work email input", kind: ["box"] },
      { selector: "#terms", name: "the terms of service line", kind: ["text"] },
    ],
  ),
  page(
    "docs",
    "Documentation",
    "--accent: #1a73e8;",
    `${nav("Kiln Docs", ["Guides", "API", "Changelog"])}
    <div class="wrap"><div class="row"><div class="side" id="sidebar"><b>Getting started</b><a href="#">Install</a><a href="#" id="side-config">Configure</a><a href="#">Deploy</a><b style="display:block;margin-top:12px">Reference</b><a href="#">CLI</a><a href="#">Config file</a></div>
    <div class="main"><h1 id="doc-title">Configure</h1><p id="doc-intro">Kiln reads <code>kiln.toml</code> from the project root. Every key is optional.</p>
    <h2 id="h-output">Output directory</h2><p>Where the build is written. Relative paths start at the project root.</p>
    <pre id="code" style="margin:0 0 12px;padding:14px;border-radius:8px;background:#1f2430;color:#e6e6e6;font:14px/1.5 Menlo, Consolas, monospace">[build]\noutput = "dist"\nminify = true</pre>
    <div class="banner" id="tip">Tip: run <code>kiln check</code> to validate the file without building.</div>
    <p><a class="btn ghost" id="next" href="#">Next: Deploy</a></p></div></div></div>`,
    [
      {
        selector: "#doc-title",
        name: 'the "Configure" page title',
        kind: ["text"],
      },
      { selector: "#code", name: "the dark code block", kind: ["text", "box"] },
      { selector: "#tip", name: "the yellow tip box", kind: ["text", "box"] },
      {
        selector: "#side-config",
        name: 'the "Configure" link in the sidebar',
        kind: ["text"],
      },
      {
        selector: "#next",
        name: 'the "Next: Deploy" button',
        kind: ["text", "box"],
      },
    ],
  ),
  page(
    "cart",
    "Shopping cart",
    "--accent: #2e7d32;",
    `${nav("Greenhouse", ["Plants", "Pots", "Care", "Cart (3)"])}
    <div class="wrap"><h1>Your cart</h1><div class="row">
    <div class="main"><div class="card"><table><tr><th>Item</th><th>Qty</th><th>Price</th></tr>
      <tr id="i1"><td><b>Monstera deliciosa</b><br><span class="muted">Medium, nursery pot</span></td><td>1</td><td>$34.00</td></tr>
      <tr id="i2"><td><b id="i2-name">Snake plant</b><br><span class="muted">Small</span></td><td>2</td><td>$28.00</td></tr>
      <tr id="i3"><td><b>Terracotta pot</b><br><span class="muted">15 cm</span></td><td>1</td><td>$9.50</td></tr></table></div>
      <p class="muted" id="ship-note" style="margin-top:12px">Orders over $60 ship free.</p></div>
    <div class="side" id="summary" style="width:300px"><h2>Summary</h2><p>Subtotal <b style="float:right">$71.50</b></p><p>Shipping <b style="float:right">Free</b></p><p id="total" style="font-size:20px">Total <b style="float:right">$71.50</b></p><a class="btn" id="checkout" href="#" style="display:block;text-align:center">Checkout</a></div>
    </div></div>`,
    [
      {
        selector: "#checkout",
        name: 'the "Checkout" button',
        kind: ["text", "box"],
      },
      {
        selector: "#total",
        name: 'the "Total" line in the summary',
        kind: ["text"],
      },
      {
        selector: "#summary",
        name: "the summary panel on the right",
        kind: ["box"],
      },
      {
        selector: "#i2-name",
        name: 'the "Snake plant" item name',
        kind: ["text"],
      },
      {
        selector: "#ship-note",
        name: "the free shipping note under the table",
        kind: ["text"],
      },
    ],
  ),
  page(
    "profile",
    "Profile settings",
    "--accent: #5b5fc7;",
    `${nav("Harbor", ["Projects", "Team", "Settings"])}
    <div class="wrap" style="max-width:820px"><h1>Profile</h1>
    <div class="card row" id="who" style="align-items:center"><div class="avatar" id="avatar"></div><div><h2 id="person">Mateo Alvarez</h2><p class="muted" style="margin:0">Staff engineer · Lisbon</p></div><a class="btn ghost" id="edit" href="#" style="margin-left:auto">Edit</a></div>
    <div class="card" style="margin-top:20px"><h2>Notifications</h2>
      <p id="n1">Email me when I am mentioned <span class="tag" style="float:right">On</span></p>
      <p id="n2">Weekly summary <span class="tag" id="off" style="float:right;background:#eee;color:#555">Off</span></p></div>
    <div class="card" id="danger" style="margin-top:20px;border-color:#f1b5b5"><h2 style="color:#a50e0e">Delete account</h2><p class="muted">This removes your projects and cannot be undone.</p><a class="btn" id="delete" href="#" style="background:#c5221f;border-color:#c5221f">Delete account</a></div></div>`,
    [
      { selector: "#person", name: 'the name "Mateo Alvarez"', kind: ["text"] },
      { selector: "#avatar", name: "the round avatar", kind: ["box"] },
      {
        selector: "#delete",
        name: 'the red "Delete account" button',
        kind: ["text", "box"],
      },
      { selector: "#danger", name: 'the "Delete account" card', kind: ["box"] },
      { selector: "#n2", name: 'the "Weekly summary" row', kind: ["text"] },
    ],
  ),
  page(
    "table",
    "Data table",
    "--accent: #00695c; --bg: #fafafa;",
    `${nav("Ledgerline", ["Invoices", "Customers", "Reports"])}
    <div class="wrap"><div class="row" style="align-items:center;margin-bottom:16px"><h1 style="margin:0" id="t-title">Invoices</h1><a class="btn" id="new" href="#" style="margin-left:auto">New invoice</a></div>
    <div class="card" id="tbl"><table><tr><th>Number</th><th id="th-cust">Customer</th><th>Due</th><th>Amount</th><th>Status</th></tr>
      ${[
        ["INV-1042", "Acme Tools", "12 Mar", "$1,240.00", "Paid"],
        ["INV-1043", "Birch & Co", "14 Mar", "$380.00", "Sent"],
        ["INV-1044", "Cobalt Labs", "15 Mar", "$2,915.50", "Overdue"],
        ["INV-1045", "Dune Studio", "19 Mar", "$640.00", "Draft"],
        ["INV-1046", "Elm Street Bakery", "21 Mar", "$95.00", "Sent"],
      ]
        .map(
          ([n, c, d, a, s], i) =>
            `<tr id="r${i + 1}"><td>${n}</td><td class="cust">${c}</td><td>${d}</td><td class="amt">${a}</td><td><span class="tag st">${s}</span></td></tr>`,
        )
        .join("")}
    </table></div><p class="muted" id="count" style="margin-top:12px">Showing 5 of 128 invoices</p></div>`,
    [
      {
        selector: "#r3 .amt",
        name: 'the "$2,915.50" amount of invoice INV-1044',
        kind: ["text"],
      },
      {
        selector: "#new",
        name: 'the "New invoice" button',
        kind: ["text", "box"],
      },
      {
        selector: "#r2 .st",
        name: 'the "Sent" status badge of invoice INV-1043',
        kind: ["text", "box"],
      },
      {
        selector: "#th-cust",
        name: 'the "Customer" column header',
        kind: ["text", "box"],
      },
      {
        selector: "#count",
        name: 'the "Showing 5 of 128 invoices" line',
        kind: ["text"],
      },
    ],
  ),
];
