(() => {
  if (window.__hbAsylumVer === 5) return;
  window.__hbAsylumVer = 5;
  const STORE = 'hb_asylum_masonic_v4';
  const PREV = 'hb_asylum_masonic_v3';
  const $ = id => document.getElementById(id);

  const MANIFEST = [
    { item: 'Quikrete 50 lb Fast-Setting Concrete (#100450)', qty: '175-180 bags', spec: '~0.375 cu ft/bag • 15% waste • 980 sq ft (~1" avg + 2"-4" holes)' },
    { item: 'Custom Building Products VersaBond 50 lb Gray', qty: '15-16 bags', spec: 'Bonding scrub slurry + 1/4"-3/4" thin feather edges' },
    { item: '2" x 4" x 16\' Southern Yellow Pine Lumber', qty: '14 boards', spec: 'Rip to 3/4" x 1-1/2" or 3/4" x 1" permanent screed rails' },
    { item: 'Grip-Rite 2-1/2" Steel Cut Masonry Nails', qty: '2 boxes (1 lb ea)', spec: 'Mortar joints only every 18"-24" (angled down)' },
    { item: 'HDX 9\' x 400\' 0.31 mil Plastic + ScotchBlue 1.88"x60yd', qty: '2 rolls + 6-pack', spec: 'Center slab masking + checkerboard alternating tape' },
    { item: 'Mixing Tubs (36"x24"x8") / Small Drum Mixer', qty: 'Multi-station', spec: 'Keep dedicated clean rinse tubs to stop fast-set seizure' }
  ];

  const PHASES = [
    {
      id: 'p1', code: 'PHASE 1', title: 'Permanent Wood Screed Strip Installation',
      obj: 'Install a permanent, level wood screed rail along all exterior brick/stone walls flush with the clean interior slab height.',
      steps: [
        { id: '1.1', title: 'Laser Level & Chalk Line', details: ['Set laser level to exact top elevation of clean interior concrete slab.', 'Transfer height marks to all brick/stone exterior walls at corners and every 10-15 ft.', 'Snap a continuous chalk line around the room perimeter.'] },
        { id: '1.2', title: 'Drop Depth Check & Table Saw Ripping (14 SYP Boards)', details: ['Measure vertically from chalk line down to highest rocky subfloor points every 5-10 ft.', 'Drop >= 1-1/2": Rip 2x4s lengthwise into 3/4" x 1-1/2" strips (4 strips per board).', 'Drop < 1-1/2" (e.g., 1"): Rip 3-1/2" face down to 1" first, then split in half for 3/4" x 1" strips.'] },
        { id: '1.3', title: 'Permanent Wall Anchoring', details: ['Align top edge of wood strip directly on chalk line with flat 3/4" face against wall.', 'Drive 2-1/2" Grip-Rite steel cut masonry nails into mortar joints only (angled slightly downward) every 18"-24". Never nail brick/stone faces.', 'Where mortar joints do not align, pack a dab of wet VersaBond thinset behind strip to anchor it.', 'Leave wood strips buried permanently for Tufflex VRP-111 & liquid rubber encapsulation.'] }
      ]
    },
    {
      id: 'p2', code: 'PHASE 2', title: 'Water Staging, Bonding Slurry & Concrete Patching (980 sq ft)',
      obj: 'Stage 3rd-floor water supply, then fill all 980 sq ft of rough perimeter concrete flush with interior slab and wood screed strips.',
      steps: [
        { id: '2.0', tag: 'WATER', title: 'Stage 3rd-Floor Water Supply (165-204 Gal Total)', details: ['Quikrete #100450 (175-180 bags @ 2.5-3.0 qt): 109-135 gal. VersaBond (15-16 bags @ 5.5-6.0 qt): 21-24 gal. Washout reserve: 35-45 gal.', 'Total water weight: 1,376-1,701 lbs (33-41 five-gal buckets or 3-4 55-gal drums / hose feed).', 'Pre-mark fixed measuring pitchers: 2.5-3.0 qt (80-96 oz; bag strict max 6 pt / 3 qt) for Quikrete and 5.5-6.0 qt for VersaBond.', 'CRITICAL: Keep ALL fans OFF during slurry scrub and concrete pour to prevent flash-skinning and shrinkage cracks.'] },
        { id: '2.1', title: 'Floor Prep & Masking (980 sq ft Perimeter)', details: ['HEPA-vacuum all loose dust, rocks, and delaminated debris from the 980 sq ft perimeter.', 'Mask clean interior concrete edge using 0.31 mil HDX painter\'s plastic (2 rolls) and ScotchBlue tape.'] },
        { id: '2.2', title: 'Thinset Bonding Scrub Coat (15-16 Bags VersaBond Gray)', details: ['LOCKED RATIO: 5.5-6.0 qts clean water per 50 lb bag to thick pancake-batter slurry; slake 5-10 min & re-mix.', 'APPLICATION RULE: Scrub thin coat onto vacuumed concrete immediately ahead of pour; concrete MUST be placed within 15-20 min while wet/tacky.', 'Thin Edge Feathering: Use standard trowel-consistency VersaBond to feather shallow 1/4"-3/4" spots flush.'] },
        { id: '2.3', title: 'Fast-Setting Concrete Pour (175-180 Bags Quikrete #100450)', details: ['LOCKED RATIO: 2.5-3.0 qts (80-96 oz) clean water per 50 lb bag mixed stiff (zero bleed water). Bag spec: 4 pt (2 qt) start, 6 pt (3 qt) strict max.', 'WORKING TIME: Mix only what places within 20 min (sets in 20-40 min). Work in manageable quadrants across the 980 sq ft perimeter.', 'Pour onto wet thinset scrub coat, tamp firmly into 2"-4" deep pockets to eliminate voids, and pull straight 2x4 screed across interior slab + exterior wood strip dead-flush.'] },
        { id: '2.4', title: 'Initial Walkable Set Hold (2-4 Hours)', details: ['Allow fast-setting concrete to set before aiming direct airflow (walkable in 2-4 hrs; bag specifies 4 hrs before heavy foot/load traffic).'] },
        { id: '2.5', tag: 'FANS', title: 'SETUP FANS & Dehumidifiers (Forced Drying Gate <= 4.5%)', details: ['Run high-velocity box fans and dehumidifiers across all 980 sq ft of patched perimeter for 48-72 hours.', 'MANDATORY GATE: Continue forced drying until Tramex concrete moisture impedance readings drop to <= 4.5% across all patched areas.'] }
      ]
    },
    {
      id: 'p3', code: 'PHASE 3', title: 'Wall Scraping, Woodwork Patching & Wall Painting',
      obj: 'Complete all dusty and overhead/vertical finishing before opening floor coating materials (ceiling excluded).',
      steps: [
        { id: '3.1', title: 'Wall Scraping', details: ['Scrape all loose paint, flaking plaster, and efflorescence from brick/stone and wall surfaces onto the masked floor.', 'Keep fans OFF while scraping to avoid blowing dust airborne across the 3rd floor.'] },
        { id: '3.2', title: 'Wood Board & Wall Patching', details: ['Patch and repair all damaged wood trim, baseboards, casings, and wall holes/cracks; sand smooth and spot-prime.'] },
        { id: '3.2b', tag: 'FANS', title: 'SETUP FANS (Accelerate Woodwork & Primer Dry)', details: ['Aim fans across patched drywall, wood filler, and primed trim to speed sanding window.', 'Turn fans OFF right before applying finish wall paint.'] },
        { id: '3.3', title: 'Wall Painting (Ceiling Excluded)', details: ['Mask ceiling line and floor edges.', 'Apply finish paint coats to all walls (do NOT paint the ceiling).'] },
        { id: '3.4', tag: 'FANS', title: 'SETUP FANS (Wall Paint Cure) & Full Room Cleanup', details: ['Run indirect circulation fans until wall paint dries cleanly.', 'Remove floor plastic/tape once dry; sweep and HEPA-vacuum the entire 47\' x 65\' (3,055 sq ft) floor thoroughly.'] }
      ]
    },
    {
      id: 'p4', code: 'PHASE 4', title: 'Floor Layout, Tufflex VRP-111, Liquid Rubber & Checkerboard',
      lockedBy: ['p2', 'p3'],
      obj: 'NO DRYLOK. Prime bare dry concrete + screed strips with Tufflex VRP-111, install 9\'/11\' liquid rubber border (1,750 sq ft), and paint 29\' x 45\' (1,305 sq ft) checkerboard.',
      steps: [
        { id: '4.1_lay', title: 'Floor Layout & Chalk Lines (9\' / 11\' Asymmetric Border)', details: ['Measure 9 ft (108") inward from three walls and 11 ft (132") inward from the designated feature/entry wall. Snap crisp border chalk lines.', 'Rubber Border Area: 1,750 sq ft total (encapsulates all 980 sq ft patch + wood screed strips + 770 sq ft overlap onto clean interior slab).', 'Central Checkerboard Area: 29\' x 45\' (1,305 sq ft) net interior rectangle. Snap centered 4\' x 4\' grid across interior zone.'] },
        { id: '4.2_prep', title: 'Mechanical Surface Prep (Full 3,055 sq ft Floor)', details: ['Mechanically grind/abrade clean concrete areas (inside 770 sq ft border overlap and across 29\' x 45\' checkerboard zone) to open pores for adhesion.', 'HEPA-vacuum the entire 3,055 sq ft floor completely dust-free.'] },
        { id: '4.3_vrp', title: 'Moisture-Mitigation Epoxy Primer (Tufflex VRP-111 - NO DRYLOK)', details: ['PREREQUISITE GATE: Confirm 980 sq ft concrete patch moisture is <= 4.5% on Tramex meter.', 'PRODUCT RULE: Do NOT use DRYLOK Extreme. Mask 9\'/11\' border line (or prime full floor per spec) and roll Tufflex VRP-111 directly onto bare, dry concrete patch, wood screed strips, and ground slab.', 'Observe manufacturer recoat window before applying base coat.'] },
        { id: '4.4_rub', title: 'Liquid Rubber Border Installation (1,750 sq ft)', details: ['Within VRP-111 recoat window, apply polyurethane base coat (ELASTA-TUFF 5000 / SYD-BASECOAT) and build up 1/4" liquid rubber (or 3/8" rubber-granule slurry) across 1,750 sq ft border.', 'Finish entire rubber border in solid black aliphatic topcoat. Pull edge tape cleanly before full cure.'] },
        { id: '4.4b_fan', tag: 'FANS', title: 'SETUP FANS (Indirect Airflow Between Border Coats)', details: ['Use indirect high-level cross-ventilation fans only (NEVER blast wet polyurethane/aliphatic resin directly).'] },
        { id: '4.5_chk', title: 'Central Checkerboard Painting (29\' x 45\' / 1,305 sq ft)', details: ['Roll 2 coats white floor coating across 29\' x 45\' zone; run indirect fans so white cures hard before taping.', 'Mask alternating 4\' x 4\' squares with burnished ScotchBlue tape.', 'Roll 2 coats black floor coating onto alternating squares; pull tape immediately before skinning over.'] },
        { id: '4.6_wear', tag: 'FANS', title: 'Final Clear Wear Coat, SETUP FANS & Event Cure Gate', details: ['Roll clear aliphatic polyurethane/polyaspartic topcoat across checkerboard (or entire floor) to lock in sheen and event traffic durability.', 'Maintain indirect airflow during cure.', 'CURE GATE: 24 hrs min light foot traffic; 48-72 hrs before heavy event furniture/staging load-in.'] }
      ]
    }
  ];

  let state = (() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (saved) return saved;
      const old = JSON.parse(localStorage.getItem(PREV) || 'null');
      return { done: old?.done || {}, tramex: old?.tramex || '' };
    } catch { return { done: {}, tramex: '' }; }
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

  function renderBlueprintSvg() {
    const cells = [];
    for (let r = 0; r < 7; r++) for (let c = 0; c < 11; c++) cells.push(`<rect x='${66 + c * 22}' y='${54 + r * 22}' width='22' height='22' fill='${(r + c) % 2 === 0 ? '#18181b' : '#f4f4f5'}'/>`);
    return `<svg viewBox='0 0 360 262' class='w-full rounded-xl border border-amber-500/35 bg-[#09090b]'><rect x='10' y='10' width='340' height='242' fill='#1c1917' stroke='#dc2626' stroke-width='3'/><rect x='16' y='16' width='328' height='230' fill='none' stroke='#f59e0b' stroke-width='1.5' stroke-dasharray='5,3'/><rect x='66' y='54' width='242' height='154' fill='#27272a' stroke='#38bdf8' stroke-width='1.5'/>${cells.join('')}<text x='187' y='30' text-anchor='middle' fill='#fca5a5' font-size='8.5' font-family='monospace' font-weight='bold'>9 FT BORDER (3 WALLS) • 980 SQ FT PATCH + 770 OVERLAP</text><text x='38' y='133' text-anchor='middle' fill='#fde047' font-size='9' font-family='monospace' font-weight='bold' transform='rotate(-90 38 133)'>11 FT ENTRY WALL</text><rect x='118' y='112' width='138' height='36' rx='6' fill='rgba(9,9,11,0.88)' stroke='#38bdf8'/><text x='187' y='127' text-anchor='middle' fill='#f8fafc' font-size='9.5' font-family='sans-serif' font-weight='900'>29' x 45' CHECKERBOARD</text><text x='187' y='140' text-anchor='middle' fill='#38bdf8' font-size='8.5' font-family='monospace'>1,305 SQ FT • 4'x4' GRID</text><text x='187' y='234' text-anchor='middle' fill='#a1a1aa' font-size='8.5' font-family='monospace'>WACO TX • 47' x 65' (3,055 SQ FT) • RUBBER: 1,750 SQ FT</text></svg>`;
  }

  function renderAsylum() {
    const host = $('view-asylum');
    if (!host) return;
    const st = calcStats();
    host.innerHTML = `<div class='max-w-xl mx-auto space-y-3 pb-10'>
      <div class='bg-zinc-900/95 border border-rose-500/40 rounded-2xl p-3 space-y-2.5'>
        <div class='flex items-start justify-between gap-2'>
          <div><div class='text-[10px] font-mono uppercase tracking-widest text-rose-400'>Masonic Lodge • Waco, TX • 3rd Floor (47' x 65')</div><div class='text-base font-black text-white'>THE ASYLUM — MASTER SPEC (980 SQ FT)</div></div>
          <button id='asyOpenCadBtn' class='px-2.5 py-1.5 rounded-xl bg-emerald-600/25 border border-emerald-400/50 text-emerald-200 text-[10px] font-black shrink-0'>3D Material Plane</button>
        </div>
        <div class='p-2 rounded-xl bg-amber-950/45 border border-amber-500/45 text-[10px] font-mono text-amber-200'><strong>COMPATIBILITY RULE:</strong> NO DRYLOK Extreme. Apply Tufflex VRP-111 directly on bare, ground/dry concrete &amp; wood screed strips once Tramex &lt;= 4.5%.</div>
        <div class='flex items-center justify-between text-xs'><span class='font-black text-amber-300'>Progress: ${st.done}/${st.total} Steps (${st.pct}%)</span><span class='font-mono text-[10px] ${st.tramexOk ? 'text-emerald-400' : 'text-rose-400'}'>Tramex: ${state.tramex === '' ? 'Not Logged' : state.tramex + '%'}</span></div>
        <div class='w-full h-2.5 rounded-full bg-zinc-950 overflow-hidden border border-zinc-800'><div class='h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400' style='width:${st.pct}%'></div></div>
        ${renderBlueprintSvg()}
        <div class='grid grid-cols-3 gap-1.5 text-center'>
          <div class='p-2 rounded-xl bg-zinc-950 border border-zinc-800'><div class='text-[10px] text-zinc-400'>Perimeter Patch</div><div class='text-xs font-black text-amber-300'>980 sq ft</div></div>
          <div class='p-2 rounded-xl bg-zinc-950 border border-zinc-800'><div class='text-[10px] text-zinc-400'>Rubber Border</div><div class='text-xs font-black text-rose-300'>1,750 sq ft</div></div>
          <div class='p-2 rounded-xl bg-zinc-950 border border-zinc-800'><div class='text-[10px] text-zinc-400'>Checkerboard</div><div class='text-xs font-black text-cyan-300'>1,305 sq ft</div></div>
        </div>
      </div>
      <div class='bg-zinc-900/95 border border-emerald-500/40 rounded-2xl p-3 flex items-center justify-between gap-2'>
        <div><div class='text-xs font-black text-emerald-300'>Tramex Moisture Gate (&lt;= 4.5%)</div><div class='text-[10px] text-zinc-400'>Log highest reading across 980 sq ft patch to unlock Phase 4</div></div>
        <input id='asyTramexIn' type='number' step='0.1' min='0' max='15' value='${state.tramex}' placeholder='e.g. 4.2' class='w-20 bg-zinc-950 border ${st.tramexOk ? 'border-emerald-400 text-emerald-300' : 'border-rose-500 text-rose-200'} rounded-lg px-2 py-1.5 text-xs font-mono text-center'>
      </div>
      <div class='bg-zinc-900/95 border border-sky-500/45 rounded-2xl p-3 space-y-2'>
        <div class='flex items-center justify-between gap-2'><div><div class='text-xs font-black text-sky-300 uppercase'>Locked Mix Ratios &amp; 3rd-Floor Water</div><div class='text-[10px] text-zinc-400'>Fixed spec (set in stone) • Quikrete No. 1004 bag verified</div></div><span class='px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-[10px] font-mono font-black text-sky-200'>165-204 gal</span></div>
        <div class='space-y-1.5 text-[11px] font-mono bg-zinc-950 border border-zinc-800 rounded-xl p-2.5'>
          <div class='flex justify-between gap-2'><span class='text-zinc-300'>Quikrete #100450 (175-180 bags)</span><span class='text-sky-300 font-bold'>2.5-3.0 qt/bag = 109-135 gal</span></div>
          <div class='text-[10px] text-zinc-400'>Bag limit: 4 pt (2 qt) start • 6 pt (3 qt) strict max • 20 min place</div>
          <div class='flex justify-between gap-2 pt-1 border-t border-zinc-800'><span class='text-zinc-300'>VersaBond Gray (15-16 bags)</span><span class='text-sky-300 font-bold'>5.5-6.0 qt/bag = 21-24 gal</span></div>
          <div class='flex justify-between gap-2'><span class='text-zinc-300'>Washout / Tub Rinse Reserve</span><span class='text-sky-300 font-bold'>35-45 gal</span></div>
          <div class='flex justify-between gap-2 pt-1 border-t border-zinc-800'><span class='text-amber-300 font-bold'>Total Staging Load</span><span class='text-rose-300 font-bold'>1,376-1,701 lbs (33-41 5g bkts)</span></div>
        </div>
      </div>
      <details class='bg-zinc-900/95 border border-zinc-800 rounded-2xl p-3'>
        <summary class='cursor-pointer text-xs font-black text-amber-300 uppercase tracking-wider'>Locked Material Manifest (980 sq ft Patch)</summary>
        <div class='mt-2 space-y-1.5'>${MANIFEST.map(m => `<div class='p-2 rounded-xl bg-zinc-950 border border-zinc-800'><div class='flex items-center justify-between gap-2'><span class='text-xs font-bold text-white'>${m.item}</span><span class='text-[10px] font-mono font-black text-amber-300 shrink-0'>${m.qty}</span></div><div class='text-[10px] text-zinc-400 mt-0.5'>${m.spec}</div></div>`).join('')}</div>
      </details>
      ${PHASES.map(ph => {
        const pDone = ph.steps.filter(s => state.done[s.id]).length;
        const isLocked = ph.id === 'p4' && !st.p4Unlocked;
        return `<div class='bg-zinc-900/95 border ${isLocked ? 'border-rose-500/50' : pDone === ph.steps.length ? 'border-emerald-500/50' : 'border-zinc-800'} rounded-2xl p-3 space-y-2.5'>
          <div><span class='px-2 py-0.5 rounded bg-rose-500/20 border border-rose-400/40 text-[10px] font-mono font-black text-rose-300'>${ph.code} • ${pDone}/${ph.steps.length}</span><h3 class='text-sm font-black text-white mt-1'>${ph.title}</h3><p class='text-[11px] text-zinc-400 mt-0.5'>${ph.obj}</p></div>
          ${isLocked ? `<div class='p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-[11px] text-rose-200 flex items-center justify-between gap-2'><span><strong>HARD SEQUENCING GATE:</strong> Finish Phase 2 (980 sq ft patch + forced dry), Phase 3 (walls), AND Tramex &lt;= 4.5% first.</span><button id='hbAsyUnlock' class='px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-black shrink-0'>Override</button></div>` : ''}
          <div class='space-y-2 ${isLocked ? 'opacity-50' : ''}'>${ph.steps.map(s => {
            const ck = !!state.done[s.id];
            const tagBadge = s.tag === 'FANS' ? `<span class='px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/50 text-[9px] font-mono font-black text-cyan-300 shrink-0'>AIRFLOW / FANS</span>` : s.tag === 'WATER' ? `<span class='px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/50 text-[9px] font-mono font-black text-sky-300 shrink-0'>WATER STAGE</span>` : '';
            return `<div data-step='${s.id}' class='p-2.5 rounded-xl border cursor-pointer ${ck ? 'bg-emerald-950/30 border-emerald-500/40' : s.tag === 'FANS' ? 'bg-cyan-950/20 border-cyan-500/35' : s.tag === 'WATER' ? 'bg-sky-950/25 border-sky-500/40' : 'bg-zinc-950/90 border-zinc-800'}'><div class='flex items-center justify-between gap-2'><div class='flex items-center gap-2 min-w-0'><input type='checkbox' ${ck ? 'checked' : ''} class='w-4 h-4 accent-emerald-500 pointer-events-none shrink-0'><span class='text-xs font-black ${ck ? 'line-through text-emerald-300' : 'text-white'}'>${s.id.split('_')[0]} • ${s.title}</span></div>${tagBadge}</div><ul class='mt-1.5 pl-6 space-y-1 list-disc text-[11px] text-zinc-300'>${s.details.map(d => `<li>${d}</li>`).join('')}</ul></div>`;
          }).join('')}</div>
        </div>`;
      }).join('')}
    </div>`;
    $('asyTramexIn').onchange = e => { state.tramex = e.target.value.trim(); save(); renderAsylum(); };
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
        const accent = k === 'cad' ? 'border-emerald-500/50 text-emerald-300' : k === 'asylum' ? 'border-amber-500/50 text-amber-300' : k === 'cloud' ? 'border-sky-500/50 text-sky-300' : 'border-zinc-800 text-zinc-400';
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