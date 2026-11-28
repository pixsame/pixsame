// The final pages: ten that `pixsame snap` was never adjusted to. They were
// written while round 2 was running, and no case was built from them until the
// code was frozen; the published result is the one on these pages.
//
// Same shape as `pages.mjs`. A target's `kind` may also hold `container` (it
// lays out its children with a gap) and `item` (it is one of several children
// of a flex or grid container).

const BASE = `
  * { box-sizing: border-box; }
  body { margin: 0; font: 16px/1.55 Georgia, "Times New Roman", serif; color: var(--text, #2b2118); background: var(--page, #faf6ef); }
  a { color: var(--key, #9a3412); }
  h1 { font: 700 36px/1.15 "Helvetica Neue", Helvetica, Arial, sans-serif; margin: 0 0 14px; }
  h2 { font: 700 21px/1.3 "Helvetica Neue", Helvetica, Arial, sans-serif; margin: 0 0 10px; }
  h3 { font: 700 15px/1.3 "Helvetica Neue", Helvetica, Arial, sans-serif; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px; }
  p { margin: 0 0 12px; }
  ul, ol { margin: 0 0 12px; padding-left: 22px; }
  .ui { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
  .strip { display: flex; justify-content: space-between; align-items: baseline; padding: 16px 40px; border-bottom: 1px solid var(--rule, #d6cbb8); }
  .strip .links { display: flex; gap: 22px; font: 14px "Helvetica Neue", Helvetica, Arial, sans-serif; }
  .strip .links a { color: inherit; text-decoration: none; }
  .name { font: 700 20px "Helvetica Neue", Helvetica, Arial, sans-serif; }
  .page { width: 1000px; margin: 0 auto; padding: 32px 0; }
  .two { display: flex; gap: 36px; }
  .three { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
  .col { display: flex; flex-direction: column; gap: 14px; }
  .inline { display: flex; gap: 12px; align-items: center; }
  .sheet { background: var(--sheet, #fff); border: 1px solid var(--rule, #d6cbb8); padding: 22px; }
  .soft { background: var(--wash, #f1e8d8); border-radius: 8px; padding: 14px 16px; }
  .go { display: inline-block; font: 700 14px "Helvetica Neue", Helvetica, Arial, sans-serif; padding: 11px 20px; background: var(--key, #9a3412); color: #fff; text-decoration: none; border-radius: 2px; }
  .go.alt { background: none; color: var(--key, #9a3412); box-shadow: inset 0 0 0 2px var(--key, #9a3412); }
  .label { display: inline-block; font: 700 11px "Helvetica Neue", Helvetica, Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.8px; padding: 3px 8px; background: var(--key, #9a3412); color: #fff; }
  .fine { font: 13px/1.4 "Helvetica Neue", Helvetica, Arial, sans-serif; color: var(--quiet, #7a6a55); }
  .big { font: 700 40px/1 "Helvetica Neue", Helvetica, Arial, sans-serif; }
  .pic { background: var(--pic, #d9c7a8); border-radius: 4px; }
  .far { margin-left: auto; }
  table { border-collapse: separate; border-spacing: 0; width: 100%; font: 14px "Helvetica Neue", Helvetica, Arial, sans-serif; }
  th, td { padding: 9px 10px; text-align: left; border-bottom: 1px solid var(--rule, #d6cbb8); }
  th { font-size: 12px; text-transform: uppercase; letter-spacing: 0.6px; color: var(--quiet, #7a6a55); }
  .meter { height: 8px; background: var(--wash, #f1e8d8); border-radius: 4px; }
  .meter b { display: block; height: 8px; border-radius: 4px; background: var(--key, #9a3412); }
  .base { padding: 20px 40px; border-top: 1px solid var(--rule, #d6cbb8); }
`;

const strip = (name, links) =>
  `<div class="strip"><span class="name">${name}</span><span class="links">${links.map((l) => `<a href="#">${l}</a>`).join("")}</span></div>`;

const page = (id, title, vars, body, targets) => ({
  id,
  title,
  targets,
  html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>${BASE}\n  :root { ${vars} }</style></head><body>${body}</body></html>`,
});

export const PAGES = [
  page(
    "recipe",
    "Recipe",
    "--key: #9a3412;",
    `${strip("The Long Table", ["Recipes", "Seasons", "Letters"])}
    <div class="page"><span class="label" id="rc-kind">Supper</span><h1 id="rc-title" style="margin-top:10px">Braised leeks with white beans</h1><p id="rc-intro" style="max-width:640px">A pot for a wet evening. It takes an hour and most of that is waiting.</p>
    <div class="inline" id="rc-facts" style="margin:18px 0;gap:28px"><div id="rc-f1"><h3>Serves</h3><span class="ui">Four</span></div><div id="rc-f2"><h3>Time</h3><span class="ui" id="rc-time">1 hour</span></div><div id="rc-f3"><h3>Cost</h3><span class="ui">About £ 6</span></div></div>
    <div class="two"><div class="sheet" id="rc-ing" style="width:320px;flex:none"><h2>Ingredients</h2><ul id="rc-list"><li>4 large leeks</li><li id="rc-i2">2 tins of white beans</li><li>A glass of dry cider</li><li>Thyme, butter, salt</li></ul><a class="go alt" id="rc-shop" href="#">Add to shopping list</a></div>
    <div style="flex:1"><h2 id="rc-how">Method</h2><ol id="rc-steps"><li id="rc-s1">Halve the leeks and brown them in butter, cut side down, without moving them.</li><li>Pour in the cider and let it bubble to half.</li><li id="rc-s3">Add the beans with their liquid and the thyme. Cover and leave on a low heat for forty minutes.</li></ol><div class="soft" id="rc-tip"><strong>Tip.</strong> A spoon of mustard at the end wakes it up.</div><div class="inline" id="rc-acts" style="margin-top:16px"><a class="go" id="rc-print" href="#">Print recipe</a><a href="#" id="rc-save">Save for later</a></div></div></div></div>`,
    [
      { selector: "#rc-title", name: "the recipe title", kind: ["text"] },
      { selector: "#rc-print", name: 'the "Print recipe" button', kind: ["text", "box", "item"] },
      { selector: "#rc-ing", name: 'the "Ingredients" box', kind: ["box", "item"] },
      { selector: "#rc-facts", name: "the row of serves, time and cost", kind: ["container"] },
      { selector: "#rc-intro", name: "the introduction under the title", kind: ["text"] },
      { selector: "#rc-tip", name: "the tip box", kind: ["text", "box"] },
      { selector: "#rc-acts", name: "the row with the print button", kind: ["container"] },
      { selector: "#rc-f2", name: 'the "Time" fact', kind: ["item"] },
      { selector: "#rc-s1", name: "the first step of the method", kind: ["text"] },
      { selector: "#rc-kind", name: 'the "Supper" label', kind: ["text", "box"] },
    ],
  ),
  page(
    "weather",
    "Weather",
    "--key: #1d4f91; --page: #eef3f8; --rule: #c3d0de; --wash: #dbe6f2; --quiet: #5b6b7d; --text: #16202b;",
    `${strip("Headland Weather", ["Today", "Week", "Tides", "Warnings"])}
    <div class="page"><div class="two"><div class="sheet" id="wx-now" style="flex:1"><h3>Now in Whitby</h3><div class="inline" id="wx-main" style="gap:20px;margin:10px 0"><span class="big" id="wx-temp">11°</span><div><strong class="ui" id="wx-sky">Showers, clearing</strong><br><span class="fine" id="wx-feel">Feels like 8° in the wind</span></div></div><div class="inline" id="wx-stats" style="gap:26px"><span class="fine" id="wx-wind">Wind 24 mph NE</span><span class="fine">Rain 60%</span><span class="fine">Sunset 20:47</span></div></div>
    <div class="soft" id="wx-warn" style="width:300px;flex:none;border-radius:0;border-left:5px solid #b45309"><h3 id="wx-warn-h">Yellow warning</h3><p class="ui" id="wx-warn-t" style="margin:6px 0 0;font-size:14px">Gusts to 50 mph on exposed coast until 18:00.</p></div></div>
    <h2 style="margin-top:28px" id="wx-next">The next five days</h2><div class="three" id="wx-days" style="grid-template-columns:repeat(5,1fr);gap:12px">
      <div class="sheet" id="wx-d1"><h3>Thu</h3><span class="ui">13° / 7°</span><p class="fine" style="margin:6px 0 0">Bright spells</p></div>
      <div class="sheet" id="wx-d2"><h3>Fri</h3><span class="ui" id="wx-d2-t">15° / 9°</span><p class="fine" style="margin:6px 0 0">Dry</p></div>
      <div class="sheet" id="wx-d3"><h3>Sat</h3><span class="ui">14° / 10°</span><p class="fine" style="margin:6px 0 0" id="wx-d3-s">Rain by evening</p></div>
      <div class="sheet" id="wx-d4"><h3>Sun</h3><span class="ui">12° / 8°</span><p class="fine" style="margin:6px 0 0">Heavy rain</p></div>
      <div class="sheet" id="wx-d5"><h3>Mon</h3><span class="ui">13° / 6°</span><p class="fine" style="margin:6px 0 0">Clearing</p></div>
    </div><p class="fine" id="wx-src" style="margin-top:14px">Updated 14:20 from the harbour station.</p></div>`,
    [
      { selector: "#wx-sky", name: 'the "Showers, clearing" line', kind: ["text"] },
      { selector: "#wx-warn", name: "the yellow warning box", kind: ["box", "item"] },
      { selector: "#wx-d2", name: "the Friday box", kind: ["box", "item"] },
      { selector: "#wx-days", name: "the row of the five day boxes", kind: ["container"] },
      { selector: "#wx-src", name: "the line about when it was updated", kind: ["text"] },
      { selector: "#wx-temp", name: "the large temperature", kind: ["text", "item"] },
      { selector: "#wx-stats", name: "the row of wind, rain and sunset", kind: ["container"] },
      { selector: "#wx-now", name: 'the "Now in Whitby" box', kind: ["box", "item"] },
      { selector: "#wx-warn-t", name: "the text of the warning", kind: ["text"] },
      { selector: "#wx-d4", name: "the Sunday box", kind: ["box", "item"] },
    ],
  ),
  page(
    "jobs",
    "Job listing",
    "--key: #166534; --pic: #cfe3d4;",
    `${strip("Millrace Co-op", ["What we do", "Work with us", "Contact"])}
    <div class="page"><h1 id="jb-title">Work with us</h1><p id="jb-lead" style="max-width:620px">We are forty people who own the place together. Three roles are open this spring.</p>
    <div class="col" id="jb-list" style="margin-top:22px;gap:16px">
      <div class="sheet inline" id="jb-1"><div><h2 id="jb-1-t">Bakery shift lead</h2><span class="fine" id="jb-1-m">Full time · Nights · Sheffield</span></div><span class="label far" id="jb-1-new">New</span><a class="go" id="jb-1-go" href="#">Read more</a></div>
      <div class="sheet inline" id="jb-2"><div><h2>Delivery cyclist</h2><span class="fine">Part time · Mornings · Sheffield</span></div><a class="go far" id="jb-2-go" href="#">Read more</a></div>
      <div class="sheet inline" id="jb-3"><div><h2>Bookkeeper</h2><span class="fine" id="jb-3-m">Two days a week · Remote possible</span></div><a class="go far" href="#">Read more</a></div>
    </div>
    <div class="two" style="margin-top:28px"><div class="soft" id="jb-pay" style="flex:1"><h3>Pay</h3><p class="ui" id="jb-pay-t" style="margin:0;font-size:14px">One rate for everyone after the first year, published every April.</p></div><div class="soft" id="jb-vote" style="flex:1"><h3>A vote</h3><p class="ui" style="margin:0;font-size:14px">Members decide the big things at four meetings a year.</p></div></div>
    <p class="fine" id="jb-note" style="margin-top:18px">Nothing that fits? Write to us anyway.</p></div>`,
    [
      { selector: "#jb-title", name: "the page heading", kind: ["text"] },
      { selector: "#jb-1-go", name: 'the "Read more" button of the bakery role', kind: ["text", "box", "item"] },
      { selector: "#jb-2", name: 'the "Delivery cyclist" row', kind: ["box", "item"] },
      { selector: "#jb-list", name: "the list of open roles", kind: ["container"] },
      { selector: "#jb-lead", name: "the paragraph under the heading", kind: ["text"] },
      { selector: "#jb-1-new", name: 'the "New" label', kind: ["text", "box", "item"] },
      { selector: "#jb-3", name: 'the "Bookkeeper" row', kind: ["box", "container", "item"] },
      { selector: "#jb-pay", name: 'the "Pay" box', kind: ["box", "item"] },
      { selector: "#jb-note", name: "the last line of the page", kind: ["text"] },
      { selector: "#jb-3-m", name: "the details line of the bookkeeper role", kind: ["text"] },
    ],
  ),
  page(
    "tracking",
    "Order tracking",
    "--key: #6b21a8; --page: #f7f4fb; --rule: #d9cfe6; --wash: #ece3f5; --quiet: #6d5f7d;",
    `${strip("Parcel & Post", ["Track", "Send", "Help"])}
    <div class="page" style="width:860px"><p class="fine" id="tr-ref">Order PP-55-20318</p><h1 id="tr-title">On its way to you</h1>
    <div class="sheet" id="tr-card"><div class="inline" id="tr-top"><div><h3>Expected</h3><strong class="ui" id="tr-when" style="font-size:20px">Thursday, before noon</strong></div><span class="label far" id="tr-state">In transit</span></div>
      <div class="meter" id="tr-meter" style="margin:18px 0"><b style="width:62%"></b></div>
      <div class="col" id="tr-steps" style="gap:10px"><div class="inline" id="tr-s1"><span class="pic" style="width:12px;height:12px;border-radius:50%"></span><span class="ui">Collected in Bristol</span><span class="fine far">Mon 09:14</span></div><div class="inline" id="tr-s2"><span class="pic" style="width:12px;height:12px;border-radius:50%"></span><span class="ui" id="tr-s2-t">Sorted at the Midlands hub</span><span class="fine far" id="tr-s2-w">Tue 22:40</span></div><div class="inline" id="tr-s3"><span class="pic" style="width:12px;height:12px;border-radius:50%"></span><span class="ui">Out for delivery</span><span class="fine far">Not yet</span></div></div></div>
    <div class="two" style="margin-top:20px"><div class="soft" id="tr-addr" style="flex:1"><h3>Delivering to</h3><p class="ui" id="tr-addr-t" style="margin:0;font-size:14px">R. Castellan, 9 Mill Lane, York</p></div><div class="soft" id="tr-safe" style="flex:1"><h3>If you are out</h3><p class="ui" style="margin:0;font-size:14px">Left with a neighbour at number 11.</p></div></div>
    <div class="inline" id="tr-acts" style="margin-top:20px"><a class="go" id="tr-change" href="#">Change delivery</a><a class="go alt" id="tr-help" href="#">Something wrong?</a></div></div>`,
    [
      { selector: "#tr-title", name: "the page heading", kind: ["text"] },
      { selector: "#tr-change", name: 'the "Change delivery" button', kind: ["text", "box", "item"] },
      { selector: "#tr-card", name: "the main tracking box", kind: ["box"] },
      { selector: "#tr-steps", name: "the list of tracking steps", kind: ["container"] },
      { selector: "#tr-s2-t", name: 'the step "Sorted at the Midlands hub"', kind: ["text", "item"] },
      { selector: "#tr-state", name: 'the "In transit" label', kind: ["text", "box", "item"] },
      { selector: "#tr-acts", name: "the row of the two buttons", kind: ["container"] },
      { selector: "#tr-addr", name: 'the "Delivering to" box', kind: ["box", "item"] },
      { selector: "#tr-ref", name: "the order number line", kind: ["text"] },
      { selector: "#tr-meter", name: "the progress bar", kind: ["box"] },
      { selector: "#tr-when", name: "the expected delivery time", kind: ["text"] },
    ],
  ),
  page(
    "playlist",
    "Playlist",
    "--key: #e11d48; --page: #17141a; --text: #f3eef5; --sheet: #231e28; --rule: #40384a; --wash: #2d2733; --quiet: #a99db5; --pic: #5a2a3a;",
    `${strip("Spindle", ["Library", "Radio", "Search"])}
    <div class="page"><div class="two"><div class="pic" id="pl-cover" style="width:220px;height:220px;flex:none"></div><div><span class="label" id="pl-kind">Playlist</span><h1 id="pl-title" style="margin-top:10px">Slow trains, late light</h1><p id="pl-desc" style="max-width:520px">Fourteen songs for the last hour of a long journey.</p><p class="fine" id="pl-meta">Made by Jules · 14 songs · 58 minutes</p><div class="inline" id="pl-acts"><a class="go" id="pl-play" href="#">Play</a><a class="go alt" id="pl-shuffle" href="#">Shuffle</a><a href="#" id="pl-share" class="ui" style="font-size:14px">Share</a></div></div></div>
    <div class="sheet" id="pl-tracks" style="margin-top:26px;padding:8px 22px"><table><thead><tr><th style="width:40px">#</th><th id="pl-th-t">Title</th><th>Artist</th><th style="text-align:right">Time</th></tr></thead><tbody>
      <tr id="pl-t1"><td>1</td><td id="pl-t1-n">Platform nine, raining</td><td>Mina Fonseca</td><td style="text-align:right">4:12</td></tr>
      <tr id="pl-t2"><td>2</td><td>Signal box</td><td id="pl-t2-a">Grey Seal Orchestra</td><td style="text-align:right">3:48</td></tr>
      <tr id="pl-t3"><td>3</td><td>Viaduct</td><td>Ebb</td><td style="text-align:right" id="pl-t3-d">5:30</td></tr>
      <tr id="pl-t4"><td>4</td><td>The quiet coach</td><td>The Lanterns</td><td style="text-align:right">4:01</td></tr>
    </tbody></table></div><p class="fine" id="pl-more" style="margin-top:12px">Ten more songs</p></div>`,
    [
      { selector: "#pl-title", name: "the playlist title", kind: ["text"] },
      { selector: "#pl-play", name: 'the "Play" button', kind: ["text", "box", "item"] },
      { selector: "#pl-tracks", name: "the box with the list of songs", kind: ["box"] },
      { selector: "#pl-acts", name: "the row of play, shuffle and share", kind: ["container"] },
      { selector: "#pl-desc", name: "the description under the title", kind: ["text"] },
      { selector: "#pl-kind", name: 'the "Playlist" label', kind: ["text", "box"] },
      { selector: "#pl-cover", name: "the cover picture", kind: ["box", "item"] },
      { selector: "#pl-shuffle", name: 'the "Shuffle" button', kind: ["text", "box", "item"] },
      { selector: "#pl-t1-n", name: 'the song title "Platform nine, raining"', kind: ["text"] },
      { selector: "#pl-meta", name: "the line with who made it and how long it is", kind: ["text"] },
    ],
  ),
  page(
    "plans",
    "Plan comparison",
    "--key: #0369a1; --page: #fff; --wash: #e0f2fe;",
    `${strip("Tidepool Hosting", ["Plans", "Docs", "Status", "Sign in"])}
    <div class="page"><h1 id="pn-title" style="text-align:center">Pick a plan, change it any time</h1><p id="pn-sub" class="ui" style="text-align:center;margin-bottom:26px">Every plan includes backups and a person to talk to.</p>
    <div class="three" id="pn-grid"><div class="sheet col" id="pn-a"><h2>Rockpool</h2><div><span class="big" id="pn-a-p">£ 6</span> <span class="fine">a month</span></div><ul class="ui" id="pn-a-l" style="font-size:14px"><li>One site</li><li>10 GB</li><li id="pn-a-l3">Email support</li></ul><a class="go alt" id="pn-a-go" href="#">Choose Rockpool</a></div>
      <div class="sheet col" id="pn-b" style="border:2px solid #0369a1"><div class="inline"><h2 style="margin:0">Estuary</h2><span class="label far" id="pn-b-tag">Most picked</span></div><div><span class="big">£ 18</span> <span class="fine" id="pn-b-per">a month</span></div><ul class="ui" style="font-size:14px"><li>Five sites</li><li>60 GB</li><li>Phone support</li></ul><a class="go" id="pn-b-go" href="#">Choose Estuary</a></div>
      <div class="sheet col" id="pn-c"><h2 id="pn-c-h">Open sea</h2><div><span class="big">£ 45</span> <span class="fine">a month</span></div><ul class="ui" style="font-size:14px"><li>Unlimited sites</li><li>250 GB</li><li>A named engineer</li></ul><a class="go alt" id="pn-c-go" href="#">Choose Open sea</a></div></div>
    <div class="soft" id="pn-note" style="margin-top:24px;text-align:center"><span class="ui" id="pn-note-t" style="font-size:14px">Charities and schools get a third off. Ask us.</span></div></div>`,
    [
      { selector: "#pn-title", name: "the page heading", kind: ["text"] },
      { selector: "#pn-b-go", name: 'the "Choose Estuary" button', kind: ["text", "box", "item"] },
      { selector: "#pn-c", name: 'the "Open sea" plan box', kind: ["box", "container", "item"] },
      { selector: "#pn-grid", name: "the row of the three plan boxes", kind: ["container"] },
      { selector: "#pn-sub", name: "the line under the heading", kind: ["text"] },
      { selector: "#pn-b-tag", name: 'the "Most picked" label', kind: ["text", "box", "item"] },
      { selector: "#pn-a", name: 'the "Rockpool" plan box', kind: ["box", "container", "item"] },
      { selector: "#pn-note", name: "the note about charities and schools", kind: ["box"] },
      { selector: "#pn-a-p", name: 'the "£ 6" price', kind: ["text"] },
      { selector: "#pn-a-l3", name: 'the "Email support" line of the Rockpool plan', kind: ["text"] },
    ],
  ),
  page(
    "faq",
    "Help centre",
    "--key: #b45309; --page: #fffbf2;",
    `${strip("Lantern Energy", ["Your account", "Tariffs", "Help"])}
    <div class="page" style="width:880px"><h1 id="fq-title">How can we help?</h1><div class="inline" id="fq-search" style="margin-bottom:24px"><div class="sheet ui" id="fq-box" style="flex:1;padding:11px 14px;font-size:14px;color:#7a6a55">Search for a meter, a bill, a move</div><a class="go" id="fq-go" href="#">Search</a></div>
    <div class="two"><div style="flex:1"><h2 id="fq-h">Asked most often</h2><div class="col" id="fq-list" style="gap:10px">
      <div class="sheet" id="fq-1"><strong class="ui" id="fq-1-q">Why is my bill an estimate?</strong><p id="fq-1-a" style="margin:8px 0 0">We had no reading in the last month. Send one and we will redo the bill within a day.</p></div>
      <div class="sheet" id="fq-2"><strong class="ui">How do I send a meter reading?</strong></div>
      <div class="sheet" id="fq-3"><strong class="ui" id="fq-3-q">I am moving home. What now?</strong></div>
      <div class="sheet" id="fq-4"><strong class="ui">Can I pay monthly instead of quarterly?</strong></div></div></div>
    <div class="col" style="width:280px;flex:none"><div class="soft" id="fq-call"><h3>Talk to someone</h3><p class="ui" id="fq-call-t" style="font-size:14px;margin:6px 0 10px">Lines are open 8 to 8, every day but Sunday.</p><a class="go alt" id="fq-call-go" href="#">Call 0800 555 0142</a></div><div class="soft" id="fq-out"><h3>Power cut?</h3><p class="ui" style="font-size:14px;margin:6px 0 0">Ring 105, free, at any hour.</p></div></div></div></div>
    <div class="base fine" id="fq-base">Lantern Energy is owned by its customers.</div>`,
    [
      { selector: "#fq-title", name: "the page heading", kind: ["text"] },
      { selector: "#fq-go", name: 'the "Search" button', kind: ["text", "box", "item"] },
      { selector: "#fq-1", name: 'the open question "Why is my bill an estimate?"', kind: ["box", "item"] },
      { selector: "#fq-list", name: "the list of questions", kind: ["container"] },
      { selector: "#fq-1-a", name: "the answer to the first question", kind: ["text"] },
      { selector: "#fq-call", name: 'the "Talk to someone" box', kind: ["box", "item"] },
      { selector: "#fq-search", name: "the search row", kind: ["container"] },
      { selector: "#fq-3", name: 'the question "I am moving home. What now?"', kind: ["box", "item"] },
      { selector: "#fq-base", name: "the footer line", kind: ["text"] },
      { selector: "#fq-call-go", name: 'the "Call 0800 555 0142" button', kind: ["text", "box"] },
      { selector: "#fq-3-q", name: 'the text "I am moving home. What now?"', kind: ["text"] },
    ],
  ),
  page(
    "portfolio",
    "Portfolio",
    "--key: #be123c; --page: #fdfdfc; --pic: #e6d9cf;",
    `${strip("Ama Boateng", ["Work", "Writing", "About", "Contact"])}
    <div class="page"><div class="two" style="align-items:center"><div style="flex:1"><h1 id="pf-title">I design maps people can read on a bus.</h1><p id="pf-bio">Ten years of transit maps, wayfinding and the odd board game. Based in Accra, working anywhere.</p><div class="inline" id="pf-acts"><a class="go" id="pf-hire" href="#">Work with me</a><a class="go alt" id="pf-cv" href="#">Download CV</a></div></div><div class="pic" id="pf-face" style="width:260px;height:260px;border-radius:50%;flex:none"></div></div>
    <h2 id="pf-h" style="margin-top:36px">Selected work</h2><div class="three" id="pf-work">
      <div id="pf-w1"><div class="pic" style="height:150px;margin-bottom:10px"></div><strong class="ui" id="pf-w1-t">Kumasi night bus map</strong><p class="fine" style="margin:2px 0 0">2023 · Print and signs</p></div>
      <div id="pf-w2"><div class="pic" id="pf-w2-pic" style="height:150px;margin-bottom:10px"></div><strong class="ui">Ferry timetable, Volta Lake</strong><p class="fine" id="pf-w2-m" style="margin:2px 0 0">2022 · Timetable design</p></div>
      <div id="pf-w3"><div class="pic" style="height:150px;margin-bottom:10px"></div><strong class="ui">Tro-tro: the board game</strong><p class="fine" style="margin:2px 0 0">2021 · Game and rules</p></div></div>
    <div class="soft inline" id="pf-quote" style="margin-top:30px;border:1px solid #d6cbb8"><p id="pf-quote-t" style="margin:0;font-style:italic">"The first map our drivers asked to keep."</p><span class="fine far" id="pf-quote-by">Metro Mass Transit</span></div></div>`,
    [
      { selector: "#pf-title", name: "the main headline", kind: ["text"] },
      { selector: "#pf-hire", name: 'the "Work with me" button', kind: ["text", "box", "item"] },
      { selector: "#pf-quote", name: "the quote box", kind: ["box", "container"] },
      { selector: "#pf-work", name: "the grid of three pieces of work", kind: ["container"] },
      { selector: "#pf-bio", name: "the paragraph under the headline", kind: ["text"] },
      { selector: "#pf-face", name: "the round portrait picture", kind: ["box", "item"] },
      { selector: "#pf-acts", name: "the row of the two buttons", kind: ["container"] },
      { selector: "#pf-w2-pic", name: "the picture of the ferry timetable", kind: ["box"] },
      { selector: "#pf-quote-t", name: "the text of the quote", kind: ["text", "item"] },
      { selector: "#pf-w2", name: 'the "Ferry timetable, Volta Lake" piece', kind: ["item"] },
      { selector: "#pf-cv", name: 'the "Download CV" button', kind: ["text", "box", "item"] },
    ],
  ),
  page(
    "admin",
    "Admin users",
    "--key: #334155; --page: #f1f5f9; --rule: #cbd5e1; --wash: #e2e8f0; --quiet: #64748b; --text: #0f172a;",
    `${strip("Console", ["Overview", "Users", "Audit log", "Billing"])}
    <div class="page" style="width:1080px"><div class="inline" id="ad-top" style="margin-bottom:18px"><h1 id="ad-title" style="margin:0;font-size:28px">Users</h1><span class="label" id="ad-count">38 active</span><a class="go far" id="ad-invite" href="#">Invite user</a></div>
    <div class="three" id="ad-stats" style="margin-bottom:18px"><div class="sheet" id="ad-s1"><h3>Seats used</h3><span class="big" id="ad-s1-n">38</span><span class="fine"> of 50</span><div class="meter" style="margin-top:10px"><b style="width:76%"></b></div></div><div class="sheet" id="ad-s2"><h3>Pending invites</h3><span class="big">4</span></div><div class="sheet" id="ad-s3"><h3 id="ad-s3-h">Without 2FA</h3><span class="big" style="color:#b91c1c">6</span></div></div>
    <div class="sheet" id="ad-table" style="padding:6px 22px"><table><thead><tr><th>Name</th><th id="ad-th-role">Role</th><th>Last seen</th><th>2FA</th></tr></thead><tbody>
      <tr id="ad-r1"><td id="ad-r1-n">Noor Haddad</td><td>Owner</td><td>Today</td><td>On</td></tr>
      <tr id="ad-r2"><td>Piotr Zielinski</td><td id="ad-r2-role">Admin</td><td>Yesterday</td><td>On</td></tr>
      <tr id="ad-r3"><td>Sun-hee Park</td><td>Member</td><td id="ad-r3-seen">3 weeks ago</td><td id="ad-r3-2fa" style="color:#b91c1c">Off</td></tr>
      <tr id="ad-r4"><td>Leif Nyberg</td><td>Member</td><td>Today</td><td>On</td></tr></tbody></table></div>
    <div class="inline" id="ad-foot" style="margin-top:14px"><span class="fine" id="ad-page">Showing 4 of 38</span><a class="go alt far" id="ad-more" href="#">Next page</a></div></div>`,
    [
      { selector: "#ad-title", name: 'the "Users" heading', kind: ["text", "item"] },
      { selector: "#ad-invite", name: 'the "Invite user" button', kind: ["text", "box", "item"] },
      { selector: "#ad-s2", name: 'the "Pending invites" box', kind: ["box", "item"] },
      { selector: "#ad-stats", name: "the row of the three number boxes", kind: ["container"] },
      { selector: "#ad-page", name: 'the "Showing 4 of 38" line', kind: ["text", "item"] },
      { selector: "#ad-count", name: 'the "38 active" label', kind: ["text", "box", "item"] },
      { selector: "#ad-top", name: "the row with the heading and the invite button", kind: ["container"] },
      { selector: "#ad-table", name: "the box with the table of users", kind: ["box"] },
      { selector: "#ad-r1-n", name: 'the name "Noor Haddad" in the table', kind: ["text"] },
      { selector: "#ad-s1", name: 'the "Seats used" box', kind: ["box", "item"] },
      { selector: "#ad-r3-seen", name: 'the "3 weeks ago" cell', kind: ["text"] },
    ],
  ),
  page(
    "signup",
    "Newsletter",
    "--key: #4d7c0f; --page: #f7f9f1; --wash: #e6edd2; --pic: #c9d6a3;",
    `<div class="page" style="width:720px;padding-top:56px"><span class="name" id="nl-name">The Hedgerow Letter</span><h1 id="nl-title" style="margin-top:22px">One letter a month about what is growing wild near you.</h1><p id="nl-lead">Written by two botanists who walk the same lanes all year. Free, and it always will be.</p>
    <div class="sheet" id="nl-form"><h3>Join 9,400 readers</h3><div class="inline" id="nl-row" style="margin-top:10px"><div class="soft ui" id="nl-input" style="flex:1;border-radius:2px;font-size:14px;color:#7a6a55">you@example.org</div><a class="go" id="nl-go" href="#">Send me the letter</a></div><p class="fine" id="nl-small" style="margin:10px 0 0">No tracking. Leave with one click.</p></div>
    <h2 id="nl-h" style="margin-top:32px">In the last three letters</h2><div class="col" id="nl-past" style="gap:10px"><div class="inline" id="nl-p1"><span class="pic" style="width:54px;height:54px;flex:none"></span><div><strong class="ui" id="nl-p1-t">May: cow parsley and its dangerous cousins</strong><br><span class="fine">How to tell five white umbels apart</span></div></div><div class="inline" id="nl-p2"><span class="pic" style="width:54px;height:54px;flex:none"></span><div><strong class="ui">April: the week the blackthorn goes over</strong><br><span class="fine" id="nl-p2-s">And why hawthorn waits</span></div></div><div class="inline" id="nl-p3"><span class="pic" id="nl-p3-pic" style="width:54px;height:54px;flex:none"></span><div><strong class="ui">March: reading a hedge by its gaps</strong><br><span class="fine">What a missing tree tells you</span></div></div></div>
    <div class="base fine" id="nl-base" style="padding:20px 0;margin-top:30px">Printed copies for libraries on request.</div></div>`,
    [
      { selector: "#nl-title", name: "the main headline", kind: ["text"] },
      { selector: "#nl-go", name: 'the "Send me the letter" button', kind: ["text", "box", "item"] },
      { selector: "#nl-form", name: "the sign-up box", kind: ["box"] },
      { selector: "#nl-past", name: "the list of past letters", kind: ["container"] },
      { selector: "#nl-lead", name: "the paragraph under the headline", kind: ["text"] },
      { selector: "#nl-input", name: "the email field", kind: ["text", "box", "item"] },
      { selector: "#nl-row", name: "the row with the email field and the button", kind: ["container"] },
      { selector: "#nl-p3-pic", name: "the picture of the March letter", kind: ["box", "item"] },
      { selector: "#nl-small", name: "the small print under the form", kind: ["text"] },
      { selector: "#nl-p2", name: "the April letter in the list", kind: ["item"] },
      { selector: "#nl-base", name: "the footer line", kind: ["text", "box"] },
    ],
  ),
];
