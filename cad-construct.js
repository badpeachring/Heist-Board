(() => {
  if (window.__hbCadLoaded) return;
  window.__hbCadLoaded = true;
  const $ = id => document.getElementById(id);
  const SCRATCH_KEY = 'hb_cad_scratch_v1';

  let THREE = null, renderer = null, scene = null, camera = null, rootGrp = null;
  let mode = 'asylum', glMode = false, spinning = true, explode = 0.25;
  let theta = 0.72, phi = 0.95, radius = 9.2, targetY = 0.6;
  let selectables = [], selectedMesh = null, spinNodes = [];
  let scratchParts = (() => {
    try { return JSON.parse(localStorage.getItem(SCRATCH_KEY) || '[]'); } catch { return []; }
  })();
  if (!scratchParts.length) {
    scratchParts = [
      { id: 'sp1', type: 'slab', name: 'Base Plate', w: 4, h: 0.25, d: 4, teeth: 16, y: 0, color: '#334155', note: 'Foundation datum plane' },
      { id: 'sp2', type: 'gear', name: 'Drive Gear 24T', w: 1.4, h: 0.22, d: 1.4, teeth: 24, y: 0.45, color: '#f59e0b', note: 'Primary torque gear' }
    ];
  }
  const saveScratch = () => localStorage.setItem(SCRATCH_KEY, JSON.stringify(scratchParts));

  function makeCheckerTex() {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 512;
    const ctx = cv.getContext('2d'); const sq = 512 / 8;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#111113' : '#f4f4f5';
      ctx.fillRect(c * sq, r * sq, sq, sq);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1.4, 2.2);
    return tex;
  }

  function makeGearGeo(teeth, rOut, depth) {
    const shape = new THREE.Shape();
    const rRoot = rOut * 0.80, step = (Math.PI * 2) / teeth;
    for (let i = 0; i < teeth; i++) {
      const a0 = i * step, a1 = a0 + step * 0.22, a2 = a0 + step * 0.50, a3 = a0 + step * 0.72;
      const p0x = Math.cos(a0) * rRoot, p0y = Math.sin(a0) * rRoot;
      if (i === 0) shape.moveTo(p0x, p0y); else shape.lineTo(p0x, p0y);
      shape.lineTo(Math.cos(a1) * rOut, Math.sin(a1) * rOut);
      shape.lineTo(Math.cos(a2) * rOut, Math.sin(a2) * rOut);
      shape.lineTo(Math.cos(a3) * rRoot, Math.sin(a3) * rRoot);
    }
    shape.closePath();
    const hole = new THREE.Path(); hole.absarc(0, 0, rOut * 0.26, 0, Math.PI * 2, true); shape.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1 });
    geo.rotateX(-Math.PI / 2); geo.center();
    return geo;
  }

  function makeMat(hex, opts = {}) {
    if (glMode) return new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.65, wireframe: true, transparent: true, opacity: 0.92 });
    return new THREE.MeshStandardMaterial({ color: hex, roughness: opts.rough ?? 0.55, metalness: opts.metal ?? 0.25, transparent: !!opts.op, opacity: opts.op ?? 1, map: opts.map || null });
  }

  function addPart(geo, mat, pos, meta) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(pos[0], pos[1], pos[2]);
    m.userData = { ...meta, baseY: pos[1], exp: meta.exp || 0 };
    rootGrp.add(m); selectables.push(m); return m;
  }

  function clearRoot() {
    if (!rootGrp) return;
    while (rootGrp.children.length) {
      const c = rootGrp.children[0];
      c.geometry?.dispose?.(); c.material?.dispose?.(); rootGrp.remove(c);
    }
    selectables = []; spinNodes = []; selectedMesh = null;
  }

  function buildAsylum() {
    radius = 9.5; targetY = 0.9;
    const W = 4.7, L = 6.5;
    addPart(new THREE.BoxGeometry(W, 0.14, L), makeMat(0x52525b, { rough: 0.9 }), [0, 0, 0], { name: 'Existing Scored Concrete Slab', cat: 'Subfloor Datum', dims: '47 ft x 65 ft (3,055 sq ft)', spec: 'Clean interior slab; rough delaminated rocky perimeter totaling 980 sq ft (~1" avg, 2"-4" holes).', exp: 0 });
    const screedMat = makeMat(0xd97706, { rough: 0.8 });
    addPart(new THREE.BoxGeometry(W - 0.08, 0.16, 0.12), screedMat, [0, 0.15, -L / 2 + 0.08], { name: 'Permanent Wood Screed Rails (14 Boards 2x4x16 SYP)', cat: 'Phase 1', dims: '3/4" x 1-1/2" or 3/4" x 1"', spec: '2 boxes Grip-Rite 2-1/2" masonry nails in mortar joints every 18-24". Left in place for encapsulation.', exp: 0.55 });
    addPart(new THREE.BoxGeometry(W - 0.08, 0.16, 0.12), screedMat, [0, 0.15, L / 2 - 0.08], { name: 'Permanent Wood Screed Rails (South)', cat: 'Phase 1', dims: 'Flush to laser chalk line', spec: 'Packed with wet VersaBond where mortar joints miss.', exp: 0.55 });
    addPart(new THREE.BoxGeometry(W, 0.12, L), makeMat(0x9ca3af, { rough: 0.85, op: 0.88 }), [0, 0.28, 0], { name: '980 sq ft VersaBond Slurry + Quikrete #100450 Patch', cat: 'Phase 2', dims: '175-180 Quikrete + 15-16 VersaBond • 165-204 gal water', spec: 'Locked: 2.5-3 qt/bag Quikrete (bag max 6 pt/3 qt), 5.5-6 qt VersaBond. FANS OFF during pour, then SETUP FANS 48-72 hrs until Tramex <= 4.5%.', exp: 1.15 });
    addPart(new THREE.BoxGeometry(W, 0.06, L), makeMat(0x0284c7, { rough: 0.35, metal: 0.15, op: 0.82 }), [0, 0.42, 0], { name: 'Tufflex VRP-111 Moisture-Mitigation Epoxy Primer', cat: 'Phase 4.3 (NO DRYLOK)', dims: 'Direct on bare dry 980 sq ft patch + wood screed + ground slab', spec: 'GATE: Tramex <= 4.5% & full 3,055 sq ft ground/HEPA-vacced. Apply within recoat window.', exp: 1.75 });
    addPart(new THREE.BoxGeometry(W, 0.10, L), makeMat(0x18181b, { rough: 0.35, metal: 0.15 }), [0, 0.56, 0], { name: 'ELASTA-TUFF 5000 / 1/4" Liquid Rubber + Black Topcoat', cat: 'Phase 4.4', dims: '9 ft (3 walls) / 11 ft (entry) = 1,750 sq ft (980 patch + 770 overlap)', spec: 'ELASTA-TUFF 5000 / SYD-BASECOAT + 1/4" liquid rubber (or 3/8" granule slurry) + solid black aliphatic topcoat.', exp: 2.35 });
    addPart(new THREE.BoxGeometry(2.9, 0.08, 4.5), makeMat(0xffffff, { rough: 0.3, map: glMode ? null : makeCheckerTex() }), [0, 0.72, 0.1], { name: 'Centered 4\'x4\' Black & White Checkerboard', cat: 'Phase 4.5', dims: '29 ft x 45 ft (1,305 sq ft)', spec: '2 coats white (indirect fans) + burnished ScotchBlue 4\'x4\' tape + 2 coats black (pull tape wet).', exp: 3.05 });
    addPart(new THREE.BoxGeometry(W, 0.04, L), makeMat(0x38bdf8, { rough: 0.1, metal: 0.2, op: 0.28 }), [0, 0.86, 0], { name: 'Clear Aliphatic Polyurethane/Polyaspartic Wear Coat', cat: 'Phase 4.6 Final', dims: '3,055 sq ft unified sheen', spec: 'Indirect airflow cure gate: 24 hrs min light foot traffic, 48-72 hrs heavy event furniture/staging load-in.', exp: 3.65 });
  }

  function buildWatch() {
    radius = 6.2; targetY = 0.8;
    addPart(new THREE.CylinderGeometry(2.35, 2.35, 0.16, 48), makeMat(0x94a3b8, { metal: 0.75, rough: 0.3 }), [0, 0, 0], { name: 'Machined Brass Mainplate', cat: 'Chassis Layer 0', dims: 'Dia 30.0mm x 1.2mm', spec: 'Primary structural datum plate holding all pivot jewel bearings.', exp: 0 });
    const g1 = addPart(makeGearGeo(36, 1.05, 0.22), makeMat(0xf59e0b, { metal: 0.8, rough: 0.25 }), [-0.85, 0.24, 0.2], { name: 'Mainspring Barrel (36T)', cat: 'Power Reserve', dims: '36 Teeth • High Torque', spec: 'Stores coiled spring energy and drives the Center Wheel pinion.', exp: 0.7 });
    const g2 = addPart(makeGearGeo(24, 0.72, 0.18), makeMat(0xeab308, { metal: 0.85, rough: 0.2 }), [0.55, 0.32, 0.2], { name: 'Center Wheel (24T)', cat: 'Gear Train', dims: '24 Teeth • 1.5x Speed Ratio', spec: '1 revolution per hour (drives minute hand arbor).', exp: 1.35 });
    const g3 = addPart(makeGearGeo(18, 0.56, 0.16), makeMat(0xd4d4d8, { metal: 0.9, rough: 0.18 }), [0.55, 0.42, -0.92], { name: 'Third Wheel (18T)', cat: 'Gear Train', dims: '18 Teeth • Step-Up Gear', spec: 'Transmits rotational energy from Center Wheel to Escape Wheel.', exp: 1.95 });
    const g4 = addPart(makeGearGeo(15, 0.46, 0.14), makeMat(0x38bdf8, { metal: 0.85, rough: 0.15 }), [-0.45, 0.50, -1.05], { name: 'Escape Wheel (15T)', cat: 'Escapement', dims: '15 Impulse Teeth', spec: 'Locks and releases discrete energy impulses to the Balance Wheel.', exp: 2.55 });
    const bal = addPart(new THREE.TorusGeometry(0.62, 0.06, 12, 36), makeMat(0xf43f5e, { metal: 0.7, rough: 0.25 }), [-1.15, 0.65, -0.7], { name: 'Oscillating Balance Wheel', cat: 'Regulator', dims: '28,800 vph (4 Hz)', spec: 'Timekeeping heart: oscillates back and forth via hairspring.', exp: 3.1 });
    bal.rotation.x = Math.PI / 2;
    addPart(new THREE.CylinderGeometry(0.14, 0.14, 0.26, 16), makeMat(0xe11d48, { metal: 0.3, rough: 0.1 }), [0.55, 0.56, 0.2], { name: 'Synthetic Ruby Jewel Bearing', cat: 'Friction Reduction', dims: 'Corundum Al2O3 Pivot', spec: 'Reduces metal-on-metal wear at high-load gear arbors.', exp: 3.45 });
    addPart(new THREE.CylinderGeometry(2.38, 2.38, 0.08, 48), makeMat(0x38bdf8, { op: 0.22, rough: 0.05 }), [0, 0.95, 0], { name: 'Anti-Reflective Sapphire Crystal', cat: 'Top Shield', dims: 'Mohs 9 Hardness', spec: 'Seals the gear assembly while displaying internal mechanics.', exp: 4.1 });
    spinNodes = [{ m: g1, s: 0.35 }, { m: g2, s: -0.525 }, { m: g3, s: 0.7 }, { m: g4, s: -1.1 }, { m: bal, osc: true }];
  }

  function buildScratch() {
    radius = 7.5; targetY = 0.8;
    scratchParts.forEach((p, idx) => {
      let geo;
      if (p.type === 'gear') geo = makeGearGeo(Math.max(8, Number(p.teeth) || 18), Math.max(0.3, Number(p.w) / 2), Math.max(0.1, Number(p.h) || 0.2));
      else if (p.type === 'cyl') geo = new THREE.CylinderGeometry(Number(p.w) / 2, Number(p.w) / 2, Number(p.h), 32);
      else if (p.type === 'ring') { geo = new THREE.TorusGeometry(Number(p.w) / 2, Math.max(0.05, Number(p.h) / 3), 12, 32); geo.rotateX(Math.PI / 2); }
      else geo = new THREE.BoxGeometry(Number(p.w) || 2, Number(p.h) || 0.2, Number(p.d) || 2);
      const m = addPart(geo, makeMat(p.color || '#10b981'), [0, Number(p.y) || 0, 0], { name: p.name, cat: `Custom ${p.type.toUpperCase()}`, dims: `W:${p.w} H:${p.h} D:${p.d}${p.type === 'gear' ? ' • ' + p.teeth + 'T' : ''}`, spec: p.note || 'Custom scratch construct part.', exp: idx * 0.7 });
      if (p.type === 'gear') spinNodes.push({ m, s: idx % 2 === 0 ? 0.55 : -0.55 });
    });
  }

  function rebuildScene() {
    if (!THREE || !rootGrp) return;
    clearRoot();
    if (mode === 'asylum') buildAsylum(); else if (mode === 'watch') buildWatch(); else buildScratch();
    applyExplode(); updateInspector(null); renderScratchList();
  }

  function applyExplode() { selectables.forEach(m => { m.position.y = m.userData.baseY + explode * (m.userData.exp || 0); }); }

  function updateCamera() {
    if (!camera) return;
    camera.position.set(radius * Math.sin(phi) * Math.sin(theta), targetY + radius * Math.cos(phi), radius * Math.sin(phi) * Math.cos(theta));
    camera.lookAt(0, targetY + explode * 1.1, 0);
  }

  function updateInspector(mesh) {
    const box = $('cadInspector'); if (!box) return;
    if (!mesh) { box.innerHTML = `<div class='text-xs font-bold text-emerald-300'>Tap any 3D layer or gear to inspect it</div><div class='text-[10px] text-zinc-400 mt-0.5'>Drag with 1 finger to orbit • Pinch or slide Zoom • Drag Explode to scroll material planes</div>`; return; }
    const u = mesh.userData;
    box.innerHTML = `<div class='flex items-center justify-between gap-2'><span class='text-xs font-black text-white'>${u.name}</span><span class='px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-[9px] font-mono text-emerald-300 shrink-0'>${u.cat}</span></div><div class='text-[10px] font-mono text-cyan-300 mt-1'>${u.dims}</div><div class='text-[11px] text-zinc-300 mt-1'>${u.spec}</div>`;
  }

  function renderScratchList() {
    const wrap = $('cadScratchPanel'); if (!wrap) return;
    wrap.classList.toggle('hidden', mode !== 'scratch'); if (mode !== 'scratch') return;
    $('cadScratchItems').innerHTML = scratchParts.map((p, i) => `<div class='flex items-center justify-between gap-2 p-2 rounded-lg bg-zinc-950 border border-zinc-800'><div class='min-w-0'><div class='text-xs font-bold text-white truncate'>${p.name} <span class='text-[10px] text-emerald-400'>(${p.type})</span></div><div class='text-[10px] font-mono text-zinc-400'>Y:${p.y} • W:${p.w} H:${p.h}</div></div><button data-rmp='${i}' class='px-2 py-1 rounded bg-rose-950 text-rose-300 text-[10px] font-bold shrink-0'>Del</button></div>`).join('');
    $('cadScratchItems').querySelectorAll('[data-rmp]').forEach(b => b.onclick = () => { scratchParts.splice(Number(b.dataset.rmp), 1); saveScratch(); rebuildScene(); });
  }

  async function bootThree() {
    const cv = $('cadCanvas'); if (!cv) return;
    if (!THREE) { $('cadStatus').textContent = 'Loading Three.js WebGL CAD...'; THREE = await import('https://esm.sh/three@0.160.0'); }
    if (!renderer) {
      renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      scene = new THREE.Scene(); scene.background = new THREE.Color(0x05080f);
      camera = new THREE.PerspectiveCamera(45, (cv.clientWidth || 340) / 340, 0.1, 100);
      scene.add(new THREE.AmbientLight(0xffffff, 0.65));
      const dl = new THREE.DirectionalLight(0xffffff, 1.1); dl.position.set(6, 12, 8); scene.add(dl);
      const pl = new THREE.PointLight(0x10b981, 0.9, 25); pl.position.set(-5, 6, -5); scene.add(pl);
      scene.add(new THREE.GridHelper(12, 24, 0x10b981, 0x1e293b));
      rootGrp = new THREE.Group(); scene.add(rootGrp);
      bindCanvasPointer(cv);
      const onRes = () => { const w = cv.parentElement?.clientWidth || 340; renderer.setSize(w, 340, false); camera.aspect = w / 340; camera.updateProjectionMatrix(); };
      onRes(); window.addEventListener('resize', onRes);
      let t = 0;
      const loop = () => {
        requestAnimationFrame(loop);
        if (spinning) { t += 0.03; spinNodes.forEach(n => { if (n.osc) n.m.rotation.z = Math.sin(t * 2.2) * 0.9; else n.m.rotation.y += n.s * 0.025; }); }
        updateCamera(); renderer.render(scene, camera);
      };
      loop();
    }
    $('cadStatus').textContent = 'WebGL 3D CAD Active';
    rebuildScene();
  }

  function bindCanvasPointer(cv) {
    const ptrs = new Map(); let downPos = null, moved = false, lastDist = 0;
    cv.onpointerdown = e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); downPos = { x: e.clientX, y: e.clientY }; moved = false; lastDist = 0; };
    cv.onpointermove = e => {
      if (!ptrs.has(e.pointerId)) return;
      const prev = ptrs.get(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) { const dx = e.clientX - prev.x, dy = e.clientY - prev.y; if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 6) moved = true; theta -= dx * 0.01; phi = Math.max(0.18, Math.min(1.48, phi - dy * 0.01)); }
      else if (ptrs.size === 2) { moved = true; const [a, b] = [...ptrs.values()]; const dist = Math.hypot(a.x - b.x, a.y - b.y); if (lastDist) radius = Math.max(2.5, Math.min(18, radius - (dist - lastDist) * 0.025)); lastDist = dist; }
    };
    const up = e => {
      if (cv.hasPointerCapture(e.pointerId)) cv.releasePointerCapture(e.pointerId);
      ptrs.delete(e.pointerId);
      if (!moved && downPos && THREE && camera) {
        const r = cv.getBoundingClientRect();
        const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, camera);
        const hits = ray.intersectObjects(selectables, false);
        selectables.forEach(m => { if (!glMode && m.material?.emissive) m.material.emissive.setHex(0x000000); });
        if (hits.length) { selectedMesh = hits[0].object; if (!glMode && selectedMesh.material?.emissive) selectedMesh.material.emissive.setHex(0x10b981); updateInspector(selectedMesh); }
      }
    };
    cv.onpointerup = up; cv.onpointercancel = up;
  }

  function renderShell() {
    const host = $('view-cad'); if (!host || $('cadCanvas')) return;
    host.innerHTML = `<div class='max-w-xl mx-auto space-y-2.5 pb-10'>
      <div class='bg-zinc-900/95 border border-emerald-500/45 rounded-2xl p-3 space-y-2'>
        <div class='flex items-center justify-between gap-2'><div><div class='text-[10px] font-mono uppercase text-emerald-400'>3D Construct Engine</div><div class='text-sm font-black text-white'>CAD MATERIAL PLANE &amp; MICRO-GEARS</div></div><span id='cadStatus' class='text-[10px] font-mono text-zinc-400'>Ready</span></div>
        <div class='grid grid-cols-3 gap-1.5'>
          <button data-cm='asylum' class='cad-m py-1.5 rounded-lg bg-emerald-600/30 border border-emerald-400 text-[11px] font-black text-white'>Asylum 47x65</button>
          <button data-cm='watch' class='cad-m py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-bold text-zinc-300'>Watch Gears</button>
          <button data-cm='scratch' class='cad-m py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-bold text-zinc-300'>Scratch Lab</button>
        </div>
        <div class='rounded-xl overflow-hidden border border-emerald-500/35 bg-[#05080f]'><canvas id='cadCanvas' class='w-full h-[340px] block touch-none'></canvas></div>
        <div class='grid grid-cols-2 gap-2.5'>
          <div><div class='flex justify-between text-[10px]'><span class='font-bold text-emerald-300'>Explode Material Planes</span><span id='cadExpVal' class='font-mono text-white'>25%</span></div><input id='cadExpIn' type='range' min='0' max='100' value='25' class='w-full accent-emerald-400'></div>
          <div><div class='flex justify-between text-[10px]'><span class='font-bold text-cyan-300'>Camera Zoom</span><span id='cadZoomVal' class='font-mono text-white'>9.2</span></div><input id='cadZoomIn' type='range' min='3' max='16' step='0.2' value='9.2' class='w-full accent-cyan-400'></div>
        </div>
        <div class='grid grid-cols-2 gap-1.5'>
          <button id='cadGlBtn' class='py-1.5 rounded-lg bg-zinc-950 border border-emerald-500/40 text-[11px] font-black text-emerald-300'>GL Construct Wireframe: OFF</button>
          <button id='cadSpinBtn' class='py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-[11px] font-bold text-amber-300'>Mechanism Spin: ON</button>
        </div>
        <div id='cadInspector' class='p-2.5 rounded-xl bg-zinc-950 border border-zinc-800'></div>
      </div>
      <div id='cadScratchPanel' class='hidden bg-zinc-900/95 border border-amber-500/40 rounded-2xl p-3 space-y-2'>
        <div class='text-xs font-black text-amber-300'>Build From Scratch - Add 3D Component</div>
        <div class='grid grid-cols-2 gap-1.5'>
          <input id='spName' placeholder='Part name (e.g. Pinion 12T)' class='bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white'>
          <select id='spType' class='bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white'><option value='gear'>Toothed Gear</option><option value='slab'>Slab / Plane</option><option value='cyl'>Cylinder / Shaft</option><option value='ring'>Ring / Bearing</option></select>
        </div>
        <div class='grid grid-cols-4 gap-1.5'>
          <input id='spW' type='number' step='0.2' value='1.6' class='bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white'>
          <input id='spH' type='number' step='0.1' value='0.25' class='bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white'>
          <input id='spY' type='number' step='0.2' value='0.9' class='bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white'>
          <input id='spT' type='number' value='20' class='bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white'>
        </div>
        <input id='spNote' placeholder='Material / function note...' class='w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white'>
        <button id='spAddBtn' class='w-full py-2 rounded-xl bg-emerald-600 text-white text-xs font-black'>+ Spawn Component Into Construct</button>
        <div id='cadScratchItems' class='space-y-1.5'></div>
      </div>
    </div>`;
    host.querySelectorAll('.cad-m').forEach(b => b.onclick = () => {
      mode = b.dataset.cm;
      host.querySelectorAll('.cad-m').forEach(x => x.className = x === b ? 'cad-m py-1.5 rounded-lg bg-emerald-600/30 border border-emerald-400 text-[11px] font-black text-white' : 'cad-m py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-bold text-zinc-300');
      rebuildScene();
    });
    $('cadExpIn').oninput = e => { explode = Number(e.target.value) / 100; $('cadExpVal').textContent = e.target.value + '%'; applyExplode(); };
    $('cadZoomIn').oninput = e => { radius = Number(e.target.value); $('cadZoomVal').textContent = radius.toFixed(1); };
    $('cadGlBtn').onclick = () => { glMode = !glMode; $('cadGlBtn').textContent = 'GL Construct Wireframe: ' + (glMode ? 'ON' : 'OFF'); rebuildScene(); };
    $('cadSpinBtn').onclick = () => { spinning = !spinning; $('cadSpinBtn').textContent = 'Mechanism Spin: ' + (spinning ? 'ON' : 'OFF'); };
    $('spAddBtn').onclick = () => {
      const name = $('spName').value.trim() || 'Part ' + (scratchParts.length + 1);
      scratchParts.push({ id: 'sp_' + Date.now(), type: $('spType').value, name, w: Number($('spW').value) || 1.5, h: Number($('spH').value) || 0.2, d: Number($('spW').value) || 1.5, y: Number($('spY').value) || 0, teeth: Number($('spT').value) || 18, color: '#10b981', note: $('spNote').value.trim() });
      $('spName').value = ''; $('spNote').value = '';
      saveScratch(); rebuildScene();
    };
  }

  function init() {
    const nav = $('mainTabs'), main = document.querySelector('main');
    if (!nav || !main || $('view-cad')) return;
    const btn = document.createElement('button');
    btn.dataset.tab = 'cad';
    btn.className = 'tab-btn px-2.5 py-1 rounded-lg bg-zinc-900 border border-emerald-500/50 text-emerald-300 text-xs font-bold shrink-0';
    btn.textContent = '3D CAD';
    nav.appendChild(btn);
    const sec = document.createElement('section');
    sec.id = 'view-cad';
    sec.className = 'hidden p-3 overflow-y-auto flex-1';
    main.appendChild(sec);
    const openCad = () => { renderShell(); bootThree(); };
    if (window.HeistBoard) window.HeistBoard.openCad = openCad;
    nav.addEventListener('click', e => { if (e.target.closest('.tab-btn')?.dataset.tab === 'cad') openCad(); });
  }
  init();
})();