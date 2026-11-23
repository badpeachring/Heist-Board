import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

(() => {
  if (window.__hbBossCrewLoaded) return;
  window.__hbBossCrewLoaded = true;
  const $ = id => document.getElementById(id);
  const CREW_CODE_KEY = 'hb_active_crew_code_v1';
  const BOSS = (window.HEIST_BOSS_EMAIL || 'sethmcnab13@gmail.com').toLowerCase();
  const CFG = window.HEIST_FIREBASE_CONFIG || {};
  const HAS_KEY = !!(CFG.apiKey && !String(CFG.apiKey).startsWith('PASTE_'));
  const esc = s => String(s || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

  let auth = null, db = null, user = null, isBoss = false, previewCrew = false;
  let bossHeists = [], bossCodes = [], activeMission = null, activeCode = '';
  let unsubs = [], crewUnsub = null;

  const inCrewView = () => previewCrew || (HAS_KEY && !isBoss) || new URLSearchParams(location.search).has('code');

  function applyRoleLayout() {
    const crew = inCrewView();
    ['heistSelect', 'newHeistBtn', 'themeCycleBtn'].forEach(id => $(id)?.classList.toggle('hidden', crew));
    document.querySelectorAll('#mainTabs .tab-btn').forEach(b => {
      const k = b.dataset.tab;
      const allowCrew = k === 'cloud' || (k === 'cad' && !!activeMission?.holo);
      b.classList.toggle('hidden', crew && !allowCrew);
    });
    if (crew) {
      const curCad = !$('view-cad')?.classList.contains('hidden');
      if (!curCad || !activeMission?.holo) window.HeistBoard?.switchTab?.('cloud');
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
    b.textContent = isBoss ? (previewCrew ? 'Exit Crew View' : 'BOSS') : 'Boss Login';
    b.onclick = () => {
      if (isBoss && previewCrew) { previewCrew = false; applyRoleLayout(); renderView(); }
      else if (isBoss) { window.HeistBoard?.switchTab?.('cloud'); }
      else { openBossLogin(); }
    };
  }

  function openBossLogin() {
    if (!HAS_KEY) return alert('Paste your Firebase apiKey in chat first to activate Boss Login.');
    let m = $('hbBossModal');
    if (!m) { m = document.createElement('div'); m.id = 'hbBossModal'; m.className = 'fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4'; document.body.appendChild(m); }
    m.innerHTML = `<div class='w-full max-w-sm bg-zinc-950 border border-rose-500/45 rounded-2xl p-4 space-y-3'>
      <div class='flex justify-between items-center'><span class='text-xs font-black uppercase text-rose-400'>Boss Admin Login</span><button id='bmClose' class='px-2 py-1 rounded bg-zinc-800 text-xs text-white'>Close</button></div>
      <div class='text-[11px] text-zinc-400'>Restricted to <span class='text-white font-mono'>${esc(BOSS)}</span>. Crew members do not need a login—use Mission Code instead.</div>
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
        else m.classList.add('hidden');
      } catch (e) { fail(e.message); }
    };
    $('bmGo').onclick = async () => {
      const em = $('bmEmail').value.trim().toLowerCase(), pw = $('bmPass').value;
      if (em !== BOSS) return fail('Restricted to ' + BOSS);
      try { await signInWithEmailAndPassword(auth, em, pw); m.classList.add('hidden'); } catch (e) { fail(e.message); }
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
    if (!code || !db) return;
    if (crewUnsub) { crewUnsub(); crewUnsub = null; }
    try {
      const ref = doc(db, 'hb_missions', code);
      const snap = await getDoc(ref);
      if (!snap.exists()) { activeMission = null; activeCode = ''; renderView('Invalid or revoked mission code: ' + code); return; }
      activeCode = code; localStorage.setItem(CREW_CODE_KEY, code);
      crewUnsub = onSnapshot(ref, s => {
        if (!s.exists()) { activeMission = null; activeCode = ''; localStorage.removeItem(CREW_CODE_KEY); applyRoleLayout(); renderView('Mission code was revoked by Boss.'); return; }
        activeMission = { code: s.id, ...s.data() };
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
    try { await navigator.clipboard.writeText(link); alert(`Crew Code Created: ${code}\nShareable link copied to clipboard!`); } catch { alert(`Crew Code Created: ${code}\nLink: ${link}`); }
  }

  async function saveHeist(title, cards = []) {
    const id = 'h_' + Date.now();
    await setDoc(doc(db, 'hb_heists', id), { title, cards, updatedAt: Date.now() });
  }

  async function importAsylum() {
    const steps = [
      { id: '1.1', title: 'Phase 1: Wood Screed Rails (14 SYP 2x4x16)', status: 'OPEN', notes: 'Laser chalk line to center slab; rip 3/4x1-1/2 or 3/4x1; Grip-Rite 2-1/2in masonry nails in mortar joints every 18-24in.' },
      { id: '2.0', title: 'Phase 2: Stage 165-204 Gal Water (980 sq ft)', status: 'OPEN', notes: '175-180 bags Quikrete #100450 (2.5-3 qt max) + 15-16 VersaBond (5.5-6 qt) + washout. FANS OFF during pour.' },
      { id: '2.5', title: 'Phase 2: SETUP FANS & Dehumidifiers (48-72 hr)', status: 'OPEN', notes: 'Forced dry all 980 sq ft patch after 2-4 hr set until Tramex <= 4.5%.' },
      { id: '3.1', title: 'Phase 3: Wall Scrape, Woodwork & Wall Paint', status: 'OPEN', notes: 'Ceiling excluded. SETUP FANS after patch/primer & wall paint; HEPA-vac full 3,055 sq ft.' },
      { id: '4.1', title: 'Phase 4: Layout 9ft/11ft Border & Grind 3,055 sq ft', status: 'OPEN', notes: '1,750 sq ft rubber border + 29x45 (1,305 sq ft) 4x4 checkerboard.' },
      { id: '4.3', title: 'Phase 4: Tufflex VRP-111 (NO DRYLOK) + Liquid Rubber', status: 'OPEN', notes: 'GATE: Tramex <= 4.5%. VRP-111 -> ELASTA-TUFF 5000 + 1/4in liquid rubber + black aliphatic topcoat.' },
      { id: '4.5', title: 'Phase 4: 29x45 Checkerboard & Clear Wear Coat', status: 'OPEN', notes: '2 coats white -> fans -> 4x4 ScotchBlue -> 2 coats black -> clear aliphatic coat. Cure 24-72 hrs.' }
    ];
    await saveHeist('The Asylum - 980 sq ft Master Spec', steps);
  }

  function renderView(msg = '') {
    const host = $('view-cloud'); if (!host) return;
    if (!HAS_KEY) {
      host.innerHTML = `<div class='max-w-xl mx-auto bg-zinc-900 border border-amber-500/45 rounded-2xl p-4 space-y-2'>
        <div class='text-xs font-black uppercase text-amber-300'>Waiting on Final Firebase API Key</div>
        <div class='text-xs text-zinc-300'>Project <code>skill-tree-4cffd</code> is pre-wired. Copy the full <code>apiKey</code> line from Firebase Console and send it in chat to activate live Boss Login &amp; Crew Codes.</div>
        <div class='text-[11px] text-cyan-300'>Your <strong>Room Holo</strong> tab and <strong>Asylum Ops</strong> already work locally right now.</div>
      </div>`;
      return;
    }

    if (inCrewView()) {
      host.innerHTML = `<div class='max-w-xl mx-auto space-y-3 pb-10'>
        <div class='bg-zinc-900/95 border border-sky-500/45 rounded-2xl p-4 space-y-2.5'>
          <div class='text-[10px] font-mono uppercase tracking-widest text-sky-400'>Crew Mission Terminal</div>
          <div class='text-sm font-black text-white'>Enter Mission Code From Boss</div>
          <div class='flex gap-2'>
            <input id='crCodeIn' value='${esc(activeCode)}' placeholder='e.g. ASYLUM-4F9K2M' class='flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono uppercase text-white'>
            <button id='crJoinBtn' class='px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-black'>Load</button>
          </div>
          ${msg ? `<div class='text-[11px] font-mono text-rose-400'>${esc(msg)}</div>` : ''}
        </div>
        ${activeMission ? `<div class='bg-zinc-900/95 border border-emerald-500/40 rounded-2xl p-3 space-y-2.5'>
          <div class='flex items-center justify-between gap-2'>
            <div><div class='text-[10px] font-mono text-emerald-400'>ACTIVE MISSION • ${esc(activeMission.code)}</div><div class='text-base font-black text-white'>${esc(activeMission.title)}</div></div>
            ${activeMission.holo ? `<button id='crOpenHolo' class='px-3 py-1.5 rounded-xl bg-cyan-600 text-white text-[11px] font-black shrink-0'>Open 3D Room</button>` : ''}
          </div>
          <div class='space-y-2'>${(activeMission.cards || []).map(c => `<div data-crst='${c.id}' class='p-2.5 rounded-xl border cursor-pointer ${c.status === 'DONE' ? 'bg-emerald-950/35 border-emerald-500/45' : 'bg-zinc-950 border-zinc-800'}'><div class='flex items-center justify-between gap-2'><span class='text-xs font-black ${c.status === 'DONE' ? 'line-through text-emerald-300' : 'text-white'}'>${esc(c.title)}</span><span class='text-[10px] font-mono ${c.status === 'DONE' ? 'text-emerald-400' : 'text-amber-300'}'>${c.status}</span></div>${c.notes ? `<div class='text-[11px] text-zinc-300 mt-1'>${esc(c.notes)}</div>` : ''}</div>`).join('')}</div>
        </div>` : `<div class='p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800 text-center text-xs text-zinc-400'>Blank slate. Paste a Mission Code above (or open a Boss link) to load your assigned work.</div>`}
      </div>`;
      $('crJoinBtn').onclick = () => loadMissionByCode($('crCodeIn').value);
      if ($('crOpenHolo')) $('crOpenHolo').onclick = () => window.HeistBoard?.switchTab?.('cad');
      host.querySelectorAll('[data-crst]').forEach(el => el.onclick = async () => {
        const cid = el.dataset.crst;
        const cards = (activeMission.cards || []).map(c => c.id === cid ? { ...c, status: c.status === 'DONE' ? 'OPEN' : 'DONE' } : c);
        await updateDoc(doc(db, 'hb_missions', activeMission.code), { cards, updatedAt: Date.now() });
      });
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

    $('bPrevCrew').onclick = () => { previewCrew = true; applyRoleLayout(); renderView(); };
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

    window.HeistBoard = window.HeistBoard || {};
    window.HeistBoard.isCrewMode = inCrewView;
    window.HeistBoard.syncCrewPins = async pins => {
      if (activeMission?.code && db) await updateDoc(doc(db, 'hb_missions', activeMission.code), { 'holo.pins': pins, updatedAt: Date.now() }).catch(() => {});
    };

    if (HAS_KEY) {
      const app = getApps().length ? getApps()[0] : initializeApp(CFG);
      auth = getAuth(app); db = getFirestore(app);
      const urlCode = new URLSearchParams(location.search).get('code') || localStorage.getItem(CREW_CODE_KEY) || '';
      onAuthStateChanged(auth, u => {
        user = u;
        isBoss = !!(u?.email && u.email.toLowerCase() === BOSS);
        if (isBoss) { previewCrew = false; startBossStreams(); }
        else if (urlCode) { loadMissionByCode(urlCode); }
        applyRoleLayout(); renderView();
      });
    } else { applyRoleLayout(); renderView(); }
  }
  init();
})();