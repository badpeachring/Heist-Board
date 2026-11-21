(() => {
  if (window.__hbLawLoaded) return;
  window.__hbLawLoaded = true;
  const $ = id => document.getElementById(id);

  const BLUEPRINTS = {
    install: {
      name: 'Lay-A-Weigh 9-Day Install',
      grossTake: 85000, overhead: 32000,
      cards: [
        { id: 'l1', title: '30-Day Cure & <=80% RH Moisture Test', type: 'INTEL', status: 'OPEN', x: 10, y: 10, parentId: '', notes: 'Tramex impedance + Calcium Chloride. Verify zero outside repair compounds.' },
        { id: 'l2', title: 'CSP 2-5 Diamond Grind & HEPA Vac', type: 'SETUP', status: 'OPEN', x: 52, y: 18, parentId: 'l1', notes: 'Lavina S7 propane grinder + DiamaPro SVX3+A.' },
        { id: 'l3', title: 'VRP-111 Moisture Block + SYD-BASECOAT', type: 'SETUP', status: 'OPEN', x: 12, y: 42, parentId: 'l2', notes: 'Apply Tufflex VRP-111 and basecoat per mil spec.' },
        { id: 'l4', title: '3/4" Crumb Rubber Mats + PU Grout', type: 'SETUP', status: 'OPEN', x: 52, y: 52, parentId: 'l3', notes: 'Non-vulcanized mats + sand/granule thickened polyurethane grout.' },
        { id: 'l5', title: 'Aliphatic Topcoat & Final Sign-Off', type: 'FINALE', status: 'OPEN', x: 28, y: 76, parentId: 'l4', notes: 'Verify cure, texture, and drain perimeters.' }
      ]
    },
    retop: {
      name: '4-Year Preventive Re-Top',
      grossTake: 28000, overhead: 9500,
      cards: [
        { id: 'r1', title: 'Wear & Delamination Audit', type: 'INTEL', status: 'OPEN', x: 14, y: 12, parentId: '', notes: 'Acoustic hammer bond map + 3-inch ball rebound check.' },
        { id: 'r2', title: '49% Vinegar Chemical Prep', type: 'SETUP', status: 'OPEN', x: 52, y: 34, parentId: 'r1', notes: 'Dilute 49% industrial vinegar to strip calcium/urine off PU binder.' },
        { id: 'r3', title: 'Adhesion Prep & Aliphatic Topcoat', type: 'FINALE', status: 'OPEN', x: 26, y: 66, parentId: 'r2', notes: 'Restore slip-resistance texture and seal wear zones.' }
      ]
    },
    audit: {
      name: 'Diagnostic Facility Audit',
      grossTake: 4500, overhead: 1200,
      cards: [
        { id: 'a1', title: 'Floor Plan & Photo/Video Walk-Through', type: 'INTEL', status: 'OPEN', x: 12, y: 14, parentId: '', notes: 'Capture drains, door thresholds, wear zones, and blisters.' },
        { id: 'a2', title: 'Rebound & Acoustic Bond Mapping', type: 'SETUP', status: 'OPEN', x: 52, y: 38, parentId: 'a1', notes: 'Log 3-inch chrome ball rebound height per stall.' },
        { id: 'a3', title: 'Issue Commercial Bid Package', type: 'FINALE', status: 'OPEN', x: 26, y: 68, parentId: 'a2', notes: 'Confirm AZA soft-substrate compliance & species exclusions.' }
      ]
    }
  };

  function spawnBlueprint(key) {
    const bp = BLUEPRINTS[key];
    const facility = prompt('Facility / Zoo Name:', bp.name);
    if (!facility) return;
    const st = window.HeistBoard.getState();
    const id = 'h_' + Date.now();
    st.heists.push({
      id, name: facility, grossTake: bp.grossTake, overhead: bp.overhead,
      crew: [
        { id: 'c1', name: 'COO (Ops)', role: 'Lead', pct: 35 },
        { id: 'c2', name: 'CEO (Finance)', role: 'Partner', pct: 35 },
        { id: 'c3', name: '1099 Install Crew', role: 'Subcontractors', pct: 30 }
      ],
      cards: JSON.parse(JSON.stringify(bp.cards)),
      law: { rh: '', rebound: '', species: '', address: '', bond: 'Solid' }
    });
    st.activeId = id;
    window.HeistBoard.saveState();
    switchTab('board');
  }

  function switchTab(tab) {
    document.querySelectorAll('main > section').forEach(s => s.classList.toggle('hidden', s.id !== 'view-' + tab));
    document.querySelectorAll('#mainTabs .tab-btn').forEach(b => {
      const on = b.dataset.tab === tab;
      b.className = on ? 'tab-btn px-3 py-1 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-200 text-xs font-bold shrink-0' : 'tab-btn px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-bold shrink-0';
    });
    if (tab === 'law') renderLaw();
  }

  function renderLaw() {
    const h = window.HeistBoard.getActiveHeist();
    if (!h.law) h.law = { rh: '', rebound: '', species: '', address: '', bond: 'Solid' };
    const rhNum = Number(h.law.rh);
    const rhWarn = rhNum > 80 ? 'FAIL: >80% RH requires moisture mitigation!' : (rhNum ? 'PASS: <=80% RH' : 'Enter Tramex / RH reading');
    const sp = (h.law.species || '').toLowerCase();
    let spWarn = 'Standard Lay-A-Weigh eligible.';
    if (/swine|pig|hog|boar/.test(sp)) spWarn = 'WARNING: Rooting species (swine) excluded from standard mat system.';
    else if (/lion|tiger|cat|felid|leopard|jaguar/.test(sp)) spWarn = 'WARNING: Large clawed felids excluded from standard system.';
    else if (/chimp|ape|gorilla|orangutan|monkey|primate/.test(sp)) spWarn = 'WARNING: Primates capable of manual peeling — review spec.';
    else if (/elephant|rhino|hippo|giraffe|camel/.test(sp)) spWarn = 'AZA Compliance: 24-hr soft-substrate standard applies.';

    $('view-law').innerHTML = `<div class='space-y-3'>
      <div class='bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 space-y-2'>
        <div class='text-xs font-black uppercase tracking-wider text-emerald-400'>1-Tap Lay-A-Weigh Blueprints</div>
        <div class='grid grid-cols-3 gap-1.5'>
          <button id='bpInstall' class='py-2 px-1 rounded-lg bg-emerald-600/25 border border-emerald-500/50 text-emerald-200 text-[11px] font-bold'>9-Day Install</button>
          <button id='bpRetop' class='py-2 px-1 rounded-lg bg-amber-600/25 border border-amber-500/50 text-amber-200 text-[11px] font-bold'>4-Yr Re-Top</button>
          <button id='bpAudit' class='py-2 px-1 rounded-lg bg-sky-600/25 border border-sky-500/50 text-sky-200 text-[11px] font-bold'>Site Audit</button>
        </div>
      </div>
      <div class='bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 space-y-2'>
        <div class='text-xs font-black uppercase tracking-wider text-rose-400'>Field Diagnostics • ${h.name}</div>
        <div class='grid grid-cols-2 gap-2'>
          <label class='text-[11px] text-zinc-400'>Concrete RH (%)<input id='lawRh' type='number' value='${h.law.rh}' placeholder='e.g. 74' class='mt-1 w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white'></label>
          <label class='text-[11px] text-zinc-400'>3" Ball Rebound (in)<input id='lawReb' value='${h.law.rebound}' placeholder='e.g. 14.5' class='mt-1 w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white'></label>
        </div>
        <div class='text-[11px] font-mono ${rhNum > 80 ? 'text-rose-400' : 'text-emerald-400'}'>${rhWarn}</div>
        <div class='grid grid-cols-2 gap-2'>
          <label class='text-[11px] text-zinc-400'>Species Housed<input id='lawSpecies' value='${h.law.species}' placeholder='e.g. Elephant, Rhino' class='mt-1 w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white'></label>
          <label class='text-[11px] text-zinc-400'>Acoustic Bond<select id='lawBond' class='mt-1 w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white'><option ${h.law.bond==='Solid'?'selected':''}>Solid</option><option ${h.law.bond==='Active Bubbles'?'selected':''}>Active Bubbles</option><option ${h.law.bond==='Soft Spots / Fluid'?'selected':''}>Soft Spots / Fluid</option></select></label>
        </div>
        <div class='p-2 rounded-lg bg-black/50 border border-zinc-800 text-[11px] text-amber-300'>${spWarn}</div>
        <label class='block text-[11px] text-zinc-400'>Facility Address (Maps Routing)<div class='flex gap-1.5 mt-1'><input id='lawAddr' value='${h.law.address}' placeholder='e.g. Detroit Zoo, Royal Oak MI' class='flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white'><button id='lawMapsBtn' class='px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold'>Maps</button></div></label>
        <button id='lawSaveBtn' class='w-full py-2 rounded-xl bg-rose-600 text-white text-xs font-black'>Save Diagnostics</button>
      </div>
    </div>`;

    $('bpInstall').onclick = () => spawnBlueprint('install');
    $('bpRetop').onclick = () => spawnBlueprint('retop');
    $('bpAudit').onclick = () => spawnBlueprint('audit');
    $('lawSaveBtn').onclick = () => {
      h.law = { rh: $('lawRh').value, rebound: $('lawReb').value, species: $('lawSpecies').value, bond: $('lawBond').value, address: $('lawAddr').value };
      window.HeistBoard.saveState();
      renderLaw();
    };
    $('lawMapsBtn').onclick = () => {
      const q = encodeURIComponent($('lawAddr').value.trim() || h.name);
      window.open('https://www.google.com/maps/search/?api=1&query=' + q, '_blank');
    };
  }

  function init() {
    const nav = $('mainTabs');
    const main = document.querySelector('main');
    if (!nav || !main || $('view-law')) return;
    const btn = document.createElement('button');
    btn.dataset.tab = 'law';
    btn.className = 'tab-btn px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-bold shrink-0';
    btn.textContent = 'Lay-A-Weigh';
    nav.appendChild(btn);
    const sec = document.createElement('section');
    sec.id = 'view-law';
    sec.className = 'hidden p-3 overflow-y-auto flex-1';
    main.appendChild(sec);
    nav.addEventListener('click', e => {
      const b = e.target.closest('.tab-btn');
      if (b) switchTab(b.dataset.tab);
    });
  }
  init();
})();