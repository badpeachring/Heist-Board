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
  let expandedIds = new Set(), unsubs = [], crewUnsub = null;

  const saveNodes = () => localStorage.setItem(CREW_NODES_KEY, JSON.stringify(savedNodes.slice(0, 20)));
  function recordNode(code, title) {
    if (!code) return;
    const clean = code.trim().toUpperCase();
    const ex = savedNodes.find(n => n.code === clean);
    if (ex) { if (title) ex.title = title; } else savedNodes.unshift({ code: clean, title: title || clean });
    saveNodes();
  }

  const hasUrlCode = () => new URLSearchParams(location.search).has('code');
  const inCrewView = () => previewCrew || hasUrlCode() || (HAS_KEY && !isBoss);

  function setCrewMode(on) {
    previewCrew = !!on;
    localStorage.setItem(CREW_MODE_KEY, previewCrew ? '1' : '0');
    applyRoleLayout(); renderView();
  }

  function applyRoleLayout() {
    const crew = inCrewView();
    const allowTabs = new Set(activeMission?.holo ? ['cloud', 'cad'] : ['cloud']);
    const nav = $('mainTabs');
    if (nav) {
      nav.style.display = ''; nav.classList.remove('hidden');
      nav.className = 'bg-zinc-950 border-b border-zinc-800 px-2.5 py-2 flex flex-wrap items-center gap-1.5 shrink-0';
      document.querySelectorAll('#mainTabs .tab-btn').forEach(b => {
        const show = !crew || allowTabs.has(b.dataset.tab);
        b.style.display = show ? '' : 'none'; b.classList.toggle('hidden', !show);
      });
    }
    ['heistSelect', 'newHeistBtn', 'themeCycleBtn'].forEach(id => {
      const el = $(id); if (el) { el.style.display = crew ? 'none' : ''; el.classList.toggle('hidden', crew); }
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
    if (!b) { b = document.createElement('button'); b.id = 'hbAcctPill'; b.className = 'px-2.5 py-1 rounded-lg bg-zinc-900 border border-sky-500/45 text-[10px] font-black text-sky-300 shrink-0'; slot.prepend(b); }
    if (inCrewView()) { b.textContent = isBoss ? 'Exit Crew' : 'Boss Login'; b.onclick = () => isBoss ? setCrewMode(false) : openBossLogin(); }
    else { b.textContent = isBoss ? 'BOSS' : 'Boss Login'; b.onclick = () => isBoss ? window.HeistBoard?.switchTab?.('cloud') : openBossLogin(); }
  }

  function openBossLogin() {
    if (!HAS_KEY) return alert('Paste your Firebase apiKey in chat first.');
    let m = $('hbBossModal');
    if (!m) { m = document.createElement('div'); m.id = 'hbBossModal'; m.className = 'fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4'; document.body.appendChild(m); }
    m.innerHTML = `<div class='w-full max-w-sm bg-zinc-950 border border-rose-500/45 rounded-2xl p-4 space-y-3'><div class='flex justify-between items-center'><span class='text-xs font-black uppercase text-rose-400'>Boss Admin Login</span><button id='bmClose' class='px-2 py-1 rounded bg-zinc-800 text-xs text-white'>Close</button></div><div class='text-[11px] text-zinc-400'>Restricted to <span class='text-white font-mono'>${esc(BOSS)}</span>.</div><button id='bmGoogle' class='w-full py-2.5 rounded-xl bg-white text-zinc-950 text-xs font-black'>Sign In with Google</button><div class='border-t border-zinc-800 pt-2.5 space-y-2'><input id='bmEmail' type='email' value='${esc(BOSS)}' class='w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white'><input id='bmPass' type='password' placeholder='Password' class='w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white'><button id='bmGo' class='w-full py-2 rounded-xl bg-rose-600 text-white text-xs font-black'>Sign In</button></div><div id='bmErr' class='hidden text-[11px] font-mono text-rose-400'></div></div>`;
    m.classList.remove('hidden'); $('bmClose').onclick = () => m.classList.add('hidden');
    const fail = msg => { $('bmErr').textContent = msg; $('bmErr').classList.remove('hidden'); };
    $('bmGoogle').onclick = async () => { try { const r = await signInWithPopup(auth, new GoogleAuthProvider()); if (r.user.email.toLowerCase() !== BOSS) { await signOut(auth); fail('Boss Gmail only.'); } else { setCrewMode(false); m.classList.add('hidden'); } } catch (e) { fail(e.message); } };
    $('bmGo').onclick = async () => { const em = $('bmEmail').value.trim().toLowerCase(), pw = $('bmPass').value; if (em !== BOSS) return fail('Restricted to ' + BOSS); try { await signInWithEmailAndPassword(auth, em, pw); setCrewMode(false); m.classList.add('hidden'); } catch (e) { fail(e.message); } };
  }

  function genCode(prefix = 'OP') {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = (prefix.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6) || 'OP') + '-';
    for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  async function propagateHeistToMissions(heistId, cards) {
    if (!db || !isBoss) return;
    const linked = bossCodes.filter(m => m.sourceHeistId === heistId);
    for (const m of linked) {
      const nextCards = m.singleCardId ? cards.filter(c => c.id === m.singleCardId) : cards;
      await updateDoc(doc(db, 'hb_missions', m.code), { cards: nextCards, updatedAt: Date.now() }).catch(() => {});
    }
    const h = bossHeists.find(x => x.id === heistId);
    if (h?.isAsylum) window.HeistBoard?.asylumBridge?.applyRemoteCards?.(cards);
  }

  async function syncMissionBackToBoss(mission) {
    if (!db || !isBoss || !mission?.sourceHeistId) return;
    const h = bossHeists.find(x => x.id === mission.sourceHeistId);
    if (!h) return;
    let changed = false;
    const merged = (h.cards || []).map(c => {
      const mc = (mission.cards || []).find(x => x.id === c.id);
      if (mc && mc.status && mc.status !== c.status) { changed = true; return { ...c, status: mc.status }; }
      return c;
    });
    if (changed) {
      await updateDoc(doc(db, 'hb_heists', h.id), { cards: merged, updatedAt: Date.now() }).catch(() => {});
      if (h.isAsylum) window.HeistBoard?.asylumBridge?.applyRemoteCards?.(merged);
    }
  }

  function startBossStreams() {
    unsubs.forEach(u => { try { u(); } catch {} }); unsubs = [];
    if (!db || !isBoss) return;
    unsubs.push(onSnapshot(collection(db, 'hb_heists'), snap => {
      bossHeists = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      const asy = bossHeists.find(h => h.isAsylum);
      if (asy) window.HeistBoard?.asylumBridge?.applyRemoteCards?.(asy.cards);
      renderView();
    }));
    unsubs.push(onSnapshot(collection(db, 'hb_missions'), snap => {
      bossCodes = snap.docs.map(d => ({ code: d.id, ...d.data() })).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      bossCodes.forEach(m => syncMissionBackToBoss(m));
      renderView();
    }));
  }

  async function loadMissionByCode(rawCode) {
    const code = String(rawCode || '').trim().toUpperCase();
    if (!code) return;
    if (!db) return renderView('Firebase not initialized.');
    if (crewUnsub) { crewUnsub(); crewUnsub = null; }
    try {
      const ref = doc(db, 'hb_missions', code);
      const snap = await getDoc(ref);
      if (!snap.exists()) { activeMission = null; activeCode = ''; renderView('Invalid or revoked code: ' + code); return; }
      activeCode = code; localStorage.setItem(CREW_CODE_KEY, code);
      recordNode(code, snap.data()?.title || code);
      crewUnsub = onSnapshot(ref, s => {
        if (!s.exists()) { activeMission = null; activeCode = ''; localStorage.removeItem(CREW_CODE_KEY); applyRoleLayout(); renderView('Code revoked by Boss.'); return; }
        activeMission = { code: s.id, ...s.data() };
        recordNode(s.id, activeMission.title || s.id);
        if (activeMission.holo) window.HeistBoard?.loadHoloState?.(activeMission.holo);
        applyRoleLayout(); renderView();
      });
    } catch (e) { renderView('Code load error: ' + e.message); }
  }

  async function createMissionCode(heist, cards, singleCardId = '', includeHolo = true) {
    const code = genCode(heist.title.split(' ')[0]);
    const holo = includeHolo && window.HeistBoard?.getHoloState ? window.HeistBoard.getHoloState() : null;
    await setDoc(doc(db, 'hb_missions', code), {
      sourceHeistId: heist.id, singleCardId: singleCardId || '', title: singleCardId ? cards[0]?.title : heist.title,
      role: 'check', cards, holo, updatedAt: Date.now()
    });
    const link = `${location.origin}${location.pathname}?code=${code}`;
    try { await navigator.clipboard.writeText(link); alert(`Live Synced Crew Code: ${code}\nLink copied!`); } catch { alert(`Crew Code: ${code}\nLink: ${link}`); }
  }

  async function importFullAsylum() {
    const steps = window.HeistBoard?.asylumBridge?.getFullSteps?.() || [];
    if (!steps.length) return alert('Open Asylum Ops tab once first, then tap Import.');
    const existing = bossHeists.find(h => h.isAsylum);
    const id = existing ? existing.id : 'h_asylum_master';
    await setDoc(doc(db, 'hb_heists', id), { title: 'The Asylum - 980 sq ft Master Spec (21 Steps)', isAsylum: true, cards: steps, updatedAt: Date.now() });
    await propagateHeistToMissions(id, steps);
    alert('Synced all 21 Asylum steps to Boss Cloud & any active Asylum crew codes!');
  }

  function renderRichNotes(c) {
    const lines = Array.isArray(c.details) && c.details.length ? c.details : String(c.notes || '').split('\n').map(s => s.replace(/^•\s*/, '').trim()).filter(Boolean);
    if (!lines.length) return `<div class='text-xs text-zinc-500'>No extra notes attached.</div>`;
    return `<ul class='space-y-1.5 pl-4 list-disc text-xs text-zinc-200 leading-relaxed'>${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>`;
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
          <div class='flex flex-wrap gap-1.5'>${savedNodes.map(n => `<div class='inline-flex items-center rounded-xl border ${n.code === activeCode ? 'bg-sky-600/30 border-sky-400 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-300'} overflow-hidden'><button data-picknode='${esc(n.code)}' class='px-2.5 py-1.5 text-[11px] font-black truncate max-w-[170px]'>${esc(n.title || n.code)}</button><button data-delnode='${esc(n.code)}' class='px-1.5 py-1.5 text-[10px] text-zinc-500 hover:text-rose-400 border-l border-zinc-800'>✕</button></div>`).join('') || `<span class='text-[11px] text-zinc-500'>No saved nodes yet.</span>`}</div>
          <div class='flex gap-2 pt-1 border-t border-zinc-800'>
            <input id='crCodeIn' value='${esc(activeCode)}' placeholder='Enter mission code' class='flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono uppercase text-white'>
            <button id='crJoinBtn' class='px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-black'>Load</button>
          </div>
          ${msg ? `<div class='text-[11px] font-mono text-rose-400'>${esc(msg)}</div>` : ''}
        </div>
        ${activeMission ? `<div class='bg-zinc-900/95 border border-cyan-500/40 rounded-2xl p-3.5 space-y-3 shadow-lg'>
          <div class='flex items-start justify-between gap-2'>
            <div class='min-w-0'><div class='text-[10px] font-mono text-emerald-400'>NODE ${esc(activeMission.code)} • ${doneCnt}/${allCards.length} (${pct}%) • LIVE SYNC</div><div class='text-base font-black text-white truncate'>${esc(activeMission.title)}</div></div>
            ${activeMission.holo ? `<button id='crOpenHolo' class='px-3 py-1.5 rounded-xl bg-cyan-600 text-white text-[11px] font-black shrink-0'>Room Holo ➔</button>` : ''}
          </div>
          <div class='w-full h-2 rounded-full bg-zinc-950 overflow-hidden border border-zinc-800'><div class='h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all' style='width:${pct}%'></div></div>
          <div class='flex gap-1.5'>
            <button data-cf='ALL' class='cf-b px-2.5 py-1 rounded-lg text-[10px] font-black border ${crewFilter === 'ALL' ? 'bg-sky-600/30 border-sky-400 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}'>All (${allCards.length})</button>
            <button data-cf='OPEN' class='cf-b px-2.5 py-1 rounded-lg text-[10px] font-black border ${crewFilter === 'OPEN' ? 'bg-amber-600/30 border-amber-400 text-amber-200' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}'>Open (${allCards.length - doneCnt})</button>
            <button data-cf='DONE' class='cf-b px-2.5 py-1 rounded-lg text-[10px] font-black border ${crewFilter === 'DONE' ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}'>Done (${doneCnt})</button>
          </div>
          <div class='space-y-2'>${filtered.map(c => {
            const isDone = c.status === 'DONE', open = expandedIds.has(c.id);
            const tagB = c.tag === 'FANS' ? `<span class='px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/50 text-[9px] font-mono font-black text-cyan-300'>AIRFLOW / FANS</span>` : c.tag === 'WATER' ? `<span class='px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/50 text-[9px] font-mono font-black text-sky-300'>WATER STAGE</span>` : '';
            return `<div class='rounded-xl border transition-all ${isDone ? 'bg-emerald-950/25 border-emerald-500/40' : c.tag === 'FANS' ? 'bg-cyan-950/20 border-cyan-500/35' : c.tag === 'WATER' ? 'bg-sky-950/25 border-sky-500/40' : 'bg-zinc-950/95 border-zinc-800'} overflow-hidden'>
              <button data-expcard='${c.id}' class='w-full p-3 text-left flex items-center justify-between gap-2'>
                <div class='min-w-0 flex-1'>
                  <div class='flex items-center gap-1.5 flex-wrap'>${c.phase ? `<span class='text-[9px] font-mono font-black text-rose-300'>${esc(c.phase)}</span>` : ''}${tagB}</div>
                  <div class='text-xs font-black mt-0.5 ${isDone ? 'line-through text-emerald-300' : 'text-white'}'>${esc(c.title)}</div>
                  <div class='text-[10px] text-zinc-400 mt-0.5'>${open ? 'Tap to collapse' : 'Tap to expand full bulleted specs'}</div>
                </div>
                <div class='flex items-center gap-1.5 shrink-0'><span class='px-2 py-0.5 rounded text-[9px] font-mono font-black ${isDone ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}'>${c.status}</span><span class='text-xs text-zinc-400'>${open ? '▴' : '▾'}</span></div>
              </button>
              ${open ? `<div class='px-3 pb-3 pt-2 border-t border-zinc-800/80 space-y-2.5'>${renderRichNotes(c)}${c.link ? `<a href='${esc(c.link)}' target='_blank' rel='noopener noreferrer' class='block px-3 py-2 rounded-lg bg-sky-950/80 border border-sky-500/40 text-xs font-bold text-sky-300'>Open Reference Link ➔</a>` : ''}<button data-setdone='${c.id}' class='w-full py-2 rounded-xl text-xs font-black ${isDone ? 'bg-zinc-800 border border-zinc-700 text-zinc-200' : 'bg-emerald-600 text-white'}'>${isDone ? 'Mark as OPEN Again' : '✓ Mark Complete (Syncs Live to Boss)'}</button></div>` : ''}
            </div>`;
          }).join('') || `<div class='p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-center text-xs text-zinc-500'>No tasks in this filter.</div>`}</div>
        </div>` : `<div class='p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800 text-center text-xs text-zinc-400'>Blank slate. Enter a Mission Code above to load assigned work.</div>`}
      </div>`;
      $('crJoinBtn').onclick = () => loadMissionByCode($('crCodeIn').value);
      if ($('crOpenHolo')) $('crOpenHolo').onclick = () => window.HeistBoard?.switchTab?.('cad');
      host.querySelectorAll('.cf-b').forEach(b => b.onclick = () => { crewFilter = b.dataset.cf; renderView(); });
      host.querySelectorAll('[data-picknode]').forEach(b => b.onclick = () => loadMissionByCode(b.dataset.picknode));
      host.querySelectorAll('[data-delnode]').forEach(b => b.onclick = e => { e.stopPropagation(); const cd = b.dataset.delnode; savedNodes = savedNodes.filter(x => x.code !== cd); saveNodes(); if (activeCode === cd) { activeCode = ''; activeMission = null; localStorage.removeItem(CREW_CODE_KEY); } renderView(); });
      host.querySelectorAll('[data-expcard]').forEach(b => b.onclick = () => { const id = b.dataset.expcard; if (expandedIds.has(id)) expandedIds.delete(id); else expandedIds.add(id); renderView(); });
      host.querySelectorAll('[data-setdone]').forEach(b => b.onclick = async e => { e.stopPropagation(); if (!db || !activeMission) return; const cid = b.dataset.setdone; const cards = (activeMission.cards || []).map(c => c.id === cid ? { ...c, status: c.status === 'DONE' ? 'OPEN' : 'DONE' } : c); await updateDoc(doc(db, 'hb_missions', activeMission.code), { cards, updatedAt: Date.now() }); });
      return;
    }

    host.innerHTML = `<div class='max-w-xl mx-auto space-y-3 pb-10'>
      <div class='bg-zinc-900/95 border border-rose-500/45 rounded-2xl p-3 flex items-center justify-between gap-2'>
        <div class='min-w-0'><div class='text-[10px] font-mono text-emerald-400'>BOSS ADMIN • LIVE TWO-WAY SYNC</div><div class='text-xs font-black text-white truncate'>${esc(user?.email || BOSS)}</div></div>
        <div class='flex gap-1.5 shrink-0'><button id='bPrevCrew' class='px-2.5 py-1.5 rounded-lg bg-sky-900 text-sky-200 text-[10px] font-black'>Preview Crew</button><button id='bSignOut' class='px-2.5 py-1.5 rounded-lg bg-zinc-800 text-rose-300 text-[10px] font-bold'>Sign Out</button></div>
      </div>
      <div class='grid grid-cols-2 gap-1.5'>
        <button id='bNewH' class='py-2 rounded-xl bg-rose-600 text-white text-xs font-black'>+ New Boss Heist</button>
        <button id='bImpAsy' class='py-2 rounded-xl bg-amber-600/25 border border-amber-400/50 text-amber-200 text-xs font-black'>+ Sync Full Asylum (21 Steps)</button>
      </div>
      <div class='space-y-2.5'>${bossHeists.map(h => `<div class='bg-zinc-900 border border-zinc-800 rounded-2xl p-3 space-y-2'>
        <div class='flex items-center justify-between gap-2'><div class='text-sm font-black text-white truncate'>${esc(h.title)}</div><div class='flex gap-1 shrink-0'><button data-gch='${h.id}' class='px-2 py-1 rounded-lg bg-sky-600 text-white text-[10px] font-black'>Crew Code</button><button data-addo='${h.id}' class='px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-black'>+ Obj</button><button data-delh='${h.id}' class='px-2 py-1 rounded-lg bg-rose-950 text-rose-300 text-[10px] font-bold'>Del</button></div></div>
        <div class='space-y-1.5 max-h-72 overflow-y-auto'>${(h.cards || []).map(c => `<div class='p-2 rounded-xl bg-zinc-950 border ${c.status === 'DONE' ? 'border-emerald-500/45' : 'border-zinc-800'} flex items-center justify-between gap-2'><div data-btog='${h.id}|${c.id}' class='min-w-0 flex-1 cursor-pointer'><div class='text-xs font-bold ${c.status === 'DONE' ? 'line-through text-emerald-300' : 'text-white'} truncate'>${esc(c.title)}</div><div class='text-[10px] text-zinc-400 truncate'>${esc((c.details?.[0] || c.notes || '').slice(0, 70))}</div></div><div class='flex gap-1 shrink-0'><button data-bedit='${h.id}|${c.id}' class='px-2 py-1 rounded bg-zinc-800 text-amber-300 text-[10px] font-bold'>Edit</button><button data-gco='${h.id}|${c.id}' class='px-2 py-1 rounded bg-sky-950 border border-sky-500/40 text-sky-300 text-[10px] font-bold'>1-Obj</button></div></div>`).join('') || `<div class='text-[11px] text-zinc-500'>No objectives yet.</div>`}</div>
      </div>`).join('') || `<div class='p-5 rounded-2xl bg-zinc-900 border border-zinc-800 text-center text-xs text-zinc-400'>Tap + Sync Full Asylum (21 Steps) to create your live-synced master heist.</div>`}</div>
      <div class='bg-zinc-900/95 border border-amber-500/40 rounded-2xl p-3 space-y-2'>
        <div class='text-xs font-black text-amber-300 uppercase'>Active Crew Codes (${bossCodes.length})</div>
        ${bossCodes.map(m => `<div class='p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2'><div class='min-w-0'><div class='text-xs font-mono font-black text-sky-300'>${esc(m.code)}</div><div class='text-[11px] text-white truncate'>${esc(m.title)} • ${(m.cards || []).filter(c => c.status === 'DONE').length}/${(m.cards || []).length} done</div></div><div class='flex gap-1 shrink-0'><button data-cpl='${m.code}' class='px-2 py-1 rounded bg-sky-700 text-white text-[10px] font-black'>Copy Link</button><button data-rvk='${m.code}' class='px-2 py-1 rounded bg-rose-950 text-rose-300 text-[10px] font-bold'>Revoke</button></div></div>`).join('') || `<div class='text-[11px] text-zinc-500'>No active crew codes.</div>`}
      </div>
    </div>`;

    $('bPrevCrew').onclick = () => setCrewMode(true);
    $('bSignOut').onclick = () => signOut(auth);
    $('bNewH').onclick = async () => { const t = prompt('Heist Title:'); if (t) await setDoc(doc(db, 'hb_heists', 'h_' + Date.now()), { title: t.trim(), cards: [], updatedAt: Date.now() }); };
    $('bImpAsy').onclick = importFullAsylum;
    host.querySelectorAll('[data-gch]').forEach(b => b.onclick = () => { const h = bossHeists.find(x => x.id === b.dataset.gch); if (h) createMissionCode(h, h.cards || [], '', true); });
    host.querySelectorAll('[data-gco]').forEach(b => b.onclick = () => { const [hid, cid] = b.dataset.gco.split('|'); const h = bossHeists.find(x => x.id === hid); const c = h?.cards?.find(x => x.id === cid); if (c) createMissionCode(h, [c], c.id, confirm('Include 3D Room Hologram with this single objective?')); });
    host.querySelectorAll('[data-addo]').forEach(b => b.onclick = async () => { const h = bossHeists.find(x => x.id === b.dataset.addo); const t = prompt('Objective title:'); if (!h || !t) return; const n = prompt('Detailed instructions (separate bullet points with |):') || ''; const details = n.split('|').map(s => s.trim()).filter(Boolean); const cards = [...(h.cards || []), { id: 'c_' + Date.now(), title: t.trim(), status: 'OPEN', details, notes: details.join('\n') }]; await updateDoc(doc(db, 'hb_heists', h.id), { cards, updatedAt: Date.now() }); await propagateHeistToMissions(h.id, cards); });
    host.querySelectorAll('[data-bedit]').forEach(b => b.onclick = async () => { const [hid, cid] = b.dataset.bedit.split('|'); const h = bossHeists.find(x => x.id === hid); const c = h?.cards?.find(x => x.id === cid); if (!h || !c) return; const nt = prompt('Edit Title:', c.title); if (nt === null) return; const curStr = Array.isArray(c.details) ? c.details.join(' | ') : (c.notes || ''); const nn = prompt('Edit Bullet Specs (separate bullets with |):', curStr); if (nn === null) return; const details = nn.split('|').map(s => s.trim()).filter(Boolean); const cards = h.cards.map(x => x.id === cid ? { ...x, title: nt.trim() || x.title, details, notes: details.join('\n') } : x); await updateDoc(doc(db, 'hb_heists', h.id), { cards, updatedAt: Date.now() }); await propagateHeistToMissions(h.id, cards); });
    host.querySelectorAll('[data-btog]').forEach(el => el.onclick = async () => { const [hid, cid] = el.dataset.btog.split('|'); const h = bossHeists.find(x => x.id === hid); if (!h) return; const cards = h.cards.map(x => x.id === cid ? { ...x, status: x.status === 'DONE' ? 'OPEN' : 'DONE' } : x); await updateDoc(doc(db, 'hb_heists', h.id), { cards, updatedAt: Date.now() }); await propagateHeistToMissions(h.id, cards); });
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
    window.HeistBoard.pushAsylumStepStatus = async (stepId, isDone) => {
      const asy = bossHeists.find(h => h.isAsylum);
      if (!asy || !db || !isBoss) return;
      const cards = (asy.cards || []).map(c => c.id === stepId ? { ...c, status: isDone ? 'DONE' : 'OPEN' } : c);
      await updateDoc(doc(db, 'hb_heists', asy.id), { cards, updatedAt: Date.now() }).catch(() => {});
      await propagateHeistToMissions(asy.id, cards);
    };

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