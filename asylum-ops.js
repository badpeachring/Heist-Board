(() => {
  if (window.__hbAsylumVer === 4) return;
  window.__hbAsylumVer = 4;
  const STORE = 'hb_asylum_masonic_v3';
  const $ = id => document.getElementById(id);

  const PHASES = [
    {
      id: 'p1', code: 'PHASE 1', title: 'Permanent Wood Screed Strip Installation',
      obj: 'Install a permanent, level wood screed rail along all exterior brick/stone walls flush with the clean interior slab height.',
      steps: [
        { id: '1.1', title: 'Laser Level & Chalk Line', details: ['Set laser level to exact top elevation of clean interior concrete slab.', 'Transfer height marks to all brick/stone exterior walls at corners and every 10-15 ft.', 'Snap a continuous chalk line around the room perimeter.'] },
        { id: '1.2', title: 'Drop Depth Check & Table Saw Ripping', details: ['Measure vertically from chalk line down to highest rocky subfloor points every 5-10 ft.', 'Drop >= 1-1/2": Rip 2x4s lengthwise into 3/4" x 1-1/2" strips (4 strips/board).', 'Drop < 1-1/2" (e.g. 1"): Rip 3-1/2" face down to 1" first, then split in half for 3/4" x 1" strips.'] },
        { id: '1.3', title: 'Permanent Wall Anchoring', details: ['Align top edge of wood strip directly on chalk line with flat 3/4" face against wall.', 'Drive 2-1/2" Grip-Rite steel cut masonry nails into mortar joints only (angled slightly downward) every 18"-24". Never nail brick/stone faces.', 'Where mortar joints miss, pack wet VersaBond thinset behind strip to bond to wall.', 'Leave wood strips buried permanently for Tufflex VRP-111 & liquid rubber encapsulation.'] }
      ]
    },
    {
      id: 'p2', code: 'PHASE 2', title: 'Water Staging, Bonding Slurry & Concrete Patching',
      obj: 'Stage 3rd-floor water supply, then fill all ~450-500 sq ft rough perimeter areas (~1" avg, 2"-4" pockets) flush with interior slab and wood screed strips.',
      steps: [
        { id: '2.0', tag: 'WATER', title: 'Stage 3rd-Floor Water Supply & Washout Station', details: ['Stage 65-102 gal total clean water BEFORE opening bags (70-90 bags Quikrete = 44-68 gal; 4-6 bags VersaBond = 5.5-9 gal; washout = 15-25 gal).', 'Mark pitchers: 2.5-3 qt (80-96 oz) for Quikrete and 5.5-6 qt for VersaBond.', 'Keep 2 full 5-gal rinse buckets active so tubs, paddles, and trowels never seize.', 'CRITICAL: Keep ALL fans OFF during slurry scrub and concrete pour to prevent flash-skinning and shrinkage cracks.'] },
        { id: '2.1', title: 'Floor Prep & Masking', details: ['HEPA-vacuum all loose dust, rocks, and delaminated debris from perimeter.', 'Mask clean interior concrete edge with 0.31 mil HDX painter\'s plastic and ScotchBlue tape.'] },
        { id: '2.2', title: 'Thinset Bonding Scrub Coat (VersaBond 50 lb. Gray)', details: ['Ratio: ~5.5-6 qts clean water per 50 lb. bag to thick pancake-batter slurry; slake 5-10 min & re-mix.', 'APPLICATION RULE: Scrub thin coat immediately ahead of concrete pour; place concrete within 15-20 min while wet/tacky.', 'Feather shallow 1/4"-3/4" spots flush using standard trowel-consistency VersaBond.'] },
        { id: '2.3', title: 'Fast-Setting Concrete Pour (Quikrete #100450 50 lb.)', details: ['Ratio: 2.5-3 qts (80-96 oz) clean water per 50 lb. bag mixed stiff (zero soupy bleed water) in drum mixer or large black mixing tub.', 'Working Time: 20-40 min per batch.', 'Pour onto wet thinset scrub coat, tamp firmly into 2"-4" pockets, and pull straight 2x4 screed across interior slab + exterior wood strip dead-flush.'] },
        { id: '2.4', title: 'Walkable Set Hold (2-4 Hours)', details: ['Allow fast-setting concrete to reach initial walkable set (2-4 hrs) before aiming direct fans so surface does not craze.'] },
        { id: '2.5', tag: 'FANS', title: 'SETUP FANS & Dehumidifiers (Forced Drying Gate <= 4.5%)', details: ['Run high-velocity box fans and dehumidifiers across the patched perimeter for 48-72 hours.', 'MANDATORY GATE: Continue forced drying until Tramex concrete moisture impedance readings drop to <= 4.5% across all patched areas.'] }
      ]
    },
    {
      id: 'p3', code: 'PHASE 3', title: 'Wall Scraping, Woodwork Patching & Wall Painting',
      obj: 'Complete all dusty and overhead/vertical finishing before opening floor coating materials (ceiling excluded).',
      steps: [
        { id: '3.1', title: 'Wall Scraping', details: ['Scrape all loose paint, flaking plaster, and efflorescence from brick/stone and wall surfaces onto masked floor.', 'Keep fans OFF while scraping to avoid blowing dust airborne.'] },
        { id: '3.2', title: 'Wood Board & Wall Patching', details: ['Patch and repair damaged wood trim, baseboards, casings, and wall holes/cracks; sand smooth and spot-prime.'] },
        { id: '3.2b', tag: 'FANS', title: 'SETUP FANS (Accelerate Woodwork & Primer Dry)', details: ['Aim fans across patched drywall, wood filler, and primed trim to speed sanding window.', 'Turn fans OFF right before applying finish wall paint.'] },
        { id: '3.3', title: 'Wall Painting (Ceiling Excluded)', details: ['Mask ceiling line and floor edges.', 'Apply finish paint coats to all walls (do NOT paint ceiling).'] },
        { id: '3.4', tag: 'FANS', title: 'SETUP FANS (Wall Paint Cure) & Full Room Cleanup', details: ['Run indirect circulation fans until wall paint dries cleanly.', 'Remove floor plastic/tape once dry; sweep and HEPA-vacuum the entire 47\' x 65\' (3,055 sq ft) floor thoroughly.'] }
      ]
    },
    {
      id: 'p4', code: 'PHASE 4', title: 'Floor Layout, Tufflex VRP-111, Liquid Rubber & Checkerboard',
      lockedBy: ['p2', 'p3'],
      obj: 'NO DRYLOK. Prime bare dry concrete + screed strips with Tufflex VRP-111, build 9\'/11\' liquid rubber border (1,750 sq ft), and paint centered 29\' x 45\' (1,305 sq ft) checkerboard.',
      steps: [
        { id: '4.1_lay', title: 'Floor Layout & Chalk Lines (9\' / 11\' Asymmetric Border)', details: ['Measure 9 ft (108") inward from three walls and 11 ft (132") inward from feature/entry wall. Snap crisp border chalk lines.', 'Rubber Border Area: 1,750 sq ft total (encapsulates concrete patch, wood screed strips, and overlaps onto clean interior slab).', 'Central Checkerboard Area: 29\' x 45\' (1,305 sq ft) net interior rectangle. Snap centered 4\' x 4\' grid across interior zone.'] },
        { id: '4.2_prep', title: 'Mechanical Surface Prep (Full 3,055 sq ft Floor)', details: ['Mechanically grind/abrade clean concrete areas (inside 9\'/11\' border overlap and 29\' x 45\' checkerboard zone) to open pores.', 'HEPA-vacuum the entire 3,055 sq ft floor completely dust-free.'] },
        { id: '4.3_vrp', title: 'Moisture-Mitigation Epoxy Primer (Tufflex VRP-111 - NO DRYLOK)', details: ['PREREQUISITE GATE: Confirm concrete patch moisture is <= 4.5% on Tramex meter.', 'PRODUCT RULE: Do NOT use DRYLOK Extreme. Mask 9\'/11\' border line (or prime full floor per spec) and roll Tufflex VRP-111 directly onto bare, dry concrete patch, wood screed strips, and ground slab.', 'Observe manufacturer recoat window before applying base coat.'] },
        { id: '4.4_rub', title: 'Liquid Rubber Border Installation (1,750 sq ft)', details: ['Within VRP-111 recoat window, apply ELASTA-TUFF 5000 / SYD-BASECOAT and build up 1/4" liquid rubber (or 3/8" rubber-granule slurry) across 9\'/11\' border zone.', 'Finish entire 1,750 sq ft rubber border in solid black aliphatic topcoat. Pull edge tape cleanly before full cure.'] },
        { id: '4.4b_fan', tag: 'FANS', title: 'SETUP FANS (Indirect Airflow Between Border Coats)', details: ['Use indirect high-level cross-ventilation fans only (NEVER blast wet polyurethane/aliphatic resin directly).'] },
        { id: '4.5_chk', title: 'Central Checkerboard Painting (29\' x 45\' / 1,305 sq ft)', details: ['Roll 2 coats white floor coating across entire 29\' x 45\' zone; run indirect fans so white cures hard before taping.', 'Mask alternating 4\' x 4\' squares with burnished ScotchBlue tape.', 'Roll 2 coats black floor coating onto alternating squares; pull tape immediately before skinning over.'] },
        { id: '4.6_wear', tag: 'FANS', title: 'Final Clear Wear Coat, SETUP FANS & Event Cure Gate', details: ['Roll clear aliphatic polyurethane/polyaspartic topcoat across checkerboard (or entire floor) to lock in sheen and event traffic durability.', 'Maintain indirect airflow during cure.', 'CURE GATE: 24 hrs min light foot traffic; 48-72 hrs heavy event furniture/staging load-in.'] }
      ]
    }
  ];

  let state = (() => {
    try { return { done: {}, cBags: 80, vBags: 5, wGal: 20, tramex: '', ...JSON.parse(localStorage.getItem(STORE) || '{}') }; }
    catch { return { done: {}, cBags: 80, vBags: 5, wGal: 20, tramex: '' }; }
  })();
  let overrideLock = false;
  const save = () => localStorage.setItem(STORE, JSON.stringify(state));

  function calcStats() {
    const all = PHASES.flatMap(p => p.steps);
    const done = all.filter(s => state.done[s.id]).length;
    const p2Done = PHASES[1].steps.every(s => state.done[s.id]);
    const p3Done = PHASES[2].steps.every(s => state.done[s.id]);
    const tVal = state.tramex === '' ? NaN : Number(state.tramex);
    const tramexOk = !Number.isNaN(tVal) && tVal > 0 && tVal <= 4.5;
    return { total: all.length, done, pct: Math.round((done / all.length) * 100), tramexOk, p4Unlocked: (p2Done && p3Done && tramexOk) || overrideLock };
  }

  function calcWater() {
    const cb = Number(state.cBags) || 80, vb = Number(state.vBags) || 5, wg = Number(state.wGal) || 20;
    const cLo = (cb * 2.5) / 4, cHi = (cb * 3.0) / 4, vLo = (vb * 5.5) / 4, vHi = (vb * 6.0) / 4;
    const tLo = cLo + vLo + wg, tHi = cHi + vHi + wg;
    return { cb, vb, wg, cQt: `${Math.round(cb * 2.5)}-${Math.round(cb * 3)} qt`, cGal: `${cLo.toFixed(1)}-${cHi.toFixed(1)} gal`, vGal: `${vLo.toFixed(1)}-${vHi.toFixed(1)} gal`, tGal: `${Math.round(tLo)}-${Math.round(tHi)} gal`, buckets: `${Math.ceil(tLo / 5)}-${Math.ceil(tHi / 5)} (5-gal)`, lbs: `${Math.round(tLo * 8.34).toLocaleString()}-${Math.round(tHi * 8.34).toLocaleString()} lbs` };
  }

  function renderBlueprintSvg() {
    const cells = [];
    for (let r = 0; r < 7; r++) for (let c = 0; c < 11; c++) cells.push(`<rect x='${66 + c * 22}' y='${54 + r * 22}' width='22' height='22' fill='${(r + c) % 2 === 0 ? '#18181b' : '#f4f4f5'}'/>`);
    return `<svg viewBox='0 0 360 262' class='w-full rounded-xl border border-amber-500/35 bg-[#09090b]'><rect x='10' y='10' width='340' height='242' fill='#1c1917' stroke='#dc2626' stroke-width='3'/><rect x='14' y='14' width='332' height='234' fill='none' stroke='#f59e0b' stroke-width='1.5' stroke-dasharray='5,3'/><rect x='66' y='54' width='242' height='154' fill='#27272a' stroke='#38bdf8' stroke-width='1.5'/>${cells.join('')}<text x='187' y='30' text-anchor='middle' fill='#fca5a5' font-size='9' font-family='monospace' font-weight='bold'>9 FT RUBBER BORDER (3 WALLS) • VRP-111 + ELASTA-TUFF</text><text x='38' y='133' text-anchor='middle' fill='#fde047' font-size='9' font-family='monospace' font-weight='bold' transform='rotate(-90 38 133)'>11 FT ENTRY WALL</text><rect x='118' y='112' width='138' height='36' rx='6' fill='rgba(9,9,11,0.88)' stroke='#38bdf8'/><text x='187' y='127' text-anchor='middle' fill='#f8fafc' font-size='9.5' font-family='sans-serif' font-weight='900'>29' x 45' CHECKERBOARD</text><text x='187' y='140' text-anchor='middle' fill='#38bdf8' font-size='8.5' font-family='monospace'>1,305 SQ FT • 4'x4' GRID</text><text x='187' y='234' text-anchor='middle' fill='#a1a1aa' font-size='8.5' font-family='monospace'>WACO TX • 47' x 65' (3,055 SQ FT) • BORDER: 1,750 SQ FT</text></svg>`;
  }

  function renderAsylum() {
    const host = $('view-asylum');
    if (!host) return;
    const st = calcStats(), w = calcWater();
    host.innerHTML = `<div class='max-w-xl mx-auto space-y-3 pb-10'>
      <div class='bg-zinc-900/95 border border-rose-500/40 rounded-2xl p-3 space-y-2.5'>
        <div class='flex items-start justify-between gap-2'>
          <div><div class='text-[10px] font-mono uppercase tracking-widest text-rose-400'>Masonic Lodge • Waco, TX • 3rd Floor (47' x 65')</div><div class='text-base font-black text-white'>THE ASYLUM — MASTER SPEC v3</div></div>
          <button id='asyOpenCadBtn' class='px-2.5 py-1.5 rounded-xl bg-emerald-600/25 border border-emerald-400/50 text-emerald-200 text-[10px] font-black shrink-0'>3D Material Plane</button>
        </div>
        <div class='p-2 rounded-xl bg-amber-950/45 border border-amber-500/45 text-[10px] font-mono text-amber-200'><strong>COMPATIBILITY RULE:</strong> NO DRYLOK Extreme. Apply Tufflex VRP-111 directly on bare, ground/dry concrete &amp; wood screed strips once Tramex &lt;= 4.5%.</div>
        <div class='flex items-center justify-between text-xs'><span class='font-black text-amber-300'>Progress: ${st.done}/${st.total} Steps (${st.pct}%)</span><span class='font-mono text-[10px] ${st.tramexOk ? 'text-emerald-400' : 'text-rose-400'}'>Tramex: ${state.tramex === '' ? 'Not Logged' : state.tramex + '%'}</span></div>
        <div class='w-full h-2.5 rounded-full bg-zinc-950 overflow-hidden border border-zinc-800'><div class='h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400' style='width:${st.pct}%'></div></div>
        ${renderBlueprintSvg()}
        <div class='grid grid-cols-3 gap-1.5 text-center'>
          <div class='p-2 rounded-xl bg-zinc-950 border border-zinc-800'><div class='text-[10px] text-zinc-400'>Perimeter Patch</div><div class='text-xs font-black text-amber-300'>~475 sq ft</div></div>
          <div class='p-2 rounded-xl bg-zinc-950 border border-zinc-800'><div class='text-[10px] text-zinc-400'>Rubber Border</div><div class='text-xs font-black text-rose-300'>1,750 sq ft</div></div>
          <div class='p-2 rounded-xl bg-zinc-950 border border-zinc-800'><div class='text-[10px] text-zinc-400'>Checkerboard</div><div class='text-xs font-black text-cyan-300'>1,305 sq ft</div></div>
        </div>
      </div>
      <div class='bg-zinc-900/95 border border-emerald-500/40 rounded-2xl p-3 flex items-center justify-between gap-2'>
        <div><div class='text-xs font-black text-emerald-300'>Tramex Moisture Gate (&lt;= 4.5%)</div><div class='text-[10px] text-zinc-400'>Log highest perimeter patch reading to unlock Phase 4</div></div>
        <input id='asyTramexIn' type='number' step='0.1' min='0' max='15' value='${state.tramex}' placeholder='e.g. 4.2' class='w-20 bg-zinc-950 border ${st.tramexOk ? 'border-emerald-400 text-emerald-300' : 'border-rose-500 text-rose-200'} rounded-lg px-2 py-1.5 text-xs font-mono text-center'>
      </div>
      <div class='bg-zinc-900/95 border border-sky-500/45 rounded-2xl p-3 space-y-2.5'>
        <div class='flex items-center justify-between gap-2'><div><div class='text-xs font-black text-sky-300 uppercase'>3rd-Floor Water &amp; Mix Calculator</div><div class='text-[10px] text-zinc-400'>Quikrete #100450 + VersaBond + Washout</div></div><span class='px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-[10px] font-mono font-black text-sky-200'>${w.tGal}</span></div>
        <div class='grid grid-cols-3 gap-2'>
          <label class='text-[10px] text-zinc-300 font-bold'>Quikrete: <span class='text-sky-300 font-mono'>${w.cb}</span><input id='asyCBags' type='range' min='50' max='110' step='5' value='${w.cb}' class='w-full accent-sky-400 mt-1'></label>
          <label class='text-[10px] text-zinc-300 font-bold'>VersaBond: <span class='text-sky-300 font-mono'>${w.vb}</span><input id='asyVBags' type='range' min='2' max='10' step='1' value='${w.vb}' class='w-full accent-sky-400 mt-1'></label>
          <label class='text-[10px] text-zinc-300 font-bold'>Washout: <span class='text-sky-300 font-mono'>${w.wg}g</span><input id='asyWGal' type='range' min='10' max='35' step='5' value='${w.wg}' class='w-full accent-sky-400 mt-1'></label>
        </div>
        <div class='grid grid-cols-2 gap-1.5 text-[11px] font-mono bg-zinc-950 border border-zinc-800 rounded-xl p-2.5'>
          <div class='text-zinc-300'>Concrete: <span class='text-sky-300 font-bold'>${w.cGal}</span> (${w.cQt})</div>
          <div class='text-zinc-300'>VersaBond: <span class='text-sky-300 font-bold'>${w.vGal}</span></div>
          <div class='text-zinc-300'>Buckets: <span class='text-amber-300 font-bold'>${w.buckets}</span></div>
          <div class='text-zinc-300'>Water Load: <span class='text-rose-300 font-bold'>${w.lbs}</span></div>
        </div>
      </div>
      ${PHASES.map(ph => {
        const pDone = ph.steps.filter(s => state.done[s.id]).length;
        const isLocked = ph.id === 'p4' && !st.p4Unlocked;
        return `<div class='bg-zinc-900/95 border ${isLocked ? 'border-rose-500/50' : pDone === ph.steps.length ? 'border-emerald-500/50' : 'border-zinc-800'} rounded-2xl p-3 space-y-2.5'>
          <div><span class='px-2 py-0.5 rounded bg-rose-500/20 border border-rose-400/40 text-[10px] font-mono font-black text-rose-300'>${ph.code} • ${pDone}/${ph.steps.length}</span><h3 class='text-sm font-black text-white mt-1'>${ph.title}</h3><p class='text-[11px] text-zinc-400 mt-0.5'>${ph.obj}</p></div>
          ${isLocked ? `<div class='p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-[11px] text-rose-200 flex items-center justify-between gap-2'><span><strong>HARD SEQUENCING GATE:</strong> Finish Phase 2, Phase 3 (walls), AND Tramex &lt;= 4.5% first.</span><button id='hbAsyUnlock' class='px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-black shrink-0'>Override</button></div>` : ''}
          <div class='space-y-2 ${isLocked ? 'opacity-50' : ''}'>${ph.steps.map(s => {
            const ck = !!state.done[s.id];
            const tagBadge = s.tag === 'FANS' ? `<span class='px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/50 text-[9px] font-mono font-black text-cyan-300 shrink-0'>AIRFLOW / FANS</span>` : s.tag === 'WATER' ? `<span class='px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/50 text-[9px] font-mono font-black text-sky-300 shrink-0'>WATER STAGE</span>` : '';
            return `<div data-step='${s.id}' class='p-2.5 rounded-xl border cursor-pointer ${ck ? 'bg-emerald-950/30 border-emerald-500/40' : s.tag === 'FANS' ? 'bg-cyan-950/20 border-cyan-500/35' : s.tag === 'WATER' ? 'bg-sky-950/25 border-sky-500/40' : 'bg-zinc-950/90 border-zinc-800'}'><div class='flex items-center justify-between gap-2'><div class='flex items-center gap-2 min-w-0'><input type='checkbox' ${ck ? 'checked' : ''} class='w-4 h-4 accent-emerald-500 pointer-events-none shrink-0'><span class='text-xs font-black ${ck ? 'line-through text-emerald-300' : 'text-white'}'>${s.id.split('_')[0]} • ${s.title}</span></div>${tagBadge}</div><ul class='mt-1.5 pl-6 space-y-1 list-disc text-[11px] text-zinc-300'>${s.details.map(d => `<li>${d}</li>`).join('')}</ul></div>`;
          }).join('')}</div>
        </div>`;
      }).join('')}
    </div>`;
    $('asyTramexIn').onchange = e => { state.tramex = e.target.value.trim(); save(); renderAsylum(); };
    $('asyCBags').oninput = e => { state.cBags = Number(e.target.value); save(); renderAsylum(); };
    $('asyVBags').oninput = e => { state.vBags = Number(e.target.value); save(); renderAsylum(); };
    $('asyWGal').oninput = e => { state.wGal = Number(e.target.value); save(); renderAsylum(); };
    $('asyOpenCadBtn').onclick = () => switchTabUnified('cad');
    if ($('hbAsyUnlock')) $('hbAsyUnlock').onclick = () => { overrideLock = true; renderAsylum(); };
    host.querySelectorAll('[data-step]').forEach(el => el.onclick = () => { state.done[el.dataset.step] = !state.done[el.dataset.step]; save(); renderAsylum(); });
  }

  function switchTabUnified(tab) {
    const applyVis = () => {
      const seen = new Set();
      document.querySelectorAll('#mainTabs .tab-btn').forEach(b => {
        const k = b.dataset.tab;
        if (seen.has(k)) { b.remove(); return; }
        seen.add(k);
        const on = k === tab;
        const accent = k === 'cad' ? 'border-emerald-500/50 text-emerald-300' : k === 'asylum' ? 'border-amber-500/50 text-amber-300' : 'border-zinc-800 text-zinc-400';
        b.className = on ? 'tab-btn px-2.5 py-1 rounded-lg bg-rose-500/25 border border-rose-400 text-white text-xs font-black shrink-0' : `tab-btn px-2.5 py-1 rounded-lg bg-zinc-900 border ${accent} text-xs font-bold shrink-0`;
      });
      document.querySelectorAll('main > section').forEach(s => s.classList.toggle('hidden', s.id !== 'view-' + tab));
      if (tab === 'asylum') renderAsylum();
      if (tab === 'cad' && window.HeistBoard?.openCad) window.HeistBoard.openCad();
      if (tab === 'board' && window.HeistBoard?.renderAll) window.HeistBoard.renderAll();
    };
    applyVis();
    requestAnimationFrame(applyVis);
  }

  function init() {
    const nav = $('mainTabs'), main = document.querySelector('main');
    if (!nav || !main) return;
    nav.querySelectorAll('[data-tab="asylum"]').forEach(el => el.remove());
    $('view-asylum')?.remove();
    const btn = document.createElement('button');
    btn.dataset.tab = 'asylum';
    btn.className = 'tab-btn px-2.5 py-1 rounded-lg bg-zinc-900 border border-amber-500/50 text-amber-300 text-xs font-bold shrink-0';
    btn.textContent = 'Asylum Ops';
    nav.appendChild(btn);
    const sec = document.createElement('section');
    sec.id = 'view-asylum';
    sec.className = 'hidden p-3 overflow-y-auto flex-1';
    main.appendChild(sec);
    nav.addEventListener('click', e => { const b = e.target.closest('.tab-btn'); if (b) switchTabUnified(b.dataset.tab); });
    if (window.HeistBoard) window.HeistBoard.switchTab = switchTabUnified;
  }
  init();
})();