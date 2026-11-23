(() => {
  if (window.__hbHoloLoaded) return;
  window.__hbHoloLoaded = true;
  const $ = id => document.getElementById(id);
  const STORE = 'hb_holo_state_v2';
  const SCAN_APP_KEY = 'hb_scan_app_url_v1';

  let THREE = null, GLTFLoader = null, renderer = null, scene = null, camera = null;
  let roomGrp = null, pinGrp = null, measGrp = null, activeMeshList = [], pinMeshes = [];
  let tool = 'inspect', holoMode = 'ghost', cutawayOn = true, selectedPinId = null;
  let theta = 0.65, phi = 1.05, radius = 10.5, target = { x: 0, y: 1.2, z: 0 };
  let measPts = [], lastRawDist = 0;

  let holo = (() => {
    try {
      const s = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (s && Array.isArray(s.pins)) return s;
    } catch {}
    return {
      scanName: 'Asylum 47x65 Hologram Shell',
      scanUrl: '',
      scaleFtPerUnit: 10,
      pins: [
        { id: 'p_1', x: -2.0, y: 0.12, z: -2.8, title: '980 sq ft Perimeter Patch & Water', area: 'Perimeter Floor', desc: '175-180 bags Quikrete #100450 (2.5-3 qt max) + 15-16 VersaBond (5.5-6 qt). 165-204 gal total water. FANS OFF during pour; SETUP FANS 48-72 hrs after 2-4 hr set until Tramex <= 4.5%.', link: '', status: 'OPEN' },
        { id: 'p_2', x: -2.3, y: 0.85, z: 0.0, title: '11 ft Entry Wall Screed & Rubber Border', area: 'West Entry Wall', desc: '14 SYP 2x4x16 boards ripped to 3/4x1-1/2 or 3/4x1; Grip-Rite 2-1/2in masonry nails in mortar joints every 18-24in. Encapsulate in 11 ft (132in) liquid rubber border (1,750 sq ft total border).', link: '', status: 'OPEN' },
        { id: 'p_3', x: 0.0, y: 0.1, z: 0.2, title: '29x45 Center Checkerboard & VRP-111', area: 'Center Slab (1,305 sq ft)', desc: 'NO DRYLOK. Grind & HEPA-vac full 3,055 sq ft -> Tufflex VRP-111 -> ELASTA-TUFF 5000 / 1/4in rubber border -> 2 coats white -> indirect fans -> 4x4 ScotchBlue grid -> 2 coats black -> clear aliphatic wear coat.', link: '', status: 'OPEN' }
      ]
    };
  })();

  const saveHolo = () => localStorage.setItem(STORE, JSON.stringify(holo));
  const esc = s => String(s || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const isCrew = () => !!window.HeistBoard?.isCrewMode?.();
  const getScanUrl = () => localStorage.getItem(SCAN_APP_KEY) || 'https://kiriengine.app/';

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

  function addEdgeWire(mesh, color = 0x22d3ee, op = 0.75) {
    const edges = new THREE.EdgesGeometry(mesh.geometry, 20);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color, transparent: true, opacity: op }));
    line.userData.isEdgeOverlay = true;
    mesh.add(line);
  }

  function styleRoomMaterials() {
    if (!roomGrp || !THREE) return;
    const side = cutawayOn ? THREE.BackSide : THREE.DoubleSide;
    roomGrp.traverse(o => {
      if (!o.isMesh || o.userData.isEdgeOverlay) return;
      if (!o.userData.origMat) o.userData.origMat = o.material;
      if (holoMode === 'ghost') {
        o.material = new THREE.MeshBasicMaterial({
          color: o.userData.isSlab ? 0x06b6d4 : 0x0284c7,
          wireframe: !o.userData.isSlab,
          transparent: true,
          opacity: o.userData.isSlab ? 0.24 : 0.38,
          depthWrite: false,
          side
        });
      } else if (holoMode === 'xray') {
        o.material = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          wireframe: true,
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
          side
        });
      } else {
        o.material = o.userData.origMat;
        if (o.material) { o.material.side = side; o.material.needsUpdate = true; }
      }
    });
  }

  function buildDemoRoom() {
    clearGroup(roomGrp); activeMeshList = [];
    const W = 4.7, H = 1.6, L = 6.5;
    const shell = new THREE.Mesh(new THREE.BoxGeometry(W, H, L), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, side: THREE.BackSide }));
    shell.position.set(0, H / 2, 0);
    shell.userData.isDemoRoom = true;
    addEdgeWire(shell, 0x38bdf8, 0.85);
    roomGrp.add(shell); activeMeshList.push(shell);

    const slab = new THREE.Mesh(new THREE.BoxGeometry(W, 0.06, L), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 }));
    slab.position.set(0, 0.03, 0);
    slab.userData.isSlab = true;
    addEdgeWire(slab, 0x06b6d4, 0.5);
    roomGrp.add(slab); activeMeshList.push(slab);

    const cb = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.04, 4.5), new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4 }));
    cb.position.set(0, 0.07, 0.1);
    addEdgeWire(cb, 0xf43f5e, 0.65);
    roomGrp.add(cb); activeMeshList.push(cb);

    radius = 10.5; target = { x: 0, y: 0.75, z: 0 };
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
    const s = 6.5 / (Math.max(size.x, size.y, size.z) || 1);
    root.scale.setScalar(s);
    root.position.set(-center.x * s, -box.min.y * s, -center.z * s);
    root.traverse(o => {
      if (o.isMesh) {
        activeMeshList.push(o);
        try { addEdgeWire(o, 0x22d3ee, 0.25); } catch {}
      }
    });
    roomGrp.add(root);
    holo.scanName = name || 'Imported 3D Scan';
    radius = 9.2; target = { x: 0, y: (size.y * s) * 0.45, z: 0 };
    styleRoomMaterials();
    rebuildPins();
    if ($('holoNameLbl')) $('holoNameLbl').textContent = holo.scanName;
    if ($('holoStatus')) $('holoStatus').textContent = `3D Scan Loaded (${activeMeshList.length} meshes)`;
  }

  async function loadGlbFromBuffer(buf, name) {
    if (!GLTFLoader) { const m = await import('https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js'); GLTFLoader = m.GLTFLoader; }
    if ($('holoStatus')) $('holoStatus').textContent = 'Importing .GLB...';
    new GLTFLoader().parse(buf, '', gltf => normalizeAndMountGltf(gltf, name), err => { if ($('holoStatus')) $('holoStatus').textContent = 'Import error: ' + err.message; });
  }

  async function loadGlbFromUrl(url) {
    if (!url) return;
    if ($('holoStatus')) $('holoStatus').textContent = 'Fetching scan...';
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      await loadGlbFromBuffer(await r.arrayBuffer(), url.split('/').pop().split('?')[0] || 'Remote Scan.glb');
    } catch (e) {
      if ($('holoStatus')) $('holoStatus').textContent = 'URL load failed: ' + e.message;
    }
  }

  function rebuildPins() {
    clearGroup(pinGrp); pinMeshes = [];
    if (!THREE || !pinGrp) return;
    holo.pins.forEach(p => {
      const done = p.status === 'DONE';
      const col = done ? 0x10b981 : 0xef4444;
      const sel = p.id === selectedPinId;
      const g = new THREE.Group();
      g.position.set(p.x, p.y, p.z);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(sel ? 0.17 : 0.13, 18, 18), new THREE.MeshBasicMaterial({ color: col }));
      orb.userData.pinId = p.id;
      orb.position.y = 0.36;
      const halo = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.28, 28), new THREE.MeshBasicMaterial({ color: done ? 0x34d399 : 0xf87171, side: THREE.DoubleSide, transparent: true, opacity: sel ? 1 : 0.85 }));
      halo.rotation.x = -Math.PI / 2;
      halo.position.y = 0.04;
      halo.userData.isHalo = true;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.36, 8), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8 }));
      stem.position.y = 0.18;
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
      measGrp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(measPts), new THREE.LineBasicMaterial({ color: 0x22d3ee })));
      lastRawDist = measPts[0].distanceTo(measPts[1]);
      const ft = lastRawDist * (holo.scaleFtPerUnit || 10);
      if ($('holoMeasOut')) $('holoMeasOut').innerHTML = `<span class='text-cyan-300 font-black'>${fmtFt(ft)}</span> <button id='holoCalBtn' class='ml-2 px-2 py-0.5 rounded bg-cyan-600 text-white text-[10px] font-black'>Calibrate</button>`;
      if ($('holoCalBtn')) $('holoCalBtn').onclick = () => {
        const real = Number(prompt('Enter true measurement in feet (e.g. 4 for a 4-ft level or 47 for wall):'));
        if (real > 0 && lastRawDist > 0) { holo.scaleFtPerUnit = real / lastRawDist; saveHolo(); drawMeasure(); }
      };
    }
  }

  function safeLink(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    const url = /^https?:\/\//i.test(s) ? s : 'https://' + s;
    return /^https?:\/\//i.test(url) ? url : '';
  }

  function renderPinPanel() {
    const box = $('holoPinCard'); if (!box) return;
    const p = holo.pins.find(x => x.id === selectedPinId);
    if (!p) {
      box.innerHTML = `<div class='flex items-center justify-between gap-2'><span class='text-xs font-black text-rose-300'>${holo.pins.length} Red Work Halos Active</span><span class='text-[10px] text-zinc-400'>Tap red pin to open scope &amp; links</span></div><div class='mt-2 space-y-1.5 max-h-44 overflow-y-auto'>${holo.pins.map(x => `<button data-selpin='${x.id}' class='w-full text-left px-2.5 py-2 rounded-xl bg-zinc-900 border ${x.status === 'DONE' ? 'border-emerald-500/40' : 'border-rose-500/40'} flex items-center justify-between gap-2'><div class='min-w-0'><div class='text-xs font-bold ${x.status === 'DONE' ? 'line-through text-emerald-300' : 'text-white'} truncate'>${esc(x.title)}</div><div class='text-[10px] text-zinc-400 truncate'>${esc(x.area || 'Surface')} ${x.link ? '• Link attached' : ''}</div></div><span class='text-[9px] font-mono ${x.status === 'DONE' ? 'text-emerald-400' : 'text-rose-400'} shrink-0'>${x.status}</span></button>`).join('') || `<div class='text-[11px] text-zinc-500'>Tap + Drop Red Pin above, then tap any spot on the 3D room.</div>`}</div>`;
      box.querySelectorAll('[data-selpin]').forEach(b => b.onclick = () => { selectedPinId = b.dataset.selpin; rebuildPins(); });
      return;
    }
    const done = p.status === 'DONE';
    const href = safeLink(p.link);
    box.innerHTML = `<div class='space-y-2'>
      <div class='flex items-start justify-between gap-2'>
        <div><div class='text-[10px] font-mono text-rose-400 uppercase'>${esc(p.area || 'Pinned Zone')} • ${p.status}</div><div class='text-sm font-black text-white'>${esc(p.title)}</div></div>
        <button id='hpBack' class='px-2.5 py-1 rounded-lg bg-zinc-800 text-[10px] font-bold text-zinc-300 shrink-0'>All Pins</button>
      </div>
      <div class='text-xs text-zinc-200 leading-relaxed bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5 whitespace-pre-line'>${esc(p.desc || 'No work notes added yet.')}</div>
      ${href ? `<a href='${esc(href)}' target='_blank' rel='noopener noreferrer' class='flex items-center justify-between px-3 py-2 rounded-xl bg-sky-950/80 border border-sky-400/50 text-xs font-black text-sky-300'><span>Open Attached Reference / Spec Link</span><span>➔</span></a>` : ''}
      <div class='flex gap-1.5'>
        <button id='hpToggle' class='flex-1 py-1.5 rounded-lg ${done ? 'bg-zinc-800 text-zinc-200' : 'bg-emerald-600 text-white'} text-xs font-black'>${done ? 'Reopen Pin' : 'Mark Done'}</button>
        ${!isCrew() ? `<button id='hpEdit' class='px-3 py-1.5 rounded-lg bg-sky-900 text-sky-200 text-xs font-bold'>Edit</button><button id='hpDel' class='px-3 py-1.5 rounded-lg bg-rose-950 text-rose-300 text-xs font-bold'>Del</button>` : ''}
      </div>
    </div>`;
    $('hpBack').onclick = () => { selectedPinId = null; rebuildPins(); };
    $('hpToggle').onclick = () => {
      p.status = done ? 'OPEN' : 'DONE'; saveHolo(); rebuildPins();
      window.HeistBoard?.syncCrewPins?.(holo.pins);
    };
    if ($('hpEdit')) $('hpEdit').onclick = () => {
      const t = prompt('Pin title:', p.title); if (t === null) return;
      const d = prompt('Work description & steps for this spot:', p.desc); if (d === null) return;
      const lk = prompt('Reference / spec / photo link URL (optional):', p.link || ''); if (lk === null) return;
      p.title = t.trim() || p.title; p.desc = d.trim(); p.link = lk.trim(); saveHolo(); rebuildPins();
    };
    if ($('hpDel')) $('hpDel').onclick = () => { holo.pins = holo.pins.filter(x => x.id !== p.id); selectedPinId = null; saveHolo(); rebuildPins(); };
  }

  function setTool(nextTool) {
    tool = nextTool; measPts = []; drawMeasure();
    document.querySelectorAll('.ht-btn').forEach(x => {
      const active = x.dataset.ht === tool;
      x.className = active
        ? 'ht-btn py-2 px-2 rounded-xl border text-[11px] font-black bg-rose-600/35 border-rose-400 text-white'
        : 'ht-btn py-2 px-2 rounded-xl border text-[11px] font-bold bg-zinc-950 border-zinc-800 text-zinc-300';
    });
    if ($('holoMeasOut')) {
      $('holoMeasOut').textContent = tool === 'pin'
        ? 'RED PIN MODE ON: Tap anywhere on the 3D wall, floor, cabinet, or ceiling to drop a red halo.'
        : tool === 'measure'
        ? 'MEASURE MODE ON: Tap Point A, then Point B on the 3D scan.'
        : '1-finger orbit • Pinch zoom • Tap any red pin for work notes & links';
    }
  }

  function cycleHoloMode() {
    holoMode = holoMode === 'ghost' ? 'xray' : holoMode === 'xray' ? 'solid' : 'ghost';
    const lbl = holoMode === 'ghost' ? 'Hologram: GHOST' : holoMode === 'xray' ? 'Hologram: X-RAY' : 'Hologram: SOLID';
    if ($('holoGhostBtn')) $('holoGhostBtn').textContent = lbl;
    styleRoomMaterials();
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
        if (lastDist) radius = Math.max(2, Math.min(24, radius - (dist - lastDist) * 0.03));
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
      if (pinHit.length && tool !== 'measure') { selectedPinId = pinHit[0].object.userData.pinId; rebuildPins(); return; }
      const roomHit = ray.intersectObjects(activeMeshList, false);
      if (!roomHit.length) return;
      const pt = roomHit[0].point;
      if (tool === 'pin' && !isCrew()) {
        const title = prompt('Red Pin Title (e.g. Cabinet Trim / Ceiling Seam / Wall Patch):');
        if (!title) return;
        const area = prompt('Area / Surface (Wall, Floor, Ceiling, Cabinet):', 'Room Surface') || 'Surface';
        const desc = prompt('Work instructions / specs for this exact spot:') || '';
        const link = prompt('Reference / guide / photo URL (optional):', '') || '';
        const np = { id: 'p_' + Date.now(), x: Number(pt.x.toFixed(3)), y: Number(pt.y.toFixed(3)), z: Number(pt.z.toFixed(3)), title: title.trim(), area: area.trim(), desc: desc.trim(), link: link.trim(), status: 'OPEN' };
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
    if (!THREE) { if ($('holoStatus')) $('holoStatus').textContent = 'Booting Hologram...'; THREE = await import('https://esm.sh/three@0.160.0'); }
    if (!renderer) {
      renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      scene = new THREE.Scene(); scene.background = new THREE.Color(0x030712);
      camera = new THREE.PerspectiveCamera(48, (cv.clientWidth || 340) / 360, 0.05, 120);
      scene.add(new THREE.AmbientLight(0xffffff, 0.9));
      const d1 = new THREE.DirectionalLight(0x38bdf8, 1.1); d1.position.set(6, 12, 8); scene.add(d1);
      const d2 = new THREE.DirectionalLight(0xffffff, 0.7); d2.position.set(-6, 5, -6); scene.add(d2);
      scene.add(new THREE.GridHelper(14, 28, 0x0284c7, 0x0f172a));
      roomGrp = new THREE.Group(); pinGrp = new THREE.Group(); measGrp = new THREE.Group();
      scene.add(roomGrp, pinGrp, measGrp);
      bindPointer(cv);
      const onRes = () => { const w = cv.parentElement?.clientWidth || 340; renderer.setSize(w, 360, false); camera.aspect = w / 360; camera.updateProjectionMatrix(); };
      onRes(); window.addEventListener('resize', onRes);
      let t = 0;
      const loop = () => {
        requestAnimationFrame(loop); t += 0.07;
        pinGrp.children.forEach(g => { const h = g.children.find(c => c.userData.isHalo); if (h) { const sc = 1 + Math.sin(t) * 0.35; h.scale.set(sc, sc, 1); } });
        updateCamera(); renderer.render(scene, camera);
      };
      loop();
      if (holo.scanUrl) loadGlbFromUrl(holo.scanUrl); else buildDemoRoom();
    } else { styleRoomMaterials(); rebuildPins(); }
    if ($('holoStatus')) $('holoStatus').textContent = 'Hologram Ready';
  }

  function renderShell() {
    const host = $('view-cad'); if (!host || $('holoCanvas')) return;
    const crew = isCrew();
    const scanAppLink = safeLink(getScanUrl()) || 'https://kiriengine.app/';
    host.innerHTML = `<div class='max-w-xl mx-auto space-y-2.5 pb-12'>
      <div class='bg-zinc-900/95 border border-cyan-500/45 rounded-2xl p-3 space-y-2.5'>
        <div class='flex items-center justify-between gap-2'>
          <div class='min-w-0'><div class='text-[10px] font-mono uppercase text-cyan-400'>3D Site Scan Hologram</div><div id='holoNameLbl' class='text-xs font-black text-white truncate'>${esc(holo.scanName)}</div></div>
          <span id='holoStatus' class='text-[10px] font-mono text-emerald-400 shrink-0'>Ready</span>
        </div>

        ${!crew ? `<div class='grid grid-cols-3 gap-1.5'>
          <label class='py-2 px-2 rounded-xl bg-cyan-600/25 border border-cyan-400/60 text-center text-[11px] font-black text-cyan-200 cursor-pointer'>Import .GLB<input id='holoFileIn' type='file' accept='.glb,.gltf' class='hidden'></label>
          <button id='holoUrlBtn' class='py-2 px-2 rounded-xl bg-zinc-950 border border-zinc-700 text-[11px] font-bold text-zinc-200'>Scan URL</button>
          <a href='${esc(scanAppLink)}' target='_blank' rel='noopener noreferrer' id='holoLaunchScanBtn' class='py-2 px-2 rounded-xl bg-emerald-600/25 border border-emerald-400/60 text-center text-[11px] font-black text-emerald-200'>Scanner App ➔</a>
        </div>` : ''}

        <div class='grid grid-cols-3 gap-1.5'>
          <button data-ht='inspect' class='ht-btn py-2 px-2 rounded-xl border text-[11px] font-black bg-rose-600/35 border-rose-400 text-white'>Orbit / Tap</button>
          ${!crew ? `<button data-ht='pin' class='ht-btn py-2 px-2 rounded-xl border text-[11px] font-black bg-zinc-950 border-rose-500/60 text-rose-300'>+ Drop Red Pin</button>` : `<button id='holoResetCam' class='py-2 px-2 rounded-xl bg-zinc-950 border border-zinc-700 text-[11px] font-bold text-zinc-200'>Reset View</button>`}
          <button data-ht='measure' class='ht-btn py-2 px-2 rounded-xl border text-[11px] font-bold bg-zinc-950 border-zinc-800 text-zinc-300'>Laser Measure</button>
        </div>

        <div class='rounded-xl overflow-hidden border border-cyan-500/35 bg-[#030712]'><canvas id='holoCanvas' class='w-full h-[360px] block touch-none'></canvas></div>

        <div class='grid grid-cols-2 gap-1.5'>
          <button id='holoGhostBtn' class='py-2 px-2 rounded-xl bg-zinc-950 border border-cyan-500/50 text-[11px] font-black text-cyan-300'>${holoMode === 'ghost' ? 'Hologram: GHOST' : holoMode === 'xray' ? 'Hologram: X-RAY' : 'Hologram: SOLID'}</button>
          <button id='holoCutBtn' class='py-2 px-2 rounded-xl bg-zinc-950 border border-emerald-500/50 text-[11px] font-black text-emerald-300'>Wall Cutaway: ${cutawayOn ? 'ON' : 'OFF'}</button>
        </div>

        <div id='holoMeasOut' class='text-[11px] font-mono text-zinc-400 text-center'>1-finger orbit • Pinch zoom • Tap red pins for work notes &amp; links</div>
        <div id='holoPinCard' class='p-2.5 rounded-xl bg-zinc-950 border border-zinc-800'></div>
      </div>

      ${!crew ? `<details class='bg-zinc-900/95 border border-zinc-800 rounded-2xl p-3'>
        <summary class='cursor-pointer text-xs font-black text-emerald-300 uppercase tracking-wider'>3D Room &amp; Cabinet Scan Guide + Import Steps</summary>
        <div class='mt-2 space-y-2 text-[11px] text-zinc-300 leading-relaxed'>
          <div><strong>1. Scan the Room (Walls, Floor, Ceiling &amp; Cabinets):</strong> Tap <strong>Scanner App ➔</strong> (or use KIRI Engine / Scaniverse). Walk slowly around the room in overlapping rings covering floor, cabinets/trim, and angled up at ceilings. Put small blue tape X-marks on blank walls/ceilings so tracking locks cleanly.</div>
          <div><strong>2. Export .GLB:</strong> Export the finished scan as a <strong>.GLB</strong> file (or copy a direct .GLB link to share with crew).</div>
          <div><strong>3. Import &amp; Pin Work:</strong> Tap <strong>Import .GLB</strong> above, then tap <strong>+ Drop Red Pin</strong> and tap any spot on the 3D model to attach exact work notes and reference links.</div>
          <div class='pt-1 flex items-center justify-between gap-2 border-t border-zinc-800'>
            <span class='text-[10px] font-mono text-zinc-400 truncate'>Scanner URL: ${esc(scanAppLink)}</span>
            <button id='holoSetAppUrl' class='px-2.5 py-1 rounded bg-zinc-800 text-[10px] font-bold text-cyan-300 shrink-0'>Change App URL</button>
          </div>
        </div>
      </details>` : ''}
    </div>`;

    host.querySelectorAll('.ht-btn').forEach(b => b.onclick = () => setTool(b.dataset.ht));
    if ($('holoResetCam')) $('holoResetCam').onclick = () => { theta = 0.65; phi = 1.05; radius = 10.2; updateCamera(); };
    $('holoGhostBtn').onclick = cycleHoloMode;
    $('holoCutBtn').onclick = () => { cutawayOn = !cutawayOn; $('holoCutBtn').textContent = 'Wall Cutaway: ' + (cutawayOn ? 'ON' : 'OFF'); styleRoomMaterials(); };
    if ($('holoFileIn')) $('holoFileIn').onchange = async e => { const f = e.target.files?.[0]; if (f) await loadGlbFromBuffer(await f.arrayBuffer(), f.name); e.target.value = ''; };
    if ($('holoUrlBtn')) $('holoUrlBtn').onclick = () => { const u = prompt('Direct .GLB scan URL (for crew sharing):', holo.scanUrl); if (u !== null) { holo.scanUrl = u.trim(); saveHolo(); if (holo.scanUrl) loadGlbFromUrl(holo.scanUrl); } };
    if ($('holoSetAppUrl')) $('holoSetAppUrl').onclick = () => { const u = prompt('Scanner / 3D portal URL:', getScanUrl()); if (u !== null && u.trim()) { localStorage.setItem(SCAN_APP_KEY, u.trim()); host.innerHTML = ''; renderShell(); bootHolo(); } };
    setTool(tool);
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