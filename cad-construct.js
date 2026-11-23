(() => {
  if (window.__hbHoloLoaded) return;
  window.__hbHoloLoaded = true;
  const $ = id => document.getElementById(id);
  const STORE = 'hb_holo_state_v1';

  let THREE = null, GLTFLoader = null, renderer = null, scene = null, camera = null;
  let roomGrp = null, pinGrp = null, measGrp = null, activeMeshList = [], pinMeshes = [];
  let tool = 'inspect', ghostOn = true, cutawayOn = true, selectedPinId = null;
  let theta = 0.65, phi = 1.05, radius = 11, target = { x: 0, y: 1.5, z: 0 };
  let measPts = [], lastRawDist = 0;

  let holo = (() => {
    try {
      const s = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (s && Array.isArray(s.pins)) return s;
    } catch {}
    return {
      scanName: 'Asylum 47x65 Ghost Shell (Demo)',
      scanUrl: '',
      scaleFtPerUnit: 10,
      pins: [
        { id: 'p_1', x: -2.1, y: 0.15, z: -2.9, title: '980 sq ft Perimeter Patch', area: 'Perimeter Floor', desc: 'VersaBond scrub slurry (5.5-6 qt) + Quikrete #100450 (2.5-3 qt max). FANS OFF during pour, then 48-72 hr dry to Tramex <= 4.5%.', status: 'OPEN' },
        { id: 'p_2', x: -2.3, y: 0.9, z: 0.0, title: '11 ft Entry Wall Screed & Border', area: 'West Entry Wall', desc: 'Anchor ripped 2x4 wood screed to laser chalk line in mortar joints every 18-24 in. Encapsulate in 11 ft liquid rubber border.', status: 'OPEN' },
        { id: 'p_3', x: 0.0, y: 0.12, z: 0.2, title: '29x45 Center Checkerboard', area: 'Center Slab', desc: 'Grind & HEPA-vac 1,305 sq ft center. 2 coats white -> indirect fans -> 4x4 ScotchBlue grid -> 2 coats black -> clear aliphatic wear coat.', status: 'OPEN' }
      ]
    };
  })();

  const saveHolo = () => localStorage.setItem(STORE, JSON.stringify(holo));
  const esc = s => String(s || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const isCrew = () => !!window.HeistBoard?.isCrewMode?.();

  function fmtFt(ft) {
    const totalIn = Math.round(ft * 12);
    return `${Math.floor(totalIn / 12)}' ${totalIn % 12}" (${ft.toFixed(2)} ft)`;
  }

  function clearGroup(g) {
    if (!g) return;
    while (g.children.length) {
      const c = g.children[0];
      c.traverse?.(o => { o.geometry?.dispose?.(); if (Array.isArray(o.material)) o.material.forEach(m => m.dispose?.()); else o.material?.dispose?.(); });
      g.remove(c);
    }
  }

  function styleRoomMaterials() {
    if (!roomGrp || !THREE) return;
    roomGrp.traverse(o => {
      if (!o.isMesh || o.userData.isEdgeOverlay) return;
      if (!o.userData.origMat) o.userData.origMat = o.material;
      if (ghostOn) {
        o.material = new THREE.MeshStandardMaterial({
          color: 0x0ea5e9, emissive: 0x0369a1, emissiveIntensity: 0.45,
          transparent: true, opacity: o.userData.isDemoRoom ? 0.22 : 0.34,
          roughness: 0.25, metalness: 0.1, depthWrite: false,
          side: o.userData.isDemoRoom ? (cutawayOn ? THREE.BackSide : THREE.DoubleSide) : (cutawayOn ? THREE.FrontSide : THREE.DoubleSide)
        });
      } else {
        o.material = o.userData.origMat;
        if (o.material) {
          o.material.side = o.userData.isDemoRoom ? (cutawayOn ? THREE.BackSide : THREE.DoubleSide) : (cutawayOn ? THREE.FrontSide : THREE.DoubleSide);
          o.material.needsUpdate = true;
        }
      }
    });
  }

  function addEdgeWire(mesh, color = 0x38bdf8, op = 0.35) {
    const edges = new THREE.EdgesGeometry(mesh.geometry, 24);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color, transparent: true, opacity: op }));
    line.userData.isEdgeOverlay = true;
    mesh.add(line);
  }

  function buildDemoRoom() {
    clearGroup(roomGrp); activeMeshList = [];
    const W = 4.7, H = 1.4, L = 6.5;
    const shell = new THREE.Mesh(new THREE.BoxGeometry(W, H, L), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85, side: THREE.BackSide }));
    shell.position.set(0, H / 2, 0);
    shell.userData.isDemoRoom = true;
    addEdgeWire(shell, 0x38bdf8, 0.55);
    roomGrp.add(shell); activeMeshList.push(shell);

    const border = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.03, 4.5), new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 }));
    border.position.set(0, 0.02, 0.1);
    addEdgeWire(border, 0x22d3ee, 0.65);
    roomGrp.add(border); activeMeshList.push(border);

    radius = 9.8; target = { x: 0, y: 0.7, z: 0 };
    styleRoomMaterials();
    rebuildPins();
    if ($('holoNameLbl')) $('holoNameLbl').textContent = holo.scanName;
  }

  function normalizeAndMountGltf(gltf, name) {
    clearGroup(roomGrp); activeMeshList = [];
    const root = gltf.scene || gltf.scenes[0];
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const s = 6.5 / maxDim;
    root.scale.setScalar(s);
    root.position.set(-center.x * s, -box.min.y * s, -center.z * s);
    root.traverse(o => {
      if (o.isMesh) {
        activeMeshList.push(o);
        try { addEdgeWire(o, 0x38bdf8, 0.18); } catch {}
      }
    });
    roomGrp.add(root);
    holo.scanName = name || 'Loaded 3D Room Scan';
    radius = 9.2; target = { x: 0, y: (size.y * s) * 0.45, z: 0 };
    styleRoomMaterials();
    rebuildPins();
    if ($('holoNameLbl')) $('holoNameLbl').textContent = holo.scanName;
    if ($('holoStatus')) $('holoStatus').textContent = `Loaded (${activeMeshList.length} surfaces)`;
  }

  async function loadGlbFromBuffer(buf, name) {
    if (!GLTFLoader) { const m = await import('https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js'); GLTFLoader = m.GLTFLoader; }
    if ($('holoStatus')) $('holoStatus').textContent = 'Parsing 3D scan...';
    new GLTFLoader().parse(buf, '', gltf => normalizeAndMountGltf(gltf, name), err => { if ($('holoStatus')) $('holoStatus').textContent = 'GLB parse failed: ' + err.message; });
  }

  async function loadGlbFromUrl(url) {
    if (!url) return;
    if ($('holoStatus')) $('holoStatus').textContent = 'Downloading room scan...';
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      await loadGlbFromBuffer(await r.arrayBuffer(), url.split('/').pop().split('?')[0]);
    } catch (e) {
      if ($('holoStatus')) $('holoStatus').textContent = 'URL load failed (CORS/link): ' + e.message;
    }
  }

  function rebuildPins() {
    clearGroup(pinGrp); pinMeshes = [];
    if (!THREE || !pinGrp) return;
    holo.pins.forEach(p => {
      const done = p.status === 'DONE';
      const col = done ? 0x10b981 : 0xef4444;
      const g = new THREE.Group();
      g.position.set(p.x, p.y, p.z);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 18), new THREE.MeshBasicMaterial({ color: col }));
      orb.userData.pinId = p.id;
      const halo = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.23, 24), new THREE.MeshBasicMaterial({ color: done ? 0x34d399 : 0xf87171, side: THREE.DoubleSide, transparent: true, opacity: 0.75 }));
      halo.rotation.x = -Math.PI / 2;
      halo.userData.isHalo = true;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.7 }));
      stem.position.y = 0.18;
      orb.position.y = 0.36;
      g.add(halo, stem, orb);
      pinGrp.add(g);
      pinMeshes.push(orb);
    });
    renderPinPanel();
  }

  function drawMeasure() {
    clearGroup(measGrp);
    if (!THREE || !measGrp || !measPts.length) return;
    measPts.forEach(pt => {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
      dot.position.copy(pt); measGrp.add(dot);
    });
    if (measPts.length === 2) {
      const geo = new THREE.BufferGeometry().setFromPoints(measPts);
      measGrp.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x22d3ee })));
      lastRawDist = measPts[0].distanceTo(measPts[1]);
      const ft = lastRawDist * (holo.scaleFtPerUnit || 10);
      if ($('holoMeasOut')) $('holoMeasOut').innerHTML = `<span class='text-cyan-300 font-black'>${fmtFt(ft)}</span> <button id='holoCalBtn' class='ml-2 px-2 py-0.5 rounded bg-cyan-600 text-white text-[10px] font-black'>Calibrate</button>`;
      if ($('holoCalBtn')) $('holoCalBtn').onclick = () => {
        const real = Number(prompt('Enter true length in feet (e.g. 4 for a 4-ft level, or 47 for short wall):'));
        if (real > 0 && lastRawDist > 0) { holo.scaleFtPerUnit = real / lastRawDist; saveHolo(); drawMeasure(); }
      };
    }
  }

  function renderPinPanel() {
    const box = $('holoPinCard'); if (!box) return;
    const p = holo.pins.find(x => x.id === selectedPinId);
    if (!p) {
      box.innerHTML = `<div class='flex items-center justify-between gap-2'><span class='text-xs font-black text-rose-300'>${holo.pins.length} Red Work Pins Active</span><span class='text-[10px] text-zinc-400'>Tap any red pin to read work scope</span></div><div class='mt-2 space-y-1 max-h-36 overflow-y-auto'>${holo.pins.map(x => `<button data-selpin='${x.id}' class='w-full text-left px-2.5 py-1.5 rounded-lg bg-zinc-900 border ${x.status === 'DONE' ? 'border-emerald-500/40' : 'border-rose-500/35'} flex items-center justify-between gap-2'><span class='text-[11px] font-bold ${x.status === 'DONE' ? 'line-through text-emerald-300' : 'text-white'} truncate'>${esc(x.title)}</span><span class='text-[9px] font-mono ${x.status === 'DONE' ? 'text-emerald-400' : 'text-rose-400'} shrink-0'>${x.status}</span></button>`).join('') || `<div class='text-[11px] text-zinc-500'>Switch to Drop Red Pin and tap any wall, cabinet, or floor.</div>`}</div>`;
      box.querySelectorAll('[data-selpin]').forEach(b => b.onclick = () => { selectedPinId = b.dataset.selpin; renderPinPanel(); });
      return;
    }
    const done = p.status === 'DONE';
    box.innerHTML = `<div class='space-y-2'>
      <div class='flex items-start justify-between gap-2'>
        <div><div class='text-[10px] font-mono text-rose-400 uppercase'>${esc(p.area || 'Pinned Zone')} • ${p.status}</div><div class='text-sm font-black text-white'>${esc(p.title)}</div></div>
        <button id='hpBack' class='px-2 py-1 rounded bg-zinc-800 text-[10px] font-bold text-zinc-300 shrink-0'>All Pins</button>
      </div>
      <div class='text-xs text-zinc-200 leading-relaxed bg-zinc-900/90 border border-zinc-800 rounded-lg p-2.5'>${esc(p.desc || 'No scope description added.')}</div>
      <div class='flex gap-1.5'>
        <button id='hpToggle' class='flex-1 py-1.5 rounded-lg ${done ? 'bg-zinc-800 text-zinc-200' : 'bg-emerald-600 text-white'} text-xs font-black'>${done ? 'Reopen Pin' : 'Mark Work Done'}</button>
        ${!isCrew() ? `<button id='hpEdit' class='px-3 py-1.5 rounded-lg bg-sky-900 text-sky-200 text-xs font-bold'>Edit</button><button id='hpDel' class='px-3 py-1.5 rounded-lg bg-rose-950 text-rose-300 text-xs font-bold'>Del</button>` : ''}
      </div>
    </div>`;
    $('hpBack').onclick = () => { selectedPinId = null; renderPinPanel(); };
    $('hpToggle').onclick = () => {
      p.status = done ? 'OPEN' : 'DONE'; saveHolo(); rebuildPins();
      window.HeistBoard?.syncCrewPins?.(holo.pins);
    };
    if ($('hpEdit')) $('hpEdit').onclick = () => {
      const t = prompt('Pin title:', p.title); if (t === null) return;
      const d = prompt('Work description for this exact spot:', p.desc); if (d === null) return;
      p.title = t.trim() || p.title; p.desc = d.trim(); saveHolo(); rebuildPins();
    };
    if ($('hpDel')) $('hpDel').onclick = () => { holo.pins = holo.pins.filter(x => x.id !== p.id); selectedPinId = null; saveHolo(); rebuildPins(); };
  }

  function updateCamera() {
    if (!camera) return;
    camera.position.set(target.x + radius * Math.sin(phi) * Math.sin(theta), target.y + radius * Math.cos(phi), target.z + radius * Math.sin(phi) * Math.cos(theta));
    camera.lookAt(target.x, target.y, target.z);
  }

  function bindPointer(cv) {
    const ptrs = new Map(); let down = null, moved = false, lastDist = 0;
    cv.onpointerdown = e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); down = { x: e.clientX, y: e.clientY }; moved = false; lastDist = 0; };
    cv.onpointermove = e => {
      if (!ptrs.has(e.pointerId)) return;
      const prev = ptrs.get(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) {
        const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
        if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) moved = true;
        theta -= dx * 0.01; phi = Math.max(0.15, Math.min(2.6, phi - dy * 0.01));
      } else if (ptrs.size === 2) {
        moved = true;
        const [a, b] = [...ptrs.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (lastDist) radius = Math.max(2, Math.min(22, radius - (dist - lastDist) * 0.03));
        lastDist = dist;
      }
    };
    const up = e => {
      if (cv.hasPointerCapture(e.pointerId)) cv.releasePointerCapture(e.pointerId);
      ptrs.delete(e.pointerId);
      if (moved || !down || !THREE || !camera) return;
      const r = cv.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, camera);
      const pinHit = ray.intersectObjects(pinMeshes, false);
      if (pinHit.length && tool !== 'measure') { selectedPinId = pinHit[0].object.userData.pinId; renderPinPanel(); return; }
      const roomHit = ray.intersectObjects(activeMeshList, false);
      if (!roomHit.length) return;
      const pt = roomHit[0].point;
      if (tool === 'pin' && !isCrew()) {
        const title = prompt('Red Pin Title (e.g. Patch Wall Cracks / Upper Cabinets):');
        if (!title) return;
        const desc = prompt('Exact work instructions for this spot:') || '';
        const area = prompt('Zone label (Wall / Floor / Ceiling / Cabinet):', 'Room Surface') || 'Surface';
        const np = { id: 'p_' + Date.now(), x: Number(pt.x.toFixed(3)), y: Number(pt.y.toFixed(3)), z: Number(pt.z.toFixed(3)), title: title.trim(), desc: desc.trim(), area: area.trim(), status: 'OPEN' };
        holo.pins.push(np); selectedPinId = np.id; saveHolo(); rebuildPins();
      } else if (tool === 'measure') {
        if (measPts.length >= 2) measPts = [];
        measPts.push(pt.clone()); drawMeasure();
      }
    };
    cv.onpointerup = up; cv.onpointercancel = up;
  }

  async function bootHolo() {
    const cv = $('holoCanvas'); if (!cv) return;
    if (!THREE) { $('holoStatus').textContent = 'Booting Hologram Engine...'; THREE = await import('https://esm.sh/three@0.160.0'); }
    if (!renderer) {
      renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      scene = new THREE.Scene(); scene.background = new THREE.Color(0x030712);
      camera = new THREE.PerspectiveCamera(48, (cv.clientWidth || 340) / 360, 0.05, 120);
      scene.add(new THREE.AmbientLight(0xffffff, 0.85));
      const d1 = new THREE.DirectionalLight(0x38bdf8, 1.0); d1.position.set(6, 12, 8); scene.add(d1);
      const d2 = new THREE.DirectionalLight(0xffffff, 0.7); d2.position.set(-6, 5, -6); scene.add(d2);
      scene.add(new THREE.GridHelper(14, 28, 0x0284c7, 0x0f172a));
      roomGrp = new THREE.Group(); pinGrp = new THREE.Group(); measGrp = new THREE.Group();
      scene.add(roomGrp, pinGrp, measGrp);
      bindPointer(cv);
      const onRes = () => { const w = cv.parentElement?.clientWidth || 340; renderer.setSize(w, 360, false); camera.aspect = w / 360; camera.updateProjectionMatrix(); };
      onRes(); window.addEventListener('resize', onRes);
      let t = 0;
      const loop = () => {
        requestAnimationFrame(loop); t += 0.06;
        pinGrp.children.forEach(g => { const h = g.children.find(c => c.userData.isHalo); if (h) { const sc = 1 + Math.sin(t) * 0.28; h.scale.set(sc, sc, 1); } });
        updateCamera(); renderer.render(scene, camera);
      };
      loop();
      if (holo.scanUrl) loadGlbFromUrl(holo.scanUrl); else buildDemoRoom();
    } else { rebuildPins(); }
    $('holoStatus').textContent = 'Hologram Ready';
  }

  function renderShell() {
    const host = $('view-cad'); if (!host || $('holoCanvas')) return;
    const crew = isCrew();
    host.innerHTML = `<div class='max-w-xl mx-auto space-y-2.5 pb-10'>
      <div class='bg-zinc-900/95 border border-cyan-500/45 rounded-2xl p-3 space-y-2'>
        <div class='flex items-center justify-between gap-2'>
          <div class='min-w-0'><div class='text-[10px] font-mono uppercase text-cyan-400'>3D Site Scan Hologram</div><div id='holoNameLbl' class='text-xs font-black text-white truncate'>${esc(holo.scanName)}</div></div>
          <span id='holoStatus' class='text-[10px] font-mono text-emerald-400 shrink-0'>Ready</span>
        </div>
        ${!crew ? `<div class='grid grid-cols-3 gap-1.5'>
          <label class='py-1.5 px-2 rounded-lg bg-cyan-600/25 border border-cyan-400/60 text-center text-[11px] font-black text-cyan-200 cursor-pointer'>Load .GLB Scan<input id='holoFileIn' type='file' accept='.glb,.gltf' class='hidden'></label>
          <button id='holoUrlBtn' class='py-1.5 px-2 rounded-lg bg-zinc-950 border border-zinc-700 text-[11px] font-bold text-zinc-200'>Scan URL</button>
          <button id='holoDemoBtn' class='py-1.5 px-2 rounded-lg bg-zinc-950 border border-zinc-700 text-[11px] font-bold text-amber-300'>Asylum Shell</button>
        </div>` : ''}
        <div class='grid grid-cols-3 gap-1.5'>
          <button data-ht='inspect' class='ht-btn py-1.5 rounded-lg bg-cyan-600/30 border border-cyan-400 text-[11px] font-black text-white'>Orbit / Tap Pin</button>
          ${!crew ? `<button data-ht='pin' class='ht-btn py-1.5 rounded-lg bg-zinc-950 border border-rose-500/50 text-[11px] font-black text-rose-300'>+ Drop Red Pin</button>` : `<button id='holoCrewGhost' class='py-1.5 rounded-lg bg-zinc-950 border border-cyan-500/40 text-[11px] font-bold text-cyan-300'>Ghost: ON</button>`}
          <button data-ht='measure' class='ht-btn py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-bold text-zinc-300'>Laser Measure</button>
        </div>
        <div class='rounded-xl overflow-hidden border border-cyan-500/35 bg-[#030712]'><canvas id='holoCanvas' class='w-full h-[360px] block touch-none'></canvas></div>
        <div class='grid grid-cols-2 gap-1.5'>
          <button id='holoGhostBtn' class='py-1.5 rounded-lg bg-zinc-950 border border-cyan-500/40 text-[11px] font-bold text-cyan-300'>Ghost Hologram: ON</button>
          <button id='holoCutBtn' class='py-1.5 rounded-lg bg-zinc-950 border border-emerald-500/40 text-[11px] font-bold text-emerald-300'>Wall Cutaway: ON</button>
        </div>
        <div id='holoMeasOut' class='text-[11px] font-mono text-zinc-400 text-center'>1-finger orbit • Pinch zoom • Tap red pins for scope</div>
        <div id='holoPinCard' class='p-2.5 rounded-xl bg-zinc-950 border border-zinc-800'></div>
      </div>
    </div>`;

    host.querySelectorAll('.ht-btn').forEach(b => b.onclick = () => {
      tool = b.dataset.ht; measPts = []; drawMeasure();
      host.querySelectorAll('.ht-btn').forEach(x => x.className = x === b ? 'ht-btn py-1.5 rounded-lg bg-cyan-600/30 border border-cyan-400 text-[11px] font-black text-white' : 'ht-btn py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-bold text-zinc-300');
      $('holoMeasOut').textContent = tool === 'pin' ? 'Tap any wall, cabinet, floor, or ceiling to drop a Red Pin' : tool === 'measure' ? 'Tap Point A, then Point B on the room scan' : 'Tap any pulsing red pin to read work scope';
    });
    $('holoGhostBtn').onclick = () => { ghostOn = !ghostOn; $('holoGhostBtn').textContent = 'Ghost Hologram: ' + (ghostOn ? 'ON' : 'OFF'); styleRoomMaterials(); };
    $('holoCutBtn').onclick = () => { cutawayOn = !cutawayOn; $('holoCutBtn').textContent = 'Wall Cutaway: ' + (cutawayOn ? 'ON' : 'OFF'); styleRoomMaterials(); };
    if ($('holoFileIn')) $('holoFileIn').onchange = async e => { const f = e.target.files?.[0]; if (f) await loadGlbFromBuffer(await f.arrayBuffer(), f.name); e.target.value = ''; };
    if ($('holoUrlBtn')) $('holoUrlBtn').onclick = () => { const u = prompt('Direct .GLB scan URL (for crew sharing):', holo.scanUrl); if (u !== null) { holo.scanUrl = u.trim(); saveHolo(); if (holo.scanUrl) loadGlbFromUrl(holo.scanUrl); } };
    if ($('holoDemoBtn')) $('holoDemoBtn').onclick = () => { holo.scanUrl = ''; holo.scanName = 'Asylum 47x65 Ghost Shell (Demo)'; saveHolo(); buildDemoRoom(); };
    renderPinPanel();
  }

  function init() {
    const nav = $('mainTabs'), main = document.querySelector('main');
    if (!nav || !main || $('view-cad')) return;
    const btn = document.createElement('button'); btn.dataset.tab = 'cad';
    btn.className = 'tab-btn px-2.5 py-1 rounded-lg bg-zinc-900 border border-cyan-500/50 text-cyan-300 text-xs font-bold shrink-0';
    btn.textContent = 'Room Holo'; nav.appendChild(btn);
    const sec = document.createElement('section'); sec.id = 'view-cad'; sec.className = 'hidden p-3 overflow-y-auto flex-1'; main.appendChild(sec);
    const openCad = () => { renderShell(); bootHolo(); };
    window.HeistBoard = window.HeistBoard || {};
    window.HeistBoard.openCad = openCad;
    window.HeistBoard.getHoloState = () => ({ scanName: holo.scanName, scanUrl: holo.scanUrl, scaleFtPerUnit: holo.scaleFtPerUnit, pins: holo.pins });
    window.HeistBoard.loadHoloState = data => { if (!data) return; holo = { scanName: data.scanName || 'Shared Room', scanUrl: data.scanUrl || '', scaleFtPerUnit: data.scaleFtPerUnit || 10, pins: Array.isArray(data.pins) ? data.pins : [] }; selectedPinId = null; if (renderer) { if (holo.scanUrl) loadGlbFromUrl(holo.scanUrl); else buildDemoRoom(); } };
    nav.addEventListener('click', e => { if (e.target.closest('.tab-btn')?.dataset.tab === 'cad') openCad(); });
  }
  init();
})();