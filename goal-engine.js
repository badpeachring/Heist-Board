import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

(() => {
  if (window.__hbGoalEngineV1) return;
  window.__hbGoalEngineV1 = true;
  const $ = id => document.getElementById(id);
  const BOSS = (window.HEIST_BOSS_EMAIL || 'sethmcnab13@gmail.com').toLowerCase();
  const CFG = window.HEIST_FIREBASE_CONFIG || {};
  const CREW_ID_KEY = 'hb_crew_id_v2', GUEST_GOALS_KEY = 'hb_guest_goals_v2';
  const esc = s => String(s || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const fmtMoney = n => '$' + Math.round(Number(n) || 0).toLocaleString();
  const fmtTime = ts => ts ? new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

  const app = getApps().length ? getApps()[0] : initializeApp(CFG);
  const auth = getAuth(app), db = getFirestore(app);

  let user = null, isBoss = false, previewCrewId = '', activeTab = 'goals', stepFilter = 'ALL';
  let bossGoals = [], bossFinances = {}, crewRoster = [];
  let myCrewId = localStorage.getItem(CREW_ID_KEY) || '', myVault = null;
  let guestCodes = (() => { try { const a = JSON.parse(localStorage.getItem(GUEST_GOALS_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } })();
  let activeGoalId = '', activeGoal = null, expanded = new Set(), overrideGate = false;
  let bossUnsubs = [], vaultUnsub = null, goalUnsub = null;

  const inBossUi = () => isBoss && !previewCrewId;
  const actorName = () => inBossUi() ? 'Boss' : (myVault?.name || 'Crew');
  const genToken = p => { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let o = (p.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6) || 'ID') + '-'; for (let i = 0; i < 8; i++) o += c[Math.floor(Math.random() * c.length)]; return o; };

  function makeAsylumStarter() {
    const cells = [];
    for (let r = 0; r < 7; r++) for (let c = 0; c < 11; c++) cells.push(`<rect x='${66 + c * 22}' y='${54 + r * 22}' width='22' height='22' fill='${(r + c) % 2 === 0 ? '#18181b' : '#f4f4f5'}'/>`);
    const svg = `<svg viewBox='0 0 360 262' class='w-full rounded-xl border border-amber-500/35 bg-[#09090b]'><rect x='10' y='10' width='340' height='242' fill='#1c1917' stroke='#dc2626' stroke-width='3'/><rect x='16' y='16' width='328' height='230' fill='none' stroke='#f59e0b' stroke-width='1.5' stroke-dasharray='5,3'/><rect x='66' y='54' width='242' height='154' fill='#27272a' stroke='#38bdf8' stroke-width='1.5'/>${cells.join('')}<text x='187' y='30' text-anchor='middle' fill='#fca5a5' font-size='8.5' font-family='monospace' font-weight='bold'>9 FT BORDER (3 WALLS) • 980 SQ FT PATCH + 770 OVERLAP</text><text x='38' y='133' text-anchor='middle' fill='#fde047' font-size='9' font-family='monospace' font-weight='bold' transform='rotate(-90 38 133)'>11 FT ENTRY WALL</text><rect x='118' y='112' width='138' height='36' rx='6' fill='rgba(9,9,11,0.88)' stroke='#38bdf8'/><text x='187' y='127' text-anchor='middle' fill='#f8fafc' font-size='9.5' font-family='sans-serif' font-weight='900'>29' x 45' CHECKERBOARD</text><text x='187' y='140' text-anchor='middle' fill='#38bdf8' font-size='8.5' font-family='monospace'>1,305 SQ FT • 4'x4' GRID</text><text x='187' y='234' text-anchor='middle' fill='#a1a1aa' font-size='8.5' font-family='monospace'>WACO TX • 47' x 65' (3,055 SQ FT) • RUBBER: 1,750 SQ FT</text></svg>`;
    return {
      id: 'ASYLUM-980SQFT', title: 'THE ASYLUM — MASTER SPEC (980 SQ FT)', subtitle: 'Masonic Lodge • Waco, TX • 3rd Floor (47x65)',
      compatRule: 'NO DRYLOK Extreme. Apply Tufflex VRP-111 directly on bare, ground/dry concrete & wood screed strips once Tramex <= 4.5%.',
      tramex: '', tramexMax: 4.5, floorplanSvg: svg,
      metrics: [{ label: 'Perimeter Patch', value: '980 sq ft', color: 'text-amber-300' }, { label: 'Rubber Border', value: '1,750 sq ft', color: 'text-rose-300' }, { label: 'Checkerboard', value: '1,305 sq ft', color: 'text-cyan-300' }],
      lockedSpecTitle: 'Locked Mix Ratios & 3rd-Floor Water (165-204 gal)',
      lockedSpecs: [
        { k: 'Quikrete #100450 (175-180 bags)', v: '2.5-3.0 qt/bag = 109-135 gal (bag max 6 pt / 3 qt)' },
        { k: 'VersaBond Gray (15-16 bags)', v: '5.5-6.0 qt/bag = 21-24 gal (wet-on-wet 15-20 min)' },
        { k: 'Washout / Tub Rinse Reserve', v: '35-45 gal (keep 2 rinse buckets live)' },
        { k: 'Total 3rd-Floor Water Load', v: '1,376-1,701 lbs (33-41 5g buckets / 3-4 drums)' }
      ],
      manifest: [
        { item: 'Quikrete 50 lb Fast-Setting Concrete (#100450)', qty: '175-180 bags', spec: '~0.375 cu ft/bag • 15% waste • 980 sq ft (~1" avg + 2"-4" holes)' },
        { item: 'Custom Building Products VersaBond 50 lb Gray', qty: '15-16 bags', spec: 'Bonding scrub slurry + 1/4"-3/4" feather edges' },
        { item: '2" x 4" x 16\' Southern Yellow Pine Lumber', qty: '14 boards', spec: 'Rip to 3/4" x 1-1/2" or 3/4" x 1" permanent screed rails' },
        { item: 'Grip-Rite 2-1/2" Steel Cut Masonry Nails', qty: '2 boxes (1 lb ea)', spec: 'Mortar joints only every 18"-24" (angled down)' },
        { item: 'HDX 9\'x400\' 0.31 mil Plastic + ScotchBlue 6-pack', qty: '2 rolls + 6-pack', spec: 'Center slab masking + 4x4 checkerboard tape' }
      ],
      holos: [{
        id: 'room_asylum_main', name: 'Main Hall 47x65', wFt: 47, lFt: 65, hFt: 14, scanUrl: '', scaleFtPerUnit: 10,
        innerZone: { wFt: 29, lFt: 45, offX: 0, offZ: 1 },
        pins: [
          { id: 'p_1', x: -2.0, y: 0.1, z: -2.8, title: '980 sq ft Perimeter Patch & Water', area: 'Floor', desc: '175-180 bags Quikrete #100450 (2.5-3 qt max) + 15-16 VersaBond (5.5-6 qt). 165-204 gal total water. FANS OFF during pour; SETUP FANS 48-72 hrs after 2-4 hr set until Tramex <= 4.5%.', link: '', status: 'OPEN', doneBy: '', doneAt: 0 },
          { id: 'p_2', x: -2.3, y: 0.7, z: 0.0, title: '11 ft Entry Wall Screed & Rubber Border', area: 'Entry', desc: '14 SYP 2x4x16 boards ripped to 3/4x1-1/2 or 3/4x1; Grip-Rite 2-1/2in masonry nails in mortar joints every 18-24in. Encapsulate in 11 ft liquid rubber border.', link: '', status: 'OPEN', doneBy: '', doneAt: 0 },
          { id: 'p_3', x: 0.0, y: 0.1, z: 0.2, title: '29x45 Center Checkerboard & VRP-111', area: 'Floor', desc: 'NO DRYLOK. Grind & HEPA-vac full 3,055 sq ft -> Tufflex VRP-111 -> ELASTA-TUFF 5000 / 1/4in rubber border -> 2 coats white -> indirect fans -> 4x4 ScotchBlue grid -> 2 coats black -> clear aliphatic wear coat.', link: '', status: 'OPEN', doneBy: '', doneAt: 0 }
        ]
      }],
      phases: [
        { id: 'p1', code: 'PHASE 1', title: 'Permanent Wood Screed Strip Installation', obj: 'Install a permanent, level wood screed rail along all exterior brick/stone walls flush with the clean interior slab height.', steps: [
          { id: '1.1', title: '1.1 • Laser Level & Chalk Line', tag: '', status: 'OPEN', details: ['Set laser level to exact top elevation of clean interior concrete slab.', 'Transfer height marks to all brick/stone exterior walls at corners and every 10-15 ft.', 'Snap a continuous chalk line around the room perimeter.'] },
          { id: '1.2', title: '1.2 • Drop Depth Check & Table Saw Ripping (14 SYP Boards)', tag: '', status: 'OPEN', details: ['Measure vertically from chalk line down to highest rocky subfloor points every 5-10 ft.', 'Drop >= 1-1/2": Rip 2x4s lengthwise into 3/4" x 1-1/2" strips (4 strips per board).', 'Drop < 1-1/2" (e.g. 1"): Rip 3-1/2" face down to 1" first, then split in half for 3/4" x 1" strips.'] },
          { id: '1.3', title: '1.3 • Permanent Wall Anchoring', tag: '', status: 'OPEN', details: ['Align top edge of wood strip directly on chalk line with flat 3/4" face against wall.', 'Drive 2-1/2" Grip-Rite steel cut masonry nails into mortar joints only (angled slightly downward) every 18"-24". Never nail brick/stone faces.', 'Pack wet VersaBond thinset behind strip where mortar joints do not align. Leave wood buried permanently for rubber encapsulation.'] }
        ] },
        { id: 'p2', code: 'PHASE 2', title: 'Water Staging, Bonding Slurry & Concrete Patching (980 sq ft)', obj: 'Stage 3rd-floor water supply, then fill all 980 sq ft of rough perimeter concrete flush with interior slab and wood screed strips.', steps: [
          { id: '2.0', title: '2.0 • Stage 3rd-Floor Water Supply (165-204 Gal Total)', tag: 'WATER', status: 'OPEN', details: ['Quikrete #100450 (175-180 bags @ 2.5-3.0 qt): 109-135 gal. VersaBond (15-16 bags @ 5.5-6.0 qt): 21-24 gal. Washout reserve: 35-45 gal.', 'Total water weight: 1,376-1,701 lbs (33-41 five-gal buckets or 3-4 drums / hose feed).', 'Pre-mark fixed measuring pitchers. Keep ALL fans OFF during slurry scrub and concrete pour.'] },
          { id: '2.1', title: '2.1 • Floor Prep & Masking (980 sq ft Perimeter)', tag: '', status: 'OPEN', details: ['HEPA-vacuum all loose dust, rocks, and delaminated debris from the 980 sq ft perimeter.', 'Mask clean interior concrete edge using 0.31 mil HDX painter\'s plastic (2 rolls) and ScotchBlue tape.'] },
          { id: '2.2', title: '2.2 • Thinset Bonding Scrub Coat (15-16 Bags VersaBond Gray)', tag: '', status: 'OPEN', details: ['LOCKED RATIO: 5.5-6.0 qts clean water per 50 lb bag to thick pancake-batter slurry; slake 5-10 min & re-mix.', 'APPLICATION RULE: Scrub thin coat immediately ahead of pour; place concrete within 15-20 min while wet/tacky.', 'Feather shallow 1/4"-3/4" spots flush with standard trowel-consistency VersaBond.'] },
          { id: '2.3', title: '2.3 • Fast-Setting Concrete Pour (175-180 Bags Quikrete #100450)', tag: '', status: 'OPEN', details: ['LOCKED RATIO: 2.5-3.0 qts (80-96 oz) clean water per 50 lb bag mixed stiff (zero bleed water). Bag strict max: 6 pt (3 qt).', 'WORKING TIME: Mix only what places within 20 min (sets in 20-40 min). Work in quadrants.', 'Tamp firmly into 2"-4" deep pockets and screed dead-flush across interior slab + exterior wood strip with straight 2x4.'] },
          { id: '2.4', title: '2.4 • Initial Walkable Set Hold (2-4 Hours)', tag: '', status: 'OPEN', details: ['Allow fast-setting concrete to set before aiming direct airflow (walkable in 2-4 hrs; bag specifies 4 hrs before heavy loads).'] },
          { id: '2.5', title: '2.5 • SETUP FANS & Dehumidifiers (Forced Drying Gate <= 4.5%)', tag: 'FANS', status: 'OPEN', details: ['Run high-velocity box fans and dehumidifiers across all 980 sq ft of patched perimeter for 48-72 hours.', 'MANDATORY GATE: Continue forced drying until Tramex concrete moisture impedance readings drop to <= 4.5% across all patched areas.'] }
        ] },
        { id: 'p3', code: 'PHASE 3', title: 'Wall Scraping, Woodwork Patching & Wall Painting', obj: 'Complete all dusty and overhead/vertical finishing before opening floor coating materials (ceiling excluded).', steps: [
          { id: '3.1', title: '3.1 • Wall Scraping', tag: '', status: 'OPEN', details: ['Scrape all loose paint, flaking plaster, and efflorescence onto masked floor. Keep fans OFF while scraping.'] },
          { id: '3.2', title: '3.2 • Wood Board & Wall Patching', tag: '', status: 'OPEN', details: ['Patch and repair all damaged wood trim, baseboards, casings, and wall holes/cracks; sand smooth and spot-prime.'] },
          { id: '3.2b', title: '3.2b • SETUP FANS (Woodwork & Primer Dry)', tag: 'FANS', status: 'OPEN', details: ['Aim fans across patched drywall, wood filler, and primed trim to speed sanding. Turn fans OFF right before finish paint.'] },
          { id: '3.3', title: '3.3 • Wall Painting (Ceiling Excluded)', tag: '', status: 'OPEN', details: ['Mask ceiling line and floor edges. Apply finish paint coats to all walls (do NOT paint the ceiling).'] },
          { id: '3.4', title: '3.4 • SETUP FANS (Paint Cure) & Full 3,055 sq ft Cleanup', tag: 'FANS', status: 'OPEN', details: ['Run indirect circulation fans until wall paint dries cleanly. Remove floor plastic/tape; sweep and HEPA-vac full 47x65 floor.'] }
        ] },
        { id: 'p4', code: 'PHASE 4', title: 'Floor Layout, Tufflex VRP-111, Liquid Rubber & Checkerboard', gateBy: ['p2', 'p3'], obj: 'NO DRYLOK. Prime bare dry concrete + screed strips with Tufflex VRP-111, install 9\'/11\' liquid rubber border (1,750 sq ft), and paint 29\'x45\' checkerboard.', steps: [
          { id: '4.1', title: '4.1 • Floor Layout & Chalk Lines (9\' / 11\' Border)', tag: '', status: 'OPEN', details: ['Measure 9 ft (108") inward from 3 walls and 11 ft (132") inward from 1 entry wall. Snap crisp border chalk lines.', 'Border = 1,750 sq ft (980 patch + 770 overlap). Interior checkerboard = 29\'x45\' (1,305 sq ft) centered 4\'x4\' grid.'] },
          { id: '4.2', title: '4.2 • Mechanical Surface Prep (Full 3,055 sq ft)', tag: '', status: 'OPEN', details: ['Mechanically grind/abrade clean concrete (770 sq ft overlap + 29x45 checkerboard) and HEPA-vacuum full 3,055 sq ft dust-free.'] },
          { id: '4.3', title: '4.3 • Tufflex VRP-111 Moisture Epoxy Primer (NO DRYLOK)', tag: '', status: 'OPEN', details: ['GATE: Confirm 980 sq ft patch Tramex <= 4.5%. Do NOT use DRYLOK Extreme.', 'Roll Tufflex VRP-111 directly onto bare dry patch, wood screed strips, and ground slab. Observe recoat window.'] },
          { id: '4.4', title: '4.4 • Liquid Rubber Border (1,750 sq ft)', tag: '', status: 'OPEN', details: ['Apply ELASTA-TUFF 5000 / SYD-BASECOAT and build 1/4" liquid rubber (or 3/8" granule slurry) across 1,750 sq ft border.', 'Finish border in solid black aliphatic topcoat. Pull edge tape cleanly before full cure.'] },
          { id: '4.4b', title: '4.4b • SETUP FANS (Indirect Between Coats)', tag: 'FANS', status: 'OPEN', details: ['Use indirect high-level cross-ventilation fans only (NEVER blast wet polyurethane/aliphatic resin directly).'] },
          { id: '4.5', title: '4.5 • 29x45 Checkerboard Painting (1,305 sq ft)', tag: '', status: 'OPEN', details: ['Roll 2 coats white across 29x45 zone -> indirect fans -> mask alternating 4x4 squares with burnished ScotchBlue -> 2 coats black -> pull tape wet.'] },
          { id: '4.6', title: '4.6 • Final Clear Wear Coat & Event Cure Gate', tag: 'FANS', status: 'OPEN', details: ['Roll clear aliphatic polyurethane/polyaspartic topcoat with indirect airflow.', 'CURE GATE: 24 hrs min light foot traffic; 48-72 hrs heavy event furniture/staging load-in.'] }
        ] }
      ],
      updatedAt: Date.now()
    };
  }

  function setPrimaryTab(tab) {
    activeTab = tab;
    const ids = ['goals', 'holo', 'cuts'];
    document.querySelectorAll('#hbPrimaryNav .ptab-btn').forEach(b => {
      const on = b.dataset.ptab === tab;
      b.className = on ? 'ptab-btn px-3 py-1.5 rounded-xl bg-rose-600/25 border border-rose-400 text-white text-xs font-black shrink-0' : 'ptab-btn px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs font-bold shrink-0';
    });
    document.querySelectorAll('main > section').forEach(s => s.classList.toggle('hidden', s.id !== 'view-' + tab));
    if (tab === 'goals') renderGoals();
    if (tab === 'holo') window.HeistHolo?.mount($('view-holo'), activeGoal, { isBoss: inBossUi(), actorName: actorName(), onSaveHolos: saveActiveHolos });
    if (tab === 'cuts') renderBossCuts();
  }

  function updateChrome() {
    const bossUi = inBossUi();
    $('hbRoleBadge').textContent = bossUi ? 'BOSS' : previewCrewId ? `PREVIEW: ${myVault?.name || previewCrewId}` : (myVault?.name ? `CREW • ${myVault.name}` : 'CREW');
    $('hbRoleBadge').className = bossUi ? 'px-2 py-0.5 rounded bg-rose-600/25 border border-rose-400/60 text-[10px] font-mono font-black text-rose-300' : 'px-2 py-0.5 rounded bg-sky-600/20 border border-sky-400/50 text-[10px] font-mono font-bold text-sky-300 truncate';
    $('hbToolsToggle').classList.toggle('hidden', !bossUi);
    if (!bossUi) $('hbLegacyBar').classList.add('hidden');
    const cutsBtn = document.querySelector('#hbPrimaryNav [data-ptab="cuts"]');
    if (cutsBtn) cutsBtn.classList.toggle('hidden', !bossUi);
    const ab = $('hbAuthBtn');
    if (isBoss && previewCrewId) { ab.textContent = 'Exit Preview'; ab.onclick = () => { previewCrewId = ''; myVault = null; vaultUnsub?.(); vaultUnsub = null; updateChrome(); selectGoal(bossGoals[0]?.id || ''); setPrimaryTab('cuts'); }; }
    else if (isBoss) { ab.textContent = 'Sign Out'; ab.onclick = () => signOut(auth); }
    else { ab.textContent = 'Boss Login'; ab.onclick = openBossLogin; }
  }

  function openBossLogin() {
    let m = $('hbLoginMod');
    if (!m) { m = document.createElement('div'); m.id = 'hbLoginMod'; m.className = 'fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4'; document.body.appendChild(m); }
    m.innerHTML = `<div class='w-full max-w-sm bg-zinc-950 border border-rose-500/45 rounded-2xl p-4 space-y-3'><div class='flex justify-between items-center'><span class='text-xs font-black uppercase text-rose-400'>Boss Admin Login</span><button id='lmX' class='px-2.5 py-1 rounded-lg bg-zinc-800 text-xs text-white'>Close</button></div><div class='text-[11px] text-zinc-400'>Boss access locked to <span class='text-white font-mono'>${esc(BOSS)}</span>.</div><button id='lmG' class='w-full py-2.5 rounded-xl bg-white text-zinc-950 text-xs font-black'>Sign In with Google</button><div class='border-t border-zinc-800 pt-2.5 space-y-2'><input id='lmEm' type='email' value='${esc(BOSS)}' class='w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white'><input id='lmPw' type='password' placeholder='Skill Tree / Firebase Password' class='w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white'><button id='lmGo' class='w-full py-2 rounded-xl bg-rose-600 text-white text-xs font-black'>Sign In</button></div><div id='lmErr' class='hidden text-[11px] font-mono text-rose-400'></div></div>`;
    m.classList.remove('hidden'); $('lmX').onclick = () => m.classList.add('hidden');
    const err = s => { $('lmErr').textContent = s; $('lmErr').classList.remove('hidden'); };
    $('lmG').onclick = async () => { try { const r = await signInWithPopup(auth, new GoogleAuthProvider()); if (r.user.email.toLowerCase() !== BOSS) { await signOut(auth); err('Boss Gmail only.'); } else m.classList.add('hidden'); } catch (e) { err(e.message); } };
    $('lmGo').onclick = async () => { try { await signInWithEmailAndPassword(auth, $('lmEm').value.trim().toLowerCase(), $('lmPw').value); m.classList.add('hidden'); } catch (e) { err(e.message); } };
  }

  async function saveActiveHolos(nextHolos) {
    if (!activeGoal) return;
    await updateDoc(doc(db, 'hb_goals', activeGoal.id), { holos: nextHolos, updatedAt: Date.now() }).catch(e => alert('Holo sync error: ' + e.message));
  }

  function selectGoal(gid) {
    activeGoalId = gid || '';
    goalUnsub?.(); goalUnsub = null;
    if (!activeGoalId) { activeGoal = null; renderGoals(); window.HeistHolo?.syncGoal(null); return; }
    goalUnsub = onSnapshot(doc(db, 'hb_goals', activeGoalId), snap => {
      activeGoal = snap.exists() ? { id: snap.id, ...snap.data() } : null;
      renderGoals();
      window.HeistHolo?.syncGoal(activeGoal, { isBoss: inBossUi(), actorName: actorName(), onSaveHolos: saveActiveHolos });
    });
  }

  function connectCrewVault(rawId, isPreview = false) {
    const cid = String(rawId || '').trim().toUpperCase();
    if (!cid) return;
    vaultUnsub?.(); vaultUnsub = null;
    if (isPreview) previewCrewId = cid; else { myCrewId = cid; localStorage.setItem(CREW_ID_KEY, cid); }
    vaultUnsub = onSnapshot(doc(db, 'hb_crew_vault', cid), snap => {
      if (!snap.exists()) { myVault = null; updateChrome(); renderGoals('Crew ID not found: ' + cid); return; }
      myVault = { crewId: snap.id, ...snap.data() };
      const list = myVault.assignedGoals || [];
      if (!activeGoalId || !list.some(g => g.goalId === activeGoalId)) selectGoal(list[0]?.goalId || guestCodes[0] || '');
      updateChrome(); renderGoals();
    });
  }

  function startBossStreams() {
    bossUnsubs.forEach(u => { try { u(); } catch {} }); bossUnsubs = [];
    bossUnsubs.push(onSnapshot(collection(db, 'hb_goals'), s => {
      bossGoals = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      if (inBossUi() && (!activeGoalId || !bossGoals.some(g => g.id === activeGoalId))) selectGoal(bossGoals[0]?.id || '');
      renderGoals(); if (activeTab === 'cuts') renderBossCuts();
    }));
    bossUnsubs.push(onSnapshot(collection(db, 'hb_boss_finances'), s => {
      bossFinances = {}; s.docs.forEach(d => { bossFinances[d.id] = d.data(); });
      if (activeTab === 'cuts') renderBossCuts();
    }));
    bossUnsubs.push(onSnapshot(collection(db, 'hb_crew_vault'), s => {
      crewRoster = s.docs.map(d => ({ crewId: d.id, ...d.data() })).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      if (activeTab === 'cuts') renderBossCuts();
    }));
  }

  function openStepModal(phaseIdx, step = null) {
    let m = $('hbStepMod');
    if (!m) { m = document.createElement('div'); m.id = 'hbStepMod'; m.className = 'fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-3'; document.body.appendChild(m); }
    const cur = step || { title: '', tag: '', details: [], link: '' };
    m.innerHTML = `<div class='w-full max-w-md bg-zinc-950 border border-rose-500/45 rounded-2xl p-4 space-y-3'>
      <div class='flex justify-between items-center'><span class='text-xs font-black uppercase text-rose-400'>${step ? 'Edit Step (Live Syncs to Crew)' : 'Add Step'}</span><button id='smX' class='px-2.5 py-1 rounded-lg bg-zinc-800 text-xs text-white'>Cancel</button></div>
      <input id='smT' value='${esc(cur.title)}' placeholder='Step title' class='w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white'>
      <select id='smTag' class='w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white'><option value='' ${!cur.tag ? 'selected' : ''}>Standard Step</option><option value='WATER' ${cur.tag === 'WATER' ? 'selected' : ''}>WATER STAGE</option><option value='FANS' ${cur.tag === 'FANS' ? 'selected' : ''}>AIRFLOW / FANS</option></select>
      <textarea id='smD' rows='5' placeholder='One bullet point per line...' class='w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white'>${esc((cur.details || []).join('\n'))}</textarea>
      <input id='smL' value='${esc(cur.link || '')}' placeholder='Reference / spec link (optional)' class='w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white'>
      <div class='flex gap-2'><button id='smSave' class='flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-black'>Save Step</button>${step ? `<button id='smDel' class='px-3 py-2.5 rounded-xl bg-zinc-900 border border-rose-500/40 text-rose-300 text-xs font-bold'>Del</button>` : ''}</div>
    </div>`;
    m.classList.remove('hidden'); $('smX').onclick = () => m.classList.add('hidden');
    $('smSave').onclick = async () => {
      const title = $('smT').value.trim(); if (!title) return;
      const details = $('smD').value.split('\n').map(x => x.trim()).filter(Boolean);
      const phases = JSON.parse(JSON.stringify(activeGoal.phases || []));
      const ph = phases[phaseIdx]; if (!ph) return;
      if (step) { const idx = ph.steps.findIndex(x => x.id === step.id); if (idx >= 0) ph.steps[idx] = { ...ph.steps[idx], title, tag: $('smTag').value, details, link: $('smL').value.trim() }; }
      else ph.steps.push({ id: 's_' + Date.now(), title, tag: $('smTag').value, status: 'OPEN', details, link: $('smL').value.trim() });
      m.classList.add('hidden');
      await updateDoc(doc(db, 'hb_goals', activeGoal.id), { phases, updatedAt: Date.now() });
    };
    if ($('smDel')) $('smDel').onclick = async () => {
      const phases = JSON.parse(JSON.stringify(activeGoal.phases || []));
      phases[phaseIdx].steps = phases[phaseIdx].steps.filter(x => x.id !== step.id);
      m.classList.add('hidden');
      await updateDoc(doc(db, 'hb_goals', activeGoal.id), { phases, updatedAt: Date.now() });
    };
  }

  function openImportJsonModal() {
    let m = $('hbImpMod');
    if (!m) { m = document.createElement('div'); m.id = 'hbImpMod'; m.className = 'fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3'; document.body.appendChild(m); }
    m.innerHTML = `<div class='w-full max-w-md bg-zinc-950 border border-sky-500/45 rounded-2xl p-4 space-y-3'><div class='flex justify-between items-center'><span class='text-xs font-black uppercase text-sky-400'>Import Goal JSON Bundle</span><button id='imX' class='px-2.5 py-1 rounded-lg bg-zinc-800 text-xs text-white'>Close</button></div><textarea id='imTxt' rows='8' placeholder='Paste Goal JSON here...' class='w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-[11px] font-mono text-white'></textarea><button id='imGo' class='w-full py-2.5 rounded-xl bg-sky-600 text-white text-xs font-black'>Import &amp; Sync Goal Live</button></div>`;
    m.classList.remove('hidden'); $('imX').onclick = () => m.classList.add('hidden');
    $('imGo').onclick = async () => {
      try {
        const obj = JSON.parse($('imTxt').value.trim());
        const id = (obj.id || genToken(obj.title || 'GOAL')).toUpperCase();
        await setDoc(doc(db, 'hb_goals', id), { ...obj, id, updatedAt: Date.now() });
        m.classList.add('hidden'); selectGoal(id);
      } catch (e) { alert('Invalid JSON: ' + e.message); }
    };
  }

  function openShareGoalModal() {
    if (!activeGoal) return;
    let m = $('hbShMod');
    if (!m) { m = document.createElement('div'); m.id = 'hbShMod'; m.className = 'fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3'; document.body.appendChild(m); }
    const guestUrl = `${location.origin}${location.pathname}?goal=${activeGoal.id}`;
    m.innerHTML = `<div class='w-full max-w-md bg-zinc-950 border border-emerald-500/45 rounded-2xl p-4 space-y-3'>
      <div class='flex justify-between items-center'><span class='text-xs font-black uppercase text-emerald-400'>Share Goal Bundle</span><button id='shX' class='px-2.5 py-1 rounded-lg bg-zinc-800 text-xs text-white'>Close</button></div>
      <div class='text-xs font-bold text-white'>${esc(activeGoal.title)}</div>
      <div class='space-y-1.5'><div class='text-[10px] font-mono uppercase text-zinc-400'>Assign to Crew IDs (Auto-appears in their Saved Goals)</div>${crewRoster.map(c => { const on = (c.assignedGoals || []).some(g => g.goalId === activeGoal.id); return `<label class='flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800'><span class='text-xs font-bold text-white'>${esc(c.name)} <span class='text-[10px] font-mono text-sky-400'>(${esc(c.crewId)})</span></span><input type='checkbox' data-asg='${esc(c.crewId)}' ${on ? 'checked' : ''} class='w-4 h-4 accent-emerald-500'></label>`; }).join('') || `<div class='text-[11px] text-zinc-500'>Add crew members in the Crew &amp; Cuts tab first.</div>`}</div>
      <button id='shSaveAsg' class='w-full py-2 rounded-xl bg-emerald-600 text-white text-xs font-black'>Save Crew Assignments</button>
      <div class='pt-2 border-t border-zinc-800 space-y-1.5'><div class='text-[10px] font-mono uppercase text-zinc-400'>Or Copy Guest Link (Goal + Holo Only, Zero Pay Info)</div><button id='shCopyGuest' class='w-full py-2 rounded-xl bg-sky-600/25 border border-sky-400/50 text-sky-200 text-xs font-black'>Copy Guest Link (${esc(activeGoal.id)})</button></div>
    </div>`;
    m.classList.remove('hidden'); $('shX').onclick = () => m.classList.add('hidden');
    $('shCopyGuest').onclick = () => { navigator.clipboard?.writeText(guestUrl); alert('Copied Guest Link:\n' + guestUrl); };
    $('shSaveAsg').onclick = async () => {
      for (const cb of m.querySelectorAll('[data-asg]')) {
        const c = crewRoster.find(x => x.crewId === cb.dataset.asg); if (!c) continue;
        let list = [...(c.assignedGoals || [])];
        const has = list.some(g => g.goalId === activeGoal.id);
        if (cb.checked && !has) list.push({ goalId: activeGoal.id, title: activeGoal.title, estCut: 0, pct: 0 });
        if (!cb.checked && has) list = list.filter(g => g.goalId !== activeGoal.id);
        await setDoc(doc(db, 'hb_crew_vault', c.crewId), { ...c, assignedGoals: list, updatedAt: Date.now() });
      }
      m.classList.add('hidden'); alert('Crew assignments synced live!');
    };
  }

  function renderGoals(err = '') {
    const host = $('view-goals'); if (!host) return;
    const bossUi = inBossUi();
    const nodeList = bossUi ? bossGoals.map(g => ({ id: g.id, title: g.title })) : [...(myVault?.assignedGoals || []).map(g => ({ id: g.goalId, title: g.title })), ...guestCodes.filter(c => !(myVault?.assignedGoals || []).some(g => g.goalId === c)).map(c => ({ id: c, title: c }))];
    const myCutEntry = !bossUi && activeGoal ? (myVault?.assignedGoals || []).find(g => g.goalId === activeGoal.id) : null;

    let goalBody = '';
    if (activeGoal) {
      const phases = activeGoal.phases || [];
      const allSteps = phases.flatMap(p => p.steps || []);
      const doneCnt = allSteps.filter(s => s.status === 'DONE').length;
      const pct = allSteps.length ? Math.round((doneCnt / allSteps.length) * 100) : 0;
      const tVal = activeGoal.tramex === '' || activeGoal.tramex === undefined ? NaN : Number(activeGoal.tramex);
      const tMax = Number(activeGoal.tramexMax) || 4.5;
      const tramexOk = !Number.isNaN(tVal) && tVal > 0 && tVal <= tMax;
      const phaseDone = id => (phases.find(p => p.id === id)?.steps || []).every(s => s.status === 'DONE');

      goalBody = `${myCutEntry && (myCutEntry.estCut > 0 || myCutEntry.pct > 0) ? `<div class='bg-gradient-to-br from-emerald-950 via-zinc-950 to-amber-950/60 border-2 border-emerald-400/70 rounded-2xl p-4 shadow-xl space-y-1'>
        <div class='flex items-center justify-between gap-2'><span class='text-[10px] font-mono font-black tracking-widest text-emerald-300 uppercase'>Your Estimated Cut • Private</span>${myCutEntry.pct > 0 ? `<span class='px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-[10px] font-mono font-black text-amber-300'>${myCutEntry.pct}% SHARE</span>` : ''}</div>
        <div class='text-4xl font-black tracking-tight text-emerald-400 drop-shadow'>${fmtMoney(myCutEntry.estCut)}</div>
        <div class='text-[10px] font-mono text-amber-200/90 uppercase'>ESTIMATE ONLY • SUBJECT TO FINAL MATERIALS &amp; JOB COSTS</div>
      </div>` : ''}
      <div class='bg-zinc-900/95 border border-rose-500/40 rounded-2xl p-3 space-y-2.5'>
        <div class='flex items-start justify-between gap-2'>
          <div class='min-w-0'><div class='text-[10px] font-mono uppercase tracking-widest text-rose-400 truncate'>${esc(activeGoal.subtitle || 'LIVE SYNCED GOAL BUNDLE')}</div><div class='text-base font-black text-white'>${esc(activeGoal.title)}</div></div>
          <div class='flex gap-1.5 shrink-0'>
            <button id='gOpenHolo' class='px-2.5 py-1.5 rounded-xl bg-cyan-600/25 border border-cyan-400/60 text-cyan-200 text-[10px] font-black'>Holo (${(activeGoal.holos || []).length})</button>
            ${bossUi ? `<button id='gShareBtn' class='px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white text-[10px] font-black'>Share</button>` : ''}
          </div>
        </div>
        ${activeGoal.compatRule ? `<div class='p-2 rounded-xl bg-amber-950/45 border border-amber-500/45 text-[10px] font-mono text-amber-200'><strong>RULE:</strong> ${esc(activeGoal.compatRule)}</div>` : ''}
        <div class='flex items-center justify-between text-xs'><span class='font-black text-amber-300'>Progress: ${doneCnt}/${allSteps.length} Steps (${pct}%)</span>${activeGoal.tramexMax ? `<span class='font-mono text-[10px] ${tramexOk ? 'text-emerald-400' : 'text-rose-400'}'>Tramex: ${activeGoal.tramex === '' || activeGoal.tramex === undefined ? 'Not Logged' : activeGoal.tramex + '%'}</span>` : ''}</div>
        <div class='w-full h-2.5 rounded-full bg-zinc-950 overflow-hidden border border-zinc-800'><div class='h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400' style='width:${pct}%'></div></div>
        ${activeGoal.floorplanSvg || ''}
        ${(activeGoal.metrics || []).length ? `<div class='grid grid-cols-3 gap-1.5 text-center'>${activeGoal.metrics.map(mt => `<div class='p-2 rounded-xl bg-zinc-950 border border-zinc-800'><div class='text-[10px] text-zinc-400'>${esc(mt.label)}</div><div class='text-xs font-black ${mt.color || 'text-white'}'>${esc(mt.value)}</div></div>`).join('')}</div>` : ''}
      </div>
      ${activeGoal.tramexMax ? `<div class='bg-zinc-900/95 border border-emerald-500/40 rounded-2xl p-3 flex items-center justify-between gap-2'><div><div class='text-xs font-black text-emerald-300'>Tramex Moisture Gate (&lt;= ${tMax}%)</div><div class='text-[10px] text-zinc-400'>Live synced reading across Boss &amp; Crew</div></div><input id='gTramexIn' type='number' step='0.1' value='${esc(activeGoal.tramex ?? '')}' placeholder='4.2' class='w-20 bg-zinc-950 border ${tramexOk ? 'border-emerald-400 text-emerald-300' : 'border-rose-500 text-rose-200'} rounded-lg px-2 py-1.5 text-xs font-mono text-center'></div>` : ''}
      ${(activeGoal.lockedSpecs || []).length ? `<div class='bg-zinc-900/95 border border-sky-500/45 rounded-2xl p-3 space-y-2'><div class='text-xs font-black text-sky-300 uppercase'>${esc(activeGoal.lockedSpecTitle || 'Locked Specs')}</div><div class='space-y-1.5 text-[11px] font-mono bg-zinc-950 border border-zinc-800 rounded-xl p-2.5'>${activeGoal.lockedSpecs.map(sp => `<div class='flex justify-between gap-2 border-b border-zinc-900 pb-1 last:border-0 last:pb-0'><span class='text-zinc-300'>${esc(sp.k)}</span><span class='text-sky-300 font-bold text-right'>${esc(sp.v)}</span></div>`).join('')}</div></div>` : ''}
      ${(activeGoal.manifest || []).length ? `<details class='bg-zinc-900/95 border border-zinc-800 rounded-2xl p-3'><summary class='cursor-pointer text-xs font-black text-amber-300 uppercase tracking-wider'>Material Manifest (${activeGoal.manifest.length} Items)</summary><div class='mt-2 space-y-1.5'>${activeGoal.manifest.map(m => `<div class='p-2 rounded-xl bg-zinc-950 border border-zinc-800'><div class='flex justify-between gap-2'><span class='text-xs font-bold text-white'>${esc(m.item)}</span><span class='text-[10px] font-mono font-black text-amber-300 shrink-0'>${esc(m.qty)}</span></div><div class='text-[10px] text-zinc-400 mt-0.5'>${esc(m.spec)}</div></div>`).join('')}</div></details>` : ''}
      <div class='flex items-center justify-between gap-2'><div class='flex gap-1.5'><button data-sf='ALL' class='sf-b px-2.5 py-1 rounded-lg text-[10px] font-black border ${stepFilter === 'ALL' ? 'bg-sky-600/30 border-sky-400 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}'>All (${allSteps.length})</button><button data-sf='OPEN' class='sf-b px-2.5 py-1 rounded-lg text-[10px] font-black border ${stepFilter === 'OPEN' ? 'bg-amber-600/30 border-amber-400 text-amber-200' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}'>Open (${allSteps.length - doneCnt})</button><button data-sf='DONE' class='sf-b px-2.5 py-1 rounded-lg text-[10px] font-black border ${stepFilter === 'DONE' ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}'>Done (${doneCnt})</button></div>${bossUi ? `<button id='gAddPhase' class='px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-[10px] font-bold text-zinc-300'>+ Phase</button>` : ''}</div>
      ${phases.map((ph, pIdx) => {
        const pSteps = ph.steps || [];
        const pDone = pSteps.filter(s => s.status === 'DONE').length;
        const visSteps = pSteps.filter(s => stepFilter === 'ALL' ? true : stepFilter === 'DONE' ? s.status === 'DONE' : s.status !== 'DONE');
        const locked = Array.isArray(ph.gateBy) && ph.gateBy.length && !overrideGate && !(ph.gateBy.every(phaseDone) && (!activeGoal.tramexMax || tramexOk));
        return `<div class='bg-zinc-900/95 border ${locked ? 'border-rose-500/50' : pDone === pSteps.length && pSteps.length ? 'border-emerald-500/50' : 'border-zinc-800'} rounded-2xl p-3 space-y-2.5'>
          <div class='flex items-start justify-between gap-2'><div><span class='px-2 py-0.5 rounded bg-rose-500/20 border border-rose-400/40 text-[10px] font-mono font-black text-rose-300'>${esc(ph.code)} • ${pDone}/${pSteps.length}</span><h3 class='text-sm font-black text-white mt-1'>${esc(ph.title)}</h3>${ph.obj ? `<p class='text-[11px] text-zinc-400 mt-0.5'>${esc(ph.obj)}</p>` : ''}</div>${bossUi ? `<button data-addst='${pIdx}' class='px-2 py-1 rounded-lg bg-emerald-600/25 border border-emerald-500/40 text-emerald-200 text-[10px] font-black shrink-0'>+ Step</button>` : ''}</div>
          ${locked ? `<div class='p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-[11px] text-rose-200 flex items-center justify-between gap-2'><span><strong>HARD SEQUENCING GATE:</strong> Finish prerequisite phases + Tramex &lt;= ${tMax}% first.</span>${bossUi ? `<button id='gOvrGate' class='px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-black shrink-0'>Override</button>` : ''}</div>` : ''}
          <div class='space-y-2 ${locked ? 'opacity-55' : ''}'>${visSteps.map(s => {
            const ck = s.status === 'DONE', open = expanded.has(s.id);
            const tagB = s.tag === 'FANS' ? `<span class='px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/50 text-[9px] font-mono font-black text-cyan-300'>AIRFLOW / FANS</span>` : s.tag === 'WATER' ? `<span class='px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/50 text-[9px] font-mono font-black text-sky-300'>WATER STAGE</span>` : '';
            return `<div class='rounded-xl border overflow-hidden ${ck ? 'bg-emerald-950/25 border-emerald-500/40' : s.tag === 'FANS' ? 'bg-cyan-950/20 border-cyan-500/35' : s.tag === 'WATER' ? 'bg-sky-950/25 border-sky-500/40' : 'bg-zinc-950/95 border-zinc-800'}'>
              <button data-exp='${s.id}' class='w-full p-2.5 text-left flex items-center justify-between gap-2'>
                <div class='min-w-0 flex-1'><div class='flex items-center gap-1.5 flex-wrap'>${tagB}<span class='text-xs font-black ${ck ? 'line-through text-emerald-300' : 'text-white'}'>${esc(s.title)}</span></div><div class='text-[10px] text-zinc-400 mt-0.5'>${ck && s.doneBy ? `✓ Done by ${esc(s.doneBy)} ${fmtTime(s.doneAt)}` : open ? 'Tap to collapse' : 'Tap to expand specs &amp; check off'}</div></div>
                <div class='flex items-center gap-1.5 shrink-0'><span class='px-2 py-0.5 rounded text-[9px] font-mono font-black ${ck ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}'>${s.status}</span><span class='text-xs text-zinc-400'>${open ? '▴' : '▾'}</span></div>
              </button>
              ${open ? `<div class='px-3 pb-3 pt-2 border-t border-zinc-800/80 space-y-2.5'>
                <ul class='pl-4 space-y-1 list-disc text-xs text-zinc-200 leading-relaxed'>${(s.details || []).map(d => `<li>${esc(d)}</li>`).join('') || '<li>No extra details.</li>'}</ul>
                ${s.link ? `<a href='${esc(s.link)}' target='_blank' rel='noopener noreferrer' class='block px-3 py-2 rounded-lg bg-sky-950 border border-sky-500/40 text-xs font-bold text-sky-300'>Open Reference Link ➔</a>` : ''}
                <div class='flex gap-1.5'><button data-done='${pIdx}|${s.id}' class='flex-1 py-2 rounded-xl text-xs font-black ${ck ? 'bg-zinc-800 text-zinc-200' : 'bg-emerald-600 text-white'}'>${ck ? 'Reopen Step' : '✓ Mark Complete (Syncs Live)'}</button>${bossUi ? `<button data-edst='${pIdx}|${s.id}' class='px-3 py-2 rounded-xl bg-sky-900 text-sky-200 text-xs font-bold'>Edit</button>` : ''}</div>
              </div>` : ''}
            </div>`;
          }).join('') || `<div class='text-[11px] text-zinc-500'>No steps in this filter.</div>`}</div>
        </div>`;
      }).join('')}
      ${bossUi ? `<div class='flex justify-end'><button id='gDelGoal' class='px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-[11px] font-bold'>Delete This Goal</button></div>` : ''}`;
    }

    host.innerHTML = `<div class='max-w-xl mx-auto space-y-3 pb-12'>
      <div class='bg-zinc-900/95 border border-sky-500/40 rounded-2xl p-3 space-y-2.5'>
        <div class='flex items-center justify-between gap-2'><span class='text-[10px] font-mono uppercase tracking-widest text-sky-400'>${bossUi ? 'Boss Goals' : 'Saved Goal Nodes'} (${nodeList.length})</span>${bossUi ? `<div class='flex gap-1.5'><button id='gNewBtn' class='px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-black'>+ Goal</button><button id='gImpBtn' class='px-2 py-1 rounded-lg bg-sky-600 text-white text-[10px] font-black'>+ JSON</button>${!bossGoals.some(g => g.id === 'ASYLUM-980SQFT') ? `<button id='gSeedAsy' class='px-2 py-1 rounded-lg bg-amber-500 text-zinc-950 text-[10px] font-black'>+ Seed Asylum</button>` : ''}</div>` : `<button id='cSwitchId' class='px-2 py-1 rounded-lg bg-zinc-800 text-[10px] font-bold text-sky-300'>${myVault ? 'Switch ID / Add Code' : 'Enter Crew ID'}</button>`}</div>
        <div class='flex flex-wrap gap-1.5'>${nodeList.map(n => `<button data-pickg='${esc(n.id)}' class='px-2.5 py-1.5 rounded-xl border text-[11px] font-black truncate max-w-[200px] ${n.id === activeGoalId ? 'bg-sky-600/30 border-sky-400 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-300'}'>${esc(n.title)}</button>`).join('') || `<span class='text-[11px] text-zinc-500'>${bossUi ? 'Tap + Seed Asylum or + JSON to create your first Goal Bundle.' : 'Enter your personal Crew ID or a Goal Code below.'}</span>`}</div>
        ${!bossUi && (!myVault || window.__hbShowCodeBox) ? `<div class='pt-2 border-t border-zinc-800 space-y-2'><div class='flex gap-2'><input id='cCodeIn' value='${esc(myCrewId)}' placeholder='Paste Crew ID (AVERY-...) or Goal Code' class='flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono uppercase text-white'><button id='cCodeGo' class='px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-black'>Load</button></div>${err ? `<div class='text-[11px] font-mono text-rose-400'>${esc(err)}</div>` : ''}</div>` : ''}
      </div>
      ${goalBody || `<div class='p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800 text-center text-xs text-zinc-400'>${bossUi ? 'Select a Goal above or tap + Seed Asylum to get started.' : 'Blank canvas. Enter your Crew ID from Boss to load your assigned Goals, 3D Room Holograms, and private Estimated Cut.'}</div>`}
    </div>`;

    host.querySelectorAll('[data-pickg]').forEach(b => b.onclick = () => selectGoal(b.dataset.pickg));
    if ($('gSeedAsy')) $('gSeedAsy').onclick = async () => { const a = makeAsylumStarter(); await setDoc(doc(db, 'hb_goals', a.id), a); selectGoal(a.id); };
    if ($('gImpBtn')) $('gImpBtn').onclick = openImportJsonModal;
    if ($('gNewBtn')) $('gNewBtn').onclick = async () => { const t = prompt('New Goal Title:'); if (!t) return; const id = genToken(t.split(' ')[0]); await setDoc(doc(db, 'hb_goals', id), { id, title: t.trim(), subtitle: 'Custom Goal Bundle', phases: [{ id: 'p1', code: 'PHASE 1', title: 'Setup & Prep', obj: '', steps: [] }], holos: [{ id: 'r1', name: 'Main Room', wFt: 20, lFt: 25, hFt: 10, scanUrl: '', scaleFtPerUnit: 10, pins: [] }], updatedAt: Date.now() }); selectGoal(id); };
    if ($('cSwitchId')) $('cSwitchId').onclick = () => { window.__hbShowCodeBox = !window.__hbShowCodeBox; renderGoals(); };
    if ($('cCodeGo')) $('cCodeGo').onclick = async () => {
      const raw = $('cCodeIn').value.trim().toUpperCase(); if (!raw) return;
      const vSnap = await getDoc(doc(db, 'hb_crew_vault', raw));
      if (vSnap.exists()) { window.__hbShowCodeBox = false; connectCrewVault(raw, false); return; }
      const gSnap = await getDoc(doc(db, 'hb_goals', raw));
      if (gSnap.exists()) { if (!guestCodes.includes(raw)) { guestCodes.unshift(raw); localStorage.setItem(GUEST_GOALS_KEY, JSON.stringify(guestCodes)); } window.__hbShowCodeBox = false; selectGoal(raw); return; }
      renderGoals('No Crew ID or Goal Code matched: ' + raw);
    };
    if ($('gOpenHolo')) $('gOpenHolo').onclick = () => setPrimaryTab('holo');
    if ($('gShareBtn')) $('gShareBtn').onclick = openShareGoalModal;
    if ($('gTramexIn')) $('gTramexIn').onchange = async e => { await updateDoc(doc(db, 'hb_goals', activeGoal.id), { tramex: e.target.value.trim(), updatedAt: Date.now() }); };
    if ($('gOvrGate')) $('gOvrGate').onclick = () => { overrideGate = true; renderGoals(); };
    host.querySelectorAll('.sf-b').forEach(b => b.onclick = () => { stepFilter = b.dataset.sf; renderGoals(); });
    host.querySelectorAll('[data-exp]').forEach(b => b.onclick = () => { const id = b.dataset.exp; if (expanded.has(id)) expanded.delete(id); else expanded.add(id); renderGoals(); });
    host.querySelectorAll('[data-done]').forEach(b => b.onclick = async () => {
      const [pi, sid] = b.dataset.done.split('|');
      const phases = JSON.parse(JSON.stringify(activeGoal.phases || []));
      const st = phases[Number(pi)]?.steps?.find(x => x.id === sid); if (!st) return;
      const next = st.status === 'DONE' ? 'OPEN' : 'DONE';
      st.status = next; st.doneBy = next === 'DONE' ? actorName() : ''; st.doneAt = next === 'DONE' ? Date.now() : 0;
      await updateDoc(doc(db, 'hb_goals', activeGoal.id), { phases, updatedAt: Date.now() });
    });
    host.querySelectorAll('[data-addst]').forEach(b => b.onclick = () => openStepModal(Number(b.dataset.addst), null));
    host.querySelectorAll('[data-edst]').forEach(b => b.onclick = () => { const [pi, sid] = b.dataset.edst.split('|'); const st = activeGoal.phases[Number(pi)]?.steps?.find(x => x.id === sid); if (st) openStepModal(Number(pi), st); });
    if ($('gAddPhase')) $('gAddPhase').onclick = async () => { const t = prompt('New Phase Title:'); if (!t) return; const phases = [...(activeGoal.phases || []), { id: 'p_' + Date.now(), code: 'PHASE ' + ((activeGoal.phases?.length || 0) + 1), title: t.trim(), obj: '', steps: [] }]; await updateDoc(doc(db, 'hb_goals', activeGoal.id), { phases, updatedAt: Date.now() }); };
    if ($('gDelGoal')) $('gDelGoal').onclick = async () => { if (confirm('Delete Goal ' + activeGoal.title + '?')) { await deleteDoc(doc(db, 'hb_goals', activeGoal.id)); selectGoal(''); } };
  }

  function renderBossCuts() {
    const host = $('view-cuts'); if (!host || !inBossUi()) return;
    const gId = activeGoalId || bossGoals[0]?.id || '';
    const gObj = bossGoals.find(x => x.id === gId);
    const fin = bossFinances[gId] || { grossTake: 0, overhead: 0, cuts: {} };
    const net = Math.max(0, (Number(fin.grossTake) || 0) - (Number(fin.overhead) || 0));
    let allocated = 0;
    const rows = crewRoster.map(c => {
      const entry = fin.cuts?.[c.crewId] || { pct: 0, fixed: 0, assigned: (c.assignedGoals || []).some(g => g.goalId === gId) };
      const est = entry.fixed > 0 ? Number(entry.fixed) : Math.round(net * (Number(entry.pct) || 0) / 100);
      if (entry.assigned) allocated += est;
      return { ...c, entry, est };
    });
    host.innerHTML = `<div class='max-w-xl mx-auto space-y-3 pb-12'>
      <div class='bg-zinc-900/95 border border-sky-500/40 rounded-2xl p-3.5 space-y-2.5'>
        <div class='flex items-center justify-between'><span class='text-xs font-black uppercase text-sky-300'>Crew Roster &amp; Private IDs</span><button id='crAddBtn' class='px-3 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-black'>+ New Crew ID</button></div>
        <div class='space-y-1.5'>${crewRoster.map(c => `<div class='p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2'><div class='min-w-0'><div class='text-xs font-black text-white truncate'>${esc(c.name)} <span class='text-[10px] text-zinc-400 font-normal'>${esc(c.role || '')}</span></div><div class='text-[10px] font-mono text-sky-400'>${esc(c.crewId)} • ${(c.assignedGoals || []).length} Goals</div></div><div class='flex gap-1 shrink-0'><button data-cpcr='${esc(c.crewId)}' class='px-2 py-1 rounded-lg bg-sky-700 text-white text-[10px] font-black'>Copy Link</button><button data-pvcr='${esc(c.crewId)}' class='px-2 py-1 rounded-lg bg-emerald-700 text-white text-[10px] font-black'>Preview</button><button data-dlcr='${esc(c.crewId)}' class='px-2 py-1 rounded-lg bg-rose-950 text-rose-300 text-[10px] font-bold'>✕</button></div></div>`).join('') || `<div class='text-xs text-zinc-500'>Tap + New Crew ID to add your first crew member.</div>`}</div>
      </div>
      ${gObj ? `<div class='bg-zinc-900/95 border border-emerald-500/45 rounded-2xl p-3.5 space-y-3'>
        <div class='flex items-center justify-between gap-2'><span class='text-xs font-black uppercase text-emerald-300'>Boss-Only Budget &amp; Private Cuts</span><select id='finGoalSel' class='bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-[11px] font-bold text-white max-w-[180px]'>${bossGoals.map(g => `<option value='${esc(g.id)}' ${g.id === gId ? 'selected' : ''}>${esc(g.title)}</option>`).join('')}</select></div>
        <div class='grid grid-cols-2 gap-2'>
          <label class='text-[10px] text-zinc-400'>Gross Take ($) [Boss Only]<input id='finGross' type='number' value='${fin.grossTake || ''}' class='mt-1 w-full bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-2 text-sm font-mono text-white'></label>
          <label class='text-[10px] text-zinc-400'>Materials / Overhead ($)<input id='finOver' type='number' value='${fin.overhead || ''}' class='mt-1 w-full bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-2 text-sm font-mono text-white'></label>
        </div>
        <div class='p-2.5 rounded-xl bg-black/70 border border-emerald-500/35 flex items-center justify-between text-xs font-mono'><span class='text-zinc-300'>Net Pool: <strong class='text-emerald-400'>${fmtMoney(net)}</strong></span><span class='text-zinc-300'>Boss Left: <strong class='text-amber-300'>${fmtMoney(net - allocated)}</strong></span></div>
        <div class='space-y-2'>${rows.map(r => `<div class='p-2.5 rounded-xl bg-zinc-950 border ${r.entry.assigned ? 'border-emerald-500/45' : 'border-zinc-800'} space-y-2'>
          <div class='flex items-center justify-between gap-2'><label class='flex items-center gap-2 text-xs font-black text-white'><input type='checkbox' data-fa='${esc(r.crewId)}' ${r.entry.assigned ? 'checked' : ''} class='w-4 h-4 accent-emerald-500'>${esc(r.name)}</label><span class='text-sm font-mono font-black text-emerald-400'>${r.entry.assigned ? fmtMoney(r.est) + ' est.' : 'Not Assigned'}</span></div>
          <div class='grid grid-cols-2 gap-2'><label class='text-[10px] text-zinc-400'>% of Net Pool<input type='number' step='0.5' data-fp='${esc(r.crewId)}' value='${r.entry.pct || ''}' placeholder='e.g. 20' class='mt-0.5 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs font-mono text-white'></label><label class='text-[10px] text-zinc-400'>OR Fixed Est ($)<input type='number' data-ff='${esc(r.crewId)}' value='${r.entry.fixed || ''}' placeholder='overrides %' class='mt-0.5 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs font-mono text-white'></label></div>
        </div>`).join('')}</div>
        <button id='finPushBtn' class='w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black'>Save &amp; Push Private Cuts to Crew Vaults</button>
        <div class='text-[10px] text-zinc-400 text-center'>Each crew member ONLY receives their own estimated dollar payout—never Gross, Overhead, or other crew cuts.</div>
      </div>` : ''}
    </div>`;

    $('crAddBtn').onclick = async () => {
      const name = prompt('Crew Member Name (e.g. Avery, Jon):'); if (!name) return;
      const role = prompt('Role (optional, e.g. Lead Installer):') || '';
      const cid = genToken(name);
      await setDoc(doc(db, 'hb_crew_vault', cid), { crewId: cid, name: name.trim(), role: role.trim(), assignedGoals: [], updatedAt: Date.now() });
    };
    host.querySelectorAll('[data-cpcr]').forEach(b => b.onclick = () => { const u = `${location.origin}${location.pathname}?crew=${b.dataset.cpcr}`; navigator.clipboard?.writeText(u); alert(`Private Crew Link Copied!\nID: ${b.dataset.cpcr}\n${u}`); });
    host.querySelectorAll('[data-pvcr]').forEach(b => b.onclick = () => { connectCrewVault(b.dataset.pvcr, true); setPrimaryTab('goals'); });
    host.querySelectorAll('[data-dlcr]').forEach(b => b.onclick = async () => { if (confirm('Revoke & delete Crew ID ' + b.dataset.dlcr + '?')) await deleteDoc(doc(db, 'hb_crew_vault', b.dataset.dlcr)); });
    if ($('finGoalSel')) $('finGoalSel').onchange = e => { selectGoal(e.target.value); renderBossCuts(); };
    if ($('finPushBtn')) $('finPushBtn').onclick = async () => {
      const grossTake = Number($('finGross').value) || 0, overhead = Number($('finOver').value) || 0;
      const netPool = Math.max(0, grossTake - overhead), cuts = {};
      for (const c of crewRoster) {
        const assigned = !!host.querySelector(`[data-fa="${c.crewId}"]`)?.checked;
        const pct = Number(host.querySelector(`[data-fp="${c.crewId}"]`)?.value) || 0;
        const fixed = Number(host.querySelector(`[data-ff="${c.crewId}"]`)?.value) || 0;
        const estCut = fixed > 0 ? fixed : Math.round(netPool * pct / 100);
        cuts[c.crewId] = { assigned, pct, fixed, estCut };
        let list = (c.assignedGoals || []).filter(g => g.goalId !== gId);
        if (assigned) list.unshift({ goalId: gId, title: gObj.title, estCut, pct: fixed > 0 ? 0 : pct });
        await setDoc(doc(db, 'hb_crew_vault', c.crewId), { ...c, assignedGoals: list, updatedAt: Date.now() });
      }
      await setDoc(doc(db, 'hb_boss_finances', gId), { grossTake, overhead, cuts, updatedAt: Date.now() });
      alert('Saved Boss financials & pushed private estimated cuts to assigned Crew IDs!');
    };
  }

  function wireNav() {
    $('hbPrimaryNav').addEventListener('click', e => { const b = e.target.closest('.ptab-btn'); if (b) setPrimaryTab(b.dataset.ptab); });
    $('hbToolsToggle').onclick = () => $('hbLegacyBar').classList.toggle('hidden');
    $('mainTabs').addEventListener('click', e => {
      const b = e.target.closest('.tab-btn'); if (!b || !inBossUi()) return;
      const k = b.dataset.tab;
      document.querySelectorAll('main > section').forEach(s => s.classList.toggle('hidden', s.id !== 'view-' + k));
      if (k === 'board') window.HeistBoard?.renderAll?.();
    });
  }

  wireNav();
  const params = new URLSearchParams(location.search);
  const urlCrew = params.get('crew'), urlGoal = params.get('goal') || params.get('code');
  onAuthStateChanged(auth, u => {
    user = u; isBoss = !!(u?.email && u.email.toLowerCase() === BOSS);
    updateChrome();
    if (isBoss) {
      previewCrewId = ''; startBossStreams(); setPrimaryTab('goals');
    } else {
      bossUnsubs.forEach(fn => { try { fn(); } catch {} }); bossUnsubs = [];
      if (urlCrew) connectCrewVault(urlCrew, false);
      else if (myCrewId) connectCrewVault(myCrewId, false);
      if (urlGoal) {
        const g = urlGoal.trim().toUpperCase();
        if (!guestCodes.includes(g)) { guestCodes.unshift(g); localStorage.setItem(GUEST_GOALS_KEY, JSON.stringify(guestCodes)); }
        selectGoal(g);
      }
      setPrimaryTab('goals');
    }
  });
})();