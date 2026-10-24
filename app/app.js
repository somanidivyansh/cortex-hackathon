/* Cadence — After the Event.
 * Canvas Protocol: every primary action happens by dragging a data card onto an action zone.
 * State lives in localStorage; nothing leaves the browser. */
(function () {
  "use strict";

  var STORE_KEY = "cadence.v1";
  var HOUR = 3600 * 1000;
  var DAY = 24 * HOUR;

  /* ---------------- utilities ---------------- */
  function uid(p) { return (p || "id") + "_" + Math.random().toString(36).slice(2, 9); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function now() { return Date.now(); }
  function cap(s) { s = String(s || "").trim(); return s.charAt(0).toUpperCase() + s.slice(1); }

  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtTime(d) {
    var h = d.getHours(), m = d.getMinutes();
    var ap = h >= 12 ? "pm" : "am";
    h = h % 12 || 12;
    return h + (m ? ":" + String(m).padStart(2, "0") : "") + ap;
  }
  function fmtDate(ts) {
    var d = new Date(ts);
    return DAYS[d.getDay()] + " " + d.getDate() + " " + MONTHS[d.getMonth()];
  }
  function fmtDue(ts) {
    var d = new Date(ts);
    return DAYS[d.getDay()] + " " + fmtTime(d);
  }
  function fmtLeft(ts) {
    var diff = ts - now();
    var abs = Math.abs(diff);
    var txt = abs < HOUR ? Math.max(1, Math.round(abs / 60000)) + " min" :
      abs < 2 * DAY ? Math.round(abs / HOUR) + " hrs" : Math.round(abs / DAY) + " days";
    return diff < 0 ? txt + " overdue" : txt + " left";
  }
  function ago(ts) {
    var diff = now() - ts;
    if (diff < 60000) return "just now";
    if (diff < HOUR) return Math.round(diff / 60000) + " min ago";
    if (diff < DAY) return Math.round(diff / HOUR) + " hrs ago";
    return Math.round(diff / DAY) + " days ago";
  }
  function dateInputValue(ts) {
    var d = new Date(ts);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  /* ---------------- state ---------------- */
  var state;

  function seed() {
    var t = now();
    var e1 = { id: "ev_prehack", name: "Pre-hack meetup", date: t - 30 * HOUR, type: "Meetup", goal: "Find a teammate and learn about vector DBs", created: t - 30 * HOUR, seeded: true };
    var e2 = { id: "ev_aibuilders", name: "AI Builders Night", date: t - 6 * DAY, type: "Conference", goal: "Meet people shipping AI products", created: t - 6 * DAY, seeded: true };
    var n1 = {
      id: "nt_1", eventId: e1.id, created: t - 28 * HOUR,
      text: "Met Ade, who is building a vector DB demo. Ade said they'd share the repo if I send a follow-up by Friday 5pm. Learned that hybrid search beats pure embeddings for short queries. Idea: a study-buddy bot that quizzes you on hackathon talks. Need to read the pgvector docs before Monday."
    };
    var n2 = {
      id: "nt_2", eventId: e2.id, created: t - 6 * DAY + 3 * HOUR,
      text: "Talked to Lin about GPU latency benchmarks. Send Lin my benchmark sheet. Key takeaway: ship a small demo every week. Spoke with Priya Shah from Nova Labs about internships."
    };
    var items = [
      { id: "pe_lin", type: "person", eventId: e2.id, noteId: n2.id, name: "Lin", text: "Lin", context: "Talked about GPU latency benchmarks.", source: "Talked to Lin about GPU latency benchmarks.", follow: "todo", created: t - 6 * DAY + 4 * HOUR },
      { id: "pe_priya", type: "person", eventId: e2.id, noteId: n2.id, name: "Priya Shah", text: "Priya Shah", context: "Nova Labs, talked about internships.", source: "Spoke with Priya Shah from Nova Labs about internships.", follow: "sent", sentAt: t - 5 * DAY, created: t - 6 * DAY + 4 * HOUR },
      { id: "ac_lin", type: "action", kind: "followup", personId: "pe_lin", eventId: e2.id, noteId: n2.id, text: "Send Lin my benchmark sheet", source: "Send Lin my benchmark sheet.", status: "open", due: t + 4 * DAY, created: t - 6 * DAY + 4 * HOUR },
      { id: "ac_priya", type: "action", kind: "followup", personId: "pe_priya", eventId: e2.id, noteId: n2.id, text: "Email Priya Shah about Nova Labs internships", source: "Spoke with Priya Shah from Nova Labs about internships.", status: "done", doneAt: t - 5 * DAY, created: t - 6 * DAY + 4 * HOUR },
      { id: "ac_demo", type: "action", kind: "task", eventId: e2.id, noteId: n2.id, text: "Ship a small demo this week", source: "Key takeaway: ship a small demo every week.", status: "open", due: t + 3 * DAY, created: t - 6 * DAY + 4 * HOUR },
      { id: "tk_weekly", type: "takeaway", eventId: e2.id, noteId: n2.id, text: "Ship a small demo every week.", source: "Key takeaway: ship a small demo every week.", created: t - 6 * DAY + 4 * HOUR },
      { id: "id_cli", type: "idea", eventId: e2.id, noteId: n2.id, text: "A CLI that benchmarks GPU latency across cloud providers", source: "Talked to Lin about GPU latency benchmarks.", status: "inbox", created: t - 6 * DAY + 4 * HOUR }
    ];
    var s = {
      version: 1,
      currentEventId: e1.id,
      events: [e1, e2],
      notes: [n1, n2],
      items: items,
      suggestions: [],
      stats: { accepted: 6, rejected: 2, firstAcceptAt: {} },
      log: [
        { t: t - 5 * DAY, text: "Followed up with Priya Shah (Nova Labs)" },
        { t: t - 6 * DAY + 4 * HOUR, text: "Accepted 6 suggestions from AI Builders Night notes" }
      ],
      drafts: { event: { name: "", date: dateInputValue(t), type: "Meetup", goal: "" }, note: { text: "", q1: "", q2: "", q3: "" } },
      messages: {}
    };
    state = s;
    // Pending suggestions for the newest event, produced by the same extractor the user runs.
    s.suggestions = extract(n1.text, e1, n1.id);
    return s;
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.version === 1) return parsed;
      }
    } catch (e) { /* storage unavailable: fall back to seed */ }
    return seed();
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function eventById(id) { return state.events.filter(function (e) { return e.id === id; })[0]; }
  function itemById(id) { return state.items.filter(function (i) { return i.id === id; })[0]; }
  function currentEvent() { return eventById(state.currentEventId) || state.events[0]; }
  function itemsOf(type, eventId) {
    return state.items.filter(function (i) { return i.type === type && (!eventId || i.eventId === eventId); });
  }
  function personByName(name) {
    var n = name.toLowerCase();
    return state.items.filter(function (i) { return i.type === "person" && i.name.toLowerCase() === n; })[0];
  }
  function logEvent(text) { state.log.unshift({ t: now(), text: text }); state.log = state.log.slice(0, 60); }

  /* ---------------- extraction (rule-based, in-browser) ---------------- */
  var NOT_NAMES = /^(I|We|They|He|She|It|The|A|An|My|Our|Their|This|That|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun|Today|Tomorrow|Next|AI|GPU|API|CLI|DB|Need|Learned|Idea|Key)$/;
  var NAME_RE = /\b(?:met|meet|meeting|talked to|talking to|talked with|spoke to|spoke with|chatted with|chat with|follow(?:ed)?[- ]up with|connect(?:ed)? with|introduced to|intro to|call with|coffee with|email|e-mail|message|ping|dm|text|send|thank)\s+([A-Z][a-zA-Z'\-]+(?:\s+[A-Z][a-zA-Z'\-]+)?)/g;
  var ACTION_RE = /\b(follow[- ]?up|send|email|e-mail|share|message|reply|call|book|schedule|try|build|read|learn|practi[cs]e|sign up|apply|register|need to|have to|must|should|will|todo|to-do|remember to|plan to|going to|ship)\b/i;
  var IDEA_RE = /\b(idea|what if|could build|app that|tool that|bot that|startup|side project|we could|i could|someone should)\b/i;
  var TAKEAWAY_RE = /\b(learn(?:ed|t)|takeaway|insight|reali[sz]ed|til|lesson|key point|interesting|turns out|tip|surpris)/i;
  var DOW = { sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2, wednesday: 3, wed: 3, thursday: 4, thu: 4, thurs: 4, friday: 5, fri: 5, saturday: 6, sat: 6 };

  function parseDue(s, base) {
    var m = s.match(/\b(?:by|before|on|until|due|this|next)?\s*(today|tonight|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thurs|fri|sat|sun|next week|end of (?:the )?week|eow|in (\d+) (day|days|hours|hrs))\b(?:\s*(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm))?/i);
    if (!m) return null;
    var word = m[1].toLowerCase();
    var d = new Date(base || now());
    d.setSeconds(0, 0);
    if (word === "today" || word === "tonight") {
      d.setHours(word === "tonight" ? 21 : 18, 0);
    } else if (word === "tomorrow") {
      d.setDate(d.getDate() + 1); d.setHours(10, 0);
    } else if (word === "next week") {
      d.setDate(d.getDate() + 7); d.setHours(10, 0);
    } else if (/end of|eow/.test(word)) {
      d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7)); d.setHours(17, 0);
    } else if (m[2]) {
      var n = parseInt(m[2], 10);
      if (/h/.test(m[3])) d = new Date(d.getTime() + n * HOUR);
      else { d.setDate(d.getDate() + n); d.setHours(10, 0); }
    } else if (word in DOW) {
      var diff = (DOW[word] - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + diff); d.setHours(10, 0);
    }
    if (m[4]) {
      var h = parseInt(m[4], 10) % 12 + (m[6].toLowerCase() === "pm" ? 12 : 0);
      d.setHours(h, m[5] ? parseInt(m[5], 10) : 0);
    }
    return d.getTime();
  }

  function cleanAction(s) {
    return cap(s.replace(/^(todo|to-do|note)\s*:\s*/i, "")
      .replace(/^(i|we)\s+(need|have|must|should|will|want|plan|am going|are going)\s+(to\s+)?/i, "")
      .replace(/^(need|have|remember|plan|going)\s+to\s+/i, "")
      .replace(/[.!]+$/, ""));
  }

  function splitSentences(text) {
    return String(text || "")
      .split(/\n+|(?<=[.!?])\s+(?=[A-Z0-9"'])/)
      .map(function (s) { return s.replace(/^[-*•\s]+/, "").trim(); })
      .filter(function (s) { return s.length > 3; });
  }

  // Returns suggestion objects. Never invents: names, dates and wording all come from the note.
  function extract(text, event, noteId) {
    var out = [];
    var seenPeople = {};
    var base = now();
    splitSentences(text).forEach(function (s) {
      var names = [];
      var m;
      var lower = s.charAt(0).toLowerCase() + s.slice(1); // so "Met Ade" matches like "met Ade"
      NAME_RE.lastIndex = 0;
      while ((m = NAME_RE.exec(lower))) {
        var nm = m[1].trim().replace(/\s+(?:about|from|at|re|regarding)$/i, "");
        var parts = nm.split(/\s+/);
        if (parts[1] && NOT_NAMES.test(parts[1])) nm = parts[0];
        if (!NOT_NAMES.test(nm.split(/\s+/)[0])) names.push(nm);
      }
      // "Ade said..." / "Sam said..." mentions of someone already named earlier in the same note
      Object.keys(seenPeople).forEach(function (k) {
        if (new RegExp("\\b(" + k + "|" + k.split(" ")[0] + ")\\b").test(s) && names.indexOf(k) < 0) names.push(k);
      });
      var due = parseDue(s, base);
      var isIdea = IDEA_RE.test(s);
      var isAction = ACTION_RE.test(s);
      var isTakeaway = TAKEAWAY_RE.test(s);

      names.forEach(function (nm) {
        if (seenPeople[nm]) return;
        seenPeople[nm] = true;
        var existing = personByName(nm);
        var ctx = s.replace(/^(met|talked to|spoke with|spoke to|chatted with)\s+/i, "");
        out.push({ id: uid("sg"), type: "person", name: nm, text: nm, context: cap(ctx), source: s, eventId: event.id, noteId: noteId, existingId: existing ? existing.id : null });
      });

      if (isIdea && !/\b(need to|must|have to)\b/i.test(s)) {
        out.push({ id: uid("sg"), type: "idea", text: cap(s.replace(/^(idea|new idea)\s*:\s*/i, "").replace(/[.!]+$/, "")), source: s, eventId: event.id, noteId: noteId });
        return;
      }
      if (isAction) {
        var followName = names.filter(function (n) { return new RegExp("\\b(" + n + "|" + n.split(" ")[0] + ")\\b").test(s); })[0];
        var isFollow = !!followName && /\b(follow|send|email|e-mail|message|reply|call|share|ping|dm|text|thank)\b/i.test(s);
        var txt = cleanAction(s);
        if (isFollow && !/^(follow|send|email|e-mail|message|reply|call|ping|dm|text|thank)/i.test(txt)) {
          var what = s.match(/\b(?:share|send)\s+(?:me\s+|you\s+)?(?:the\s+|their\s+|his\s+|her\s+|my\s+)?([a-z][\w\s-]{2,30}?)(?=\s+(?:if|when|by|before)|[.,]|$)/i) ||
            s.match(/\babout\s+(?:the\s+|their\s+|our\s+)?([a-z][\w\s-]{2,30}?)(?=\s+(?:if|when|by|before)|[.,]|$)/i);
          txt = "Follow up with " + followName + (what ? " re: " + what[1].trim() : "");
        }
        if (due && !/\b(by|before)\b/i.test(txt)) txt += " — by " + fmtDue(due);
        out.push({ id: uid("sg"), type: "action", kind: isFollow ? "followup" : "task", personName: isFollow ? followName : null, text: txt.replace(/[.!]+$/, ""), due: due, source: s, eventId: event.id, noteId: noteId });
        if (!isTakeaway) return;
      }
      if (isTakeaway || (!isAction && !names.length && s.length > 24)) {
        out.push({ id: uid("sg"), type: "takeaway", text: cap(s.replace(/^(key takeaway|takeaway|learned that|learnt that|learned|til)\s*:?\s*/i, "").replace(/[.!]+$/, "")) + ".", source: s, eventId: event.id, noteId: noteId });
      }
    });
    return out;
  }

  /* ---------------- priority ---------------- */
  function scoreAction(a) {
    var score = 20, reasons = [];
    var t = now();
    var ev = eventById(a.eventId);
    if (a.snoozedUntil && a.snoozedUntil > t) return { score: -1, reasons: ["Snoozed until " + fmtDue(a.snoozedUntil)] };
    if (a.due) {
      var hrs = (a.due - t) / HOUR;
      if (hrs < 0) { score += 55; reasons.push({ w: 55, t: "<b>Overdue</b> by " + fmtLeft(a.due).replace(" overdue", "") }); }
      else if (hrs < 24) { score += 42; reasons.push({ w: 42, t: "Due in <b>" + Math.max(1, Math.round(hrs)) + " hrs</b> (" + fmtDue(a.due) + ")" }); }
      else if (hrs < 72) { score += 26; reasons.push({ w: 26, t: "Due " + fmtDue(a.due) }); }
      else { score += 8; reasons.push({ w: 8, t: "Due " + fmtDate(a.due) }); }
    }
    if (a.kind === "followup" && ev) {
      var windowEnd = ev.date + 48 * HOUR;
      var left = (windowEnd - t) / HOUR;
      if (left > 0) { score += 30; reasons.push({ w: 30, t: "<b>~" + Math.round(left) + " hrs left</b> in the 48-hour follow-up window" }); }
      else { score += 12; reasons.push({ w: 12, t: "Follow-up window closed " + Math.round(-left / 24 + 0.01) + "d ago — a late reply still beats none" }); }
    }
    if (a.kind === "experiment") { score += 14; reasons.push({ w: 14, t: "Keeps an idea from going cold" }); }
    var ageDays = (t - a.created) / DAY;
    if (ageDays > 1) { var w = Math.min(12, Math.round(ageDays * 2)); score += w; reasons.push({ w: w, t: "Waiting " + Math.round(ageDays) + " days" }); }
    reasons.sort(function (x, y) { return y.w - x.w; });
    return { score: Math.min(99, score), reasons: reasons.map(function (r) { return r.t; }) };
  }
  function openActions() {
    return state.items.filter(function (i) { return i.type === "action" && i.status === "open"; })
      .map(function (a) { var s = scoreAction(a); return { a: a, score: s.score, reasons: s.reasons }; })
      .sort(function (x, y) { return y.score - x.score; });
  }

  /* ---------------- undo + toast ---------------- */
  var undoSnap = null, toastTimer = null;
  function mutate(fn, msg) {
    var snap = clone(state);
    fn();
    save();
    undoSnap = snap;
    render();
    toast(msg, true);
  }
  function toast(msg, withUndo) {
    var el = $("#toast");
    $("#toastMsg").textContent = msg;
    $("#toastUndo").style.display = withUndo ? "" : "none";
    el.classList.add("is-shown");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("is-shown"); }, 5000);
  }
  $("#toastUndo").addEventListener("click", function () {
    if (!undoSnap) return;
    state = undoSnap; undoSnap = null; save(); render();
    toast("Undone", false);
  });

  /* ---------------- views ---------------- */
  var VIEWS = [
    { id: "capture", code: "P1", label: "Capture & Reflect" },
    { id: "review", code: "AI", label: "AI Review" },
    { id: "today", code: "APP", label: "Do This First" },
    { id: "ideas", code: "P2", label: "Ideas" },
    { id: "people", code: "P3", label: "People" },
    { id: "progress", code: "ROI", label: "Progress" }
  ];
  function currentView() {
    var h = (location.hash || "").replace("#", "");
    return VIEWS.some(function (v) { return v.id === h; }) ? h : "today";
  }

  // Per-section art direction: hero photo (same as the showcase card), colours, giant title, pills.
  var IMG = "../showcase/assets/";
  var META = {
    capture: { img: "6ab392697fe7cc9c077d1bb5_HeyGluco_2_hover.jpg", bg: "#f6c9c7", accent: "#ff5400", title: "Capture", pills: ["P1 · Student attendee", "Notes + reflection", "After the event"], tags: ["Event reflection", "Notes & takeaways", "Quick capture"] },
    review: { img: "feature-ai-engine.jpg", fit: "contain", bg: "#fefefe", accent: "#ff5400", ink: "#ff5400", title: "AI Review", pills: ["AI · Action engine", "Human approval", "Zero invention"], tags: ["Smart extraction", "Source-linked", "You decide"] },
    today: { img: "feature-do-this-first.jpg", bg: "#d9b791", accent: "#ff5400", title: "Do this first", pills: ["APP · Live prototype", "One next step", "48-hour window"], tags: ["Priority score", "Clear reason", "Momentum"] },
    ideas: { img: "persona-builder.jpg", fit: "contain", bg: "#fffedf", accent: "#ff5400", ink: "#ff5400", title: "Ideas", pills: ["P2 · Builder / early pro", "Idea → experiment", "3-day first step"], tags: ["Idea inbox", "Experiments", "Park or archive"] },
    people: { img: "persona-networker.jpg", fit: "contain", bg: "#ffffff", accent: "#ff5400", ink: "#121213", title: "People", pills: ["P3 · Networker / founder", "Context + follow-up", "Drafts from your notes"], tags: ["Contact cards", "Follow-up status", "Reminders"] },
    progress: { img: "feature-targets.jpg", fit: "contain", bg: "#fefefe", accent: "#ff5400", ink: "#ff5400", title: "Progress", pills: ["ROI · 30-day targets", "Live numbers", "Outcomes per event"], tags: ["Acceptance rate", "Event-to-outcome", "72-hour follow-ups"] }
  };
  var SQUIGGLE = '<path d="M25.002 153.857C25.002 153.857 151.002 -28.0122 236.002 40.3572C351.002 132.857 -86.2292 534.598 62.5019 617.857C173.257 679.857 466.502 -70.1428 646.002 40.3572C889.446 190.221 -74.3269 862.107 151.002 983.857C337.002 1084.36 526.502 453.148 665.002 551.357C803.502 649.566 415.502 926.187 501.002 983.857C586.502 1041.53 703.002 794.357 703.002 794.357" stroke="currentColor" stroke-width="50" stroke-linecap="round"/>';

  function head(kicker, title, sub) {
    var m = META[currentView()];
    var ev = currentEvent();
    return '<div class="view-head"><div class="view-meta" data-reveal><span>' + esc(kicker) + '</span>' +
      '<label class="event-pick">Working on event<select id="eventSelect" aria-label="Current event"></select></label>' +
      (ev && ev.goal ? '<span style="font-size:15px;font-weight:400">Goal: ' + esc(ev.goal) + "</span>" : "") + "</div>" +
      '<div><h2 class="view-title" data-split>' + title + '</h2><p class="view-sub" data-reveal>' + sub + "</p>" +
      '<div class="view-tags" data-reveal>' + m.tags.map(function (t) { return '<span class="view-tag">' + esc(t) + "</span>"; }).join("") + "</div></div></div>" +
      '<div class="board">';
  }
  function grip(tagHtml, right) {
    return '<svg class="card-squiggle" viewBox="0 0 728 1020" fill="none" aria-hidden="true">' + SQUIGGLE + "</svg>" +
      '<div class="card-grip"><span>' + tagHtml + '</span><span style="display:flex;align-items:center;gap:8px">' + (right || "") + '<span class="grip-dots" aria-hidden="true"></span></span></div>';
  }
  function cardAttrs(kind, id, label) {
    return ' data-kind="' + kind + '" data-id="' + esc(id) + '" tabindex="0" role="group" aria-roledescription="draggable card" aria-label="' + esc(label) + '" aria-describedby="kbdHelp"';
  }
  function sourceHtml(src, eventId) {
    if (!src) return "";
    var ev = eventById(eventId);
    return '<div class="source"><b>Source' + (ev ? " · " + esc(ev.name) : "") + ":</b> “" + esc(src) + "”</div>";
  }

  var ZONES = {};
  function zone(id, label, desc, icon, tone, accepts, run) { return { id: id, label: label, desc: desc, icon: icon, tone: tone, accepts: accepts, run: run }; }

  /* ---- P1 Capture ---- */
  function viewCapture() {
    var ev = currentEvent();
    var d = state.drafts;
    var takeaways = itemsOf("takeaway", ev && ev.id);
    var notes = state.notes.filter(function (n) { return ev && n.eventId === ev.id; });
    var html = head("P1 · Student attendee", "Capture &amp; reflect", "Jot down what happened while it’s fresh. Fill a card, then <b>drag it onto a zone</b> to save it — there are no save buttons here.");
    html += '<div class="capture-grid">';
    html += '<article class="card form-card"' + cardAttrs("event-draft", "draft-event", "New event card") + ">" + grip('<span class="tag muted">New event</span>') +
      '<div class="field"><label for="evName">Event name</label><input id="evName" data-draft="event.name" value="' + esc(d.event.name) + '" placeholder="e.g. React Conf 2026"></div>' +
      '<div class="field-row"><div class="field"><label for="evDate">Date</label><input id="evDate" type="date" data-draft="event.date" value="' + esc(d.event.date) + '"></div>' +
      '<div class="field"><label for="evType">Type</label><select id="evType" data-draft="event.type">' +
      ["Meetup", "Hackathon", "Workshop", "Conference", "Talk", "Other"].map(function (t) { return "<option" + (d.event.type === t ? " selected" : "") + ">" + t + "</option>"; }).join("") +
      "</select></div></div>" +
      '<div class="field"><label for="evGoal">What did you hope to get out of it?</label><input id="evGoal" data-draft="event.goal" value="' + esc(d.event.goal) + '" placeholder="e.g. find a mentor"></div>' +
      '<div class="drag-cue">Drag onto “Create event”</div></article>';

    html += '<article class="card form-card"' + cardAttrs("note-draft", "draft-note", "Note card for " + (ev ? ev.name : "event")) + ">" +
      grip('<span class="tag">Note · ' + esc(ev ? ev.name : "No event") + "</span>") +
      '<div class="field"><label for="ntText">Raw notes — messy is fine</label><textarea id="ntText" rows="5" data-draft="note.text" placeholder="Met Sam from Acme, building a payments API. Said to email them by Friday. Learned that…">' + esc(d.note.text) + "</textarea></div>" +
      '<div class="field"><label for="q1">What did you learn or find surprising?</label><input id="q1" data-draft="note.q1" value="' + esc(d.note.q1) + '"></div>' +
      '<div class="field-row"><div class="field"><label for="q2">Who do you want to follow up with?</label><input id="q2" data-draft="note.q2" value="' + esc(d.note.q2) + '" placeholder="e.g. Sam, about the API beta"></div>' +
      '<div class="field"><label for="q3">One thing you’ll do in the next 48 hours</label><input id="q3" data-draft="note.q3" value="' + esc(d.note.q3) + '" placeholder="e.g. practise SQL joins"></div></div>' +
      '<div class="drag-cue">Drag onto “Extract with AI” or “Save note only”</div></article>';
    html += "</div>";

    html += '<div class="section-label">Saved for ' + esc(ev ? ev.name : "") + "</div>";
    if (!takeaways.length && !notes.length) html += '<div class="empty">Nothing saved for this event yet.</div>';
    html += '<div class="card-grid">';
    takeaways.forEach(function (t) {
      html += '<article class="card is-static">' + grip('<span class="tag takeaway">Takeaway</span>') + '<p class="card-title">' + esc(t.text) + "</p>" + sourceHtml(t.source, t.eventId) + "</article>";
    });
    notes.forEach(function (n) {
      html += '<article class="card is-static">' + grip('<span class="tag muted">Note · ' + esc(ago(n.created)) + "</span>") + '<p class="card-text">' + esc(n.text).slice(0, 260) + (n.text.length > 260 ? "…" : "") + "</p></article>";
    });
    html += "</div>";

    ZONES = [
      zone("create-event", "Create event", "Drop the new-event card to add it", "+", "accent", ["event-draft"], createEvent),
      zone("extract", "Extract with AI", "Drop a note: AI suggests takeaways, people, ideas, actions", "✨", "accent", ["note-draft"], function () { saveNote(true); }),
      zone("save-note", "Save note only", "Keep the raw note without suggestions", "↓", "", ["note-draft"], function () { saveNote(false); })
    ];
    return html;
  }

  function createEvent() {
    var d = state.drafts.event;
    if (!d.name.trim()) { toast("Give the event a name first", false); $("#evName") && $("#evName").focus(); return false; }
    mutate(function () {
      var ts = d.date ? new Date(d.date + "T18:00").getTime() : now();
      var ev = { id: uid("ev"), name: d.name.trim(), date: ts, type: d.type, goal: d.goal.trim(), created: now() };
      state.events.unshift(ev);
      state.currentEventId = ev.id;
      state.drafts.event = { name: "", date: dateInputValue(now()), type: "Meetup", goal: "" };
      logEvent("Created event “" + ev.name + "”");
    }, "Event created — now capture your notes");
  }

  function saveNote(withAI) {
    var ev = currentEvent();
    var d = state.drafts.note;
    var parts = [d.text.trim()];
    if (!parts[0] && !d.q1.trim() && !d.q2.trim() && !d.q3.trim()) { toast("Write a note or answer a reflection question first", false); $("#ntText") && $("#ntText").focus(); return false; }
    var created = 0;
    mutate(function () {
      var noteText = d.text.trim();
      var note = { id: uid("nt"), eventId: ev.id, text: noteText, reflection: { q1: d.q1, q2: d.q2, q3: d.q3 }, created: now() };
      state.notes.unshift(note);
      if (withAI) {
        var sug = extract(noteText, ev, note.id);
        if (d.q1.trim()) {
          sug.push({ id: uid("sg"), type: "takeaway", text: cap(d.q1.trim().replace(/[.!]+$/, "")) + ".", source: "Reflection: " + d.q1.trim(), eventId: ev.id, noteId: note.id });
        }
        if (d.q2.trim()) {
          var q2 = /\b(met|talk|spoke|follow|email|message|call|send)\b/i.test(d.q2) ? d.q2 : "Follow up with " + d.q2;
          extract(q2, ev, note.id).forEach(function (s) {
            s.source = "Reflection: " + d.q2.trim();
            if (!sug.some(function (x) { return x.type === s.type && x.text.toLowerCase() === s.text.toLowerCase(); })) sug.push(s);
          });
        }
        if (d.q3.trim()) {
          var due = parseDue(d.q3) || (now() + 48 * HOUR);
          sug.push({ id: uid("sg"), type: "action", kind: "task", text: cleanAction(d.q3.trim()), due: due, source: "Reflection: " + d.q3.trim(), eventId: ev.id, noteId: note.id });
        }
        created = sug.length;
        state.suggestions = sug.concat(state.suggestions);
        logEvent("Captured notes for “" + ev.name + "” — " + created + " suggestions");
      } else {
        logEvent("Saved a note for “" + ev.name + "”");
      }
      state.drafts.note = { text: "", q1: "", q2: "", q3: "" };
    }, withAI ? "Extracted suggestions — review them before they’re saved" : "Note saved");
    if (withAI) location.hash = "#review";
  }

  /* ---- AI Review ---- */
  function viewReview() {
    var ev = currentEvent();
    var list = state.suggestions;
    var html = head("AI · Action engine & trust", "If AI proposes it, you decide it", "The engine read your notes and proposed these cards. Click any text to edit it. <b>Nothing is saved until you drop it on “Accept &amp; save”.</b>");
    html += '<div class="trust"><div><b>Traceable</b>Every card shows the exact sentence it came from.</div><div><b>No invention</b>Names, dates and deadlines only come from your words.</div><div><b>You approve</b>Accept or reject each card — one drag at a time.</div></div>';
    html += '<div class="section-label">' + list.length + " waiting for review</div>";
    if (!list.length) {
      html += '<div class="empty">No suggestions waiting. <a href="#capture">Capture some notes</a> and drop them on “Extract with AI”.</div>';
    }
    html += '<div class="card-grid">';
    list.forEach(function (s) {
      var tagCls = s.type === "action" ? "" : s.type;
      var label = s.type === "action" ? (s.kind === "followup" ? "Follow-up" : "Action") : s.type === "person" ? (s.existingId ? "Person · known" : "Person") : cap(s.type);
      html += '<article class="card"' + cardAttrs("suggestion", s.id, label + ": " + s.text) + ">" + grip('<span class="tag ' + tagCls + '">' + esc(label) + "</span>") +
        '<p class="card-title editable" contenteditable="true" spellcheck="false" data-edit="' + esc(s.id) + '">' + esc(s.text) + "</p>" +
        (s.type === "person" && s.context ? '<p class="card-text">' + esc(s.context) + "</p>" : "") +
        '<div class="card-meta">' + (s.due ? "<span>Due <strong>" + esc(fmtDue(s.due)) + "</strong></span>" : "") + (s.personName ? "<span>With <strong>" + esc(s.personName) + "</strong></span>" : "") + "</div>" +
        sourceHtml(s.source, s.eventId) + "</article>";
    });
    html += "</div>";
    ZONES = [
      zone("accept", "Accept & save", "Adds the card to your event record", "✓", "good", ["suggestion"], acceptSuggestion),
      zone("reject", "Reject", "Discard it — the AI got this one wrong", "✕", "bad", ["suggestion"], rejectSuggestion)
    ];
    return html;
  }

  function takeSuggestion(id) {
    var idx = -1;
    state.suggestions.forEach(function (s, i) { if (s.id === id) idx = i; });
    return idx < 0 ? null : state.suggestions.splice(idx, 1)[0];
  }
  function acceptSuggestion(id) {
    var s = state.suggestions.filter(function (x) { return x.id === id; })[0];
    if (!s) return false;
    var msg = "Saved";
    mutate(function () {
      takeSuggestion(id);
      var base = { id: uid(s.type.slice(0, 2)), eventId: s.eventId, noteId: s.noteId, text: s.text.trim(), source: s.source, created: now() };
      if (s.type === "person") {
        if (s.existingId) {
          var p = itemById(s.existingId);
          if (p) p.context = (p.context ? p.context + " " : "") + s.context;
          msg = "Added context to " + s.name;
        } else {
          state.items.push(Object.assign(base, { type: "person", name: s.text.trim(), context: s.context, follow: "todo" }));
          msg = s.text.trim() + " added to People";
        }
        // link any open follow-ups waiting for this person
        var person = personByName(s.text.trim());
        state.items.forEach(function (i) { if (i.type === "action" && !i.personId && i.personName && person && i.personName.toLowerCase() === person.name.toLowerCase()) i.personId = person.id; });
      } else if (s.type === "action") {
        var pp = s.personName ? personByName(s.personName) : null;
        state.items.push(Object.assign(base, { type: "action", kind: s.kind || "task", status: "open", due: s.due || null, personName: s.personName || null, personId: pp ? pp.id : null }));
        msg = "Action added to your queue";
      } else if (s.type === "idea") {
        state.items.push(Object.assign(base, { type: "idea", status: "inbox" }));
        msg = "Idea saved to the inbox";
      } else {
        state.items.push(Object.assign(base, { type: "takeaway" }));
        msg = "Takeaway saved";
      }
      state.stats.accepted++;
      if (!state.stats.firstAcceptAt[s.eventId]) state.stats.firstAcceptAt[s.eventId] = now();
      logEvent("Accepted " + s.type + ": " + s.text.trim());
    }, msg);
  }
  function rejectSuggestion(id) {
    var s = state.suggestions.filter(function (x) { return x.id === id; })[0];
    if (!s) return false;
    mutate(function () { takeSuggestion(id); state.stats.rejected++; }, "Rejected — it won’t be saved");
  }

  /* ---- APP Do this first ---- */
  function viewToday() {
    var ranked = openActions();
    var active = ranked.filter(function (r) { return r.score >= 0; });
    var snoozed = ranked.filter(function (r) { return r.score < 0; });
    var done = state.items.filter(function (i) { return i.type === "action" && i.status === "done"; }).sort(function (a, b) { return b.doneAt - a.doneAt; });
    var html = head("APP · Live prototype", "Do this first", "One clear next step, ranked by deadlines and the 48-hour follow-up window. <b>Drag it to “Done”</b> when it’s finished and the queue re-ranks.");
    if (!active.length) {
      html += '<div class="empty">You’re all caught up. <a href="#capture">Capture another event</a> or turn an <a href="#ideas">idea</a> into an experiment.</div>';
    } else {
      var top = active[0];
      var p = top.a.personId ? itemById(top.a.personId) : null;
      html += '<article class="card first-card"' + cardAttrs("action", top.a.id, "Do this first: " + top.a.text) + ">" + grip('<span class="tag">Do this first</span>', '<span class="score">' + top.score + "<small>/99</small></span>") +
        '<h2 class="card-title">' + esc(top.a.text) + "</h2>" +
        '<div class="why"><b>Why:</b> ' + top.reasons.slice(0, 2).join(" · ") + "</div>" +
        '<div class="card-meta"><span>Event <strong>' + esc((eventById(top.a.eventId) || {}).name || "") + "</strong></span>" +
        (p ? "<span>Person <strong>" + esc(p.name) + "</strong></span>" : "") +
        (top.a.due ? "<span><strong>" + esc(fmtLeft(top.a.due)) + "</strong></span>" : "") +
        "<span>Source <strong>“" + esc((top.a.source || "").slice(0, 70)) + ((top.a.source || "").length > 70 ? "…" : "") + "”</strong></span></div></article>";
    }
    if (active.length > 1) {
      html += '<div class="section-label">Up next · ' + (active.length - 1) + "</div><div class=\"card-grid\">";
      active.slice(1).forEach(function (r) { html += actionCard(r); });
      html += "</div>";
    }
    if (snoozed.length) {
      html += '<div class="section-label">Snoozed</div><div class="card-grid">';
      snoozed.forEach(function (r) { html += actionCard(r); });
      html += "</div>";
    }
    if (done.length) {
      html += '<div class="section-label">Done · ' + done.length + '</div><div class="card-grid">';
      done.slice(0, 6).forEach(function (a) {
        html += '<article class="card is-static">' + grip('<span class="tag done">Done</span>') + '<p class="card-title" style="text-decoration:line-through;text-decoration-color:rgba(0,0,0,.3)">' + esc(a.text) + '</p><div class="card-meta"><span>' + esc(ago(a.doneAt)) + "</span></div></article>";
      });
      html += "</div>";
    }
    ZONES = [
      zone("done", "Done", "Mark complete — progress updates", "✓", "good", ["action"], completeAction),
      zone("snooze", "Snooze 1 day", "Push it to tomorrow", "⏱", "", ["action"], snoozeAction),
      zone("drop", "Let it go", "Remove it from the queue", "✕", "bad", ["action"], dropAction)
    ];
    return html;
  }
  function actionCard(r) {
    var a = r.a;
    var p = a.personId ? itemById(a.personId) : null;
    var label = a.kind === "followup" ? "Follow-up" : a.kind === "experiment" ? "Experiment" : "Action";
    return '<article class="card"' + cardAttrs("action", a.id, label + ": " + a.text) + ">" + grip('<span class="tag' + (a.kind === "experiment" ? " idea" : "") + '">' + label + "</span>", '<span class="score">' + (r.score < 0 ? "–" : r.score) + "</span>") +
      '<p class="card-title">' + esc(a.text) + "</p>" +
      '<p class="card-text">' + (r.reasons[0] || "") + "</p>" +
      '<div class="card-meta"><span>' + esc((eventById(a.eventId) || {}).name || "") + "</span>" + (p ? "<span>with <strong>" + esc(p.name) + "</strong></span>" : "") + (a.due ? "<span>" + esc(fmtLeft(a.due)) + "</span>" : "") + "</div></article>";
  }
  function completeAction(id) {
    var a = itemById(id); if (!a) return false;
    mutate(function () {
      a.status = "done"; a.doneAt = now(); a.snoozedUntil = null;
      if (a.personId) { var p = itemById(a.personId); if (p) { p.follow = "sent"; p.sentAt = now(); } }
      if (a.ideaId) { var i = itemById(a.ideaId); if (i) i.status = "tested"; }
      logEvent("Completed: " + a.text);
    }, "Done! Nice follow-through");
  }
  function snoozeAction(id) {
    var a = itemById(id); if (!a) return false;
    mutate(function () { a.snoozedUntil = now() + DAY; }, "Snoozed until tomorrow");
  }
  function dropAction(id) {
    var a = itemById(id); if (!a) return false;
    mutate(function () { a.status = "dropped"; logEvent("Let go: " + a.text); }, "Removed from your queue");
  }

  /* ---- P2 Ideas ---- */
  function viewIdeas() {
    var inbox = itemsOf("idea").filter(function (i) { return i.status === "inbox"; });
    var exps = itemsOf("idea").filter(function (i) { return i.status === "experiment" || i.status === "tested"; });
    var parked = itemsOf("idea").filter(function (i) { return i.status === "parked"; });
    var html = head("P2 · Builder / early pro", "Idea inbox", "Ideas from your events, waiting for a decision. <b>Drag one onto “Run an experiment”</b> and Cadence creates a small first step with a 3-day deadline.");
    html += '<div class="section-label">Inbox · ' + inbox.length + "</div>";
    if (!inbox.length) html += '<div class="empty">No new ideas. Ideas you accept in <a href="#review">AI Review</a> land here.</div>';
    html += '<div class="card-grid">';
    inbox.forEach(function (i) {
      html += '<article class="card"' + cardAttrs("idea", i.id, "Idea: " + i.text) + ">" + grip('<span class="tag idea">Idea</span>') + '<p class="card-title">' + esc(i.text) + "</p>" + '<div class="card-meta"><span>' + esc((eventById(i.eventId) || {}).name || "") + "</span><span>" + esc(ago(i.created)) + "</span></div>" + sourceHtml(i.source, i.eventId) + "</article>";
    });
    html += "</div>";
    if (exps.length) {
      html += '<div class="section-label">Experiments</div><div class="card-grid">';
      exps.forEach(function (i) {
        var a = i.actionId ? itemById(i.actionId) : null;
        html += '<article class="card is-static">' + grip('<span class="tag ' + (i.status === "tested" ? "done" : "idea") + '">' + (i.status === "tested" ? "Tested" : "Running") + "</span>") + '<p class="card-title">' + esc(i.text) + "</p>" + (a ? '<p class="card-text">First step: ' + esc(a.text.replace(/^Experiment: /, "")) + (a.status === "open" && a.due ? " · " + esc(fmtLeft(a.due)) : "") + "</p>" : "") + "</article>";
      });
      html += "</div>";
    }
    if (parked.length) {
      html += '<div class="section-label">Parked for later</div><div class="card-grid">';
      parked.forEach(function (i) {
        html += '<article class="card"' + cardAttrs("idea", i.id, "Parked idea: " + i.text) + ">" + grip('<span class="tag muted">Parked</span>') + '<p class="card-title">' + esc(i.text) + "</p></article>";
      });
      html += "</div>";
    }
    ZONES = [
      zone("experiment", "Run an experiment", "Creates a first step due in 3 days", "⚗", "accent", ["idea"], ideaToExperiment),
      zone("park", "Park for later", "Keep it, decide another day", "⧗", "", ["idea"], function (id) { setIdea(id, "parked", "Parked for later"); }),
      zone("archive", "Archive", "Not worth pursuing right now", "↓", "bad", ["idea"], function (id) { setIdea(id, "archived", "Archived"); })
    ];
    return html;
  }
  function ideaToExperiment(id) {
    var i = itemById(id); if (!i) return false;
    mutate(function () {
      var a = { id: uid("ac"), type: "action", kind: "experiment", ideaId: i.id, eventId: i.eventId, noteId: i.noteId, text: "Experiment: build the smallest version of “" + i.text + "”", source: i.source, status: "open", due: now() + 3 * DAY, created: now() };
      state.items.push(a);
      i.status = "experiment"; i.actionId = a.id;
      logEvent("Started experiment: " + i.text);
    }, "Experiment added to Do This First");
  }
  function setIdea(id, status, msg) {
    var i = itemById(id); if (!i) return false;
    mutate(function () { i.status = status; }, msg);
  }

  /* ---- P3 People ---- */
  function followMessage(p) {
    var ev = eventById(p.eventId);
    var open = state.items.filter(function (i) { return i.type === "action" && i.status === "open" && i.personId === p.id; })[0];
    var about = p.context ? p.context.replace(/[.!]+$/, "").replace(/^(who is|who's)\s+/i, "") : "";
    return "Hi " + p.name.split(" ")[0] + ",\n\nGreat meeting you at " + (ev ? ev.name : "the event") + "." +
      (about ? " I enjoyed our chat — " + about.charAt(0).toLowerCase() + about.slice(1) + "." : "") +
      (open ? "\n\n" + open.text.replace(/ — by .*$/, "").replace(/^Follow up with [^ ]+( re:)?/i, "Following up on") + "." : "") +
      "\n\nWould love to stay in touch.\n\nBest,";
  }
  function viewPeople() {
    var people = itemsOf("person").slice().sort(function (a, b) {
      var order = { todo: 0, drafted: 1, sent: 2 };
      return order[a.follow] - order[b.follow];
    });
    var html = head("P3 · Networker / founder", "People to follow up", "Who you met, why they matter and when to reach out. <b>Drag a person onto “Draft follow-up”</b> to get a message written from your own notes.");
    if (!people.length) html += '<div class="empty">No people yet. Accept person suggestions in <a href="#review">AI Review</a>.</div>';
    html += '<div class="card-grid">';
    people.forEach(function (p) {
      var ev = eventById(p.eventId);
      var windowEnd = ev ? ev.date + 48 * HOUR : null;
      var status = p.follow === "sent" ? '<span class="tag done">Followed up</span>' : p.follow === "drafted" ? '<span class="tag">Draft ready</span>' : '<span class="tag person">To follow up</span>';
      var windowTxt = p.follow === "sent" ? "Sent " + ago(p.sentAt) : windowEnd ? (windowEnd > now() ? fmtLeft(windowEnd) + " in 48h window" : "48h window passed") : "";
      html += '<article class="card"' + cardAttrs("person", p.id, "Person: " + p.name) + ">" + grip(status) +
        '<p class="card-title">' + esc(p.name) + "</p>" +
        '<p class="card-text">' + esc(p.context || "") + "</p>" +
        '<div class="card-meta"><span>Met at <strong>' + esc(ev ? ev.name : "") + "</strong></span><span>" + esc(windowTxt) + "</span>" + (p.remindAt && p.follow !== "sent" ? "<span>Reminder <strong>" + esc(fmtDue(p.remindAt)) + "</strong></span>" : "") + "</div>" +
        (state.messages[p.id] != null ? '<div class="draft-box"><textarea data-msg="' + esc(p.id) + '" aria-label="Follow-up draft for ' + esc(p.name) + '">' + esc(state.messages[p.id]) + "</textarea></div>" : "") +
        "</article>";
    });
    html += "</div>";
    ZONES = [
      zone("draft", "Draft follow-up", "Writes a message from your notes (copied to clipboard)", "✎", "accent", ["person"], draftFollowUp),
      zone("sent", "Mark followed up", "Logs it and closes their follow-up", "✓", "good", ["person"], markFollowed),
      zone("remind", "Remind in 2 days", "Adds a follow-up to Do This First", "⏰", "", ["person"], remindPerson)
    ];
    return html;
  }
  function draftFollowUp(id) {
    var p = itemById(id); if (!p) return false;
    var msg = state.messages[p.id] || followMessage(p);
    mutate(function () {
      state.messages[p.id] = msg;
      if (p.follow !== "sent") p.follow = "drafted";
    }, "Draft ready for " + p.name + " — edit it on the card");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(msg).then(function () { toast("Draft for " + p.name + " copied to clipboard", true); }, function () { /* clipboard blocked */ });
    }
  }
  function markFollowed(id) {
    var p = itemById(id); if (!p) return false;
    mutate(function () {
      p.follow = "sent"; p.sentAt = now();
      state.items.forEach(function (i) { if (i.type === "action" && i.status === "open" && i.personId === p.id && i.kind === "followup") { i.status = "done"; i.doneAt = now(); } });
      logEvent("Followed up with " + p.name);
    }, "Followed up with " + p.name);
  }
  function remindPerson(id) {
    var p = itemById(id); if (!p) return false;
    mutate(function () {
      var due = now() + 2 * DAY;
      p.remindAt = due;
      var open = state.items.filter(function (i) { return i.type === "action" && i.status === "open" && i.personId === p.id; })[0];
      if (open) open.due = due;
      else state.items.push({ id: uid("ac"), type: "action", kind: "followup", personId: p.id, eventId: p.eventId, noteId: p.noteId, text: "Follow up with " + p.name, source: p.source, status: "open", due: due, created: now() });
    }, "Reminder set for " + fmtDue(now() + 2 * DAY));
  }

  /* ---- ROI Progress ---- */
  function viewProgress() {
    var actions = itemsOf("action").filter(function (a) { return a.status !== "dropped"; });
    var doneA = actions.filter(function (a) { return a.status === "done"; });
    var people = itemsOf("person");
    var within = people.filter(function (p) { var ev = eventById(p.eventId); return p.follow === "sent" && ev && p.sentAt - ev.date <= 72 * HOUR; });
    var totalReviewed = state.stats.accepted + state.stats.rejected;
    var accRate = totalReviewed ? state.stats.accepted / totalReviewed : 0;
    var evOutcome = state.events.filter(function (e) { return doneA.some(function (a) { return a.eventId === e.id; }); });
    var firstTimes = state.events.filter(function (e) { return !e.seeded; }).map(function (e) { return state.stats.firstAcceptAt[e.id] ? (state.stats.firstAcceptAt[e.id] - e.created) / 60000 : null; }).filter(function (x) { return x != null && x >= 0; });

    function metric(value, label, target, ratio, targetRatio, met) {
      return '<div class="metric' + (met ? " is-met" : "") + '"><div class="metric-value">' + value + '</div><div class="metric-label">' + label + '</div><div class="metric-target">' + target + "</div>" +
        '<div class="bar"><div class="bar-fill" style="width:' + Math.round(Math.min(1, ratio) * 100) + '%"></div>' + (targetRatio != null ? '<div class="bar-target" style="left:' + Math.round(targetRatio * 100) + '%"></div>' : "") + "</div></div>";
    }
    var pct = function (x) { return Math.round(x * 100) + "%"; };
    var html = head("ROI · Impact & 30-day targets", "Is it paying off?", "Live numbers from your own events, measured against the targets from our plan. Everything here updates as you drag cards elsewhere.");
    html += '<div class="metrics">' +
      metric(pct(accRate), "Extraction acceptance rate", "Target ≥ 60% · " + state.stats.accepted + " of " + totalReviewed + " accepted", accRate, 0.6, accRate >= 0.6) +
      metric(pct(state.events.length ? evOutcome.length / state.events.length : 0), "Event-to-outcome rate", "Target ≥ 50% · " + evOutcome.length + " of " + state.events.length + " events with a finished action", state.events.length ? evOutcome.length / state.events.length : 0, 0.5, state.events.length && evOutcome.length / state.events.length >= 0.5) +
      metric(pct(people.length ? within.length / people.length : 0), "Followed up within 72 hrs", "Target ≥ 40% · " + within.length + " of " + people.length + " contacts", people.length ? within.length / people.length : 0, 0.4, people.length && within.length / people.length >= 0.4) +
      metric(doneA.length + "/" + actions.length, "Actions completed", actions.length - doneA.length + " still open", actions.length ? doneA.length / actions.length : 0, null, actions.length && doneA.length === actions.length) +
      (firstTimes.length ? metric(Math.round(Math.min.apply(null, firstTimes)) + "m", "Fastest event → first accepted item", "Target < 5 min", Math.min(1, 5 / Math.max(5, Math.min.apply(null, firstTimes))), null, Math.min.apply(null, firstTimes) < 5) : "") +
      "</div>";
    html += '<div class="section-label">By event</div><table class="table"><thead><tr><th>Event</th><th>Date</th><th>People</th><th>Ideas</th><th>Actions done</th></tr></thead><tbody>';
    state.events.forEach(function (e) {
      var acts = actions.filter(function (a) { return a.eventId === e.id; });
      html += "<tr><td>" + esc(e.name) + "</td><td>" + esc(fmtDate(e.date)) + "</td><td>" + itemsOf("person", e.id).length + "</td><td>" + itemsOf("idea", e.id).length + "</td><td>" + acts.filter(function (a) { return a.status === "done"; }).length + " / " + acts.length + "</td></tr>";
    });
    html += "</tbody></table>";
    html += '<div class="section-label">Recent activity</div><ul class="timeline">' + state.log.slice(0, 10).map(function (l) {
      return "<li><time>" + esc(ago(l.t)) + "</time><span>" + esc(l.text) + "</span></li>";
    }).join("") + "</ul>";
    ZONES = [];
    return html;
  }

  /* ---------------- render ---------------- */
  var RENDER = { capture: viewCapture, review: viewReview, today: viewToday, ideas: viewIdeas, people: viewPeople, progress: viewProgress };

  function renderTabs(view) {
    var counts = {
      review: state.suggestions.length,
      today: openActions().filter(function (r) { return r.score >= 0; }).length,
      ideas: itemsOf("idea").filter(function (i) { return i.status === "inbox"; }).length,
      people: itemsOf("person").filter(function (p) { return p.follow !== "sent"; }).length
    };
    $("#tabs").innerHTML = VIEWS.map(function (v) {
      return '<a class="tab" href="#' + v.id + '"' + (v.id === view ? ' aria-current="page"' : "") + '><span class="code">' + v.code + "</span>" + esc(v.label) + (counts[v.id] ? '<span class="count">' + counts[v.id] + "</span>" : "") + "</a>";
    }).join("");
    $("#menuList").innerHTML = VIEWS.map(function (v) {
      return '<li><a href="#' + v.id + '"' + (v.id === view ? ' aria-current="page"' : "") + "><small>" + v.code + "</small>" + esc(v.label) + "</a></li>";
    }).join("");
    var idx = VIEWS.map(function (v) { return v.id; }).indexOf(view);
    var nxt = VIEWS[(idx + 1) % VIEWS.length];
    var nx = $("#next");
    nx.href = "#" + nxt.id;
    nx.innerHTML = "<small>Next feature · " + nxt.code + "</small><span>" + esc(nxt.label) + " →</span>";
  }
  function renderEvents() {
    var sel = $("#eventSelect");
    if (!sel) return;
    sel.innerHTML = state.events.map(function (e) { return '<option value="' + esc(e.id) + '"' + (e.id === state.currentEventId ? " selected" : "") + ">" + esc(e.name) + "</option>"; }).join("");
  }
  function renderHero(view) {
    var m = META[view];
    var hero = $("#hero");
    hero.style.setProperty("--hero-bg", m.bg);
    hero.style.setProperty("--hero-accent", m.accent);
    hero.classList.toggle("is-contain", !!m.fit);
    hero.innerHTML = '<img class="hero-img" src="' + IMG + m.img + '" alt=""' + (m.fit ? ' style="object-fit:' + m.fit + ';object-position:center 30%"' : "") + ">" +
      '<svg class="hero-squiggle" viewBox="0 0 728 1020" fill="none" aria-hidden="true">' + SQUIGGLE + "</svg>" +
      '<div class="hero-pills">' + m.pills.map(function (p) { return '<span class="hero-pill">' + esc(p) + "</span>"; }).join("") + "</div>" +
      '<h1 class="hero-title"' + (m.ink ? ' style="color:' + m.ink + '"' : "") + '><span class="line-mask"><span class="hero-title-text">' + esc(m.title) + "</span></span></h1>";
    fitHeroTitle();
  }
  function fitHeroTitle() {
    var t = $(".hero-title-text");
    if (!t) return;
    var h1 = t.closest(".hero-title");
    h1.style.fontSize = "100px";
    var w = t.getBoundingClientRect().width || 1;
    var target = window.innerWidth * 0.92;
    var size = Math.min(100 * target / w, window.innerHeight * 0.42);
    h1.style.fontSize = size + "px";
  }
  function renderZones() {
    var el = $("#zones");
    if (!ZONES.length) {
      el.innerHTML = '<h2 class="zones-title">Action zones</h2><p class="zones-empty">This page is read-only — the numbers move when you drag cards in the other sections.</p>';
      return;
    }
    el.innerHTML = '<h2 class="zones-title">Action zones</h2><p class="zones-hint">Drag a card and drop it here. Keyboard: focus a card, press the zone’s number.</p>' +
      ZONES.map(function (z, i) {
        return '<div class="zone" data-zone="' + z.id + '" data-tone="' + z.tone + '" data-accepts="' + z.accepts.join(" ") + '"><div class="zone-icon" aria-hidden="true">' + z.icon + '</div><div><div class="zone-label">' + esc(z.label) + '</div><div class="zone-desc">' + esc(z.desc) + '</div></div><span class="zone-key">' + (i + 1) + "</span></div>";
      }).join("");
  }
  // full = a new section is shown (hero + intro animate); otherwise only the board refreshes after a drop.
  function render(full, noMotion) {
    var view = currentView();
    var scrollY = window.scrollY;
    if (full) renderHero(view);
    $("#canvas").innerHTML = RENDER[view]() + "</div>";
    renderZones();
    renderTabs(view);
    renderEvents();
    document.title = VIEWS.filter(function (v) { return v.id === view; })[0].label + " · Cadence";
    if (!full) window.scrollTo(0, scrollY);
    if (!noMotion) Motion.enter(full);
  }

  /* ---------------- inputs ---------------- */
  document.addEventListener("input", function (e) {
    var t = e.target;
    if (t.dataset.draft) {
      var path = t.dataset.draft.split(".");
      state.drafts[path[0]][path[1]] = t.value;
      save();
    } else if (t.dataset.msg) {
      state.messages[t.dataset.msg] = t.value;
      save();
    } else if (t.dataset.edit) {
      var s = state.suggestions.filter(function (x) { return x.id === t.dataset.edit; })[0];
      if (s) { s.text = t.textContent.replace(/\s+/g, " ").trim(); save(); }
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.target.dataset && e.target.dataset.edit && e.key === "Enter") { e.preventDefault(); e.target.blur(); }
  });
  document.addEventListener("change", function (e) {
    if (e.target.id !== "eventSelect") return;
    state.currentEventId = e.target.value; save(); render();
  });
  $("#resetDemo").addEventListener("click", function (e) {
    e.preventDefault();
    if (!confirm("Reset Cadence to the demo data? Your changes in this browser will be lost.")) return;
    try { localStorage.removeItem(STORE_KEY); } catch (err) { /* ignore */ }
    state = seed(); save(); render();
    toast("Demo data restored", false);
  });
  window.addEventListener("hashchange", function () {
    Motion.closeMenu();
    Motion.wipe(function () { Motion.scrollTop(); render(true); });
  });
  window.addEventListener("resize", fitHeroTitle);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitHeroTitle);

  /* ---------------- motion (GSAP + Lenis from the showcase page; everything degrades without them) ---------------- */
  var Motion = (function () {
    var G = window.gsap;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var on = !!G && !reduce;
    var lenis = null;
    var heroTriggers = [];
    if (on) G.set("#wipe", { y: 0, yPercent: 100 }); // GSAP owns the transform from here on
    if (on && window.ScrollTrigger) G.registerPlugin(window.ScrollTrigger);
    if (on && window.SplitText) G.registerPlugin(window.SplitText);

    if (on && window.Lenis) {
      lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
      if (window.ScrollTrigger) lenis.on("scroll", window.ScrollTrigger.update);
      G.ticker.add(function (t) { lenis.raf(t * 1000); });
      G.ticker.lagSmoothing(0);
    }

    function split(el, type) {
      if (!window.SplitText) return null;
      try { return new window.SplitText(el, { type: type, linesClass: "line-mask" }); } catch (e) { return null; }
    }

    function heroIn() {
      var hero = $("#hero");
      heroTriggers.forEach(function (t) { t.kill(); });
      heroTriggers = [];
      var title = $(".hero-title-text", hero);
      var s = title && split(title, "words,chars");
      fitHeroTitle();
      var tl = G.timeline({ defaults: { ease: "expo.out" } });
      tl.fromTo($(".hero-img", hero), { scale: 1.18 }, { scale: 1, duration: 1.6 }, 0);
      if (s) tl.from(s.chars, { yPercent: 115, rotate: 6, duration: 1.1, stagger: 0.035 }, 0.1);
      tl.to($(".hero-squiggle path", hero), { strokeDashoffset: 0, duration: 1.8, ease: "power2.inOut" }, 0.2);
      tl.from($all(".hero-pill", hero), { scale: 0, opacity: 0, duration: 0.9, stagger: 0.12, ease: "back.out(2)" }, 0.45);
      if (window.ScrollTrigger) {
        heroTriggers.push(G.to($(".hero-img", hero), { yPercent: 12, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } }).scrollTrigger);
        heroTriggers.push(G.to($(".hero-title", hero), { yPercent: -18, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } }).scrollTrigger);
        heroTriggers.push(G.to($all(".hero-pill", hero), { yPercent: -120, ease: "none", stagger: 0.1, scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } }).scrollTrigger);
      }
    }

    function introIn() {
      var h = $(".view-title");
      var s = h && split(h, "lines,words");
      var targets = s ? s.words : [h];
      G.from(targets, { yPercent: 110, opacity: 0, duration: 1, stagger: 0.04, ease: "expo.out", scrollTrigger: window.ScrollTrigger ? { trigger: h, start: "top 88%", once: true } : undefined });
      G.from($all("[data-reveal]"), { y: 30, opacity: 0, duration: 0.9, stagger: 0.1, ease: "expo.out", scrollTrigger: window.ScrollTrigger ? { trigger: ".view-head", start: "top 85%", once: true } : undefined });
      G.from($all(".view-tag"), { scale: 0.6, opacity: 0, duration: 0.7, stagger: 0.06, ease: "back.out(2)", delay: 0.2, scrollTrigger: window.ScrollTrigger ? { trigger: ".view-head", start: "top 85%", once: true } : undefined });
    }

    function boardIn(full) {
      var cards = $all(".board .card, .board .metric, .board .empty, .board .trust > div, .board .timeline li");
      if (full && window.ScrollTrigger) {
        G.set(cards, { y: 60, opacity: 0, rotate: 1.5 });
        window.ScrollTrigger.batch(cards, {
          start: "top 92%",
          once: true,
          onEnter: function (b) { G.to(b, { y: 0, opacity: 1, rotate: 0, duration: 1, stagger: 0.08, ease: "expo.out", overwrite: true }); }
        });
        G.fromTo($all(".zone"), { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.9, stagger: 0.08, ease: "expo.out", clearProps: "transform,opacity" });
        G.fromTo($all(".bar-fill"), { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: "expo.out", clearProps: "transform" });
      } else {
        G.fromTo(cards, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.025, ease: "power3.out", clearProps: "transform,opacity" });
      }
      // Failsafe: interactive elements must never stay hidden if a tween gets interrupted.
      clearTimeout(boardIn.t);
      boardIn.t = setTimeout(function () {
        $all(".zone").forEach(function (z) { if (getComputedStyle(z).opacity < 0.99 && !document.body.classList.contains("dragging")) G.set(z, { clearProps: "transform,opacity" }); });
        $all(".board .card").forEach(function (c) { if (c.getBoundingClientRect().top < window.innerHeight && getComputedStyle(c).opacity < 0.05) G.to(c, { y: 0, opacity: 1, rotate: 0, duration: 0.6, ease: "expo.out" }); });
      }, 2500);
    }

    return {
      on: on,
      enter: function (full) {
        if (!on) return;
        if (full && window.ScrollTrigger) window.ScrollTrigger.getAll().forEach(function (t) { t.kill(); });
        if (full) { heroIn(); introIn(); }
        boardIn(full);
      },
      wipe: function (swap) {
        if (!on) { swap(); return; }
        var w = $("#wipe");
        G.timeline()
          .set(w, { y: 0, yPercent: 100, borderRadius: "50% 50% 0 0 / 12% 12% 0 0" })
          .to(w, { yPercent: 0, borderRadius: "0", duration: 0.55, ease: "expo.inOut" })
          .add(swap)
          .to(w, { yPercent: -100, borderRadius: "0 0 50% 50% / 0 0 12% 12%", duration: 0.7, ease: "expo.inOut" }, "+=0.05");
      },
      loader: function (done) {
        var l = $("#loader");
        if (!on) { l.remove(); document.body.classList.remove("is-loading"); done(); return; }
        G.timeline({ onComplete: function () { l.remove(); } })
          .to($(".loader-squiggle"), { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut" })
          .to($(".loader-mark"), { opacity: 1, duration: 0.01 }, 0.55)
          .from($all(".loader-mark span"), { yPercent: 120, rotate: 8, duration: 0.8, stagger: 0.1, ease: "expo.out" }, 0.55)
          .add(function () { document.body.classList.remove("is-loading"); done(); }, 1.25)
          .to(l, { yPercent: -100, duration: 0.9, ease: "expo.inOut" }, 1.25);
      },
      burst: function (zEl) {
        if (!on || !zEl) return;
        var r = zEl.getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var colors = ["#ff5400", "#1a54e4", "#7b3fe4", "#16b5a5", "#121213", "#f9c74f"];
        var kinds = ["tri", "dot", "bar"];
        for (var i = 0; i < 16; i++) {
          var p = document.createElement("span");
          p.className = "burst " + kinds[i % 3];
          p.style.setProperty("--c", colors[i % colors.length]);
          p.style.left = cx + "px";
          p.style.top = cy + "px";
          document.body.appendChild(p);
          var a = Math.random() * Math.PI * 2, d = 70 + Math.random() * 120;
          G.fromTo(p, { x: 0, y: 0, scale: 0.4, rotate: 0, opacity: 1 }, {
            x: Math.cos(a) * d, y: Math.sin(a) * d - 30, scale: 1, rotate: Math.random() * 540 - 270, opacity: 0,
            duration: 0.9 + Math.random() * 0.4, ease: "expo.out", onComplete: (function (el) { return function () { el.remove(); }; })(p)
          });
        }
        G.fromTo(zEl, { scale: 1.08 }, { scale: 1, duration: 0.8, ease: "elastic.out(1, 0.4)", clearProps: "transform" });
      },
      scrollTop: function () { if (lenis) lenis.scrollTo(0, { immediate: true }); window.scrollTo(0, 0); },
      pauseScroll: function () { if (lenis) lenis.stop(); },
      resumeScroll: function () { if (lenis) lenis.start(); },
      toggleMenu: function () {
        var m = $("#menu"), b = $("#menuBtn");
        var open = b.getAttribute("aria-expanded") !== "true";
        b.setAttribute("aria-expanded", String(open));
        if (open) {
          m.hidden = false;
          if (lenis) lenis.stop();
          if (on) {
            G.fromTo(m, { clipPath: "circle(0% at calc(100% - 46px) 46px)" }, { clipPath: "circle(150% at calc(100% - 46px) 46px)", duration: 0.9, ease: "expo.inOut" });
            G.from($all(".menu-list a"), { yPercent: 100, opacity: 0, duration: 0.8, stagger: 0.05, ease: "expo.out", delay: 0.25 });
          } else m.style.clipPath = "none";
        } else this.closeMenu();
      },
      closeMenu: function () {
        var m = $("#menu"), b = $("#menuBtn");
        if (m.hidden) return;
        b.setAttribute("aria-expanded", "false");
        if (lenis) lenis.start();
        if (on) G.to(m, { clipPath: "circle(0% at calc(100% - 46px) 46px)", duration: 0.6, ease: "expo.inOut", onComplete: function () { m.hidden = true; } });
        else m.hidden = true;
      }
    };
  })();
  $("#menuBtn").addEventListener("click", function () { Motion.toggleMenu(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") Motion.closeMenu(); });

  /* ---------------- drag & drop (pointer events: mouse, pen, touch) ---------------- */
  var drag = null;
  var NO_DRAG = "input, textarea, select, a, .draft-box";

  function zoneAccepts(zEl, kind) { return (zEl.dataset.accepts || "").split(" ").indexOf(kind) >= 0; }
  function zoneById(id) { return ZONES.filter(function (z) { return z.id === id; })[0]; }

  function runZone(zId, card) {
    var z = zoneById(zId);
    if (!z) return;
    var zEl = $('.zone[data-zone="' + zId + '"]');
    var result = z.run(card.dataset.id);
    if (result !== false) Motion.burst($('.zone[data-zone="' + zId + '"]') || zEl);
    return result;
  }

  document.addEventListener("pointerdown", function (e) {
    if (e.button !== 0) return;
    var card = e.target.closest(".card[data-kind]");
    if (!card || e.target.closest(NO_DRAG)) return;
    // editable text drags the card too, unless it is already being edited
    var editing = e.target.closest("[contenteditable='true']");
    if (editing && editing === document.activeElement) return;
    if (e.pointerType === "touch" && !e.target.closest(".card-grip")) return;
    drag = { card: card, x: e.clientX, y: e.clientY, id: e.pointerId, started: false };
  });

  document.addEventListener("pointermove", function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.started) {
      if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) < 6) return;
      startDrag(e);
    }
    e.preventDefault();
    moveGhost(e.clientX, e.clientY);
  }, { passive: false });

  document.addEventListener("pointerup", function (e) { if (drag && e.pointerId === drag.id) endDrag(e, false); });
  document.addEventListener("pointercancel", function (e) { if (drag && e.pointerId === drag.id) endDrag(e, true); });

  function startDrag(e) {
    var card = drag.card;
    var r = card.getBoundingClientRect();
    var g = card.cloneNode(true);
    g.classList.add("ghost");
    g.removeAttribute("tabindex");
    g.style.width = Math.min(r.width, 380) + "px";
    document.body.appendChild(g);
    drag.ghost = g;
    drag.offX = Math.min(e.clientX - r.left, 360);
    drag.offY = e.clientY - r.top;
    drag.started = true;
    drag.startRect = r;
    card.classList.add("is-lifted");
    document.body.classList.add("dragging");
    Motion.pauseScroll();
    $all(".zone").forEach(function (z) {
      z.classList.add(zoneAccepts(z, card.dataset.kind) ? "is-ready" : "is-off");
    });
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (window.getSelection) window.getSelection().removeAllRanges();
  }

  function moveGhost(x, y) {
    var g = drag.ghost;
    var tilt = Math.max(-6, Math.min(6, (x - (drag.lastX || x)) * 0.6));
    drag.lastX = x;
    g.style.transform = "translate(" + (x - drag.offX) + "px," + (y - drag.offY) + "px) rotate(" + tilt + "deg)";
    var under = document.elementFromPoint(x, y);
    var z = under && under.closest(".zone");
    $all(".zone.is-over").forEach(function (o) { if (o !== z) o.classList.remove("is-over"); });
    drag.over = null;
    if (z && zoneAccepts(z, drag.card.dataset.kind)) { z.classList.add("is-over"); drag.over = z.dataset.zone; }
    // auto-scroll near viewport edges
    var edge = 70;
    if (y < edge) window.scrollBy(0, -12); else if (y > window.innerHeight - edge && window.innerWidth > 960) window.scrollBy(0, 12);
  }

  function endDrag(e, cancelled) {
    var d = drag;
    drag = null;
    if (!d.started) return;
    document.body.classList.remove("dragging");
    Motion.resumeScroll();
    $all(".zone").forEach(function (z) { z.classList.remove("is-ready", "is-off", "is-over"); });
    var g = d.ghost;
    void g.offsetWidth; // commit the last position so the drop animation starts from it
    if (!cancelled && d.over) {
      g.classList.add("is-dropping");
      g.style.transform += " scale(0.4)";
      setTimeout(function () { g.remove(); }, 260);
      var result = runZone(d.over, d.card);
      if (result === false && document.body.contains(d.card)) d.card.classList.remove("is-lifted");
    } else {
      g.classList.add("is-returning");
      g.style.transform = "translate(" + d.startRect.left + "px," + d.startRect.top + "px) rotate(0deg)";
      setTimeout(function () { g.remove(); d.card.classList.remove("is-lifted"); }, 300);
    }
  }
  // the click that follows a drag should not follow links inside a card
  document.addEventListener("click", function (e) {
    if (document.body.classList.contains("dragging")) e.preventDefault();
  }, true);

  // keyboard alternative: focus a card, press the zone number
  document.addEventListener("keydown", function (e) {
    var card = e.target.closest && e.target.closest(".card[data-kind]");
    if (!card || e.target !== card) return;
    var n = parseInt(e.key, 10);
    if (!n || !ZONES[n - 1]) return;
    var z = ZONES[n - 1];
    if (z.accepts.indexOf(card.dataset.kind) < 0) { toast("“" + z.label + "” doesn’t take this card", false); return; }
    e.preventDefault();
    runZone(z.id, card);
  });

  /* ---------------- boot ---------------- */
  state = load();
  // Arriving from an event card on the showcase (?event=Name): open that event, creating it once.
  (function () {
    var name = "";
    try { name = (new URLSearchParams(location.search).get("event") || "").trim(); } catch (e) { /* old browser */ }
    if (!name) return;
    var ev = state.events.filter(function (e) { return e.name.toLowerCase() === name.toLowerCase(); })[0];
    if (!ev) {
      ev = { id: uid("ev"), name: name, date: now(), type: "Event", goal: "", created: now() };
      state.events.unshift(ev);
      logEvent("Opened “" + name + "” from the showcase");
    }
    state.currentEventId = ev.id;
    if (history.replaceState) history.replaceState(null, "", location.pathname + (location.hash || "#capture"));
  })();
  save();
  render(true, true);
  Motion.loader(function () { Motion.enter(true); });
})();
