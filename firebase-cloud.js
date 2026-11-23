import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

(() => {
  if (window.__hbBossCrewLoaded) return;
  window.__hbBossCrewLoaded = true;
  const $ = id => document.getElementById(id);
  const CREW_CODE_KEY = 'hb_active_crew_code_v1';
  const CREW_NODES_KEY = 'hb_saved_crew_nodes_v1';
  const CREW_MODE_KEY = 'hb_crew_mode_v1';
  const BOSS = (window.HEIST_BOSS_EMAIL || 'sethmcnab13@gmail.com').toLowerCase();
  const CFG = window.HEIST_FIREBASE_CONFIG || {};
  const HAS_KEY = !!(CFG.apiKey && !String(CFG.apiKey).startsWith('PASTE_'));
  const esc = s => String(s || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

  let auth = null, db = null, user = null, isBoss = false, crewFilter = 'ALL';
  let previewCrew = localStorage.getItem(CREW_MODE_KEY) === '1';
  let bossHeists = [], bossCodes = [], activeMission = null;
  let activeCode = localStorage.getItem(CREW_CODE_KEY) || '';
  let savedNodes = (() => { try { const a = JSON.parse(localStorage.getItem(CREW_NODES_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } })();
  let expandedIds = new Set();
  let unsubs = [], crewUnsub = null;

  const saveNodes = () => localStorage.setItem(CREW_NODES_KEY, JSON.stringify(savedNodes.slice(0, 20)));
  function recordNode(code, title) {
    if (!code) return;
    const clean = code.trim().toUpperCase();
    const existing = savedNodes.find(n => n.code === clean);
    if (existing) { if (title) existing.title = title; }
    else savedNodes.unshift({ code: clean, title: title || clean });
    saveNodes();
  }

  const hasUrlCode = () => new URLSearchParams(location.search).has('code');
  const inCrewView = () => previewCrew || hasUrlCode() || (HAS_KEY && !isBoss);

  function setCrewMode(on) {
    previewCrew = !!on;
    localStorage.setItem(CREW_MODE_KEY, previewCrew ? '1' : '0');
    applyRoleLayout();
    renderView();
  }

  function applyRoleLayout() {
    const crew = inCrewView();
    const allowTabs = new Set(activeMission?.holo ? ['cloud', 'cad'] : ['cloud']);
    const nav = $('mainTabs');
    if (nav) {
      nav.style.display = '';
      nav.classList.remove('hidden');
      nav.className = 'bg-zinc-950 border-b border-zinc-800 px-2.5 py-2 flex flex-wrap items-center gap-1.5 shrink-0';
      document.querySelectorAll('#mainTabs .tab-btn').forEach(b => {
        const k = b.dataset.tab;
        const show = !crew || allowTabs.has(k);
        b.style.display = show ? '' : 'none';
        b.classList.toggle('hidden', !show);
      });
    }
    ['heistSelect', 'newHeistBtn', 'themeCycleBtn'].forEach(id => {
      const el = $(id);
      if (el) { el.style.display = crew ? 'none' : ''; el.classList.toggle('hidden', crew); }
    });
    if (crew) {
      const cur = [...document.querySelectorAll('main > section')].find(s => !s.classList.contains('hidden'));
      const curKey = cur?.id?.replace('view-', '');
      if (!curKey || !allowTabs.has(curKey)) {
        document.querySelectorAll('main > section').forEach(s => s.classList.toggle('hidden', s.id !== 'view-cloud'));
        renderView();
      }
    }
    updateHeaderBtn();
  }

  function updateHeaderBtn() {
    const slot = $('headerActionSlots'); if (!slot) return;
    let b = $('hbAcctPill');
    if (!b) {
      b = document.createElement('button'); b.id = 'hbAcctPill';
      b.className = 'px-2.5 py-1 rounded-lg bg-zinc-900 border border-sky-500/45 text-[10px] font-black text-sky-300 shrink-0';
      slot.prepend(b);
    }
    if (inCrewView()) {
      b.textContent = isBoss ? 'Exit Crew' : 'Boss Login';
      b.onclick = () => isBoss ? setCrewMode(false) : openBossLogin();
    } else {
      b.textContent = isBoss ? 'BOSS' : 'Boss Login';
      b.onclick = () => isBoss ? window.HeistBoard?.switchTab?.('cloud') : openBossLogin();
    }
  }

  function openBossLogin() {
    if (!HAS_KEY) return alert('Paste your Firebase apiKey in chat first to activate Boss Login.');
    let m = $('hbBossModal');
    if (!m) { m = document.createElement('div'); m.id = 'hbBossModal'; m.className = 'fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4'; document.body.appendChild(m); }
    m.innerHTML = `<div class='w-full max-w-sm bg-zinc-950 border border-rose-500/45 rounded-2xl p-4 space-y-3'>
      <div class='flex justify-between items-center'><span class='text-xs font-black uppercase text-rose-400'>Boss Admin Login</span><button id='bmClose' class='px-2 py-1 rounded bg-zinc-800 text-xs text-white'>Close</button></div>
      <div class='text-[11px] text-zinc-400'>Restricted to <span class='text-white font-mono'>${esc(BOSS)}</span>. Crew members use a Mission Code—no account needed.</div>
      <button id='bmGoogle' class='w-full py-2.5 rounded-xl bg-white text-zinc-950 text-xs font-black'>Sign In with Google (${esc(BOSS)})</button>
      <div class='border-t border-zinc-800 pt-2.5 space-y-2'>
        <div class='text-[10px] text-zinc-400'>Or use your Skill Tree Firebase password:</div>
        <input id='bmEmail' type='email' value='${esc(BOSS)}' class='w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white'>
        <input id='bmPass' type='password' placeholder='Password' class='w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white'>
        <button id='bmGo' class='w-full py-2 rounded-xl bg-rose-600 text-white text-xs font-black'>Sign In</button>
      </div>
      <div id='bmErr' class='hidden text-[11px] font-mono text-rose-400'></div>
    </div>`;
    m.classList.remove('hidden');
    $('bmClose').onclick = () => m.classList.add('hidden');
    const fail = msg => { $('bmErr').textContent = msg; $('bmErr').classList.remove('hidden'); };
    $('bmGoogle').onclick = async () => {
      try {
        const res = await signInWithPopup(auth, new GoogleAuthProvider());
        if (res.user.email.toLowerCase() !== BOSS) { await signOut(auth); fail('Access denied: Boss Gmail only.'); }
        else { setCrewMode(false); m.classList.add('hidden'); }
      } catch (e) { fail(e.message); }
    };
    $('bmGo').onclick = async () => {
      const em = $('bmEmail').value.trim().toLowerCase(), pw = $('bmPass').value;
      if (em !== BOSS) return fail('Restricted to ' + BOSS);
      try { await signInWithEmailAndPassword(auth, em, pw); setCrewMode(false); m.classList.add('hidden'); } catch (e) { fail(e.message); }
    };
  }

  function genCode(prefix = 'OP') {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = prefix.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6) || 'OP';
    out += '-';
    for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  function startBossStreams() {
    unsubs.forEach(u => { try { u(); } catch {} }); unsubs = [];
    if (!db || !isBoss) return;
    unsubs.push(onSnapshot(collection(db, 'hb_heists'), snap => {
      bossHeists = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      renderView();
    }));
    unsubs.push(onSnapshot(collection(db, 'hb_missions'), snap => {
      bossCodes = snap.docs.map(d => ({ code: d.id, ...d.data() })).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      renderView();
    }));
  }

  async function loadMissionByCode(rawCode) {
    const code = String(rawCode || '').trim().toUpperCase();
    if (!code) return;
    if (!db) return renderView('Firebase API key not yet added—code will sync once key is saved.');
    if (crewUnsub) { crewUnsub(); crewUnsub = null; }
    try {
      const ref = doc(db, 'hb_missions', code);
      const snap = await getDoc(ref);
      if (!snap.exists()) { activeMission = null; activeCode = ''; renderView('Invalid or revoked mission code: ' + code); return; }
      activeCode = code; localStorage.setItem(CREW_CODE_KEY, code);
      recordNode(code, snap.data()?.title || code);
      crewUnsub = onSnapshot(ref, s => {
        if (!s.exists()) { activeMission = null; activeCode = ''; localStorage.removeItem(CREW_CODE_KEY); applyRoleLayout(); renderView('Mission code was revoked by Boss.'); return; }
        activeMission = { code: s.id, ...s.data() };
        recordNode(s.id, activeMission.title || s.id);
        if (activeMission.holo) window.HeistBoard?.loadHoloState?.(activeMission.holo);
        applyRoleLayout(); renderView();
      });
    } catch (e) { renderView('Code load error: ' + e.message); }
  }

  async function createMissionCode(title, cards, includeHolo = true) {
    const code = genCode(title.split(' ')[0]);
    const holo = includeHolo && window.HeistBoard?.getHoloState ? window.HeistBoard.getHoloState() : null;
    await setDoc(doc(db, 'hb_missions', code), {
      title, role: 'check', cards, holo, updatedAt: Date.now()
    });
    const link = `${location.origin}${location.pathname}?code=${code}`;
    try { await navigator.clipboard.writeText(link); alert(`Crew Code Created: ${code}\nLink copied to clipboard!`); } catch { alert(`Crew Code Created: ${code}\nLink: ${link}`); }
  }

  async function saveHeist(title, cards = []) {
    const id = 'h_' + Date.now();
    await setDoc(doc(db, 'hb_heists', id), { title, cards, updatedAt: Date.now() });
  }

  async function importAsylum() {
    const steps = [
      { id: '1.1', title: 'Phase 1.1: Laser Level & Chalk Line (47x65 = 3,055 sq ft)', status: 'OPEN', notes: '• Set laser level to exact top elevation of clean interior concrete center slab.\n• Transfer height marks to all brick/stone exterior walls at corners and every 10-15 ft.\n• Snap a continuous taut chalk line around the entire room perimeter.' },
      { id: '1.2', title: 'Phase 1.2: Drop Depth Check & 2x4 Ripping (14 SYP Boards)', status: 'OPEN', notes: '• Measure vertically from chalk line down to highest rocky subfloor spots every 5-10 ft.\n• Drop >= 1-1/2 in: Rip 14 boards of 2x4x16 Southern Yellow Pine lengthwise into 3/4 in x 1-1/2 in strips (4 strips/board).\n• Drop < 1-1/2 in (e.g. 1 in): Rip 3-1/2 in face down to 1 in first, then split in half to make 3/4 in x 1 in strips.' },
      { id: '1.3', title: 'Phase 1.3: Permanent Wood Screed Anchoring', status: 'OPEN', notes: '• Align top edge of wood strip directly on chalk line with flat 3/4 in face against wall.\n• Drive 2-1/2 in Grip-Rite steel cut masonry nails (2 boxes / 1 lb ea) into mortar joints only (angled slightly downward) every 18-24 in. Never nail brick/stone faces.\n• Where mortar joints do not align, pack a dab of wet VersaBond thinset behind strip.\n• Leave wood strips permanently in place for Tufflex VRP-111 & liquid rubber encapsulation.' },
      { id: '2.0', title: 'Phase 2.0: Stage 165-204 Gal Water & Washout (980 sq ft)', status: 'OPEN', notes: '• Quikrete #100450 (175-180 bags @ 2.5-3.0 qt): 109-135 gal.\n• VersaBond Gray (15-16 bags @ 5.5-6.0 qt): 21-24 gal.\n• Washout / tub & paddle rinse reserve: 35-45 gal.\n• Total staging: 165-204 gal (1,376-1,701 lbs; 33-41 five-gal buckets or 3-4 fifty-five-gal drums / hose feed).\n• Keep 2 full 5-gal rinse buckets active and keep ALL fans OFF during slurry scrub and pour.' },
      { id: '2.1', title: 'Phase 2.1: 980 sq ft Perimeter Prep & Masking', status: 'OPEN', notes: '• HEPA-vacuum all loose dust, rocks, and delaminated debris from the 980 sq ft rocky perimeter (~1 in avg, 2-4 in deep holes).\n• Mask clean interior concrete slab edge using 0.31 mil HDX painter\'s plastic (2 rolls of 9x400 ft) and 3M ScotchBlue painter\'s tape (1 six-pack of 1.88 in x 60 yd).' },
      { id: '2.2', title: 'Phase 2.2: VersaBond Scrub Coat & Feathering (15-16 Bags)', status: 'OPEN', notes: '• Mix Ratio: ~5.5-6.0 qts clean water per 50 lb bag of Custom Building Products VersaBond Gray to thick pancake-batter slurry; slake 5-10 min & re-mix.\n• CRITICAL RULE: Scrub thin coat onto vacuumed concrete immediately ahead of pour; concrete MUST be placed within 15-20 min while slurry is still wet/tacky.\n• Feather shallow 1/4-3/4 in spots flush with standard trowel-consistency VersaBond where gravel concrete will not fit.' },
      { id: '2.3', title: 'Phase 2.3: Quikrete #100450 Concrete Pour (175-180 Bags)', status: 'OPEN', notes: '• LOCKED RATIO: 2.5-3.0 qts (80-96 oz) clean water per 50 lb bag mixed stiff (zero soupy bleed water) in 36x24x8 in mixing tubs or small drum mixer.\n• Bag limit: 4 pt (2 qt) start, 6 pt (3 qt) strict max. Mix only what places within 20 min (sets in 20-40 min; bag 4 hr heavy load spec).\n• Tamp into 2-4 in deep pockets to eliminate air voids and screed dead-flush with a straight 2x4 across interior slab and wood screed strip.' },
      { id: '2.5', title: 'Phase 2.5: SETUP FANS & Dehumidifiers (Tramex <= 4.5%)', status: 'OPEN', notes: '• Hold 2-4 hrs for initial set before aiming direct airflow so surface does not craze.\n• Run high-velocity box fans and dehumidifiers across all 980 sq ft of patched perimeter for 48-72 hours.\n• HARD GATE: Do not coat until Tramex concrete moisture impedance readings drop to <= 4.5% across all patched areas.' },
      { id: '3.1', title: 'Phase 3.1-3.3: Wall Scraping, Woodwork & Wall Paint', status: 'OPEN', notes: '• Scrape loose paint, flaking plaster, and efflorescence from brick/stone and walls onto masked floor (fans OFF during scraping).\n• Patch damaged wood trim, baseboards, casings, and wall holes/cracks; sand smooth and spot-prime (SETUP FANS to speed dry; OFF before finish paint).\n• Mask ceiling line and floor edges; paint all walls to finish coats (DO NOT PAINT CEILING).' },
      { id: '3.4', title: 'Phase 3.4: SETUP FANS (Paint Cure) & Full 3,055 sq ft Cleanup', status: 'OPEN', notes: '• Run indirect circulation fans until wall paint dries cleanly.\n• Remove floor plastic/tape once wall paint dries; sweep and HEPA-vacuum the entire 47x65 ft (3,055 sq ft) floor thoroughly.' },
      { id: '4.1', title: 'Phase 4.1-4.2: 9ft/11ft Layout, Grind & HEPA-Vac (3,055 sq ft)', status: 'OPEN', notes: '• Measure 9 ft (108 in) inward from 3 walls and 11 ft (132 in) inward from the 1 feature/entry wall; snap border chalk lines.\n• Border = 1,750 sq ft total (980 sq ft patch + wood screed + 770 sq ft clean slab overlap). Center checkerboard = 29x45 ft (1,305 sq ft) with 4x4 ft grid.\n• Mechanically grind/abrade clean concrete (770 sq ft overlap + 29x45 checkerboard) and HEPA-vacuum full 3,055 sq ft dust-free.' },
      { id: '4.3', title: 'Phase 4.3: Tufflex VRP-111 Primer (NO DRYLOK)', status: 'OPEN', notes: '• PREREQUISITE GATE: Confirm 980 sq ft patch is <= 4.5% on Tramex AND all Phase 2 & Phase 3 work is 100% done.\n• PRODUCT RULE: Do NOT use DRYLOK Extreme. Roll Tufflex VRP-111 directly onto bare dry patch, wood screed strips, and ground slab; observe recoat window.' },
      { id: '4.4', title: 'Phase 4.4: Liquid Rubber Border (1,750 sq ft) & Indirect Fans', status: 'OPEN', notes: '• Within VRP-111 recoat window, apply ELASTA-TUFF 5000 / SYD-BASECOAT and build 1/4 in liquid rubber (or 3/8 in rubber-granule slurry) across 1,750 sq ft border.\n• Finish rubber border in solid black aliphatic topcoat; pull edge tape cleanly before full cure.\n• Use indirect high-level cross-ventilation fans only (never blast wet resin directly).' },
      { id: '4.5', title: 'Phase 4.5-4.6: 29x45 Checkerboard, Clear Coat & Cure Gate', status: 'OPEN', notes: '• Roll 2 coats white floor coating across 29x45 ft center (indirect fans to cure hard before taping).\n• Mask alternating 4x4 ft squares with burnished ScotchBlue tape; roll 2 coats black and pull tape immediately before skinning over.\n• Roll clear aliphatic polyurethane/polyaspartic wear coat; CURE GATE: 24 hrs min light foot traffic, 48-72 hrs heavy event load-in.' }
    ];
    await saveHeist('The Asylum - 980 sq ft Master Spec', steps);
  }

  function renderView(msg = '') {
    const host = $('view-cloud'); if (!host) return;
    if (inCrewView()) {
      const allCards = activeMission?.cards || [];
      const doneCnt = allCards.filter(c => c.status === 'DONE').length;
      const pct = allCards.length ? Math.round((doneCnt / allCards.length) * 100) : 0;
      const filtered = allCards.filter(c => crewFilter === 'ALL' ? true : crewFilter === 'DONE' ? c.status === 'DONE' : c.status !== 'DONE');
      host.innerHTML = `<div class='max-w-xl mx-auto space-y-3 pb-10'>
        <div class='bg-zinc-900/95 border border-sky-500/45 rounded-2xl p-3.5 space-y-2.5 shadow-lg'>
          <div class='flex items-center justify-between gap-2'><span class='text-[10px] font-mono uppercase tracking-widest text-sky-400'>Saved Project Nodes</span><span class='text-[10px] font-mono text-zinc-400'>${savedNodes.length} Saved</span></div>
          <div class='flex flex-wrap gap-1.5'>${savedNodes.map(n => `<div class='inline-flex items-center rounded-xl border ${n.code === activeCode ? 'bg-sky-600/30 border-sky-400 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-300'} overflow-hidden'><button data-picknode='${esc(n.code)}' class='px-2.5 py-1.5 text-[11px] font-black truncate max-w-[170px]'>${esc(n.title || n.code)}</button><button data-delnode='${esc(n.code)}' class='px-1.5 py-1.5 text-[10px] text-zinc-500 hover:text-rose-400 border-l border-zinc-800'>✕</button></div>`).join('') || `<span class='text-[11px] text-zinc-500'>No saved mission nodes yet.</span>`}</div>
          <div class='flex gap-2 pt-1 border-t border-zinc-800'>
            <input id='crCodeIn' value='${esc(activeCode)}' placeholder='Add / enter new code (e.g. ASYLUM-4F9K2M)' class='flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono uppercase text-white'>
            <button id='crJoinBtn' class='px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-black'>Load</button>
          </div>
          ${msg ? `<div class='text-[11px] font-mono text-rose-400'>${esc(msg)}</div>` : ''}
        </div>
        ${activeMission ? `<div class='bg-zinc-900/95 border border-cyan-500/40 rounded-2xl p-3.5 space-y-3 shadow-lg'>
          <div class='flex items-start justify-between gap-2'>
            <div class='min-w-0'><div class='text-[10px] font-mono text-emerald-400'>NODE ${esc(activeMission.code)} • ${doneCnt}/${allCards.length} (${pct}%)</div><div class='text-base font-black text-white truncate'>${esc(activeMission.title)}</div></div>
            ${activeMission.holo ? `<button id='crOpenHolo' class='px-3 py-1.5 rounded-xl bg-cyan-600 text-white text-[11px] font-black shrink-0'>Room Holo ➔</button>` : ''}
          </div>
          <div class='w-full h-2 rounded-full bg-zinc-950 overflow-hidden border border-zinc-800'><div class='h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all' style='width:${pct}%'></div></div>
          <div class='flex gap-1.5'>
            <button data-cf='ALL' class='cf-b px-2.5 py-1 rounded-lg text-[10px] font-black border ${crewFilter === 'ALL' ? 'bg-sky-600/30 border-sky-400 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}'>All (${allCards.length})</button>
            <button data-cf='OPEN' class='cf-b px-2.5 py-1 rounded-lg text-[10px] font-black border ${crewFilter === 'OPEN' ? 'bg-amber-600/30 border-amber-400 text-amber-200' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}'>Open (${allCards.length - doneCnt})</button>
            <button data-cf='DONE' class='cf-b px-2.5 py-1 rounded-lg text-[10px] font-black border ${crewFilter === 'DONE' ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}'>Done (${doneCnt})</button>
          </div>
          <div class='space-y-2'>${filtered.map(c => {
            const isDone = c.status === 'DONE';
            const open = expandedIds.has(c.id);
            return `<div class='rounded-xl border transition-all ${isDone ? 'bg-emerald-950/25 border-emerald-500/40' : 'bg-zinc-950/95 border-zinc-800'} overflow-hidden'>
              <button data-expcard='${c.id}' class='w-full p-3 text-left flex items-center justify-between gap-2'>
                <div class='min-w-0 flex-1'>
                  <div class='text-xs font-black ${isDone ? 'line-through text-emerald-300' : 'text-white'}'>${esc(c.title)}</div>
                  <div class='text-[10px] text-zinc-400 mt-0.5'>${open ? 'Tap to collapse specs' : 'Tap to expand full specs &amp; rules'}</div>
                </div>
                <div class='flex items-center gap-1.5 shrink-0'>
                  <span class='px-2 py-0.5 rounded text-[9px] font-mono font-black ${isDone ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}'>${c.status}</span>
                  <span class='text-xs text-zinc-400'>${open ? '▴' : '▾'}</span>
                </div>
              </button>
              ${open ? `<div class='px-3 pb-3 pt-1 border-t border-zinc-800/80 space-y-2.5'>
                <div class='text-xs text-zinc-200 leading-relaxed whitespace-pre-line'>${esc(c.notes || 'No extra notes attached to this objective.')}</div>
                ${c.link ? `<a href='${esc(c.link)}' target='_blank' rel='noopener noreferrer' class='block px-3 py-2 rounded-lg bg-sky-950/80 border border-sky-500/40 text-xs font-bold text-sky-300'>Open Reference Link ➔</a>` : ''}
                <button data-setdone='${c.id}' class='w-full py-2 rounded-xl text-xs font-black ${isDone ? 'bg-zinc-800 border border-zinc-700 text-zinc-200' : 'bg-emerald-600 text-white'}'>${isDone ? 'Mark as OPEN Again' : '✓ Mark Objective Complete (DONE)'}</button>
              </div>` : ''}
            </div>`;
          }).join('') || `<div class='p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-center text-xs text-zinc-500'>No tasks in this filter.</div>`}</div>
        </div>` : `<div class='p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800 text-center text-xs text-zinc-400'>Blank slate. Enter a Mission Code above (or tap a saved project node) to load assigned work.</div>`}
      </div>`;
      $('crJoinBtn').onclick = () => loadMissionByCode($('crCodeIn').value);
      if ($('crOpenHolo')) $('crOpenHolo').onclick = () => window.HeistBoard?.switchTab?.('cad');
      host.querySelectorAll('.cf-b').forEach(b => b.onclick = () => { crewFilter = b.dataset.cf; renderView(); });
      host.querySelectorAll('[data-picknode]').forEach(b => b.onclick = () => loadMissionByCode(b.dataset.picknode));
      host.querySelectorAll('[data-delnode]').forEach(b => b.onclick = e => {
        e.stopPropagation();
        const cd = b.dataset.delnode;
        savedNodes = savedNodes.filter(x => x.code !== cd);
        saveNodes();
        if (activeCode === cd) { activeCode = ''; activeMission = null; localStorage.removeItem(CREW_CODE_KEY); }
        renderView();
      });
      host.querySelectorAll('[data-expcard]').forEach(b => b.onclick = () => {
        const id = b.dataset.expcard;
        if (expandedIds.has(id)) expandedIds.delete(id); else expandedIds.add(id);
        renderView();
      });
      host.querySelectorAll('[data-setdone]').forEach(b => b.onclick = async e => {
        e.stopPropagation();
        if (!db || !activeMission) return;
        const cid = b.dataset.setdone;
        const cards = (activeMission.cards || []).map(c => c.id === cid ? { ...c, status: c.status === 'DONE' ? 'OPEN' : 'DONE' } : c);
        await updateDoc(doc(db, 'hb_missions', activeMission.code), { cards, updatedAt: Date.now() });
      });
      return;
    }

    if (!HAS_KEY) {
      host.innerHTML = `<div class='max-w-xl mx-auto bg-zinc-900 border border-amber-500/45 rounded-2xl p-4 space-y-2.5'>
        <div class='text-xs font-black uppercase text-amber-300'>Waiting on Final Firebase API Key</div>
        <div class='text-xs text-zinc-300'>Paste your full Firebase <code>apiKey</code> in chat to enable live Boss Login &amp; Crew Codes.</div>
        <button id='clTestCrewBtn' class='px-3 py-2 rounded-xl bg-sky-600 text-white text-xs font-black'>Preview Blank Crew Screen</button>
      </div>`;
      $('clTestCrewBtn').onclick = () => setCrewMode(true);
      return;
    }

    host.innerHTML = `<div class='max-w-xl mx-auto space-y-3 pb-10'>
      <div class='bg-zinc-900/95 border border-rose-500/45 rounded-2xl p-3 flex items-center justify-between gap-2'>
        <div class='min-w-0'><div class='text-[10px] font-mono text-emerald-400'>BOSS ADMIN ACTIVE</div><div class='text-xs font-black text-white truncate'>${esc(user.email)}</div></div>
        <div class='flex gap-1.5 shrink-0'><button id='bPrevCrew' class='px-2.5 py-1.5 rounded-lg bg-sky-900 text-sky-200 text-[10px] font-black'>Preview Crew</button><button id='bSignOut' class='px-2.5 py-1.5 rounded-lg bg-zinc-800 text-rose-300 text-[10px] font-bold'>Sign Out</button></div>
      </div>
      <div class='grid grid-cols-2 gap-1.5'>
        <button id='bNewH' class='py-2 rounded-xl bg-rose-600 text-white text-xs font-black'>+ New Boss Heist</button>
        <button id='bImpAsy' class='py-2 rounded-xl bg-amber-600/25 border border-amber-400/50 text-amber-200 text-xs font-black'>+ Import Asylum</button>
      </div>
      <div class='space-y-2.5'>${bossHeists.map(h => `<div class='bg-zinc-900 border border-zinc-800 rounded-2xl p-3 space-y-2'>
        <div class='flex items-center justify-between gap-2'><div class='text-sm font-black text-white truncate'>${esc(h.title)}</div><div class='flex gap-1 shrink-0'><button data-gch='${h.id}' class='px-2 py-1 rounded-lg bg-sky-600 text-white text-[10px] font-black'>Crew Code</button><button data-addo='${h.id}' class='px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-black'>+ Obj</button><button data-delh='${h.id}' class='px-2 py-1 rounded-lg bg-rose-950 text-rose-300 text-[10px] font-bold'>Del</button></div></div>
        <div class='space-y-1.5'>${(h.cards || []).map(c => `<div class='p-2 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2'><div class='min-w-0'><div class='text-xs font-bold text-white truncate'>${esc(c.title)}</div>${c.notes ? `<div class='text-[10px] text-zinc-400 truncate'>${esc(c.notes)}</div>` : ''}</div><button data-gco='${h.id}|${c.id}' class='px-2 py-1 rounded bg-sky-950 border border-sky-500/40 text-sky-300 text-[10px] font-bold shrink-0'>1-Obj Code</button></div>`).join('') || `<div class='text-[11px] text-zinc-500'>No objectives yet.</div>`}</div>
      </div>`).join('') || `<div class='p-5 rounded-2xl bg-zinc-900 border border-zinc-800 text-center text-xs text-zinc-400'>Tap + Import Asylum or + New Boss Heist to start generating crew codes.</div>`}</div>
      <div class='bg-zinc-900/95 border border-amber-500/40 rounded-2xl p-3 space-y-2'>
        <div class='text-xs font-black text-amber-300 uppercase'>Active Crew Codes (${bossCodes.length})</div>
        ${bossCodes.map(m => `<div class='p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2'><div class='min-w-0'><div class='text-xs font-mono font-black text-sky-300'>${esc(m.code)}</div><div class='text-[11px] text-white truncate'>${esc(m.title)} • ${(m.cards || []).filter(c => c.status === 'DONE').length}/${(m.cards || []).length} done</div></div><div class='flex gap-1 shrink-0'><button data-cpl='${m.code}' class='px-2 py-1 rounded bg-sky-700 text-white text-[10px] font-black'>Copy Link</button><button data-rvk='${m.code}' class='px-2 py-1 rounded bg-rose-950 text-rose-300 text-[10px] font-bold'>Revoke</button></div></div>`).join('') || `<div class='text-[11px] text-zinc-500'>No active crew codes.</div>`}
      </div>
    </div>`;

    $('bPrevCrew').onclick = () => setCrewMode(true);
    $('bSignOut').onclick = () => signOut(auth);
    $('bNewH').onclick = async () => { const t = prompt('Heist Title:'); if (t) await saveHeist(t.trim()); };
    $('bImpAsy').onclick = importAsylum;
    host.querySelectorAll('[data-gch]').forEach(b => b.onclick = () => { const h = bossHeists.find(x => x.id === b.dataset.gch); if (h) createMissionCode(h.title, h.cards || [], true); });
    host.querySelectorAll('[data-gco]').forEach(b => b.onclick = () => { const [hid, cid] = b.dataset.gco.split('|'); const h = bossHeists.find(x => x.id === hid); const c = h?.cards?.find(x => x.id === cid); if (c) createMissionCode(c.title, [c], confirm('Include 3D Room Hologram & Red Pins with this single objective?')); });
    host.querySelectorAll('[data-addo]').forEach(b => b.onclick = async () => { const h = bossHeists.find(x => x.id === b.dataset.addo); const t = prompt('Objective title:'); if (!h || !t) return; const n = prompt('Instructions:') || ''; await updateDoc(doc(db, 'hb_heists', h.id), { cards: [...(h.cards || []), { id: 'c_' + Date.now(), title: t.trim(), status: 'OPEN', notes: n.trim() }], updatedAt: Date.now() }); });
    host.querySelectorAll('[data-delh]').forEach(b => b.onclick = async () => { if (confirm('Delete Boss heist?')) await deleteDoc(doc(db, 'hb_heists', b.dataset.delh)); });
    host.querySelectorAll('[data-cpl]').forEach(b => b.onclick = () => { const url = `${location.origin}${location.pathname}?code=${b.dataset.cpl}`; navigator.clipboard?.writeText(url); alert('Copied: ' + url); });
    host.querySelectorAll('[data-rvk]').forEach(b => b.onclick = async () => { if (confirm('Revoke code ' + b.dataset.rvk + '?')) await deleteDoc(doc(db, 'hb_missions', b.dataset.rvk)); });
  }

  function init() {
    const nav = $('mainTabs'), main = document.querySelector('main');
    if (!nav || !main || $('view-cloud')) return;
    const btn = document.createElement('button'); btn.dataset.tab = 'cloud';
    btn.className = 'tab-btn px-2.5 py-1 rounded-lg bg-zinc-900 border border-sky-500/50 text-sky-300 text-xs font-bold shrink-0';
    btn.textContent = 'Crew Codes'; nav.appendChild(btn);
    const sec = document.createElement('section'); sec.id = 'view-cloud'; sec.className = 'hidden p-3 overflow-y-auto flex-1'; main.appendChild(sec);
    nav.addEventListener('click', e => { if (e.target.closest('.tab-btn')?.dataset.tab === 'cloud') renderView(); });
    setInterval(() => applyRoleLayout(), 600);
    applyRoleLayout(); renderView();

    window.HeistBoard = window.HeistBoard || {};
    window.HeistBoard.isCrewMode = inCrewView;

    if (HAS_KEY) {
      const app = getApps().length ? getApps()[0] : initializeApp(CFG);
      auth = getAuth(app); db = getFirestore(app);
      const urlCode = new URLSearchParams(location.search).get('code') || activeCode;
      onAuthStateChanged(auth, u => {
        user = u;
        isBoss = !!(u?.email && u.email.toLowerCase() === BOSS);
        if (isBoss) { previewCrew = false; localStorage.setItem(CREW_MODE_KEY, '0'); startBossStreams(); }
        else if (urlCode) { loadMissionByCode(urlCode); }
        applyRoleLayout(); renderView();
      });
    }
  }
  init();
})();