(() => {
  if (window.__hbFbLoaded) return;
  window.__hbFbLoaded = true;
  const $ = id => document.getElementById(id);
  const CFG_OVR = 'hb_fb_cfg_v1';
  const UID_KEY = 'hb_last_uid_v1';
  const SDK = 'https://www.gstatic.com/firebasejs/13.4.0';

  let fb = null, auth = null, db = null, user = null;
  let unsubs = [], myHeists = [], sharedInHeists = [], sharedInObjs = [], outHeists = [], outObjs = [];
  let activeSubTab = 'mine', shareCtx = null;

  const esc = s => String(s || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const tsOf = d => d?.updatedAt?.seconds || d?.updatedAt || 0;

  function getConfig() {
    let cfg = window.HEIST_FIREBASE_CONFIG || {};
    let owner = window.HEIST_OWNER_EMAIL || '';
    try {
      const ovr = JSON.parse(localStorage.getItem(CFG_OVR) || 'null');
      if (ovr?.apiKey && ovr?.projectId) { cfg = ovr; if (ovr.ownerEmail) owner = ovr.ownerEmail; }
    } catch {}
    const valid = !!(cfg.apiKey && cfg.projectId && !String(cfg.apiKey).startsWith('YOUR_'));
    return { cfg, owner: String(owner).trim().toLowerCase(), valid };
  }

  function isOwner() {
    const { owner } = getConfig();
    return !!(user?.email && owner && user.email.toLowerCase() === owner);
  }

  function applyPrivacyGuards() {
    const ownerOk = isOwner();
    ['asylum', 'law'].forEach(k => {
      document.querySelectorAll(`#mainTabs [data-tab="${k}"]`).forEach(b => b.classList.toggle('hidden', !ownerOk));
      const sec = $('view-' + k);
      if (sec && !ownerOk) sec.classList.add('hidden');
    });
    if (user?.uid) {
      const prevUid = localStorage.getItem(UID_KEY);
      if (prevUid && prevUid !== user.uid) {
        Object.keys(localStorage).forEach(k => { if (/heist|asylum|hb_cad/i.test(k) && k !== CFG_OVR) localStorage.removeItem(k); });
      }
      localStorage.setItem(UID_KEY, user.uid);
    }
  }

  function stopListeners() { unsubs.forEach(fn => { try { fn(); } catch {} }); unsubs = []; }

  async function loadSdk() {
    if (fb) return fb;
    const [appM, authM, fsM] = await Promise.all([
      import(`${SDK}/firebase-app.js`),
      import(`${SDK}/firebase-auth.js`),
      import(`${SDK}/firebase-firestore.js`)
    ]);
    fb = { ...appM, ...authM, ...fsM };
    return fb;
  }

  async function connectFirebase() {
    const { cfg, valid } = getConfig();
    if (!valid) { renderCloud(); return; }
    try {
      const m = await loadSdk();
      const app = m.getApps().length ? m.getApps()[0] : m.initializeApp(cfg);
      auth = m.getAuth(app);
      db = m.getFirestore(app);
      m.onAuthStateChanged(auth, u => {
        user = u;
        stopListeners();
        updateHeaderPill();
        if (u) {
          $('hbAuthModal')?.classList.add('hidden');
          applyPrivacyGuards();
          startStreams();
        } else {
          myHeists = []; sharedInHeists = []; sharedInObjs = []; outHeists = []; outObjs = [];
          applyPrivacyGuards();
          showAuthModal();
        }
        renderCloud();
      });
    } catch (e) {
      renderCloud('Firebase init error: ' + e.message);
    }
  }

  function startStreams() {
    if (!db || !user) return;
    const uid = user.uid, email = (user.email || '').toLowerCase();
    const { collection, query, where, onSnapshot, doc, updateDoc } = fb;

    unsubs.push(onSnapshot(query(collection(db, 'heists'), where('ownerUid', '==', uid)), snap => {
      myHeists = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => tsOf(b) - tsOf(a));
      renderCloud();
    }));
    unsubs.push(onSnapshot(query(collection(db, 'shared_heists'), where('recipientEmail', '==', email)), snap => {
      sharedInHeists = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => tsOf(b) - tsOf(a));
      renderCloud();
    }));
    unsubs.push(onSnapshot(query(collection(db, 'shared_objectives'), where('recipientEmail', '==', email)), snap => {
      sharedInObjs = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => tsOf(b) - tsOf(a));
      renderCloud();
    }));
    unsubs.push(onSnapshot(query(collection(db, 'shared_heists'), where('ownerUid', '==', uid)), snap => {
      outHeists = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderCloud();
    }));
    unsubs.push(onSnapshot(query(collection(db, 'shared_objectives'), where('ownerUid', '==', uid)), snap => {
      outObjs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      outObjs.forEach(sh => {
        const parent = myHeists.find(h => h.id === sh.sourceHeistId);
        const card = parent?.cards?.find(c => c.id === sh.cardId);
        if (card && sh.status && card.status !== sh.status) {
          card.status = sh.status;
          updateDoc(doc(db, 'heists', parent.id), { cards: parent.cards, updatedAt: Date.now() }).catch(() => {});
        }
      });
      renderCloud();
    }));
  }

  async function createCloudHeist(title, cards = [], fin = {}) {
    if (!db || !user) return alert('Sign in first.');
    const id = 'h_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    await fb.setDoc(fb.doc(db, 'heists', id), {
      ownerUid: user.uid, ownerEmail: user.email.toLowerCase(),
      title: title || 'Untitled Heist',
      grossTake: Number(fin.grossTake) || 0, overhead: Number(fin.overhead) || 0,
      crew: Array.isArray(fin.crew) ? fin.crew : [],
      cards, updatedAt: Date.now()
    });
  }

  async function pullLocalBoardToCloud() {
    const keys = Object.keys(localStorage).filter(k => /heist_board/i.test(k));
    for (const k of keys) {
      try {
        const raw = JSON.parse(localStorage.getItem(k) || 'null');
        const list = Array.isArray(raw?.heists) ? raw.heists : Array.isArray(raw) ? raw : [];
        const curId = $('heistSelect')?.value;
        const h = list.find(x => x.id === curId) || list[0];
        if (h && Array.isArray(h.cards)) {
          await createCloudHeist(h.name || h.title || 'Board Heist', h.cards.map(c => ({ id: c.id || 'c_' + Math.random().toString(36).slice(2, 7), title: c.title || 'Objective', type: c.type || 'SETUP', status: c.status || 'OPEN', notes: c.notes || '', link: c.link || '' })), { grossTake: h.grossTake, overhead: h.overhead, crew: h.crew });
          alert('Synced active Board heist into your Private Cloud!');
          return;
        }
      } catch {}
    }
    alert('No local board heist found. Tap + New Cloud Heist to create one.');
  }

  async function importAsylumToCloud() {
    const steps = [
      { id: '1.1', type: 'PHASE 1', title: 'Laser Level & Chalk Line', status: 'OPEN', notes: 'Set laser to clean interior slab; mark exterior brick/stone every 10-15 ft and snap chalk line.' },
      { id: '1.2', type: 'PHASE 1', title: 'Drop Depth Check & 2x4 Ripping', status: 'OPEN', notes: 'Drop >=1.5in: 3/4x1-1/2 strips. Drop <1.5in: 3/4x1 strips.' },
      { id: '1.3', type: 'PHASE 1', title: 'Permanent Wall Anchoring', status: 'OPEN', notes: '2-1/2in Grip-Rite masonry nails in mortar joints every 18-24in; VersaBond dab where mortar misses.' },
      { id: '2.0', type: 'WATER', title: 'Stage 3rd-Floor Water (65-102 gal)', status: 'OPEN', notes: '70-90 bags Quikrete + 4-6 bags VersaBond + washout. FANS OFF during pour.' },
      { id: '2.2', type: 'PHASE 2', title: 'VersaBond Slurry + Quikrete #100450 Pour', status: 'OPEN', notes: 'VersaBond 5.5-6 qt wet-on-wet (15-20 min); Quikrete 2.5-3 qt stiff; screed flush.' },
      { id: '2.5', type: 'FANS', title: 'SETUP FANS & Dehumidifiers (48-72 hr)', status: 'OPEN', notes: 'Forced dry after 2-hr set until Tramex <= 4.5%.' },
      { id: '3.1', type: 'PHASE 3', title: 'Wall Scraping, Woodwork & Wall Paint', status: 'OPEN', notes: 'Ceiling excluded. SETUP FANS after patch/primer and after final paint; HEPA-vac full 3,055 sq ft.' },
      { id: '4.1', type: 'PHASE 4', title: 'Layout 9ft/11ft Border & Grind 3,055 sq ft', status: 'OPEN', notes: '1,750 sq ft border + 29x45 (1,305 sq ft) 4x4 checkerboard. Grind & HEPA-vac.' },
      { id: '4.3', type: 'PHASE 4', title: 'Tufflex VRP-111 Primer (NO DRYLOK)', status: 'OPEN', notes: 'GATE: Tramex <= 4.5%. Roll directly on dry patch, wood screed & ground slab.' },
      { id: '4.4', type: 'PHASE 4', title: 'ELASTA-TUFF 5000 + 1/4in Rubber + Black Topcoat', status: 'OPEN', notes: '1,750 sq ft border; indirect cross-vent fans between coats.' },
      { id: '4.5', type: 'PHASE 4', title: '29x45 Checkerboard & Clear Aliphatic Wear Coat', status: 'OPEN', notes: '2 coats white -> indirect fans -> ScotchBlue 4x4 -> 2 coats black -> clear coat. Cure 24-72 hrs.' }
    ];
    await createCloudHeist('The Asylum - Masonic Lodge (47x65)', steps, {});
    alert('Imported The Asylum into your Private Cloud Heists! You can now share individual objectives.');
  }

  function openShareModal(kind, heist, card = null) {
    shareCtx = { kind, heist, card };
    let m = $('hbShareModal');
    if (!m) {
      m = document.createElement('div'); m.id = 'hbShareModal';
      m.className = 'fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3';
      document.body.appendChild(m);
    }
    const lbl = kind === 'heist' ? `Entire Heist: ${heist.title}` : `Single Objective: ${card.title}`;
    m.innerHTML = `<div class='w-full max-w-md bg-zinc-950 border border-sky-500/45 rounded-2xl p-4 space-y-3'>
      <div class='flex items-center justify-between'><span class='text-xs font-black uppercase text-sky-300'>Selective Cloud Share</span><button id='shClose' class='px-2.5 py-1 rounded-lg bg-zinc-800 text-xs text-white font-bold'>Close</button></div>
      <div class='p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-bold text-white'>${esc(lbl)}</div>
      <input id='shEmailIn' type='email' placeholder='Recipient email (their Firebase login email)' class='w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white'>
      <select id='shRoleIn' class='w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white'>
        <option value='check'>Can View &amp; Check Off Done (Recommended)</option>
        <option value='view'>View Only (Read-Only)</option>
        <option value='edit'>Full Co-Edit</option>
      </select>
      ${kind === 'heist' ? `<label class='flex items-center gap-2 text-xs text-zinc-300'><input id='shHideFin' type='checkbox' checked class='accent-emerald-500'>Strip Budget &amp; Crew Cuts (Recommended)</label>` : `<div class='text-[10px] text-emerald-300 font-mono'>Zero leak: Recipient sees ONLY this single objective card.</div>`}
      <button id='shSendBtn' class='w-full py-2.5 rounded-xl bg-sky-600 text-white text-xs font-black'>Grant Access Now</button>
    </div>`;
    m.classList.remove('hidden');
    $('shClose').onclick = () => m.classList.add('hidden');
    $('shSendBtn').onclick = async () => {
      const rec = $('shEmailIn').value.trim().toLowerCase();
      if (!rec || !rec.includes('@')) return alert('Enter a valid email.');
      const role = $('shRoleIn').value;
      const sid = 'sh_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);
      try {
        if (kind === 'heist') {
          const hideFin = !!$('shHideFin')?.checked;
          await fb.setDoc(fb.doc(db, 'shared_heists', sid), {
            ownerUid: user.uid, ownerEmail: user.email.toLowerCase(), recipientEmail: rec,
            sourceHeistId: heist.id, title: heist.title, role, hideFinancials: hideFin,
            grossTake: hideFin ? 0 : (heist.grossTake || 0), overhead: hideFin ? 0 : (heist.overhead || 0),
            crew: hideFin ? [] : (heist.crew || []), cards: heist.cards || [], updatedAt: Date.now()
          });
        } else {
          await fb.setDoc(fb.doc(db, 'shared_objectives', sid), {
            ownerUid: user.uid, ownerEmail: user.email.toLowerCase(), recipientEmail: rec,
            sourceHeistId: heist.id, cardId: card.id, title: card.title, type: card.type || 'TASK',
            status: card.status || 'OPEN', notes: card.notes || '', link: card.link || '',
            role, updatedAt: Date.now()
          });
        }
        m.classList.add('hidden');
        alert('Shared securely with ' + rec + '!');
      } catch (e) { alert('Share error: ' + e.message); }
    };
  }

  function showAuthModal() {
    let m = $('hbAuthModal');
    if (!m) {
      m = document.createElement('div'); m.id = 'hbAuthModal';
      m.className = 'fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4';
      document.body.appendChild(m);
    }
    m.innerHTML = `<div class='w-full max-w-sm bg-zinc-950 border border-rose-500/45 rounded-2xl p-5 space-y-3 shadow-2xl'>
      <div><div class='text-[10px] font-mono uppercase tracking-widest text-rose-400'>Heist Board Cloud Auth</div><div class='text-lg font-black text-white'>Private Account Access</div><div class='text-[11px] text-zinc-400 mt-0.5'>Each account gets an isolated blank workspace. Shared items sync live.</div></div>
      <input id='authEmail' type='email' placeholder='Email address' class='w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-white'>
      <input id='authPass' type='password' placeholder='Password (min 6 chars)' class='w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-white'>
      <div id='authErr' class='hidden text-[11px] font-mono text-rose-400'></div>
      <div class='grid grid-cols-2 gap-2'>
        <button id='authSignIn' class='py-2.5 rounded-xl bg-rose-600 text-white text-xs font-black'>Sign In</button>
        <button id='authSignUp' class='py-2.5 rounded-xl bg-sky-600 text-white text-xs font-black'>Create Account</button>
      </div>
      <button id='authOffline' class='w-full py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-bold text-zinc-400'>Continue Offline (Local Device Only)</button>
    </div>`;
    m.classList.remove('hidden');
    const run = async isNew => {
      const em = $('authEmail').value.trim(), pw = $('authPass').value;
      const errEl = $('authErr'); errEl.classList.add('hidden');
      if (!em || pw.length < 6) { errEl.textContent = 'Enter email and 6+ char password.'; errEl.classList.remove('hidden'); return; }
      try {
        if (isNew) { const cr = await fb.createUserWithEmailAndPassword(auth, em, pw); fb.sendEmailVerification(cr.user).catch(() => {}); }
        else { await fb.signInWithEmailAndPassword(auth, em, pw); }
      } catch (e) { errEl.textContent = e.message; errEl.classList.remove('hidden'); }
    };
    $('authSignIn').onclick = () => run(false);
    $('authSignUp').onclick = () => run(true);
    $('authOffline').onclick = () => m.classList.add('hidden');
  }

  function updateHeaderPill() {
    const slot = $('headerActionSlots'); if (!slot) return;
    let b = $('hbAcctPill');
    if (!b) {
      b = document.createElement('button'); b.id = 'hbAcctPill';
      b.className = 'px-2 py-1 rounded-lg bg-zinc-900 border border-sky-500/45 text-[10px] font-black text-sky-300 shrink-0';
      slot.prepend(b);
    }
    b.textContent = user ? user.email.split('@')[0].slice(0, 10) : 'Sign In';
    b.onclick = () => { if (user) { window.HeistBoard?.switchTab?.('cloud'); } else { const { valid } = getConfig(); if (valid) showAuthModal(); else window.HeistBoard?.switchTab?.('cloud'); } };
  }

  function renderCloud(errMsg = '') {
    const host = $('view-cloud'); if (!host) return;
    const { valid, cfg, owner } = getConfig();
    if (!valid) {
      host.innerHTML = `<div class='max-w-xl mx-auto bg-zinc-900 border border-amber-500/45 rounded-2xl p-4 space-y-2.5'>
        <div class='text-sm font-black text-amber-300'>Connect Your Firebase Project</div>
        <div class='text-xs text-zinc-300'>Paste your Firebase Web Config below for instant testing, or put it in <code>firebase-config.js</code> so friends connect automatically.</div>
        <input id='fbOwnerIn' value='${esc(owner)}' placeholder='Your Owner Email (keeps Asylum/Law tabs private to you)' class='w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white'>
        <input id='fbKeyIn' placeholder='apiKey (AIza...)' class='w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-mono'>
        <input id='fbDomIn' placeholder='authDomain (your-app.firebaseapp.com)' class='w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-mono'>
        <input id='fbProjIn' placeholder='projectId' class='w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-mono'>
        <input id='fbAppIn' placeholder='appId (1:...:web:...)' class='w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-mono'>
        <button id='fbSaveCfgBtn' class='w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black'>Save &amp; Connect Firebase</button>
      </div>`;
      $('fbSaveCfgBtn').onclick = () => {
        const next = { ownerEmail: $('fbOwnerIn').value.trim(), apiKey: $('fbKeyIn').value.trim(), authDomain: $('fbDomIn').value.trim(), projectId: $('fbProjIn').value.trim(), appId: $('fbAppIn').value.trim() };
        if (!next.apiKey || !next.projectId) return alert('Enter apiKey and projectId.');
        localStorage.setItem(CFG_OVR, JSON.stringify(next));
        connectFirebase();
      };
      return;
    }
    if (!user) {
      host.innerHTML = `<div class='max-w-xl mx-auto bg-zinc-900 border border-rose-500/40 rounded-2xl p-5 text-center space-y-3'>
        <div class='text-sm font-black text-white'>Sign In to Access Your Private Cloud Workspace</div>
        ${errMsg ? `<div class='text-xs text-rose-400 font-mono'>${esc(errMsg)}</div>` : ''}
        <button id='clOpenAuth' class='px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-black'>Open Login / Sign Up</button>
      </div>`;
      $('clOpenAuth').onclick = showAuthModal;
      return;
    }

    const inCount = sharedInHeists.length + sharedInObjs.length;
    const outCount = outHeists.length + outObjs.length;
    host.innerHTML = `<div class='max-w-xl mx-auto space-y-3 pb-10'>
      <div class='bg-zinc-900/95 border border-sky-500/40 rounded-2xl p-3 flex items-center justify-between gap-2'>
        <div class='min-w-0'><div class='text-[10px] font-mono text-emerald-400'>FIREBASE CLOUD LIVE ${isOwner() ? '• OWNER' : '• PRIVATE USER'}</div><div class='text-xs font-black text-white truncate'>${esc(user.email)}</div></div>
        <button id='clSignOut' class='px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-[11px] font-bold text-rose-300 shrink-0'>Sign Out</button>
      </div>
      <div class='grid grid-cols-3 gap-1.5'>
        <button data-st='mine' class='cl-st py-2 rounded-xl border text-xs font-black ${activeSubTab === 'mine' ? 'bg-rose-600/25 border-rose-400 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}'>My Heists (${myHeists.length})</button>
        <button data-st='in' class='cl-st py-2 rounded-xl border text-xs font-black ${activeSubTab === 'in' ? 'bg-sky-600/25 border-sky-400 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}'>Shared In (${inCount})</button>
        <button data-st='out' class='cl-st py-2 rounded-xl border text-xs font-black ${activeSubTab === 'out' ? 'bg-amber-600/25 border-amber-400 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}'>Sent (${outCount})</button>
      </div>
      <div id='clBody' class='space-y-2.5'></div>
    </div>`;
    $('clSignOut').onclick = () => fb.signOut(auth);
    host.querySelectorAll('.cl-st').forEach(b => b.onclick = () => { activeSubTab = b.dataset.st; renderCloud(); });

    const body = $('clBody');
    if (activeSubTab === 'mine') {
      body.innerHTML = `<div class='grid grid-cols-2 gap-1.5'>
        <button id='clNewHeist' class='py-2 rounded-xl bg-rose-600 text-white text-xs font-black'>+ New Private Heist</button>
        <button id='clPullLocal' class='py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-cyan-300 text-xs font-bold'>+ Sync Local Board</button>
        ${isOwner() ? `<button id='clImpAsylum' class='col-span-2 py-2 rounded-xl bg-amber-600/25 border border-amber-400/50 text-amber-200 text-xs font-black'>+ Import Asylum Ops Into Private Cloud</button>` : ''}
      </div>` + (myHeists.length ? myHeists.map(h => `<div class='bg-zinc-900/95 border border-zinc-800 rounded-2xl p-3 space-y-2'>
        <div class='flex items-center justify-between gap-2'>
          <div class='text-sm font-black text-white truncate'>${esc(h.title)}</div>
          <div class='flex gap-1 shrink-0'>
            <button data-shh='${h.id}' class='px-2 py-1 rounded-lg bg-sky-600 text-white text-[10px] font-black'>Share Heist</button>
            <button data-addc='${h.id}' class='px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-black'>+ Obj</button>
            <button data-delh='${h.id}' class='px-2 py-1 rounded-lg bg-rose-950 text-rose-300 text-[10px] font-bold'>Del</button>
          </div>
        </div>
        <div class='space-y-1.5'>${(h.cards || []).map(c => `<div class='p-2 rounded-xl bg-zinc-950 border ${c.status === 'DONE' ? 'border-emerald-500/45' : 'border-zinc-800'} flex items-start justify-between gap-2'>
          <div data-togc='${h.id}|${c.id}' class='min-w-0 flex-1 cursor-pointer'><div class='text-xs font-bold ${c.status === 'DONE' ? 'line-through text-emerald-300' : 'text-white'}'>${esc(c.title)}</div>${c.notes ? `<div class='text-[10px] text-zinc-400 mt-0.5'>${esc(c.notes)}</div>` : ''}</div>
          <button data-sho='${h.id}|${c.id}' class='px-2 py-1 rounded bg-sky-950 border border-sky-500/40 text-sky-300 text-[10px] font-bold shrink-0'>Share Obj</button>
        </div>`).join('') || `<div class='text-[11px] text-zinc-500'>No objectives yet. Tap + Obj.</div>`}</div>
      </div>`).join('') : `<div class='p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-center text-xs text-zinc-400'>Your private workspace is completely blank. Tap + New Private Heist to start.</div>`);

      $('clNewHeist').onclick = async () => { const t = prompt('New Private Heist Title:'); if (t) await createCloudHeist(t.trim()); };
      $('clPullLocal').onclick = pullLocalBoardToCloud;
      if ($('clImpAsylum')) $('clImpAsylum').onclick = importAsylumToCloud;
      body.querySelectorAll('[data-shh]').forEach(b => b.onclick = () => { const h = myHeists.find(x => x.id === b.dataset.shh); if (h) openShareModal('heist', h); });
      body.querySelectorAll('[data-sho]').forEach(b => b.onclick = () => { const [hid, cid] = b.dataset.sho.split('|'); const h = myHeists.find(x => x.id === hid); const c = h?.cards?.find(x => x.id === cid); if (h && c) openShareModal('obj', h, c); });
      body.querySelectorAll('[data-addc]').forEach(b => b.onclick = async () => {
        const h = myHeists.find(x => x.id === b.dataset.addc); if (!h) return;
        const title = prompt('Objective title:'); if (!title) return;
        const notes = prompt('Details / notes (optional):') || '';
        const cards = [...(h.cards || []), { id: 'c_' + Date.now(), type: 'SETUP', title: title.trim(), status: 'OPEN', notes: notes.trim() }];
        await fb.updateDoc(fb.doc(db, 'heists', h.id), { cards, updatedAt: Date.now() });
      });
      body.querySelectorAll('[data-togc]').forEach(el => el.onclick = async () => {
        const [hid, cid] = el.dataset.togc.split('|'); const h = myHeists.find(x => x.id === hid); if (!h) return;
        const cards = (h.cards || []).map(c => c.id === cid ? { ...c, status: c.status === 'DONE' ? 'OPEN' : 'DONE' } : c);
        await fb.updateDoc(fb.doc(db, 'heists', h.id), { cards, updatedAt: Date.now() });
      });
      body.querySelectorAll('[data-delh]').forEach(b => b.onclick = async () => { if (confirm('Delete this private cloud heist?')) await fb.deleteDoc(fb.doc(db, 'heists', b.dataset.delh)); });
    } else if (activeSubTab === 'in') {
      const objsHtml = sharedInObjs.map(o => `<div class='p-3 rounded-2xl bg-zinc-900 border ${o.status === 'DONE' ? 'border-emerald-500/45' : 'border-sky-500/40'} space-y-1.5'>
        <div class='flex items-center justify-between gap-2'><span class='text-[10px] font-mono text-sky-300'>OBJECTIVE FROM ${esc(o.ownerEmail)} (${o.role})</span><span class='text-[10px] font-black ${o.status === 'DONE' ? 'text-emerald-400' : 'text-amber-300'}'>${o.status}</span></div>
        <div class='text-xs font-black text-white'>${esc(o.title)}</div>
        ${o.notes ? `<div class='text-[11px] text-zinc-300'>${esc(o.notes)}</div>` : ''}
        ${o.role !== 'view' ? `<button data-toginobj='${o.id}' class='px-3 py-1.5 rounded-lg ${o.status === 'DONE' ? 'bg-zinc-800 text-zinc-300' : 'bg-emerald-600 text-white'} text-[11px] font-black'>${o.status === 'DONE' ? 'Reopen' : 'Mark Done'}</button>` : ''}
      </div>`).join('');
      const heistsHtml = sharedInHeists.map(h => `<div class='p-3 rounded-2xl bg-zinc-900 border border-fuchsia-500/40 space-y-2'>
        <div class='text-[10px] font-mono text-fuchsia-300'>HEIST FROM ${esc(h.ownerEmail)} (${h.role})</div>
        <div class='text-sm font-black text-white'>${esc(h.title)}</div>
        <div class='space-y-1.5'>${(h.cards || []).map(c => `<div class='p-2 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2'><div class='min-w-0'><div class='text-xs font-bold ${c.status === 'DONE' ? 'line-through text-emerald-300' : 'text-white'}'>${esc(c.title)}</div>${c.notes ? `<div class='text-[10px] text-zinc-400'>${esc(c.notes)}</div>` : ''}</div>${h.role !== 'view' ? `<button data-toginh='${h.id}|${c.id}' class='px-2 py-1 rounded text-[10px] font-black ${c.status === 'DONE' ? 'bg-emerald-700 text-white' : 'bg-zinc-800 text-zinc-300'}'>${c.status}</button>` : `<span class='text-[10px] text-zinc-400'>${c.status}</span>`}</div>`).join('')}</div>
      </div>`).join('');
      body.innerHTML = (objsHtml + heistsHtml) || `<div class='p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-center text-xs text-zinc-400'>Nothing has been shared with ${esc(user.email)} yet.</div>`;
      body.querySelectorAll('[data-toginobj]').forEach(b => b.onclick = async () => {
        const o = sharedInObjs.find(x => x.id === b.dataset.toginobj); if (!o) return;
        await fb.updateDoc(fb.doc(db, 'shared_objectives', o.id), { status: o.status === 'DONE' ? 'OPEN' : 'DONE', updatedAt: Date.now() });
      });
      body.querySelectorAll('[data-toginh]').forEach(b => b.onclick = async () => {
        const [sid, cid] = b.dataset.toginh.split('|'); const h = sharedInHeists.find(x => x.id === sid); if (!h) return;
        const cards = (h.cards || []).map(c => c.id === cid ? { ...c, status: c.status === 'DONE' ? 'OPEN' : 'DONE' } : c);
        await fb.updateDoc(fb.doc(db, 'shared_heists', sid), { cards, updatedAt: Date.now() });
      });
    } else {
      const rows = [
        ...outHeists.map(s => ({ col: 'shared_heists', id: s.id, kind: 'HEIST', title: s.title, to: s.recipientEmail, role: s.role })),
        ...outObjs.map(s => ({ col: 'shared_objectives', id: s.id, kind: 'OBJECTIVE', title: s.title, to: s.recipientEmail, role: s.role }))
      ];
      body.innerHTML = rows.length ? rows.map(r => `<div class='p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2'><div class='min-w-0'><div class='text-[10px] font-mono text-amber-300'>${r.kind} • ${r.role} • ${esc(r.to)}</div><div class='text-xs font-bold text-white truncate'>${esc(r.title)}</div></div><button data-rev='${r.col}|${r.id}' class='px-2.5 py-1 rounded-lg bg-rose-950 border border-rose-500/40 text-rose-300 text-[10px] font-black shrink-0'>Revoke</button></div>`).join('') : `<div class='p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-center text-xs text-zinc-400'>No active outgoing shares.</div>`;
      body.querySelectorAll('[data-rev]').forEach(b => b.onclick = async () => {
        const [col, id] = b.dataset.rev.split('|');
        await fb.deleteDoc(fb.doc(db, col, id));
      });
    }
  }

  function init() {
    const nav = $('mainTabs'), main = document.querySelector('main');
    if (!nav || !main || $('view-cloud')) return;
    const btn = document.createElement('button');
    btn.dataset.tab = 'cloud';
    btn.className = 'tab-btn px-2.5 py-1 rounded-lg bg-zinc-900 border border-sky-500/50 text-sky-300 text-xs font-bold shrink-0';
    btn.textContent = 'Cloud & Share';
    nav.appendChild(btn);
    const sec = document.createElement('section');
    sec.id = 'view-cloud';
    sec.className = 'hidden p-3 overflow-y-auto flex-1';
    main.appendChild(sec);
    nav.addEventListener('click', e => { if (e.target.closest('.tab-btn')?.dataset.tab === 'cloud') renderCloud(); });
    updateHeaderPill();
    connectFirebase();
  }
  init();
})();