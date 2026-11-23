(() => {
  if (window.__hbAsylumLoaded) return;
  window.__hbAsylumLoaded = true;
  const STORE = 'hb_asylum_masonic_v1';
  const $ = id => document.getElementById(id);

  const PHASES = [
    {
      id: 'p1', code: 'PHASE 1', title: 'Permanent Wood Screed Strip Installation',
      obj: 'Establish a permanent, level perimeter guide rail along the exterior brick/stone walls flush with the clean interior concrete slab.',
      steps: [
        { id: '1.1', title: 'Laser Level & Chalk Line', details: ['Set laser level to exact finished elevation of clean interior concrete slab.', 'Transfer elevation marks to all exterior brick/stone walls at corners and every 10–15 ft.', 'Snap a continuous taut chalk line connecting all marks around the perimeter.'] },
        { id: '1.2', title: 'Depth Measurement & 2x4 Ripping', details: ['Measure vertical drop from chalk line to highest rocky subfloor spots every 5–10 ft.', 'Drop ≥ 1-1/2": Rip 2x4s lengthwise on table saw into 3/4" x 1-1/2" strips (4 strips/board).', 'Drop < 1-1/2" (e.g. 1"): Rip 3-1/2" face down to 1" first, then rip in half for 3/4" x 1" strips.'] },
        { id: '1.3', title: 'Permanent Wall Anchoring', details: ['Align top edge of wood strip directly on chalk line with flat 3/4" face against wall.', 'Drive 2-1/2" Grip-Rite steel cut masonry nails into mortar joints only (angled slightly downward) every 18"–24". Never nail brick/stone faces.', 'Where mortar joints miss, pack wet VersaBond thinset behind strip to bond to wall.', 'Leave wood strips permanently in place for liquid rubber encapsulation.'] }
      ]
    },
    {
      id: 'p2', code: 'PHASE 2', title: 'Bonding Slurry & Concrete Patching',
      obj: 'Bring all ~450–500 sq ft rough rocky perimeter concrete (~1" avg, 2"–4" pockets) dead-flush with interior slab and wood screed strips.',
      steps: [
        { id: '2.1', title: 'Surface Prep & Masking', details: ['HEPA-vacuum all loose debris, dust, and delaminated concrete from rocky perimeter.', 'Mask off clean interior slab edge using 0.31 mil HDX painter\'s plastic and ScotchBlue tape.'] },
        { id: '2.2', title: 'Thinset Bonding Scrub Coat (VersaBond 50 lb Gray)', details: ['Mix Ratio: ~5.5 to 6 qts clean water per 50 lb bag (thick pancake-batter slurry; slake 5–10 min & re-mix).', 'CRITICAL OPEN TIME: Scrub thin coat immediately ahead of concrete pour; pour while wet/tacky (within 15–20 min) — never let skin over.', 'Feather shallow 1/4"–3/4" spots flush using standard trowel-consistency VersaBond.'] },
        { id: '2.3', title: 'Fast-Setting Concrete Pour (Quikrete #100450)', details: ['Mix Ratio: ~2.5 to 3 qts (80–96 oz) water per 50 lb bag in drum mixer or large black mixing tub. Mix stiff (no excess bleed water) for 2–3 min.', 'Working Time: 20–40 min per batch in manageable sections.', 'Dump onto wet thinset scrub coat, tamp into 2"–4" pockets to eliminate voids, and pull straight 2x4 screed across interior slab + exterior wood strip.'] },
        { id: '2.4', title: 'Curing & Forced Drying', details: ['Walkable Cure: 2 to 4 hours.', 'After 2 hrs initial set, aim high-velocity fans and run dehumidifiers across patched perimeter for 48–72 hours.'] }
      ]
    },
    {
      id: 'p3', code: 'PHASE 3', title: 'Wall Scraping, Woodwork Patching & Wall Painting',
      obj: 'Complete all dusty, messy overhead/vertical work before opening any floor coatings (ceiling excluded).',
      steps: [
        { id: '3.1', title: 'Wall Prep & Scraping', details: ['Scrape all loose/peeling paint, efflorescence, and debris from brick/stone and drywall/plaster onto protected floor.'] },
        { id: '3.2', title: 'Wood Board & Wall Patching', details: ['Patch and repair damaged wood trim, baseboards, window casings, and wall holes/cracks.', 'Sand smooth and prime all patched areas.'] },
        { id: '3.3', title: 'Wall Painting (Ceiling Excluded)', details: ['Mask ceiling line and floor perimeter as needed.', 'Cut in and roll/spray all walls to final finish coats (do NOT paint ceiling).', 'Sweep and HEPA-vacuum entire 47\' x 65\' (3,055 sq ft) floor thoroughly once wall paint is dry.'] }
      ]
    },
    {
      id: 'p4', code: 'PHASE 4', title: 'Moisture Sealing, Rubber Border & Checkerboard',
      lockedBy: ['p2', 'p3'],
      obj: 'Install seamless 9-ft / 11-ft encapsulated black liquid rubber border (1,750 sq ft) + centered 29\' x 45\' (1,305 sq ft) 4\'x4\' checkerboard.',
      steps: [
        { id: '4.1', title: 'Patch Moisture Check & DRYLOK Extreme Gray', details: ['Verify 48–72 hr forced dry complete and concrete moisture meter reads dry.', 'Stir DRYLOK Extreme thoroughly (do not thin). Roll 1 heavy coat over entire concrete patch + wood screed strips at ~100 sq ft/gal (3/4" nap roller).', 'Dry Time: 2 hours to recoat/topcoat (ambient temp ≥ 50°F).'] },
        { id: '4.2', title: 'Asymmetric Floor Layout & Chalk Grid', details: ['Measure 9 ft (108") inward from three walls; measure 11 ft (132") inward from feature/entry wall. Snap crisp border chalk lines.', 'Remaining Interior Zone: (47\'-18\') x (65\'-20\') = 29\' x 45\' (1,305 sq ft).', 'Snap centered grid of 4\' x 4\' squares across interior zone with equal trim squares at edges.'] },
        { id: '4.3', title: 'Liquid Rubber Border Installation (1,750 sq ft)', details: ['Grind/abrade clean concrete inside 9\'/11\' border band, HEPA-vacuum, and tape clean edge along chalk line.', 'Apply moisture-tolerant primer (VRP-111) per recoat window, followed by 1/4" liquid rubber (or 3/8" rubber-granule slurry).', 'Topcoat border in solid black aliphatic topcoat. Pull edge tape while wet/tacky or score cleanly before full cure.'] },
        { id: '4.4', title: 'Central Checkerboard Painting (29\' x 45\') & Final Cure', details: ['Grind/abrade and HEPA-vacuum interior 1,305 sq ft slab; roll concrete primer to full tack-free dry.', 'Roll 2 coats white floor coating across checkerboard zone; allow full dry.', 'Tape alternating 4\' x 4\' squares with burnished ScotchBlue tape; roll 2 coats black floor coating and pull tape before skinning over.', 'Optional/Recommended: Roll clear aliphatic polyurethane/polyaspartic wear coat across floor.', 'Final Cure: 24 hrs min foot traffic; 48–72 hrs before heavy event load-in.'] }
      ]
    }
  ];

  let doneMap = (() => { try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch { return {}; } })();
  let overrideLock = false;
  const save = () => localStorage.setItem(STORE, JSON.stringify(doneMap));

  function calcStats() {
    const all = PHASES.flatMap(p => p.steps);
    const done = all.filter(s => doneMap[s.id]).length;
    const p2Done = PHASES[1].steps.every(s => doneMap[s.id]);
    const p3Done = PHASES[2].steps.every(s => doneMap[s.id]);
    return { total: all.length, done, pct: Math.round((done / all.length) * 100), p4Unlocked: (p2Done && p3Done) || overrideLock, p2Done, p3Done };
  }

  function renderBlueprintSvg() {
    const cells = [];
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 11; c++) {
        const isBlack = (r + c) % 2 === 0;
        cells.push(`<rect x='${66 + c * 22}' y='${54 + r * 22}' width='22' height='22' fill='${isBlack ? '#18181b' : '#f4f4f5'}'/>`);
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

  function renderDrawer() {
    let modal = $('hbAsylumModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'hbAsylumModal';
      modal.className = 'fixed inset-0 z-50 bg-black/95 backdrop-blur-md overflow-y-auto p-3';
      document.body.appendChild(modal);
    }
    modal.classList.remove('hidden');
    const st = calcStats();

    modal.innerHTML = `<div class='max-w-xl mx-auto space-y-3 pb-12'>
      <div class='sticky top-0 z-20 bg-zinc-950/95 border border-rose-500/40 rounded-2xl p-3 flex items-center justify-between gap-2 shadow-xl'>
        <div>
          <div class='text-[10px] font-mono uppercase tracking-widest text-rose-400'>Masonic Lodge • 3rd Floor Op</div>
          <div class='text-base font-black text-white'>THE ASYLUM — MASTER RENOVATION</div>
        </div>
        <button id='hbAsyClose' class='px-3 py-1.5 rounded-xl bg-zinc-800 border border-zinc-700 text-xs font-black text-white'>Close</button>
      </div>

      <div class='bg-zinc-900/95 border border-zinc-800 rounded-2xl p-3 space-y-2.5'>
        <div class='flex items-center justify-between text-xs'>
          <span class='font-black text-amber-300'>Mission Progress: ${st.done}/${st.total} Steps (${st.pct}%)</span>
          <span class='font-mono text-[10px] text-zinc-400'>Target: 1-Week Turnaround</span>
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

      ${PHASES.map(ph => {
        const pDone = ph.steps.filter(s => doneMap[s.id]).length;
        const isLocked = ph.id === 'p4' && !st.p4Unlocked;
        return `<div class='bg-zinc-900/95 border ${isLocked ? 'border-rose-500/50' : pDone === ph.steps.length ? 'border-emerald-500/50' : 'border-zinc-800'} rounded-2xl p-3 space-y-2.5'>
          <div class='flex items-start justify-between gap-2'>
            <div>
              <span class='px-2 py-0.5 rounded bg-rose-500/20 border border-rose-400/40 text-[10px] font-mono font-black text-rose-300'>${ph.code} • ${pDone}/${ph.steps.length}</span>
              <h3 class='text-sm font-black text-white mt-1'>${ph.title}</h3>
              <p class='text-[11px] text-zinc-400 mt-0.5'>${ph.obj}</p>
            </div>
          </div>
          ${isLocked ? `<div class='p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-[11px] text-rose-200 flex items-center justify-between gap-2'>
            <span><strong>SEQUENCING LOCK:</strong> Finish Phase 2 (Concrete Patch) &amp; Phase 3 (Wall Scraping/Painting) before opening floor coatings.</span>
            <button id='hbAsyUnlock' class='px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-black shrink-0'>Override</button>
          </div>` : ''}
          <div class='space-y-2 ${isLocked ? 'opacity-50' : ''}'>
            ${ph.steps.map(s => {
              const checked = !!doneMap[s.id];
              return `<div data-step='${s.id}' class='p-2.5 rounded-xl border cursor-pointer transition-all ${checked ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-zinc-950/90 border-zinc-800'}'>
                <div class='flex items-center gap-2.5'>
                  <input type='checkbox' ${checked ? 'checked' : ''} class='w-4 h-4 accent-emerald-500 pointer-events-none shrink-0'>
                  <span class='text-xs font-black ${checked ? 'line-through text-emerald-300' : 'text-white'}'>${s.id} • ${s.title}</span>
                </div>
                <ul class='mt-1.5 pl-6 space-y-1 list-disc text-[11px] text-zinc-300'>
                  ${s.details.map(d => `<li>${d}</li>`).join('')}
                </ul>
              </div>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>`;

    $('hbAsyClose').onclick = () => modal.classList.add('hidden');
    if ($('hbAsyUnlock')) $('hbAsyUnlock').onclick = () => { overrideLock = true; renderDrawer(); };
    modal.querySelectorAll('[data-step]').forEach(el => el.onclick = () => {
      const id = el.dataset.step;
      doneMap[id] = !doneMap[id];
      save();
      renderDrawer();
    });
  }

  function mountTrigger() {
    if ($('hbAsylumLaunchBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'hbAsylumLaunchBtn';
    btn.type = 'button';
    btn.className = 'fixed bottom-3 right-3 z-40 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-700 via-red-600 to-amber-600 border border-amber-300/60 text-white shadow-2xl text-left';
    btn.innerHTML = `<span class='block text-xs font-black tracking-wide'>🏛️ THE ASYLUM (47'x65')</span><span class='block text-[9px] text-amber-100/90'>Masonic Lodge • 4-Phase Blueprint</span>`;
    btn.onclick = renderDrawer;
    document.body.appendChild(btn);
  }

  mountTrigger();
  setInterval(mountTrigger, 1200);
})();