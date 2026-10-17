/* =========================================================================
   Nipper Hub — main app (no build step, plain JS)
   ========================================================================= */
(function () {
  'use strict';
  const C = NIP.CONFIG;
  const store = NIP.createStore();

  /* ---------------- state ---------------- */
  const S = {
    user: null, me: null, ready: false,
    participants: [], sessions: [], staff: [],
    season: NIP.currentSeason(),
    authTab: 'signin', authError: '', authInfo: '',
    unsubs: [],
    evalDate: today(), evalEnv: 'Pool', evalMode: 'prelim', hideDone: false,
    nipperFilter: { q: '', ag: 'All', status: 'all' },
    gameFilter: { q: '', type: 'all', ag: 'All' }
  };
  try {
    const saved = JSON.parse(localStorage.getItem('nipperhub-ui') || '{}');
    if (saved.evalEnv) S.evalEnv = saved.evalEnv;
  } catch (e) { }
  function saveUi() { try { localStorage.setItem('nipperhub-ui', JSON.stringify({ evalEnv: S.evalEnv })); } catch (e) { } }

  /* ---------------- utils ---------------- */
  function today() { return new Date().toLocaleDateString('en-CA'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function fmtDate(d) {
    if (!d) return '';
    const x = new Date(d.length === 10 ? d + 'T00:00:00' : d);
    return isNaN(x) ? esc(d) : x.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function fmtDay(d) {
    const x = new Date(d + 'T00:00:00');
    return isNaN(x) ? esc(d) : x.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  const seasonKey = s => String(s).replace('/', '-');
  const initials = p => ((p.firstName || '?')[0] + (p.lastName || '')[0] || '').toUpperCase();
  const fullName = p => `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unnamed';
  const myName = () => (S.me && S.me.name) || (S.user && S.user.email) || 'Age Manager';
  const isAdmin = () => S.me && S.me.role === 'admin';
  function toast(msg) {
    const root = document.getElementById('toast-root');
    root.innerHTML = `<div class="toast" role="status">${esc(msg)}</div>`;
    clearTimeout(toast._t); toast._t = setTimeout(() => { root.innerHTML = ''; }, 2600);
  }
  async function safe(fn, okMsg) {
    try { const r = await fn(); if (okMsg) toast(okMsg); return r; }
    catch (e) { console.error(e); toast('Couldn’t save: ' + (e.code || e.message || e)); }
  }
  function seasonsList() {
    const y = NIP.seasonStartYear(NIP.currentSeason());
    return [y + 1, y, y - 1, y - 2].map(v => `${v}/${String((v + 1) % 100).padStart(2, '0')}`);
  }

  /* ---------------- domain helpers ---------------- */
  function ageGroupOf(p, season = S.season) {
    if (p.dob) return NIP.ageGroupFromDob(p.dob, season);
    if (!p.ageGroup) return null;
    const idx = NIP.AGE_GROUPS.indexOf(p.ageGroup);
    if (idx < 0) return p.ageGroup;
    const shift = NIP.seasonStartYear(season) - NIP.seasonStartYear(p.ageGroupSeason || season);
    const n = idx + shift;
    if (n < 0) return null;
    return n < NIP.AGE_GROUPS.length ? NIP.AGE_GROUPS[n] : 'U15+';
  }
  const nippers = () => S.participants.filter(p => p.kind !== 'nsa' && p.active !== false);
  const helpers = () => S.participants.filter(p => p.kind === 'nsa' && p.active !== false);
  const seasonNippers = () => nippers().filter(p => NIP.AGE_GROUPS.includes(ageGroupOf(p)));
  function rec(p, std, season = S.season) {
    return (p.signoffs && p.signoffs[seasonKey(season)] && p.signoffs[seasonKey(season)][std]) || null;
  }
  function elementsFor(std, ag) {
    if (std === 'prelim') return NIP.PRELIM[ag] || [];
    if (std === 'comp') return NIP.COMP[ag] ? [NIP.COMP[ag]] : [];
    if (std === 'nsa') return NIP.NSA_PREREQS.map(x => Object.assign({ area: 'Pre-requisite' }, x)).concat(NIP.NSA);
    return [];
  }
  function status(p, std, season = S.season) {
    const ag = std === 'nsa' ? null : ageGroupOf(p, season);
    const els = elementsFor(std, ag);
    if (!els.length) return { code: 'na', done: 0, total: 0 };
    const r = rec(p, std, season);
    const items = (r && r.items) || {};
    const done = els.filter(e => items[e.id]).length;
    let code = 'not_started';
    if (r && r.outcome === 'competent') code = 'competent';
    else if (r && r.outcome === 'nyc') code = 'nyc';
    else if (done > 0) code = 'in_progress';
    return { code, done, total: els.length, rec: r };
  }
  function statusBadge(st, std) {
    const lbl = std === 'comp' ? 'Comp' : std === 'nsa' ? 'NSA' : 'Prelim';
    switch (st.code) {
      case 'competent': return `<span class="badge ok">✓ ${lbl}${std === 'nsa' ? ' proficient' : ' competent'}</span>`;
      case 'nyc': return `<span class="badge bad">${lbl}: not yet</span>`;
      case 'in_progress': return `<span class="badge warn">${lbl} ${st.done}/${st.total}</span>`;
      case 'na': return std === 'comp' ? '' : `<span class="badge">${lbl} n/a</span>`;
      default: return `<span class="badge">${lbl} to do</span>`;
    }
  }
  function sessionsFor(ag, season = S.season) {
    return S.sessions.filter(s => s.season === season && (!ag || s.ageGroup === ag || s.ageGroup === 'All'));
  }
  function attendance(p) {
    const ag = ageGroupOf(p);
    const ss = sessionsFor(ag);
    const here = ss.filter(s => (s.present || []).includes(p.id)).length;
    return { here, total: ss.length, pct: ss.length ? Math.round(100 * here / ss.length) : 0 };
  }
  function shortLabel(e) {
    if (e.id === 'submerge') return /roll/i.test(e.text) ? 'Roll + touch' : 'Submerge';
    return ({ float: 'Float', tread: 'Tread', glide: 'Glide', swim: e.text.match(/(\d+ m)/) ? 'Swim ' + e.text.match(/(\d+ m)/)[1] : 'Swim', underwater: 'Underwater', survival: 'Survival ' + ((e.text.match(/(\d+ m)$/) || [])[1] || ''), ows: e.text.match(/(\d+ ?m)/) ? e.text.match(/(\d+ ?m)/)[1] + ' open water' : 'Open water' })[e.id] || e.area;
  }

  /* ---------------- sign-off actions ---------------- */
  function soPath(std, sub) { return `signoffs.${seasonKey(S.season)}.${std}${sub ? '.' + sub : ''}`; }
  async function toggleItem(pid, std, eid) {
    const p = S.participants.find(x => x.id === pid); if (!p) return;
    const ag = std === 'nsa' ? null : ageGroupOf(p);
    const els = elementsFor(std, ag);
    const r = rec(p, std) || {};
    const items = Object.assign({}, r.items || {});
    items[eid] = !items[eid];
    const all = els.every(e => items[e.id]);
    const patch = {};
    patch[soPath(std, 'items')] = items;
    patch[soPath(std, 'ageGroup')] = ag || null;
    patch[soPath(std, 'updatedAt')] = Date.now();
    patch[soPath(std, 'updatedBy')] = myName();
    if (all) {
      patch[soPath(std, 'outcome')] = 'competent';
      patch[soPath(std, 'date')] = S.evalDate || today();
      patch[soPath(std, 'assessor')] = myName();
      patch[soPath(std, 'assessorUid')] = S.user ? S.user.uid : null;
      if (std === 'prelim' && !r.environment) patch[soPath(std, 'environment')] = S.evalEnv;
    } else if (r.outcome === 'competent') {
      patch[soPath(std, 'outcome')] = 'in_progress';
    }
    await safe(() => store.update('participants', pid, patch), all ? `${p.firstName} signed off ✓` : null);
  }
  async function setOutcome(pid, std, outcome) {
    const p = S.participants.find(x => x.id === pid); if (!p) return;
    const patch = {};
    if (outcome === 'clear') { patch[soPath(std)] = NIP.DELETE; }
    else {
      patch[soPath(std, 'outcome')] = outcome;
      patch[soPath(std, 'date')] = S.evalDate || today();
      patch[soPath(std, 'assessor')] = myName();
      patch[soPath(std, 'assessorUid')] = S.user ? S.user.uid : null;
      patch[soPath(std, 'updatedAt')] = Date.now();
      patch[soPath(std, 'ageGroup')] = std === 'nsa' ? null : ageGroupOf(p);
      if (std === 'prelim' && !(rec(p, std) || {}).environment) patch[soPath(std, 'environment')] = S.evalEnv;
    }
    if (outcome === 'clear' && !confirm('Clear this sign-off record for ' + fullName(p) + '?')) return;
    await safe(() => store.update('participants', pid, patch), outcome === 'nyc' ? 'Marked “not yet competent”' : outcome === 'clear' ? 'Cleared' : 'Saved');
  }

  /* ---------------- icons ---------------- */
  const I = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.6c2.6.2 4.3 2 4.9 4.9"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 12l3 3 5-6"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4"/><path d="M5 4h13v6H5"/><path d="M5 10h13v6H5" opacity=".55"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
    tick: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 19V5"/><path d="M8 7h7M8 11h7"/></svg>',
    life: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6"/></svg>',
    team: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="3.5"/><path d="M5 21c.8-4 3.5-6.5 7-6.5s6.2 2.5 7 6.5"/></svg>',
    out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h4v16h-4"/><path d="M10 17l5-5-5-5M15 12H3"/></svg>',
    logo: '<svg width="40" height="40" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#0B2545"/><rect x="14" y="10" width="4" height="46" rx="2" fill="#fff"/><path d="M18 12h32v14H18z" fill="#E2231A"/><path d="M18 26h32v14H18z" fill="#FFD200"/></svg>'
  };

  /* ---------------- router ---------------- */
  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, qs] = h.split('?');
    const parts = path.split('/').filter(Boolean);
    const q = {}; (qs || '').split('&').filter(Boolean).forEach(kv => { const [k, v] = kv.split('='); q[decodeURIComponent(k)] = decodeURIComponent(v || ''); });
    return { name: parts[0] || 'home', id: parts[1], q };
  }
  const NAV = [
    ['home', 'Home', I.home], ['nippers', 'Nippers', I.users], ['evaluate', 'Sign-off', I.check],
    ['sessions', 'Sessions', I.cal], ['games', 'Games', I.flag], ['more', 'More', I.more]
  ];
  const NAV_GROUP = { nipper: 'nippers', session: 'sessions', game: 'games', safety: 'more', standards: 'more', helpers: 'more', team: 'more' };

  /* ---------------- render ---------------- */
  let pendingRender = false;
  function scheduleRender() {
    const a = document.activeElement;
    if (a && a.closest && a.closest('#view') && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && !/checkbox|radio/.test(a.type)) { pendingRender = true; return; }
    render();
  }
  document.addEventListener('focusout', () => { if (pendingRender) setTimeout(() => { if (pendingRender) { pendingRender = false; scheduleRender(); } }, 50); });

  function render() {
    pendingRender = false;
    const app = document.getElementById('app');
    if (!S.ready) return;
    if (!S.user) { app.innerHTML = authView(); return; }
    if (!S.me || S.me.role === 'pending' || S.me.role === 'removed') { app.innerHTML = pendingView(); return; }
    const r = parseHash();
    const active = NAV_GROUP[r.name] || r.name;
    let body = '';
    try { body = (VIEWS[r.name] || VIEWS.home)(r); }
    catch (e) { console.error(e); body = `<div class="card"><h2>Something went wrong</h2><p>${esc(e.message)}</p></div>`; }
    app.innerHTML = `
      <header class="topbar">
        <div class="topbar-inner">
          <a class="brand" href="#/">${I.logo}<span class="brand-text"><span class="brand-name">${esc(C.APP_NAME)}</span><span class="brand-club">${esc(C.CLUB_NAME)}</span></span></a>
          <span class="spacer"></span>
          <nav class="desk-nav" aria-label="Main">${NAV.map(([k, l]) => `<a href="#/${k === 'home' ? '' : k}" class="${active === k ? 'active' : ''}">${l}</a>`).join('')}</nav>
          <label class="visually-hidden" for="season">Season</label>
          <select id="season" class="season-select" data-change="season">${seasonsList().map(s => `<option ${s === S.season ? 'selected' : ''}>${s}</option>`).join('')}</select>
        </div>
      </header>
      ${store.mode === 'demo' ? `<div class="demo-banner">Demo mode: data is saved in this browser only${location.protocol === 'file:' ? ' (open via a web server or GitHub Pages to use Firebase)' : ''}.</div>` : ''}
      <main id="view">${body}</main>
      <nav class="bottom-nav" aria-label="Main" style="grid-template-columns:repeat(${NAV.length},1fr)">
        ${NAV.map(([k, l, ic]) => `<a href="#/${k === 'home' ? '' : k}" class="${active === k ? 'active' : ''}">${ic}<span>${l}</span></a>`).join('')}
      </nav>`;
  }

  /* ================= AUTH ================= */
  function authView() {
    const t = S.authTab;
    return `<div class="auth-wrap"><div class="auth-card">
      <div class="logo">${I.logo.replace('width="40" height="40"', 'width="54" height="54"')}<div><h1>${esc(C.APP_NAME)}</h1><div class="muted">${esc(C.CLUB_NAME)} · Age Manager portal</div></div></div>
      <div class="tabs" role="tablist">
        <button class="${t === 'signin' ? 'active' : ''}" data-action="auth-tab" data-tab="signin">Sign in</button>
        <button class="${t === 'signup' ? 'active' : ''}" data-action="auth-tab" data-tab="signup">Create account</button>
      </div>
      ${S.authError ? `<div class="error">${esc(S.authError)}</div>` : ''}
      ${S.authInfo ? `<div class="note" style="margin-bottom:12px">${esc(S.authInfo)}</div>` : ''}
      <form data-form="${t === 'reset' ? 'reset' : t}">
        ${t === 'signup' ? `<label class="field">Your name<input type="text" name="name" autocomplete="name" required></label>` : ''}
        <label class="field">Email<input type="email" name="email" autocomplete="email" required></label>
        ${t !== 'reset' ? `<label class="field">Password<input type="password" name="password" autocomplete="${t === 'signup' ? 'new-password' : 'current-password'}" ${store.mode === 'demo' ? '' : 'required minlength="6"'}></label>` : ''}
        <button class="btn block" type="submit">${t === 'signup' ? 'Create account' : t === 'reset' ? 'Send reset email' : 'Sign in'}</button>
      </form>
      <div class="row between" style="margin-top:12px">
        ${t === 'signin' ? `<button class="btn ghost" data-action="auth-tab" data-tab="reset">Forgot password?</button>` : t === 'reset' ? `<button class="btn ghost" data-action="auth-tab" data-tab="signin">Back to sign in</button>` : '<span></span>'}
      </div>
      <p class="muted" style="font-size:.85rem;margin-top:10px">${store.mode === 'demo'
        ? 'Demo mode: type any email to look around. Nothing leaves this browser.'
        : 'New age managers: create an account, then ask a club admin to approve you. The first account created becomes the club admin.'}</p>
    </div></div>`;
  }
  function pendingView() {
    return `<div class="auth-wrap"><div class="auth-card">
      <div class="logo">${I.logo}<h1 style="font-size:1.6rem">Nearly there</h1></div>
      <p>Hi ${esc(myName())}, your account is <strong>waiting for approval</strong>.</p>
      <p class="muted">Ask your Junior Activities Chair (or another club admin) to approve you in <em>More → Team</em>. This page will update automatically.</p>
      <button class="btn secondary block" data-action="signout">Sign out</button>
    </div></div>`;
  }

  /* ================= VIEWS ================= */
  const VIEWS = {};

  /* ---------- Home ---------- */
  VIEWS.home = function () {
    const all = seasonNippers();
    const comp = all.filter(p => status(p, 'prelim').code === 'competent').length;
    const nyc = all.filter(p => status(p, 'prelim').code === 'nyc').length;
    const ses = S.sessions.filter(s => s.season === S.season);
    const rows = NIP.AGE_GROUPS.map(ag => {
      const list = all.filter(p => ageGroupOf(p) === ag);
      const done = list.filter(p => status(p, 'prelim').code === 'competent').length;
      const compDone = NIP.COMP[ag] ? list.filter(p => status(p, 'comp').code === 'competent').length : null;
      const pct = list.length ? Math.round(100 * done / list.length) : 0;
      return `<tr>
        <td><a href="#/nippers?ag=${ag}" class="badge ag" style="text-decoration:none">${ag}</a><div class="muted" style="font-size:.78rem;margin-top:3px">${esc(NIP.AGE_AWARDS[ag])}</div></td>
        <td>${list.length}</td>
        <td style="min-width:120px">${list.length ? `<div class="row" style="gap:8px"><div class="progress" style="flex:1"><i style="width:${pct}%"></i></div><strong>${done}/${list.length}</strong></div>` : '<span class="muted">–</span>'}</td>
        <td class="hide-sm">${compDone === null ? '<span class="muted">n/a</span>' : list.length ? `${compDone}/${list.length}` : '–'}</td>
        <td><a class="btn small secondary" href="#/evaluate?ag=${ag}">Sign off</a></td></tr>`;
    }).join('');
    const upcoming = ses.filter(s => s.date >= today()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
    return `
      <div class="page-head"><div><h1>G’day, ${esc((myName() || '').split(' ')[0])}</h1><p class="sub">Season ${esc(S.season)} · ${esc(C.CLUB_NAME)}</p></div>
        <div class="btn-row"><a class="btn" href="#/evaluate">Start sign-offs</a><a class="btn yellow" href="#/sessions?new=1">Plan a session</a></div></div>
      <div class="stats">
        <div class="stat red"><div class="num">${all.length}</div><div class="lbl">Nippers this season</div></div>
        <div class="stat"><div class="num" style="color:var(--ok)">${comp}</div><div class="lbl">Prelim evaluation competent</div></div>
        <div class="stat"><div class="num" style="color:var(--warn)">${all.length - comp - nyc}</div><div class="lbl">Still to evaluate</div></div>
        <div class="stat"><div class="num">${ses.length}</div><div class="lbl">Sessions logged</div></div>
      </div>
      ${!all.length ? `<div class="card yellow" style="margin-top:14px"><h3>Get started</h3><p>Add your nippers first. You can paste a whole list from your registration spreadsheet.</p>
        <div class="btn-row"><a class="btn" href="#/nippers?bulk=1">Add nippers</a>${store.mode === 'demo' ? '<button class="btn secondary" data-action="seed">Load sample nippers</button>' : ''}</div></div>` : ''}
      <div class="grid-2" style="margin-top:14px">
        <div class="card flag-top" style="grid-column:1/-1"><h2>Sign-off progress by age group</h2>
          <div class="table-wrap"><table class="ag-table"><thead><tr><th>Age group</th><th>Nippers</th><th>Preliminary evaluation</th><th class="hide-sm">Comp eval</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
        </div>
        <div class="card"><h2>Coming up</h2>${upcoming.length ? `<div class="stack">${upcoming.map(s => `<a class="list-item card-link" style="padding:8px 0" href="#/session/${s.id}"><div class="grow"><div class="title">${fmtDay(s.date)} · ${esc(s.ageGroup)}</div><div class="meta">${(s.games || []).length} games planned</div></div></a>`).join('')}</div>` : '<p class="muted">No sessions planned yet.</p>'}
          <a class="btn small secondary" href="#/sessions?new=1">+ New session</a></div>
        <div class="card"><h2>Start-of-season checklist</h2>
          <ul style="padding-left:20px;margin:0">
            <li>Assessors approved by the club and <strong>minuted at a club meeting</strong></li>
            <li>Water Safety Supervisor appointed; Surf Risk Rating done before every water activity</li>
            <li>Evaluation ratios: <strong>1:1 for new nippers</strong>, up to 1:5 for returning nippers</li>
            <li>Every nipper completes the <a href="#/standards">Preliminary Evaluation</a> before water activities</li>
            <li>Record results in the club’s official system (SLS Hub / Nipper App) as well</li>
            <li>Age Managers hold a current Age Manager award + WWCC</li>
          </ul></div>
      </div>`;
  };

  /* ---------- Nippers list ---------- */
  VIEWS.nippers = function (r) {
    if (r.q.ag) S.nipperFilter.ag = r.q.ag;
    if (r.q.bulk) return bulkView();
    if (r.q.new) return nipperForm(null);
    const f = S.nipperFilter;
    const all = seasonNippers();
    const counts = {}; all.forEach(p => { const a = ageGroupOf(p); counts[a] = (counts[a] || 0) + 1; });
    let list = all.filter(p => (f.ag === 'All' || ageGroupOf(p) === f.ag));
    if (f.q) list = list.filter(p => fullName(p).toLowerCase().includes(f.q.toLowerCase()));
    if (f.status !== 'all') list = list.filter(p => { const c = status(p, 'prelim').code; return f.status === 'todo' ? (c === 'not_started' || c === 'in_progress') : c === f.status; });
    list.sort((a, b) => NIP.AGE_GROUPS.indexOf(ageGroupOf(a)) - NIP.AGE_GROUPS.indexOf(ageGroupOf(b)) || (a.lastName || '').localeCompare(b.lastName || '') || (a.firstName || '').localeCompare(b.firstName || ''));
    const others = nippers().filter(p => !NIP.AGE_GROUPS.includes(ageGroupOf(p)));
    return `
      <div class="page-head"><div><h1>Nippers</h1><p class="sub">${all.length} registered for ${esc(S.season)}</p></div>
        <div class="btn-row"><a class="btn" href="#/nippers?new=1">+ Add nipper</a><a class="btn secondary" href="#/nippers?bulk=1">Paste a list</a><button class="btn secondary" data-action="export">Export CSV</button></div></div>
      <div class="card" style="margin-bottom:12px">
        <label class="visually-hidden" for="nq">Search</label>
        <input id="nq" type="search" placeholder="Search by name…" value="${esc(f.q)}" data-input="nq" style="margin-top:0">
        <div class="chips" style="margin-top:10px">${['All'].concat(NIP.AGE_GROUPS).map(a => `<button class="chip ${f.ag === a ? 'active' : ''}" data-action="nf-ag" data-v="${a}">${a}${a !== 'All' && counts[a] ? `<span class="count">${counts[a]}</span>` : ''}</button>`).join('')}</div>
        <div class="chips" style="margin-top:8px">${[['all', 'Any status'], ['todo', 'Prelim to do'], ['nyc', 'Not yet competent'], ['competent', 'Competent']].map(([k, l]) => `<button class="chip ${f.status === k ? 'active' : ''}" data-action="nf-status" data-v="${k}">${l}</button>`).join('')}</div>
      </div>
      ${list.length ? `<div class="list">${list.map(p => {
        const ag = ageGroupOf(p); const att = attendance(p);
        return `<a class="list-item" href="#/nipper/${p.id}"><span class="avatar">${esc(initials(p))}</span>
          <div class="grow"><div class="title">${esc(fullName(p))} ${p.memberStatus === 'new' ? '<span class="badge yellow">New</span>' : ''}</div>
          <div class="meta row" style="gap:6px;margin-top:3px">${statusBadge(status(p, 'prelim'), 'prelim')} ${statusBadge(status(p, 'comp'), 'comp')} ${att.total ? `<span class="muted">${att.here}/${att.total} sessions</span>` : ''}</div></div>
          <span class="badge ag">${esc(ag)}</span></a>`;
      }).join('')}</div>` : `<div class="card empty"><h3>No nippers here yet</h3><p>Add nippers one at a time, or paste a list.</p></div>`}
      ${others.length ? `<details class="card" style="margin-top:12px"><summary>${others.length} member(s) outside U6–U14 this season</summary><div class="stack" style="margin-top:8px">${others.map(p => `<a href="#/nipper/${p.id}">${esc(fullName(p))}</a> <span class="muted">(${esc(ageGroupOf(p) || 'no age group')})</span>`).join('<br>')}</div></details>` : ''}`;
  };

  function nipperForm(p) {
    const ag = p ? ageGroupOf(p) : (S.nipperFilter.ag !== 'All' ? S.nipperFilter.ag : 'U6');
    return `<div class="page-head"><h1>${p ? 'Edit nipper' : 'Add a nipper'}</h1></div>
      <form class="card" data-form="nipper" data-id="${p ? p.id : ''}" style="max-width:640px">
        <div class="form-grid two">
          <label class="field">First name<input type="text" name="firstName" required value="${esc(p && p.firstName)}"></label>
          <label class="field">Last name<input type="text" name="lastName" value="${esc(p && p.lastName)}"></label>
          <label class="field">Date of birth <span class="hint">Optional. If entered, the age group is worked out automatically (age at 30 September).</span><input type="date" name="dob" value="${esc(p && p.dob)}"></label>
          <label class="field">Age group in ${esc(S.season)} <span class="hint">Used when no date of birth is entered.</span>
            <select name="ageGroup">${NIP.AGE_GROUPS.map(a => `<option ${a === ag ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
          <label class="field">Member status <span class="hint">New nippers are evaluated at 1:1.</span>
            <select name="memberStatus"><option value="returning" ${p && p.memberStatus === 'returning' ? 'selected' : ''}>Returning</option><option value="new" ${!p || p.memberStatus === 'new' ? 'selected' : ''}>New this season</option></select></label>
        </div>
        <label class="field">Notes for age managers <span class="hint">Keep it brief and practical, e.g. “nervous in waves”. Medical and contact details belong in SLS Hub, not here.</span><textarea name="notes">${esc(p && p.notes)}</textarea></label>
        <div class="btn-row"><button class="btn" type="submit">${p ? 'Save' : 'Add nipper'}</button><a class="btn secondary" href="${p ? '#/nipper/' + p.id : '#/nippers'}">Cancel</a>
        ${p ? `<span style="flex:1"></span><button type="button" class="btn ghost" data-action="archive" data-id="${p.id}">Archive</button>${isAdmin() ? `<button type="button" class="btn ghost" data-action="delete-nipper" data-id="${p.id}">Delete</button>` : ''}` : ''}</div>
      </form>`;
  }

  function bulkView() {
    const ag = S.nipperFilter.ag !== 'All' ? S.nipperFilter.ag : 'U6';
    return `<div class="page-head"><div><h1>Paste a list</h1><p class="sub">One nipper per line: <span class="kbd">First Last</span>, with optional extras separated by commas.</p></div></div>
      <form class="card" data-form="bulk" style="max-width:720px">
        <label class="field">Default age group (for lines without a date of birth)
          <select name="ageGroup">${NIP.AGE_GROUPS.map(a => `<option ${a === ag ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
        <label class="field">Default member status
          <select name="memberStatus"><option value="returning">Returning</option><option value="new">New this season</option></select></label>
        <label class="field">Nippers
          <span class="hint">Examples: <span class="kbd">Charlie Smith</span> · <span class="kbd">Ava Nguyen, 14/03/2017</span> · <span class="kbd">Jack Brown, U9, new</span></span>
          <textarea name="list" rows="10" placeholder="Charlie Smith&#10;Ava Nguyen, 14/03/2017&#10;Jack Brown, U9, new" required></textarea></label>
        <div class="btn-row"><button class="btn" type="submit">Add nippers</button><a class="btn secondary" href="#/nippers">Cancel</a></div>
      </form>`;
  }

  /* ---------- Nipper detail ---------- */
  VIEWS.nipper = function (r) {
    const p = S.participants.find(x => x.id === r.id);
    if (!p) return `<div class="card empty"><h3>Nipper not found</h3><a href="#/nippers">Back to list</a></div>`;
    if (r.q.edit) return nipperForm(p);
    const ag = ageGroupOf(p);
    const att = attendance(p);
    const award = rec(p, 'award');
    const history = Object.keys(p.signoffs || {}).filter(k => k !== seasonKey(S.season)).sort().reverse();
    return `
      <div class="page-head"><div>
        <a href="#/nippers" class="muted" style="text-decoration:none">← Nippers</a>
        <h1 style="margin-top:4px">${esc(fullName(p))}</h1>
        <div class="row" style="gap:6px"><span class="badge ag">${esc(ag || '—')}</span>${p.memberStatus === 'new' ? '<span class="badge yellow">New member: evaluate at 1:1</span>' : '<span class="badge">Returning</span>'}${p.dob ? `<span class="muted">DOB ${fmtDate(p.dob)}</span>` : ''}</div>
      </div><a class="btn secondary" href="#/nipper/${p.id}?edit=1">Edit</a></div>
      ${p.notes ? `<div class="callout yellow" style="margin-bottom:12px"><strong>Notes:</strong> ${esc(p.notes)}</div>` : ''}
      ${NIP.AGE_GROUPS.includes(ag) ? `
      <div class="grid">
        ${signoffCard(p, 'prelim', ag)}
        ${NIP.COMP[ag] ? signoffCard(p, 'comp', ag) : `<div class="card"><h3>Competition Evaluation</h3><p class="muted">${ag === 'U8' ? 'Not required for U8. Their only water event is the wade (waist-deep).' : 'Not required for ' + ag + '.'}</p></div>`}
        <div class="card"><h3>Age award: ${esc(NIP.AGE_AWARDS[ag])}</h3>
          <p class="muted" style="margin-bottom:8px">Age awards are based on participation, not competence. SLS NSW suggests including nippers who attend at least 50% of sessions (club discretion).</p>
          <div class="row between"><div><strong>${att.here}</strong> of ${att.total} ${ag} sessions attended ${att.total ? `(${att.pct}%)` : ''}</div>
          ${award && award.outcome === 'competent'
            ? `<span class="badge ok">✓ Recommended ${fmtDate(award.date)}</span> <button class="btn small ghost" data-action="outcome" data-id="${p.id}" data-std="award" data-v="clear">Undo</button>`
            : `<button class="btn small ${att.pct >= 50 ? '' : 'secondary'}" data-action="outcome" data-id="${p.id}" data-std="award" data-v="competent">Recommend for award</button>`}</div>
        </div>
      </div>` : `<div class="card"><p>${esc(fullName(p))} is outside the U6–U14 nipper age groups in ${esc(S.season)}.</p></div>`}
      ${history.length ? `<div class="card" style="margin-top:14px"><h3>Previous seasons</h3>${history.map(k => {
        const s = k.replace('-', '/'); const pr = rec(p, 'prelim', s); const cp = rec(p, 'comp', s);
        return `<div class="row" style="padding:6px 0;border-bottom:1px dashed var(--line)"><strong style="width:70px">${esc(s)}</strong>${pr ? statusBadge(status(p, 'prelim', s), 'prelim') + ` <span class="muted">${esc(pr.ageGroup || '')} ${fmtDate(pr.date)} ${esc(pr.assessor || '')}</span>` : '<span class="muted">No prelim record</span>'} ${cp ? statusBadge(status(p, 'comp', s), 'comp') : ''}</div>`;
      }).join('')}</div>` : ''}`;
  };

  function signoffCard(p, std, ag) {
    const els = elementsFor(std, ag);
    const st = status(p, std);
    const r = st.rec || {};
    const items = r.items || {};
    const title = std === 'prelim' ? 'Preliminary Evaluation' : std === 'comp' ? 'Competition Evaluation' : 'Nipper Safety Assistant: annual skills maintenance';
    const intro = std === 'prelim' ? `${NIP.STAGES[NIP.stageOf(ag)].name}: ${NIP.STAGES[NIP.stageOf(ag)].focus}. Recommended depth ${NIP.STAGES[NIP.stageOf(ag)].depth}. Must be done before nippers starts each season.`
      : std === 'comp' ? 'Only needed if this nipper will compete (intra-club, inter-club, branch or state).'
        : 'Assessed by a qualified SRC/Bronze Medallion Trainer or Endorsed Delegate. Renew every season.';
    return `<div class="card flag-top">
      <div class="row between"><h3 style="margin:0">${title}</h3>${statusBadge(st, std)}</div>
      <p class="muted" style="font-size:.9rem;margin-top:6px">${intro}</p>
      ${els.map(e => `<div class="req"><button class="tick ${items[e.id] ? 'on' : ''}" data-action="tick" data-id="${p.id}" data-std="${std}" data-el="${e.id}" aria-pressed="${!!items[e.id]}" aria-label="${esc(e.text)}">${I.tick}</button>
        <div><div class="area">${esc(e.area)}</div><div>${esc(e.text)}</div></div></div>`).join('')}
      <hr>
      ${r.outcome === 'competent' || r.outcome === 'nyc' ? `<p style="font-size:.92rem"><strong>${r.outcome === 'competent' ? (std === 'nsa' ? 'Proficient' : 'Competent') : 'Not yet competent'}</strong> · ${fmtDate(r.date)} · assessed by ${esc(r.assessor || '—')}${r.environment ? ' · ' + esc(r.environment) : ''}</p>` : ''}
      <form class="form-grid two" data-form="so-meta" data-id="${p.id}" data-std="${std}">
        <label class="field">Date<input type="date" name="date" value="${esc(r.date || S.evalDate)}"></label>
        ${std !== 'nsa' ? `<label class="field">Where<select name="environment">${['Pool', 'Still water', 'Open water / beach'].map(o => `<option ${(r.environment || (std === 'comp' ? 'Open water / beach' : S.evalEnv)) === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label>` : '<span></span>'}
        <label class="field" style="grid-column:1/-1">Notes<input type="text" name="notes" value="${esc(r.notes)}" placeholder="e.g. needed a reminder to recover to standing"></label>
        <div class="btn-row" style="grid-column:1/-1"><button class="btn small secondary" type="submit">Save details</button>
          ${r.outcome !== 'competent' ? `<button type="button" class="btn small" data-action="outcome" data-id="${p.id}" data-std="${std}" data-v="competent" ${st.done < st.total ? 'disabled title="Tick every element first"' : ''}>Mark ${std === 'nsa' ? 'proficient' : 'competent'}</button>` : ''}
          ${r.outcome !== 'nyc' ? `<button type="button" class="btn small secondary" data-action="outcome" data-id="${p.id}" data-std="${std}" data-v="nyc">Not yet competent</button>` : ''}
          ${st.rec ? `<button type="button" class="btn small ghost" data-action="outcome" data-id="${p.id}" data-std="${std}" data-v="clear">Clear</button>` : ''}</div>
      </form></div>`;
  }

  /* ---------- Evaluation day ---------- */
  VIEWS.evaluate = function (r) {
    const ag = r.q.ag || S.evalAg || 'U6';
    S.evalAg = ag;
    const mode = NIP.COMP[ag] ? S.evalMode : 'prelim';
    const els = elementsFor(mode, ag);
    let list = seasonNippers().filter(p => ageGroupOf(p) === ag).sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
    const total = list.length;
    const doneCount = list.filter(p => status(p, mode).code === 'competent').length;
    if (S.hideDone) list = list.filter(p => status(p, mode).code !== 'competent');
    const newCount = list.filter(p => p.memberStatus === 'new').length;
    return `
      <div class="page-head"><div><h1>Sign-off</h1><p class="sub">Tap each element as the nipper completes it. A nipper is signed off automatically once every element is ticked.</p></div></div>
      <div class="chips" style="margin-bottom:10px">${NIP.AGE_GROUPS.map(a => `<a class="chip ${a === ag ? 'active' : ''}" style="text-decoration:none" href="#/evaluate?ag=${a}">${a}</a>`).join('')}</div>
      <div class="grid-2">
        <div class="req-ref">
          <div class="row between"><strong>${ag} · ${mode === 'prelim' ? 'Preliminary Evaluation' : 'Competition Evaluation'}</strong>
          ${NIP.COMP[ag] ? `<span class="chips"><button class="chip ${mode === 'prelim' ? 'active' : ''}" data-action="eval-mode" data-v="prelim">Prelim</button><button class="chip ${mode === 'comp' ? 'active' : ''}" data-action="eval-mode" data-v="comp">Comp</button></span>` : ''}</div>
          ${mode === 'prelim' ? `<div class="muted" style="font-size:.85rem">${NIP.STAGES[NIP.stageOf(ag)].name} · recommended depth ${NIP.STAGES[NIP.stageOf(ag)].depth}</div>` : ''}
          <ol>${els.map(e => `<li><strong>${esc(shortLabel(e))}:</strong> ${esc(e.text)}</li>`).join('')}</ol>
        </div>
        <div class="card">
          <div class="form-grid two">
            <label class="field">Evaluation date<input type="date" value="${esc(S.evalDate)}" data-change="evalDate"></label>
            <label class="field">Where<select data-change="evalEnv">${['Pool', 'Still water', 'Open water / beach'].map(o => `<option ${S.evalEnv === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label>
          </div>
          <div class="row between"><span><strong>${doneCount}/${total}</strong> signed off</span>
            <label class="row" style="gap:6px;font-size:.9rem"><input type="checkbox" data-change="hideDone" ${S.hideDone ? 'checked' : ''}> Hide signed-off</label></div>
          ${newCount ? `<div class="note" style="margin-top:8px">${newCount} new member(s) here. Water safety ratio is <strong>1:1</strong> for new nippers during the evaluation.</div>` : ''}
        </div>
      </div>
      <div style="margin-top:12px">
      ${list.length ? list.map(p => {
        const st = status(p, mode); const items = (st.rec && st.rec.items) || {};
        return `<div class="eval-row">
          <div class="row between"><a href="#/nipper/${p.id}" class="name" style="color:inherit">${esc(fullName(p))}</a>
            <span class="row" style="gap:6px">${p.memberStatus === 'new' ? '<span class="badge yellow">New 1:1</span>' : ''}${statusBadge(st, mode)}</span></div>
          <div class="eval-ticks">${els.map(e => `<button class="pill-tick ${items[e.id] ? 'on' : ''}" data-action="tick" data-id="${p.id}" data-std="${mode}" data-el="${e.id}" aria-pressed="${!!items[e.id]}"><span class="dot"></span>${esc(shortLabel(e))}</button>`).join('')}
            ${st.code !== 'competent' && st.code !== 'nyc' ? `<button class="btn small ghost" data-action="outcome" data-id="${p.id}" data-std="${mode}" data-v="nyc">Not yet</button>` : ''}
            ${st.code === 'nyc' ? `<button class="btn small ghost" data-action="outcome" data-id="${p.id}" data-std="${mode}" data-v="clear">Re-assess</button>` : ''}</div>
        </div>`;
      }).join('') : `<div class="card empty"><h3>${total ? 'Everyone’s signed off 🎉' : 'No ' + ag + ' nippers yet'}</h3>${total ? '' : `<a class="btn" href="#/nippers?bulk=1&ag=${ag}">Add ${ag} nippers</a>`}</div>`}
      </div>
      <p class="muted" style="font-size:.85rem;margin-top:14px">Signing off here records the evaluation in Nipper Hub. Also record it in your club’s official system (SLS Hub / Nipper App) so it counts for competition entries.</p>`;
  };

  /* ---------- Sessions ---------- */
  VIEWS.sessions = function (r) {
    if (r.q.new) return sessionForm();
    const list = S.sessions.filter(s => s.season === S.season).sort((a, b) => b.date.localeCompare(a.date));
    return `<div class="page-head"><div><h1>Sessions</h1><p class="sub">Weekly attendance and game plans. Attendance feeds the age-award recommendation.</p></div>
      <a class="btn" href="#/sessions?new=1">+ New session</a></div>
      ${list.length ? `<div class="list">${list.map(s => `<a class="list-item" href="#/session/${s.id}"><span class="avatar" style="background:var(--navy);color:#fff">${esc((s.ageGroup || '').replace('All', '★'))}</span>
        <div class="grow"><div class="title">${fmtDay(s.date)}${s.title ? ' · ' + esc(s.title) : ''}</div><div class="meta">${esc(s.ageGroup)} · ${(s.present || []).length} present · ${(s.games || []).length} games${s.srr ? ' · SRR ' + esc(s.srr) : ''}</div></div>
        ${s.date >= today() ? '<span class="badge water">Upcoming</span>' : ''}</a>`).join('')}</div>`
        : `<div class="card empty"><h3>No sessions yet</h3><p>Create one for each age group each week to record attendance and plan games.</p></div>`}`;
  };
  function sessionForm(s) {
    const nextSun = (() => { const d = new Date(); d.setDate(d.getDate() + ((7 - d.getDay()) % 7)); return d.toLocaleDateString('en-CA'); })();
    return `<div class="page-head"><h1>${s ? 'Edit session' : 'New session'}</h1></div>
      <form class="card" data-form="session" data-id="${s ? s.id : ''}" style="max-width:640px">
        <div class="form-grid two">
          <label class="field">Date<input type="date" name="date" required value="${esc(s ? s.date : nextSun)}"></label>
          <label class="field">Age group<select name="ageGroup">${['All'].concat(NIP.AGE_GROUPS).map(a => `<option ${(s ? s.ageGroup : (S.evalAg || 'U6')) === a ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
          <label class="field">Title (optional)<input type="text" name="title" value="${esc(s && s.title)}" placeholder="e.g. Week 3: rips & flags"></label>
          <label class="field">Surf Risk Rating <span class="hint">From the SLSA Operations App, if known</span><input type="number" name="srr" min="1" max="40" value="${esc(s && s.srr)}"></label>
        </div>
        <label class="field">Notes<textarea name="notes">${esc(s && s.notes)}</textarea></label>
        <div class="btn-row"><button class="btn" type="submit">${s ? 'Save' : 'Create session'}</button><a class="btn secondary" href="${s ? '#/session/' + s.id : '#/sessions'}">Cancel</a>
        ${s ? `<span style="flex:1"></span><button type="button" class="btn ghost" data-action="delete-session" data-id="${s.id}">Delete</button>` : ''}</div>
      </form>`;
  }
  VIEWS.session = function (r) {
    const s = S.sessions.find(x => x.id === r.id);
    if (!s) return `<div class="card empty"><h3>Session not found</h3><a href="#/sessions">Back</a></div>`;
    if (r.q.edit) return sessionForm(s);
    const kids = seasonNippers().filter(p => s.ageGroup === 'All' || ageGroupOf(p) === s.ageGroup).sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
    const present = new Set(s.present || []);
    const presentKids = kids.filter(p => present.has(p.id));
    const notEval = presentKids.filter(p => status(p, 'prelim').code !== 'competent');
    const games = (s.games || []).map(id => NIP.GAMES.find(g => g.id === id)).filter(Boolean);
    const hasWater = games.some(g => g.type === 'wade' || g.type === 'water');
    const ratio = s.srr ? ratioCalc({ n: presentKids.length, srr: Number(s.srr), activity: 'regular', u8: ['U6', 'U7', 'U8'].includes(s.ageGroup), nsa: 99 }) : null;
    return `
      <div class="page-head"><div><a href="#/sessions" class="muted" style="text-decoration:none">← Sessions</a>
        <h1 style="margin-top:4px">${fmtDay(s.date)} · ${esc(s.ageGroup)}</h1>${s.title ? `<p class="sub">${esc(s.title)}</p>` : ''}</div>
        <div class="btn-row"><button class="btn secondary" data-action="print">Print</button><a class="btn secondary" href="#/session/${s.id}?edit=1">Edit</a></div></div>
      ${s.notes ? `<div class="callout yellow" style="margin-bottom:12px">${esc(s.notes)}</div>` : ''}
      <div class="grid-2">
        <div class="card flag-top"><div class="row between"><h2 style="margin:0">Attendance</h2><strong>${presentKids.length}/${kids.length}</strong></div>
          <div class="btn-row no-print" style="margin:8px 0"><button class="btn small secondary" data-action="att-all" data-id="${s.id}">All present</button><button class="btn small ghost" data-action="att-none" data-id="${s.id}">Clear</button></div>
          ${notEval.length && hasWater ? `<div class="error"><strong>${notEval.length} present nipper(s) haven’t passed the Preliminary Evaluation:</strong> ${notEval.map(p => esc(p.firstName)).join(', ')}. Keep them out of water activities, or supervise them more closely.</div>` : ''}
          ${kids.length ? kids.map(p => { const c = status(p, 'prelim').code; return `<label class="row" style="padding:8px 0;border-bottom:1px dashed var(--line);gap:10px;cursor:pointer">
            <input type="checkbox" style="width:22px;height:22px" data-action="att" data-sid="${s.id}" data-pid="${p.id}" ${present.has(p.id) ? 'checked' : ''}>
            <span style="flex:1">${esc(fullName(p))}${s.ageGroup === 'All' ? ` <span class="muted">${esc(ageGroupOf(p))}</span>` : ''}</span>
            ${c === 'competent' ? '<span class="badge ok">✓ Prelim</span>' : `<span class="badge ${c === 'nyc' ? 'bad' : 'warn'}">No prelim</span>`}</label>`; }).join('') : '<p class="muted">No nippers in this age group yet.</p>'}
        </div>
        <div class="grid" style="align-content:start">
          <div class="card"><h2>Games plan</h2>
            ${games.length ? games.map((g, i) => `<div class="row" style="padding:8px 0;border-bottom:1px dashed var(--line)"><strong style="width:20px">${i + 1}.</strong><a href="#/game/${g.id}" style="flex:1">${esc(g.name)}</a>${typeBadge(g.type)}<button class="btn small ghost no-print" data-action="game-remove" data-sid="${s.id}" data-gid="${g.id}" aria-label="Remove">✕</button></div>`).join('') : '<p class="muted">No games yet.</p>'}
            <div class="row no-print" style="margin-top:10px"><select data-change="game-add" data-sid="${s.id}" style="flex:1;margin:0"><option value="">+ Add a game…</option>${NIP.GAMES.filter(g => !(s.games || []).includes(g.id) && (s.ageGroup === 'All' || agIn(s.ageGroup, g))).map(g => `<option value="${g.id}">${esc(g.name)} (${NIP.GAME_TYPES[g.type].label})</option>`).join('')}</select></div>
            ${hasWater ? `<div class="callout water" style="margin-top:12px"><strong>Water activities planned.</strong> Need a Water Safety Supervisor, a Surf Risk Rating assessment and water safety at ratio. Head count before and after.</div>` : ''}
          </div>
          <div class="card"><h2>Water safety</h2>${ratio ? ratioSummary(ratio) : `<p class="muted">Add the Surf Risk Rating to this session to see minimum ratios, or use the <a href="#/safety">ratio calculator</a>.</p>`}</div>
        </div>
      </div>`;
  };

  /* ---------- Games ---------- */
  function agIn(ag, g) { const i = NIP.AGE_GROUPS.indexOf(ag); return i >= NIP.AGE_GROUPS.indexOf(g.from) && i <= NIP.AGE_GROUPS.indexOf(g.to); }
  function typeBadge(t) { const cls = t === 'sand' ? 'yellow' : t === 'surfed' ? 'bad' : 'water'; return `<span class="badge ${cls}">${esc(NIP.GAME_TYPES[t].label)}</span>`; }
  VIEWS.games = function () {
    const f = S.gameFilter;
    let list = NIP.GAMES.filter(g => (f.type === 'all' || g.type === f.type) && (f.ag === 'All' || agIn(f.ag, g)));
    if (f.q) { const q = f.q.toLowerCase(); list = list.filter(g => (g.name + ' ' + g.summary + ' ' + (g.skills || []).join(' ')).toLowerCase().includes(q)); }
    return `<div class="page-head"><div><h1>Games &amp; activities</h1><p class="sub">${NIP.GAMES.length} beach games with set-up, rules and safety notes. Add them to a session plan.</p></div></div>
      <div class="card" style="margin-bottom:12px">
        <input type="search" placeholder="Search games or skills (e.g. flotation, rips)…" value="${esc(f.q)}" data-input="gq" style="margin-top:0" aria-label="Search games">
        <div class="chips" style="margin-top:10px">${[['all', 'All']].concat(Object.entries(NIP.GAME_TYPES).map(([k, v]) => [k, v.label])).map(([k, l]) => `<button class="chip ${f.type === k ? 'active' : ''}" data-action="gf-type" data-v="${k}">${l}</button>`).join('')}</div>
        <div class="chips" style="margin-top:8px">${['All'].concat(NIP.AGE_GROUPS).map(a => `<button class="chip ${f.ag === a ? 'active' : ''}" data-action="gf-ag" data-v="${a}">${a}</button>`).join('')}</div>
      </div>
      <div class="grid-3">${list.map(g => `<a class="card card-link game-card type-${g.type}" href="#/game/${g.id}"><span class="type-strip"></span>
        <h3>${esc(g.name)}</h3><div class="game-meta">${typeBadge(g.type)}<span class="badge">${g.from}–${g.to}</span><span class="badge">${esc(g.time)}</span>${g.prelim ? `<span class="badge ok">Builds: ${esc(g.prelim.join(', '))}</span>` : ''}</div>
        <p style="margin:0;font-size:.94rem">${esc(g.summary)}</p></a>`).join('') || '<div class="card empty">No games match those filters.</div>'}</div>`;
  };
  VIEWS.game = function (r) {
    const g = NIP.GAMES.find(x => x.id === r.id);
    if (!g) return `<div class="card empty"><h3>Game not found</h3><a href="#/games">Back</a></div>`;
    const upcoming = S.sessions.filter(s => s.date >= today()).sort((a, b) => a.date.localeCompare(b.date));
    const water = g.type === 'wade' || g.type === 'water';
    const li = arr => `<ul>${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
    return `<div class="game-detail">
      <a href="#/games" class="muted" style="text-decoration:none">← Games</a>
      <div class="page-head" style="margin-top:4px"><div><h1>${esc(g.name)}</h1>
        <div class="game-meta">${typeBadge(g.type)}<span class="badge ag">${g.from}–${g.to}</span><span class="badge">${esc(g.time)}</span><span class="badge">${esc(g.players)}</span><span class="badge">Intensity: ${esc(g.intensity)}</span></div></div>
        <div class="btn-row no-print"><button class="btn secondary" data-action="print">Print</button></div></div>
      <div class="grid-2">
        <div class="card flag-top" style="grid-column:1/-1"><p style="font-size:1.08rem;margin:0">${esc(g.summary)}</p></div>
        ${water ? `<div class="callout water" style="grid-column:1/-1"><strong>Water activity.</strong> Needs a Water Safety Supervisor on the beach, a Surf Risk Rating assessment, and water safety at ratio (1:10 low risk, 1:5 otherwise; NSAs can help for U8 and under in low risk). Only nippers who passed this season’s Preliminary Evaluation.</div>` : ''}
        <div class="card"><h3>Equipment</h3>${li(g.equipment)}<h3 style="margin-top:14px">Set-up</h3><p>${esc(g.setup)}</p></div>
        <div class="card"><h3>How to play</h3><ol>${g.steps.map(x => `<li>${esc(x)}</li>`).join('')}</ol></div>
        ${g.rules.length ? `<div class="card"><h3>Rules</h3>${li(g.rules)}</div>` : ''}
        ${g.safety.length ? `<div class="card"><h3>Safety</h3>${li(g.safety)}</div>` : ''}
        ${g.variations.length ? `<div class="card"><h3>Variations</h3>${li(g.variations)}</div>` : ''}
        <div class="card"><h3>Skills</h3><div class="chips">${g.skills.map(s => `<span class="badge">${esc(s)}</span>`).join('')}</div>
          ${g.prelim ? `<p class="muted" style="margin-top:10px;font-size:.9rem">Good practice for the Preliminary Evaluation element: <strong>${esc(g.prelim.join(', '))}</strong>.</p>` : ''}</div>
        ${g.debrief ? `<div class="card yellow"><h3>Debrief</h3><p style="margin:0">${esc(g.debrief)}</p></div>` : ''}
        ${g.questions ? `<div class="card" style="grid-column:1/-1"><h3>Question bank</h3><ol>${g.questions.map(([q, a]) => `<li>${esc(q)} <strong style="color:${a ? 'var(--ok)' : 'var(--bad)'}">${a ? 'TRUE' : 'FALSE'}</strong></li>`).join('')}</ol></div>` : ''}
      </div>
      <div class="card no-print" style="margin-top:14px"><h3>Add to a session</h3>
        ${upcoming.length ? `<div class="row"><select id="add-to-session" style="flex:1;margin:0">${upcoming.map(s => `<option value="${s.id}">${fmtDay(s.date)} · ${esc(s.ageGroup)}${s.title ? ' · ' + esc(s.title) : ''}</option>`).join('')}</select><button class="btn" data-action="game-to-session" data-gid="${g.id}">Add</button></div>`
        : `<p class="muted">No upcoming sessions. <a href="#/sessions?new=1">Create one</a>.</p>`}</div>
    </div>`;
  };

  /* ---------- Safety: ratio calculator ---------- */
  function ratioCalc({ n, srr, activity, u8, nsa }) {
    const band = NIP.SRR_BANDS.find(b => srr >= b.min && srr <= b.max) || NIP.SRR_BANDS[0];
    if (!band.ratio) return { band, stop: true };
    let ratio = band.ratio, note = '';
    if (activity === 'prelim-new') { ratio = 1; note = 'Preliminary Evaluation, new members: 1:1.'; }
    else if (activity === 'prelim-ret') { ratio = Math.min(5, band.ratio); note = 'Preliminary Evaluation, returning members: maximum 1:5.'; }
    else if (activity === 'inclusive') { ratio = 1; note = 'Adaptive / inclusive activity: 1:1 recommended minimum.'; }
    const wspOnly = Math.ceil(n / ratio);
    let withNsa = null;
    if (activity === 'regular' && band.nsa && u8 && nsa > 0 && n > 0) {
      for (let W = 1; W <= wspOnly; W++) {
        const A = Math.min(nsa, W, Math.ceil(Math.max(0, n - W * ratio) / 5));
        if (W * ratio + A * 5 >= n) { withNsa = { W, A }; break; }
      }
      if (withNsa && withNsa.A === 0) withNsa = null;
    }
    const total = withNsa ? withNsa.W + withNsa.A : wspOnly;
    return { band, ratio, wspOnly, withNsa, inWater: withNsa ? withNsa.W >= 1 ? Math.ceil(0.75 * total) : total : Math.ceil(0.75 * wspOnly), note, n };
  }
  function ratioSummary(c) {
    if (c.stop) return `<div class="error"><strong>${esc(c.band.label)}: do not proceed</strong> with water activities.</div>`;
    const color = c.band.min <= 8 ? 'var(--ok-soft)' : c.band.min <= 20 ? 'var(--warn-soft)' : 'var(--bad-soft)';
    return `<p><span class="srr-band" style="background:${color}">${esc(c.band.label)} (SRR ${c.band.min}–${c.band.max})</span></p>
      <div class="row" style="gap:20px;align-items:flex-end"><div><div class="result-big">${c.wspOnly}</div><div class="muted">Water Safety Personnel minimum (1:${c.ratio}) for ${c.n} nippers</div></div>
      ${c.withNsa ? `<div><div class="result-big" style="color:var(--water)">${c.withNsa.W} + ${c.withNsa.A}</div><div class="muted">or WSP + Nipper Safety Assistants</div></div>` : ''}</div>
      ${c.note ? `<p style="margin-top:10px">${esc(c.note)}</p>` : ''}
      <ul style="padding-left:20px;margin:10px 0 0">
        <li>Plus a <strong>Water Safety Supervisor</strong> on the beach for the whole activity (Bronze Medallion).</li>
        <li>At least <strong>75% of water safety in the water</strong> with SLSA-approved rescue equipment${c.withNsa ? '; all NSAs in the water' : ''}.</li>
        ${c.withNsa ? '<li>NSAs: U8 and under, low risk, shallow water only, max 1:5, no more than 50% of the team.</li>' : ''}
        <li>These are minimums. The WSS can and should add more for the conditions.</li></ul>`;
  }
  VIEWS.safety = function () {
    const v = S.calc || (S.calc = { n: 20, srr: 6, activity: 'regular', u8: true, nsa: 2 });
    const c = ratioCalc(v);
    return `<div class="page-head"><div><h1>Water safety</h1><p class="sub">Minimum ratios from SLSA Procedure 1.01A Water Safety (May 2026).</p></div></div>
      <div class="grid-2">
        <form class="card flag-top" data-form="calc" oninput="this.requestSubmit && this.requestSubmit()">
          <h2>Ratio calculator</h2>
          <div class="form-grid two">
            <label class="field">Nippers in the water<input type="number" name="n" min="0" value="${v.n}"></label>
            <label class="field">Surf Risk Rating score<span class="hint">From the Operations App / LIMSOC</span><input type="number" name="srr" min="1" max="40" value="${v.srr}"></label>
          </div>
          <label class="field">Activity<select name="activity">
            ${[['regular', 'Nipper water activity'], ['prelim-new', 'Preliminary Evaluation: new members'], ['prelim-ret', 'Preliminary Evaluation: returning members'], ['inclusive', 'Adaptive / inclusive activity']].map(([k, l]) => `<option value="${k}" ${v.activity === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <div class="form-grid two">
            <label class="field row" style="gap:8px"><input type="checkbox" name="u8" ${v.u8 ? 'checked' : ''} style="width:20px;height:20px"> All participants U8 or younger</label>
            <label class="field">NSAs available<input type="number" name="nsa" min="0" value="${v.nsa}"></label>
          </div>
        </form>
        <div class="card" aria-live="polite"><h2>Minimum water safety</h2>${ratioSummary(c)}</div>
        <div class="card"><h2>Ratio table</h2><table class="ag-table"><thead><tr><th>SRR</th><th>Risk</th><th>Nippers (no SRC)</th></tr></thead><tbody>
          ${NIP.SRR_BANDS.map(b => `<tr><td>${b.min}${b.max < 99 ? '–' + b.max : '+'}</td><td>${b.label}</td><td>${b.ratio ? `1:${b.ratio}${b.nsa ? ' (NSA 1:5)' : ''}` : '<strong style="color:var(--bad)">Do not proceed</strong>'}</td></tr>`).join('')}
        </tbody></table></div>
        <div class="card"><h2>Who wears what</h2><table class="ag-table"><tbody>
          <tr><th>Water Safety Personnel</th><td>Long-sleeve fluoro <strong>orange</strong> “WATER SAFETY” rash shirt, or full surf rescue uniform with cap</td></tr>
          <tr><th>Nipper Safety Assistant</th><td>Long-sleeve fluoro <strong>green</strong> “NIPPER SAFETY ASSISTANT” rash shirt</td></tr>
          <tr><th>Nippers</th><td>High-vis vest as the outer layer + coloured cap secured under the chin</td></tr>
          <tr><th>WSS</th><td>Optional identifiable orange vest or shirt; stays on the beach</td></tr></tbody></table></div>
      </div>`;
  };

  /* ---------- Standards reference ---------- */
  VIEWS.standards = function () {
    const stageTable = k => {
      const st = NIP.STAGES[k];
      return `<div class="card flag-top"><h2>${st.name}: ${st.groups.join(', ')}</h2><p class="muted">${st.focus} · recommended depth ${st.depth}</p>
        <div class="table-wrap"><table class="ag-table"><thead><tr><th></th>${st.groups.map(g => `<th>${g}</th>`).join('')}</tr></thead><tbody>
        ${['Flotation', 'Submersion', 'Propulsion'].map(area => `<tr><th>${area}</th>${st.groups.map(g => `<td>${NIP.PRELIM[g].filter(e => e.area === area).map(e => esc(e.text)).join('<br><br>')}</td>`).join('')}</tr>`).join('')}
        </tbody></table></div></div>`;
    };
    const li = a => `<ul style="padding-left:20px;margin:6px 0 0">${a.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
    return `<div class="page-head"><div><h1>Sign-off standards</h1><p class="sub">What each age group must show, and who can sign them off.</p></div><button class="btn secondary no-print" data-action="print">Print</button></div>
      <div class="card yellow"><strong>Preliminary Evaluation</strong> must be completed before a nipper starts nippers each season. SLS NSW describes it as a <em>skills evaluation, not a proficiency</em>. Age group = age at 30 September. Clubs and branches can set requirements <strong>above</strong> these, never below. Check with your branch.</div>
      <div class="grid" style="margin-top:14px">
        ${stageTable(1)}${stageTable(2)}${stageTable(3)}
        <div class="grid-2">
          <div class="card"><h2>Who can assess (recommended)</h2>${li(NIP.REF.prelimAssessor)}</div>
          <div class="card"><h2>Ratios during &amp; after evaluation</h2>${li(NIP.REF.prelimRatios)}</div>
          <div class="card"><h2>Competition Evaluation</h2><p class="muted">Needed only to compete. Juniors can compete from U8 (intra-club up).</p>
            <table class="ag-table"><tbody>${NIP.AGE_GROUPS.map(g => `<tr><th>${g}</th><td>${NIP.COMP[g] ? esc(NIP.COMP[g].text) : g === 'U8' ? 'Nil: no water competition except the wade (waist-deep)' : 'Nil'}</td></tr>`).join('')}</tbody></table></div>
          <div class="card"><h2>Age awards (Surf Education)</h2><p class="muted">Participation-based. SLS NSW suggests ≥50% attendance (club discretion). Processed via the Nipper App or SurfGuard.</p>
            <table class="ag-table"><tbody>${NIP.AGE_GROUPS.map(g => `<tr><th>${g}</th><td>${esc(NIP.AGE_AWARDS[g])}</td></tr>`).join('')}</tbody></table></div>
        </div>
        <div class="card"><h2>Sources</h2><ul style="padding-left:20px;margin:0">
          <li><a href="https://www.manula.com/manuals/slsnsw/junior-activities/1/en/topic/preliminary-evaluations" target="_blank" rel="noopener">SLS NSW Junior Activities Manual: Preliminary Evaluations</a></li>
          <li><a href="https://www.manula.com/manuals/slsnsw/junior-activities/1/en/topic/junior-competition-evaluation" target="_blank" rel="noopener">SLS NSW Junior Activities Manual: Competition Evaluation</a></li>
          <li><a href="https://www.manula.com/manuals/slsnsw/junior-activities/1/en/topic/junior-age-awards" target="_blank" rel="noopener">SLS NSW Junior Activities Manual: Junior Age Awards</a></li>
          <li>SLSA Procedure 1.01A Water Safety (May 2026) · SLSA Procedure 1.01B Nipper Safety Assistant Award (May 2026)</li></ul></div>
      </div>`;
  };

  /* ---------- NSA helpers ---------- */
  VIEWS.helpers = function (r) {
    const list = helpers().sort((a, b) => fullName(a).localeCompare(fullName(b)));
    const open = r.id ? S.participants.find(p => p.id === r.id) : null;
    if (open) {
      return `<a href="#/helpers" class="muted" style="text-decoration:none">← Nipper Safety Assistants</a>
        <div class="page-head" style="margin-top:4px"><h1>${esc(fullName(open))}</h1><button class="btn ghost" data-action="archive" data-id="${open.id}">Archive</button></div>
        ${signoffCard(open, 'nsa', null)}`;
    }
    return `<div class="page-head"><div><h1>Nipper Safety Assistants</h1><p class="sub">Helpers aged 13+ who support water safety for U8 and under (SLSA 1.01B).</p></div></div>
      <div class="grid-2">
        <div class="card flag-top"><h2>When NSAs can help</h2><ul style="padding-left:20px;margin:0">${NIP.REF.nsaConditions.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
          <p class="muted" style="margin-top:10px;font-size:.9rem"><strong>Who can assess:</strong> ${esc(NIP.REF.nsaAssessor)}</p></div>
        <form class="card" data-form="helper"><h2>Add a helper</h2>
          <div class="form-grid two"><label class="field">First name<input type="text" name="firstName" required></label><label class="field">Last name<input type="text" name="lastName"></label></div>
          <button class="btn" type="submit">Add helper</button></form>
      </div>
      <div class="list" style="margin-top:14px">${list.length ? list.map(p => `<a class="list-item" href="#/helpers/${p.id}"><span class="avatar" style="background:#2E9E4F;color:#fff">${esc(initials(p))}</span><div class="grow"><div class="title">${esc(fullName(p))}</div></div>${statusBadge(status(p, 'nsa'), 'nsa')}</a>`).join('') : '<div class="empty">No helpers added yet.</div>'}</div>`;
  };

  /* ---------- Team / admin ---------- */
  VIEWS.team = function () {
    const list = S.staff.slice().sort((a, b) => (a.role === 'pending' ? -1 : 1) - (b.role === 'pending' ? -1 : 1) || (a.name || '').localeCompare(b.name || ''));
    return `<div class="page-head"><div><h1>Team</h1><p class="sub">${isAdmin() ? 'Approve new age managers and set who is an admin.' : 'Age managers with access to Nipper Hub.'}</p></div></div>
      <form class="card" data-form="profile" style="margin-bottom:14px"><div class="row"><label class="field" style="flex:1;margin:0">Your display name (shown as assessor)<input type="text" name="name" value="${esc(S.me && S.me.name)}"></label><button class="btn secondary" type="submit" style="align-self:flex-end">Save</button></div></form>
      <div class="list">${list.map(m => `<div class="list-item"><span class="avatar">${esc((m.name || '?')[0].toUpperCase())}</span>
        <div class="grow"><div class="title">${esc(m.name || '—')} ${m.id === (S.user && S.user.uid) ? '<span class="badge">You</span>' : ''}</div><div class="meta">${esc(m.email || '')}</div></div>
        ${isAdmin() && m.id !== S.user.uid ? `<select data-change="role" data-id="${m.id}" style="width:auto;margin:0">${[['pending', 'Pending'], ['age_manager', 'Age manager'], ['admin', 'Admin'], ['removed', 'Removed']].map(([k, l]) => `<option value="${k}" ${m.role === k ? 'selected' : ''}>${l}</option>`).join('')}</select>`
        : `<span class="badge ${m.role === 'pending' ? 'warn' : m.role === 'admin' ? 'bad' : 'ok'}">${esc((m.role || '').replace('_', ' '))}</span>`}</div>`).join('')}</div>`;
  };

  /* ---------- More ---------- */
  VIEWS.more = function () {
    const tile = (href, ic, t, d) => `<a class="card card-link" href="${href}">${ic}<div><strong>${t}</strong><div class="muted" style="font-size:.88rem">${d}</div></div></a>`;
    return `<div class="page-head"><h1>More</h1></div>
      <div class="more-grid">
        ${tile('#/standards', I.book, 'Sign-off standards', 'Every age group’s evaluation requirements')}
        ${tile('#/safety', I.life, 'Water safety', 'Ratio calculator, uniforms, SRR bands')}
        ${tile('#/helpers', I.shield, 'Nipper Safety Assistants', 'Track NSA skills maintenance')}
        ${tile('#/team', I.team, 'Team', isAdmin() ? 'Approve age managers' : 'Who has access')}
      </div>
      <div class="card" style="margin-top:14px"><div class="row between"><div><strong>${esc(myName())}</strong><div class="muted">${esc(S.user.email || '')} · ${esc((S.me.role || '').replace('_', ' '))}</div></div>
        <button class="btn secondary" data-action="signout">${I.out.replace('<svg', '<svg width="18" height="18"')} Sign out</button></div></div>
      ${store.mode === 'demo' ? `<div class="card" style="margin-top:14px"><h3>Demo tools</h3><div class="btn-row"><button class="btn secondary" data-action="seed">Load sample nippers</button><button class="btn ghost" data-action="reset-demo">Reset demo data</button></div></div>` : ''}`;
  };

  /* ================= EVENTS ================= */
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-action]'); if (!el) return;
    const a = el.dataset.action, d = el.dataset;
    if (el.tagName === 'INPUT') return; // checkboxes handled on change
    e.preventDefault();
    switch (a) {
      case 'auth-tab': S.authTab = d.tab; S.authError = ''; S.authInfo = ''; render(); break;
      case 'signout': await store.signOut(); location.hash = '#/'; break;
      case 'tick': await toggleItem(d.id, d.std, d.el); break;
      case 'outcome': await setOutcome(d.id, d.std, d.v); break;
      case 'eval-mode': S.evalMode = d.v; render(); break;
      case 'nf-ag': S.nipperFilter.ag = d.v; history.replaceState(null, '', '#/nippers'); render(); break;
      case 'nf-status': S.nipperFilter.status = d.v; render(); break;
      case 'gf-type': S.gameFilter.type = d.v; render(); break;
      case 'gf-ag': S.gameFilter.ag = d.v; render(); break;
      case 'export': exportCsv(); break;
      case 'print': window.print(); break;
      case 'seed': await seed(); break;
      case 'reset-demo': if (confirm('Delete all demo data?')) { store.resetDemo(); toast('Demo data reset'); } break;
      case 'archive': {
        const p = S.participants.find(x => x.id === d.id);
        if (p && confirm(`Archive ${fullName(p)}? They’ll be hidden from lists but their records are kept.`)) {
          await safe(() => store.update('participants', d.id, { active: false }), 'Archived'); location.hash = p.kind === 'nsa' ? '#/helpers' : '#/nippers';
        } break;
      }
      case 'delete-nipper': {
        const p = S.participants.find(x => x.id === d.id);
        if (p && confirm(`Permanently delete ${fullName(p)} and all their sign-off records?`)) { await safe(() => store.remove('participants', d.id), 'Deleted'); location.hash = '#/nippers'; }
        break;
      }
      case 'delete-session': if (confirm('Delete this session and its attendance?')) { await safe(() => store.remove('sessions', d.id), 'Session deleted'); location.hash = '#/sessions'; } break;
      case 'att-all': case 'att-none': {
        const s = S.sessions.find(x => x.id === d.id);
        const kids = seasonNippers().filter(p => s.ageGroup === 'All' || ageGroupOf(p) === s.ageGroup).map(p => p.id);
        await safe(() => store.update('sessions', d.id, { present: a === 'att-all' ? kids : [] })); break;
      }
      case 'game-remove': {
        const s = S.sessions.find(x => x.id === d.sid);
        await safe(() => store.update('sessions', d.sid, { games: (s.games || []).filter(g => g !== d.gid) })); break;
      }
      case 'game-to-session': {
        const sid = document.getElementById('add-to-session').value; const s = S.sessions.find(x => x.id === sid);
        if (s) await safe(() => store.update('sessions', sid, { games: Array.from(new Set((s.games || []).concat(d.gid))) }), 'Added to ' + fmtDay(s.date));
        break;
      }
    }
  });

  document.addEventListener('change', async e => {
    const el = e.target;
    if (el.dataset.action === 'att') {
      const s = S.sessions.find(x => x.id === el.dataset.sid); const set = new Set(s.present || []);
      el.checked ? set.add(el.dataset.pid) : set.delete(el.dataset.pid);
      await safe(() => store.update('sessions', s.id, { present: Array.from(set) })); return;
    }
    const k = el.dataset.change; if (!k) return;
    if (k === 'season') { S.season = el.value; render(); }
    else if (k === 'evalDate') { S.evalDate = el.value; }
    else if (k === 'evalEnv') { S.evalEnv = el.value; saveUi(); }
    else if (k === 'hideDone') { S.hideDone = el.checked; render(); }
    else if (k === 'role') { await safe(() => store.update('staff', el.dataset.id, { role: el.value }), 'Role updated'); }
    else if (k === 'game-add' && el.value) {
      const s = S.sessions.find(x => x.id === el.dataset.sid);
      await safe(() => store.update('sessions', s.id, { games: (s.games || []).concat(el.value) }));
    }
  });

  document.addEventListener('input', e => {
    const k = e.target.dataset.input; if (!k) return;
    if (k === 'nq') S.nipperFilter.q = e.target.value;
    if (k === 'gq') S.gameFilter.q = e.target.value;
    const pos = e.target.selectionStart;
    render();
    const again = document.querySelector(`[data-input="${k}"]`);
    if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (x) { } }
  });

  document.addEventListener('submit', async e => {
    const form = e.target.closest('form[data-form]'); if (!form) return;
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(form).entries());
    const kind = form.dataset.form;
    try {
      if (kind === 'signin' || kind === 'signup' || kind === 'reset') {
        S.authError = ''; S.authInfo = '';
        if (kind === 'signin') await store.signIn(fd.email.trim(), fd.password);
        if (kind === 'signup') await store.signUp(fd.name.trim(), fd.email.trim(), fd.password);
        if (kind === 'reset') { await store.resetPassword(fd.email.trim()); S.authInfo = 'Check your email for a reset link.'; S.authTab = 'signin'; render(); }
        return;
      }
      if (kind === 'nipper') {
        const data = { firstName: fd.firstName.trim(), lastName: (fd.lastName || '').trim(), dob: fd.dob || '', memberStatus: fd.memberStatus, notes: (fd.notes || '').trim(), kind: 'nipper', active: true };
        data.ageGroup = fd.ageGroup; data.ageGroupSeason = S.season;
        if (form.dataset.id) { await store.update('participants', form.dataset.id, data); toast('Saved'); location.hash = '#/nipper/' + form.dataset.id; }
        else { const id = await store.add('participants', data); toast(data.firstName + ' added'); location.hash = '#/nipper/' + id; }
      }
      if (kind === 'bulk') {
        const rows = parseBulk(fd.list, fd.ageGroup, fd.memberStatus);
        if (!rows.length) { toast('No names found'); return; }
        await store.batchAdd('participants', rows);
        toast(`${rows.length} nippers added`); location.hash = '#/nippers';
      }
      if (kind === 'helper') {
        await store.add('participants', { firstName: fd.firstName.trim(), lastName: (fd.lastName || '').trim(), kind: 'nsa', active: true });
        toast('Helper added'); form.reset();
      }
      if (kind === 'session') {
        const data = { date: fd.date, ageGroup: fd.ageGroup, title: (fd.title || '').trim(), srr: fd.srr ? Number(fd.srr) : null, notes: (fd.notes || '').trim(), season: seasonFor(fd.date) };
        if (form.dataset.id) { await store.update('sessions', form.dataset.id, data); toast('Saved'); location.hash = '#/session/' + form.dataset.id; }
        else { const id = await store.add('sessions', Object.assign({ present: [], games: [] }, data)); location.hash = '#/session/' + id; }
      }
      if (kind === 'so-meta') {
        const std = form.dataset.std; const patch = {};
        patch[soPath(std, 'date')] = fd.date || today();
        if (fd.environment) patch[soPath(std, 'environment')] = fd.environment;
        patch[soPath(std, 'notes')] = fd.notes || '';
        await store.update('participants', form.dataset.id, patch); toast('Details saved');
      }
      if (kind === 'calc') {
        S.calc = { n: Math.max(0, Number(fd.n) || 0), srr: Number(fd.srr) || 1, activity: fd.activity, u8: !!fd.u8, nsa: Math.max(0, Number(fd.nsa) || 0) };
        const box = form.nextElementSibling; if (box) box.innerHTML = '<h2>Minimum water safety</h2>' + ratioSummary(ratioCalc(S.calc));
      }
      if (kind === 'profile') { await store.update('staff', S.user.uid, { name: fd.name.trim() }); toast('Name updated'); }
    } catch (err) {
      console.error(err);
      if (/signin|signup|reset/.test(kind)) { S.authError = authMessage(err); render(); }
      else toast('Couldn’t save: ' + (err.code || err.message));
    }
  });

  function authMessage(err) {
    const c = err.code || '';
    if (/invalid-credential|wrong-password|user-not-found/.test(c)) return 'That email and password don’t match. Try again or reset your password.';
    if (/email-already-in-use/.test(c)) return 'An account already exists for that email. Sign in instead.';
    if (/weak-password/.test(c)) return 'Password needs to be at least 6 characters.';
    if (/invalid-email/.test(c)) return 'That email address doesn’t look right.';
    if (/operation-not-allowed/.test(c)) return 'Email/password sign-in isn’t enabled yet in the Firebase console (Authentication → Sign-in method).';
    if (/too-many-requests/.test(c)) return 'Too many attempts. Wait a minute and try again.';
    if (/unauthorized-domain/.test(c)) return 'This website address isn’t authorised in Firebase (Authentication → Settings → Authorised domains).';
    return err.message || String(err);
  }

  function seasonFor(date) { return NIP.currentSeason(new Date(date + 'T00:00:00')); }

  function parseBulk(text, defAg, defStatus) {
    return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(line => {
      const parts = line.split(/[,\t]/).map(s => s.trim()).filter(Boolean);
      const names = parts.shift().split(/\s+/);
      const row = { firstName: names.shift(), lastName: names.join(' '), dob: '', ageGroup: defAg, ageGroupSeason: S.season, memberStatus: defStatus, kind: 'nipper', active: true, notes: '' };
      parts.forEach(x => {
        let m;
        if ((m = x.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/))) row.dob = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
        else if (/^\d{4}-\d{2}-\d{2}$/.test(x)) row.dob = x;
        else if (/^u\d{1,2}$/i.test(x)) row.ageGroup = x.toUpperCase();
        else if (/^new$/i.test(x)) row.memberStatus = 'new';
        else if (/^return/i.test(x)) row.memberStatus = 'returning';
      });
      return row;
    }).filter(r => r.firstName);
  }

  function exportCsv() {
    const rows = [['First name', 'Last name', 'DOB', 'Age group', 'Member status', 'Prelim outcome', 'Prelim date', 'Prelim assessor', 'Prelim environment', 'Comp eval outcome', 'Comp eval date', 'Sessions attended', 'Sessions held', 'Age award', 'Award recommended', 'Notes']];
    seasonNippers().sort((a, b) => NIP.AGE_GROUPS.indexOf(ageGroupOf(a)) - NIP.AGE_GROUPS.indexOf(ageGroupOf(b)) || (a.lastName || '').localeCompare(b.lastName || '')).forEach(p => {
      const ag = ageGroupOf(p); const pr = rec(p, 'prelim') || {}; const cp = rec(p, 'comp') || {}; const aw = rec(p, 'award') || {}; const at = attendance(p);
      const lbl = c => ({ competent: 'Competent', nyc: 'Not yet competent', in_progress: 'In progress', not_started: '', na: 'N/A' })[c];
      rows.push([p.firstName, p.lastName, p.dob, ag, p.memberStatus, lbl(status(p, 'prelim').code), pr.date, pr.assessor, pr.environment, lbl(status(p, 'comp').code), cp.date, at.here, at.total, NIP.AGE_AWARDS[ag], aw.outcome === 'competent' ? 'Yes' : '', p.notes]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `nippers-${seasonKey(S.season)}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function seed() {
    const first = ['Charlie', 'Ava', 'Jack', 'Mia', 'Oliver', 'Isla', 'Noah', 'Ruby', 'Leo', 'Grace', 'Henry', 'Zara', 'Archie', 'Willow', 'Lucas', 'Matilda', 'Hudson', 'Harper', 'Max', 'Sienna', 'Billy', 'Frankie', 'Tom', 'Evie', 'Kai', 'Lily', 'Finn'];
    const last = ['Smith', 'Nguyen', 'Brown', 'Wilson', 'Taylor', 'Kelly', 'Murphy', 'Walker', 'Clarke', 'Hughes', 'Ryan', 'Patel'];
    const rows = first.map((f, i) => ({ firstName: f, lastName: last[i % last.length], dob: '', ageGroup: NIP.AGE_GROUPS[i % 9], ageGroupSeason: S.season, memberStatus: i % 4 === 0 ? 'new' : 'returning', kind: 'nipper', active: true, notes: '' }));
    await store.batchAdd('participants', rows);
    toast('Sample nippers added');
  }

  /* ================= BOOT ================= */
  window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

  function startData() {
    S.unsubs.forEach(u => u && u()); S.unsubs = [];
    ['participants', 'sessions', 'staff'].forEach(col => {
      S.unsubs.push(store.subscribe(col, list => { S[col] = list; scheduleRender(); }));
    });
  }

  (async function boot() {
    try { await store.init(); }
    catch (e) {
      console.error(e);
      document.getElementById('app').innerHTML = `<div class="auth-wrap"><div class="auth-card"><h2>Couldn’t connect</h2><p>Firebase didn’t load. Check your internet connection and refresh.</p><p class="muted">${esc(e.message)}</p><p><a href="?demo">Open in demo mode instead</a></p></div></div>`;
      return;
    }
    let started = false;
    store.onAuth((user, me) => {
      S.user = user; S.me = me; S.ready = true;
      const ok = user && me && (me.role === 'admin' || me.role === 'age_manager');
      if (ok && !started) { started = true; startData(); }
      if (!ok && started) { started = false; S.unsubs.forEach(u => u && u()); S.unsubs = []; S.participants = []; S.sessions = []; S.staff = []; }
      render();
    });
  })();
})();
