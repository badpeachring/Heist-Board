(() => {
  if (window.__hbAsylumLoaded) return;
  window.__hbAsylumLoaded = true;
  const STORE = 'hb_asylum_masonic_v2';
  const LEGACY = 'hb_asylum_masonic_v1';
  const $ = id => document.getElementById(id);

  const PHASES = [
    {
      id: 'p1', code: 'PHASE 1', title: 'Permanent Wood Screed Strip Installation',
      obj: 'Establish a permanent, level perimeter guide rail along exterior brick/stone walls flush with the clean interior slab.',
      steps: [
        { id: '1.1', title: 'Laser Level & Chalk Line', details: ['Set laser level to exact finished elevation of clean interior concrete slab.', 'Transfer marks to all exterior brick/stone walls at corners and every 10-15 ft.', 'Snap a continuous taut chalk line connecting all marks around the perimeter.'] },
        { id: '1.2', title: 'Depth Measurement & 2x4 Ripping', details: ['Measure vertical drop from chalk line to highest rocky subfloor spots every 5-10 ft.', 'Drop >= 1-1/2": Rip 2x4s lengthwise on table saw into 3/4" x 1-1/2" strips (4 strips/board).', 'Drop < 1-1/2" (e.g. 1"): Rip 3-1/2" face down to 1" first, then rip in half for 3/4" x 1" strips.'] },
        { id: '1.3', title: 'Permanent Wall Anchoring', details: ['Align top edge of wood strip directly on chalk line with flat 3/4" face against wall.', 'Drive 2-1/2" Grip-Rite steel cut masonry nails into mortar joints only (angled slightly downward) every 18"-24". Never nail brick/stone faces.', 'Where mortar joints miss, pack wet VersaBond thinset behind strip to bond to wall.', 'Leave wood strips permanently in place for liquid rubber encapsulation.'] }
      ]
    },
    {
      id: 'p2', code: 'PHASE 2', title: 'Water Staging, Bonding Slurry & Concrete Patching',
      obj: 'Stage 3rd-floor water supply, then bring ~450-500 sq ft rough perimeter concrete (~1" avg, 2"-4" pockets) dead-flush.',
      steps: [
        { id: '2.0', tag: 'WATER', title: 'Stage 3rd-Floor Water Supply & Washout Station', details: ['Stage 65-102 gal total clean water BEFORE opening bags (70-90 bags Quikrete = 44-68 gal; 4-6 bags VersaBond = 5.5-9 gal; tool/tub washout = 15-25 gal).', 'Mark two dedicated measuring pitchers: 2.5-3 qt line (Quikrete) and 5.5-6 qt line (VersaBond).', 'Keep 2 full 5-gal rinse buckets active continuously so paddles, tubs, and trowels never seize on fast-set concrete.', 'CRITICAL: Keep ALL fans OFF during slurry scrub and concrete pour to prevent flash-skinning and shrinkage cracks.'] },
        { id: '2.1', title: 'Surface Prep & Masking', details: ['HEPA-vacuum all loose debris, dust, and delaminated concrete from rocky perimeter.', 'Mask off clean interior slab edge using 0.31 mil HDX painter\'s plastic and ScotchBlue tape.'] },
        { id: '2.2', title: 'Thinset Bonding Scrub Coat (VersaBond 50 lb Gray)', details: ['Mix Ratio: ~5.5 to 6 qts clean water per 50 lb bag (thick pancake-batter slurry; slake 5-10 min & re-mix).', 'CRITICAL OPEN TIME: Scrub thin coat immediately ahead of concrete pour; pour while wet/tacky (within 15-20 min) - never let skin over.', 'Feather shallow 1/4"-3/4" spots flush using standard trowel-consistency VersaBond.'] },
        { id: '2.3', title: 'Fast-Setting Concrete Pour (Quikrete #100450 - 70 to 90 Bags)', details: ['Mix Ratio: 2.5 to 3 qts (80-96 oz) clean water per 50 lb bag in drum mixer or large black mixing tub. Mix stiff (no excess soupy bleed water) for 2-3 min.', 'Working Time: 20-40 min per batch. Work in manageable sections with continuous bucket-runner water supply.', 'Dump onto wet thinset scrub coat, tamp into 2"-4" pockets to eliminate air voids, and pull straight 2x4 screed across interior slab + exterior wood strip.'] },
        { id: '2.4', title: 'Initial Walkable Set Hold (2-4 Hours)', details: ['Allow fast-setting concrete to reach initial set (~2 hrs) before aiming direct airflow so surface does not craze or crack.', 'Walkable cure reached at 2 to 4 hours.'] },
        { id: '2.5', tag: 'FANS', title: 'SETUP FANS & Dehumidifiers (48-72 Hr Forced Dry)', details: ['Deploy high-velocity air movers / box fans aimed low across the entire patched perimeter immediately after the 2-hr initial set.', 'Run dehumidifiers continuously alongside fans for 48-72 hours to purge the 50-77 gallons of mix water before moisture sealing.', 'Spot-check patch with Tramex concrete moisture impedance meter before entering Phase 4.'] }
      ]
    },
    {
      id: 'p3', code: 'PHASE 3', title: 'Wall Scraping, Woodwork Patching & Wall Painting',
      obj: 'Complete all dusty overhead/vertical work before opening floor coatings (ceiling excluded).',
      steps: [
        { id: '3.1', title: 'Wall Prep & Scraping', details: ['Scrape all loose/peeling paint, efflorescence, and debris from brick/stone and drywall/plaster onto protected floor.', 'Keep fans OFF while scraping to avoid blowing lead/plaster dust airborne across the 3rd floor.'] },
        { id: '3.2', title: 'Wood Board & Wall Patching + Spot Prime', details: ['Patch and repair damaged wood trim, baseboards, window casings, and wall holes/cracks.', 'Sand smooth and prime all patched areas.'] },
        { id: '3.2b', tag: 'FANS', title: 'SETUP FANS (Accelerate Patch & Primer Dry)', details: ['Aim fans across patched drywall, wood filler, and primed trim so surfaces dry fast for sanding and finish coats.', 'Turn fans OFF again right before rolling/spraying wet finish wall paint.'] },
        { id: '3.3', title: 'Wall Painting (Ceiling Excluded)', details: ['Mask ceiling line and floor perimeter as needed.', 'Cut in and roll/spray all walls to final finish coats (do NOT paint ceiling).'] },
        { id: '3.4', tag: 'FANS', title: 'SETUP FANS (Fast Wall Paint Cure) + Final HEPA Vac', details: ['Set up indirect room-circulation fans once walls are rolled to speed tack-free cure between coats and before floor prep.', 'Once wall paint is dry, sweep and HEPA-vacuum the entire 47\' x 65\' (3,055 sq ft) floor thoroughly.'] }
      ]
    },
    {
      id: 'p4', code: 'PHASE 4', title: 'Moisture Sealing, Rubber Border & Checkerboard',
      lockedBy: ['p2', 'p3'],
      obj: 'Install seamless 9-ft / 11-ft encapsulated black liquid rubber border (1,750 sq ft) + centered 29\' x 45\' (1,305 sq ft) 4\'x4\' checkerboard.',
      steps: [
        { id: '4.1', title: 'Patch Moisture Check & DRYLOK Extreme Gray', details: ['Verify 48-72 hr forced dry complete and Tramex concrete moisture meter reads dry.', 'Stir DRYLOK Extreme thoroughly (do not thin). Roll 1 heavy coat over concrete patch + wood screed strips at ~100 sq ft/gal (3/4" nap roller, ambient >= 50F).'] },
        { id: '4.1b', tag: 'FANS', title: 'SETUP FANS (DRYLOK 2-Hr Recoat Window)', details: ['Aim cross-ventilation fans across the DRYLOK perimeter band to hit the 2-hour dry/recoat window cleanly and exhaust vapor.'] },
        { id: '4.2', title: 'Asymmetric Floor Layout & Chalk Grid', details: ['Measure 9 ft (108") inward from three walls; measure 11 ft (132") inward from feature/entry wall. Snap crisp border chalk lines.', 'Remaining Interior Zone: (47\'-18\') x (65\'-20\') = 29\' x 45\' (1,305 sq ft).', 'Snap centered grid of 4\' x 4\' squares across interior zone with equal trim squares at edges.'] },
        { id: '4.3', title: 'Liquid Rubber Border Installation (1,750 sq ft)', details: ['Grind/abrade clean concrete inside 9\'/11\' border band (Lavina S7 + DiamaPro HEPA), vacuum, and tape clean edge along chalk line.', 'Apply moisture-tolerant primer (VRP-111) per recoat window, followed by 1/4" liquid rubber (or 3/8" rubber-granule slurry).', 'Topcoat border in solid black aliphatic topcoat. Pull edge tape while wet/tacky or score cleanly before full cure.'] },
        { id: '4.3b', tag: 'FANS', title: 'SETUP FANS (Indirect Airflow Between Primer / Rubber / Topcoat)', details: ['Use indirect high-level cross-ventilation fans (NEVER aim air directly at wet polyurethane/aliphatic resin to avoid ripples or dust embedding).', 'Exhaust solvent fumes out 3rd-floor windows and accelerate recoat readiness.'] },
        { id: '4.4', title: 'Central Checkerboard Painting (29\' x 45\' Interior Slab)', details: ['Grind/abrade and HEPA-vacuum interior 1,305 sq ft slab; roll concrete primer to full tack-free dry.', 'Roll 2 coats white floor coating across entire checkerboard zone.', 'Tape alternating 4\' x 4\' squares with burnished ScotchBlue tape; roll 2 coats black floor coating and pull tape immediately before skinning over.', 'Roll clear aliphatic polyurethane/polyaspartic wear coat across floor for event durability.'] },
        { id: '4.4b', tag: 'FANS', title: 'SETUP FANS (Checkerboard Coat Dry & Final 24-72 Hr Cure)', details: ['Run indirect fans after white base coats so white paint cures hard before applying ScotchBlue tape (prevents tape lift).', 'Run continuous indirect airflow after final black & clear aliphatic wear coat: 24 hrs min foot traffic; 48-72 hrs heavy event load-in.'] }
      ]
    }
  ];

  let state = (() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (saved) return saved;
      const oldDone = JSON.parse(localStorage.getItem(LEGACY) || '{}');
      return { done: oldDone, cBags: 80, vBags: 5, wGal: 20 };
    } catch { return { done: {}, cBags: 80, vBags: 5, wGal: 20 }; }
  })();
  let overrideLock = false;
  const save = () => localStorage.setItem(STORE, JSON.stringify(state));

  function calcStats() {
    const all = PHASES.flatMap(p => p.steps);
    const done = all.filter(s => state.done[s.id]).length;
    const p2Done = PHASES[1].steps.every(s => state.done[s.id]);
    const p3Done = PHASES[2].steps.every(s => state.done[s.id]);
    return { total: all.length, done, pct: Math.round((done / all.length) * 100), p4Unlocked: (p2Done && p3Done) || overrideLock };
  }

  function calcWater() {
    const cb = Number(state.cBags) || 80;
    const vb = Number(state.vBags) || 5;
    const wg = Number(state.wGal) || 20;
    const cLo = (cb * 2.5) / 4, cHi = (cb * 3.0) / 4;
    const vLo = (vb * 5.5) / 4, vHi = (vb * 6.0) / 4;
    const tLo = cLo + vLo + wg, tHi = cHi + vHi + wg;
    return {
      cb, vb, wg,
      cQt: `${Math.round(cb * 2.5)}-${Math.round(cb * 3)} qt`,
      cGal: `${cLo.toFixed(1)}-${cHi.toFixed(1)} gal`,
      vGal: `${vLo.toFixed(1)}-${vHi.toFixed(1)} gal`,
      tGal: `${Math.round(tLo)}-${Math.round(tHi)} gal`,
      buckets: `${Math.ceil(tLo / 5)}-${Math.ceil(tHi / 5)} (5-gal buckets)`,
      lbs: `${Math.round(tLo * 8.34).toLocaleString()}-${Math.round(tHi * 8.34).toLocaleString()} lbs`
    };
  }

  function renderBlueprintSvg() {
    const cells = [];
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 11; c++) {
        cells.push(`<rect x='${66 + c * 22}' y='${54 + r * 22}' width='22' height='22' fill='${(r + c) % 2 === 0 ? '#18181b' : '#f4f4f5'}'/>`);
      }
    }
    return `<svg viewBox='0 0 360 262' class='w-full rounded-xl border border-amber-500/35 bg-[#09090b]'>
      <rect x='10' y='10' width='340' height='242' fill='#1c1917' stroke='#dc2626' stroke-width='3'/>
      <rect x='14' y='14' width='332' height='234' fill='none' stroke='#f59e0b' stroke-width='1.5' stroke-dasharray='5,3'/>
      <rect x='66' y='54' width='242' height='154' fill='#27272a' stroke='#38bdf8' stroke-width='1.5'/>
      ${cells.join('')}
      <text x='187' y='30' text-anchor='middle' fill='#fca5a5' font-size='9' font-family='monospace' font-weight='bold'>9 FT RUBBER BORDER (3 WALLS) • WOOD SCREED + PATCH</text>
      <text x='38' y='133' text-anchor='middle' fill='#fde047' font-size='9' font-family='monospace' font-weight='bold' transform='rotate(-90 38 133)'>11 FT ENTRY WALL</text>
      <rect x='118' y='112' width='138' height='36' rx='6' fill='rgba(9,9,11,0.88)' stroke='#38bdf8'/>
      <text x='187' y='127' text-anchor='middle' fill='#f8fafc' font-size='9.5' font-family='sans-serif' font-weight='900'>29' x 45' CHECKERBOARD</text>
      <text x='187' y='140' text-anchor='middle' fill='#38bdf8' font-size='8.5' font-family='monospace'>1,305 SQ FT • 4'x4' GRID</text>
      <text x='187' y='234' text-anchor='middle' fill='#a1a1aa' font-size='8.5' font-family='monospace'>TOTAL: 47' x 65' (3,055 SQ FT) • RUBBER BAND: 1,750 SQ FT</text>
    </svg>`;
  }

  function renderAsylum() {
    const host = $('view-asylum');
    if (!host) return;
    const st = calcStats();
    const w = calcWater();
    host.innerHTML = `<div class='max-w-xl mx-auto space-y-3 pb-10'>
      <div class='bg-zinc-900/95 border border-rose-500/40 rounded-2xl p-3 space-y-2.5'>
        <div class='flex items-start justify-between gap-2'>
          <div>
            <div class='text-[10px] font-mono uppercase tracking-widest text-rose-400'>Masonic Lodge • 3rd Floor (47' x 65')</div>
            <div class='text-base font-black text-white'>THE ASYLUM — MASTER OPS</div>
          </div>
          <button id='asyOpenCadBtn' class='px-2.5 py-1.5 rounded-xl bg-emerald-600/25 border border-emerald-400/50 text-emerald-200 text-[10px] font-black shrink-0'>3D Material Plane</button>
        </div>
        <div class='flex items-center justify-between text-xs'>
          <span class='font-black text-amber-300'>Progress: ${st.done}/${st.total} Steps (${st.pct}%)</span>
          <span class='font-mono text-[10px] text-zinc-400'>1-Week Target</span>
        </div>
        <div class='w-full h-2.5 rounded-full bg-zinc-950 overflow-hidden border border-zinc-800'>
          <div class='h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all' style='width:${st.pct}%'></div>
        </div>
        ${renderBlueprintSvg()}
        <div class='grid grid-cols-3 gap-1.5 text-center'>
          <div class='p-2 rounded-xl bg-zinc-950 border border-zinc-800'><div class='text-[10px] text-zinc-400'>Perimeter Patch</div><div class='text-xs font-black text-amber-300'>~475 sq ft</div></div>
          <div class='p-2 rounded-xl bg-zinc-950 border border-zinc-800'><div class='text-[10px] text-zinc-400'>Rubber Border</div><div class='text-xs font-black text-rose-300'>1,750 sq ft</div></div>
          <div class='p-2 rounded-xl bg-zinc-950 border border-zinc-800'><div class='text-[10px] text-zinc-400'>Checkerboard</div><div class='text-xs font-black text-cyan-300'>1,305 sq ft</div></div>
        </div>
      </div>

      <div class='bg-zinc-900/95 border border-sky-500/45 rounded-2xl p-3 space-y-2.5'>
        <div class='flex items-center justify-between gap-2'>
          <div>
            <div class='text-xs font-black text-sky-300 uppercase tracking-wider'>3rd-Floor Water &amp; Mix Calculator</div>
            <div class='text-[10px] text-zinc-400'>Quikrete #100450 (2.5-3 qt) + VersaBond (5.5-6 qt) + Washout</div>
          </div>
          <span class='px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-[10px] font-mono font-black text-sky-200'>${w.tGal}</span>
        </div>
        <div class='grid grid-cols-3 gap-2'>
          <label class='text-[10px] text-zinc-300 font-bold'>Quikrete Bags: <span class='text-sky-300 font-mono'>${w.cb}</span><input id='asyCBags' type='range' min='50' max='110' step='5' value='${w.cb}' class='w-full accent-sky-400 mt-1'></label>
          <label class='text-[10px] text-zinc-300 font-bold'>VersaBond: <span class='text-sky-300 font-mono'>${w.vb}</span><input id='asyVBags' type='range' min='2' max='10' step='1' value='${w.vb}' class='w-full accent-sky-400 mt-1'></label>
          <label class='text-[10px] text-zinc-300 font-bold'>Washout: <span class='text-sky-300 font-mono'>${w.wg}g</span><input id='asyWGal' type='range' min='10' max='35' step='5' value='${w.wg}' class='w-full accent-sky-400 mt-1'></label>
        </div>
        <div class='grid grid-cols-2 gap-1.5 text-[11px] font-mono bg-zinc-950 border border-zinc-800 rounded-xl p-2.5'>
          <div class='text-zinc-300'>Concrete: <span class='text-sky-300 font-bold'>${w.cGal}</span> (${w.cQt})</div>
          <div class='text-zinc-300'>VersaBond: <span class='text-sky-300 font-bold'>${w.vGal}</span></div>
          <div class='text-zinc-300'>Containers: <span class='text-amber-300 font-bold'>${w.buckets}</span></div>
          <div class='text-zinc-300'>Water Load: <span class='text-rose-300 font-bold'>${w.lbs}</span></div>
        </div>
      </div>

      ${PHASES.map(ph => {
        const pDone = ph.steps.filter(s => state.done[s.id]).length;
        const isLocked = ph.id === 'p4' && !st.p4Unlocked;
        return `<div class='bg-zinc-900/95 border ${isLocked ? 'border-rose-500/50' : pDone === ph.steps.length ? 'border-emerald-500/50' : 'border-zinc-800'} rounded-2xl p-3 space-y-2.5'>
          <div>
            <span class='px-2 py-0.5 rounded bg-rose-500/20 border border-rose-400/40 text-[10px] font-mono font-black text-rose-300'>${ph.code} • ${pDone}/${ph.steps.length}</span>
            <h3 class='text-sm font-black text-white mt-1'>${ph.title}</h3>
            <p class='text-[11px] text-zinc-400 mt-0.5'>${ph.obj}</p>
          </div>
          ${isLocked ? `<div class='p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-[11px] text-rose-200 flex items-center justify-between gap-2'><span><strong>SEQUENCING LOCK:</strong> Finish Phase 2 (Concrete + Forced Dry) &amp; Phase 3 (Walls) before floor coatings.</span><button id='hbAsyUnlock' class='px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-black shrink-0'>Override</button></div>` : ''}
          <div class='space-y-2 ${isLocked ? 'opacity-50' : ''}'>
            ${ph.steps.map(s => {
              const ck = !!state.done[s.id];
              const tagBadge = s.tag === 'FANS' ? `<span class='px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/50 text-[9px] font-mono font-black text-cyan-300 shrink-0'>AIRFLOW / FANS</span>` : s.tag === 'WATER' ? `<span class='px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/50 text-[9px] font-mono font-black text-sky-300 shrink-0'>WATER STAGE</span>` : '';
              return `<div data-step='${s.id}' class='p-2.5 rounded-xl border cursor-pointer transition-all ${ck ? 'bg-emerald-950/30 border-emerald-500/40' : s.tag === 'FANS' ? 'bg-cyan-950/20 border-cyan-500/35' : s.tag === 'WATER' ? 'bg-sky-950/25 border-sky-500/40' : 'bg-zinc-950/90 border-zinc-800'}'>
                <div class='flex items-center justify-between gap-2'>
                  <div class='flex items-center gap-2 min-w-0'><input type='checkbox' ${ck ? 'checked' : ''} class='w-4 h-4 accent-emerald-500 pointer-events-none shrink-0'><span class='text-xs font-black ${ck ? 'line-through text-emerald-300' : 'text-white'}'>${s.id} • ${s.title}</span></div>
                  ${tagBadge}
                </div>
                <ul class='mt-1.5 pl-6 space-y-1 list-disc text-[11px] text-zinc-300'>${s.details.map(d => `<li>${d}</li>`).join('')}</ul>
              </div>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>`;

    $('asyCBags').oninput = e => { state.cBags = Number(e.target.value); save(); renderAsylum(); };
    $('asyVBags').oninput = e => { state.vBags = Number(e.target.value); save(); renderAsylum(); };
    $('asyWGal').oninput = e => { state.wGal = Number(e.target.value); save(); renderAsylum(); };
    $('asyOpenCadBtn').onclick = () => switchTabUnified('cad');
    if ($('hbAsyUnlock')) $('hbAsyUnlock').onclick = () => { overrideLock = true; renderAsylum(); };
    host.querySelectorAll('[data-step]').forEach(el => el.onclick = () => { state.done[el.dataset.step] = !state.done[el.dataset.step]; save(); renderAsylum(); });
  }

  function switchTabUnified(tab) {
    document.querySelectorAll('main > section').forEach(s => s.classList.toggle('hidden', s.id !== 'view-' + tab));
    document.querySelectorAll('#mainTabs .tab-btn').forEach(b => {
      const on = b.dataset.tab === tab;
      b.className = on ? 'tab-btn px-3 py-1 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-200 text-xs font-bold shrink-0' : 'tab-btn px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-bold shrink-0';
    });
    if (tab === 'asylum') renderAsylum();
    if (tab === 'cad' && window.HeistBoard?.openCad) window.HeistBoard.openCad();
    if (tab === 'board' && window.HeistBoard?.renderAll) window.HeistBoard.renderAll();
  }

  function init() {
    const nav = $('mainTabs'), main = document.querySelector('main');
    if (!nav || !main || $('view-asylum')) return;
    const btn = document.createElement('button');
    btn.dataset.tab = 'asylum';
    btn.className = 'tab-btn px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-bold shrink-0';
    btn.textContent = 'Asylum Ops';
    nav.appendChild(btn);
    const sec = document.createElement('section');
    sec.id = 'view-asylum';
    sec.className = 'hidden p-3 overflow-y-auto flex-1';
    main.appendChild(sec);
    nav.addEventListener('click', e => {
      const b = e.target.closest('.tab-btn');
      if (b) switchTabUnified(b.dataset.tab);
    });
    if (window.HeistBoard) window.HeistBoard.switchTab = switchTabUnified;
  }
  init();
})();