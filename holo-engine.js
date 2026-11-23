(() => {
  if (window.HeistHolo) return;
  const $ = id => document.getElementById(id);
  const SCAN_URL_KEY = 'hb_scanner_url_v2';
  const esc = s => String(s || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const safeLink = r => { const s = String(r || '').trim(); if (!s) return ''; return /^https?:\/\//i.test(s) ? s : 'https://' + s; };
  const fmtTime = ts => ts ? new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

  let THREE = null, GLTFLoader = null, renderer = null, scene = null, camera = null;
  let roomGrp = null, pinGrp = null, measGrp = null, activeMeshes = [], pinOrbs = [];
  let theta = 0.65, phi = 1.05, radius = 10.5, target = { x: 0, y: 1.0, z: 0 };
  let tool = 'inspect', viewMode = 'ghost', cutaway = true, measPts = [], lastRaw = 0;
  let curHost = null, curGoal = null, curIdx = 0, selectedPinId = null;
  let cfg = { isBoss: false, actorName: 'Crew', onSaveHolos: null };

  const activeHolo = () => (curGoal?.holos && curGoal.holos[curIdx]) || null;
  const getScanApp = () => localStorage.getItem(SCAN_URL_KEY) || 'https://kiriengine.app/';
  const fmtFt = ft => { const i = Math.round(ft * 12); return `${Math.floor(i / 12)}' ${i % 12}" (${ft.toFixed(2)} ft)`; };

  function clearGrp(g) {
    if (!g) return;
    while (g.children.length) {
      const c = g.children[0];
      c.traverse?.(o => { o.geometry?.dispose?.(); if (Array.isArray(o.material)) o.material.forEach(m => m.dispose?.()); else o.material?.dispose?.(); });
      g.remove(c);
    }
  }

  function addEdges(mesh, col = 0x22d3ee, op = 0.75) {
    const line = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 22), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op }));
    line.userData.isEdge = true; mesh.add(line);
  }

  function applyVisualStyle() {
    if (!roomGrp || !THREE) return;
    roomGrp.traverse(o => {
      if (!o.isMesh || o.userData.isEdge) return;
      if (!o.userData.origMat) o.userData.origMat = o.material;
      const s = o.userData.isShell ? (cutaway ? THREE.BackSide : THREE.DoubleSide) : o.userData.isFloor ? THREE.DoubleSide : (cutaway ? THREE.FrontSide : THREE.DoubleSide);
      if (viewMode === 'ghost') {
        o.material = new THREE.MeshBasicMaterial({ color: o.userData.isFloor ? 0x0891b2 : 0x0284c7, wireframe: !o.userData.isFloor && !o.userData.isShell, transparent: true, opacity: o.userData.isFloor ? 0.28 : 0.22, depthWrite: false, side: s });
      } else if (viewMode === 'xray') {
        o.material = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.55, depthWrite: false, side: s });
      } else {
        o.material = o.userData.origMat;
        if (o.material) { o.material.side = s; o.material.needsUpdate = true; }
      }
    });
  }

  function buildRoomMesh() {
    if (!THREE || !roomGrp) return;
    clearGrp(roomGrp); activeMeshes = []; measPts = []; drawMeasure();
    const h = activeHolo();
    if (!h) { rebuildPins(); return; }
    if (h.scanUrl) { loadGlbUrl(h.scanUrl, h.name); return; }
    const wFt = Number(h.wFt) || 30, lFt = Number(h.lFt) || 40, hFt = Number(h.hFt) || 12;
    const scale = 6.5 / Math.max(wFt, lFt, 1);
    h.scaleFtPerUnit = 1 / scale;
    const W = wFt * scale, L = lFt * scale, H = Math.max(0.8, hFt * scale);
    const shell = new THREE.Mesh(new THREE.BoxGeometry(W, H, L), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, side: THREE.BackSide }));
    shell.position.set(0, H / 2, 0); shell.userData.isShell = true;
    addEdges(shell, 0x38bdf8, 0.9); roomGrp.add(shell); activeMeshes.push(shell);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, L), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7, side: THREE.DoubleSide }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = 0.01; floor.userData.isFloor = true;
    roomGrp.add(floor); activeMeshes.push(floor);
    if (h.innerZone && h.innerZone.wFt && h.innerZone.lFt) {
      const iw = h.innerZone.wFt * scale, il = h.innerZone.lFt * scale;
      const inner = new THREE.Mesh(new THREE.BoxGeometry(iw, 0.04, il), new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4 }));
      inner.position.set((h.innerZone.offX || 0) * scale, 0.03, (h.innerZone.offZ || 0) * scale);
      inner.userData.isFloor = true; addEdges(inner, 0xf43f5e, 0.85); roomGrp.add(inner); activeMeshes.push(inner);
    }
    radius = 10.2; target = { x: 0, y: H * 0.45, z: 0 };
    applyVisualStyle(); rebuildPins();
    if ($('hhStatus')) $('hhStatus').textContent = `${wFt}' x ${lFt}' x ${hFt}' Ghost Shell`;
  }

  function mountGltf(gltf) {
    clearGrp(roomGrp); activeMeshes = [];
    const root = gltf.scene || gltf.scenes[0];
    const box = new THREE.Box3().setFromObject(root);
    const sz = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
    const s = 6.5 / (Math.max(sz.x, sz.y, sz.z) || 1);
    root.scale.setScalar(s); root.position.set(-ctr.x * s, -box.min.y * s, -ctr.z * s);
    root.traverse(o => { if (o.isMesh) { activeMeshes.push(o); try { addEdges(o, 0x22d3ee, 0.22); } catch {} } });
    roomGrp.add(root);
    radius = 9.2; target = { x: 0, y: (sz.y * s) * 0.45, z: 0 };
    applyVisualStyle(); rebuildPins();
    if ($('hhStatus')) $('hhStatus').textContent = `3D Scan Ready (${activeMeshes.length} meshes)`;
  }

  async function loadGlbBuffer(buf) {
    if (!GLTFLoader) { const m = await import('https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js'); GLTFLoader = m.GLTFLoader; }
    if ($('hhStatus')) $('hhStatus').textContent = 'Parsing 3D scan...';
    new GLTFLoader().parse(buf, '', gltf => mountGltf(gltf), e => { if ($('hhStatus')) $('hhStatus').textContent = 'GLB error: ' + e.message; });
  }

  async function loadGlbUrl(url) {
    if ($('hhStatus')) $('hhStatus').textContent = 'Loading 3D scan...';
    try { const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status); await loadGlbBuffer(await r.arrayBuffer()); }
    catch (e) { if ($('hhStatus')) $('hhStatus').textContent = 'Scan URL failed: ' + e.message; }
  }

  function rebuildPins() {
    clearGrp(pinGrp); pinOrbs = [];
    const h = activeHolo();
    if (!THREE || !pinGrp || !h) { renderPinCard(); return; }
    (h.pins || []).forEach(p => {
      const done = p.status === 'DONE', sel = p.id === selectedPinId;
      const col = done ? 0x10b981 : 0xef4444;
      const g = new THREE.Group(); g.position.set(p.x, p.y, p.z);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(sel ? 0.18 : 0.13, 18, 18), new THREE.MeshBasicMaterial({ color: col }));
      orb.userData.pinId = p.id; orb.position.y = 0.38;
      const halo = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.29, 28), new THREE.MeshBasicMaterial({ color: done ? 0x34d399 : 0xf87171, side: THREE.DoubleSide, transparent: true, opacity: sel ? 1 : 0.85 }));
      halo.rotation.x = -Math.PI / 2; halo.position.y = 0.04; halo.userData.isHalo = true;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.38, 8), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85 }));
      stem.position.y = 0.19;
      g.add(halo, stem, orb); pinGrp.add(g); pinOrbs.push(orb);
    });
    renderPinCard();
  }

  function drawMeasure() {
    clearGrp(measGrp);
    const h = activeHolo();
    if (!THREE || !measGrp || !measPts.length) return;
    measPts.forEach(pt => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), new THREE.MeshBasicMaterial({ color: 0x22d3ee })); d.position.copy(pt); measGrp.add(d); });
    if (measPts.length === 2 && h) {
      measGrp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(measPts), new THREE.LineBasicMaterial({ color: 0x22d3ee })));
      lastRaw = measPts[0].distanceTo(measPts[1]);
      const ft = lastRaw * (h.scaleFtPerUnit || 10);
      if ($('hhHint')) $('hhHint').innerHTML = `<span class='text-cyan-300 font-black'>${fmtFt(ft)}</span>${cfg.isBoss ? ` <button id='hhCalBtn' class='ml-2 px-2 py-0.5 rounded bg-cyan-600 text-white text-[10px] font-black'>Calibrate</button>` : ''}`;
      if ($('hhCalBtn')) $('hhCalBtn').onclick = () => {
        const real = Number(prompt('Enter true feet between these 2 points (e.g. 4 or 47):'));
        if (real > 0 && lastRaw > 0) { h.scaleFtPerUnit = real / lastRaw; commitHolos(); drawMeasure(); }
      };
    }
  }

  function commitHolos() { if (curGoal && cfg.onSaveHolos) cfg.onSaveHolos(curGoal.holos || []); }

  function openPinModal(posOrPin, isEdit = false) {
    let m = $('hhPinModal');
    if (!m) { m = document.createElement('div'); m.id = 'hhPinModal'; m.className = 'fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-3'; document.body.appendChild(m); }
    const cur = isEdit ? posOrPin : { title: '', area: 'Floor', desc: '', link: '' };
    const zones = ['Floor', 'Wall', 'Ceiling', 'Cabinet / Trim', 'Entry'];
    m.innerHTML = `<div class='w-full max-w-md bg-zinc-950 border border-rose-500/50 rounded-2xl p-4 space-y-3 shadow-2xl'>
      <div class='flex items-center justify-between'><span class='text-xs font-black uppercase text-rose-400'>${isEdit ? 'Edit Red Work Halo' : 'Drop Red Work Halo'}</span><button id='hpmClose' class='px-2.5 py-1 rounded-lg bg-zinc-800 text-xs text-white font-bold'>Cancel</button></div>
      <input id='hpmTitle' value='${esc(cur.title)}' placeholder='Work title (e.g. Patch 980 sq ft Perimeter)' class='w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white'>
      <div class='flex flex-wrap gap-1.5'>${zones.map(z => `<button type='button' data-zn='${z}' class='hpm-zn px-2.5 py-1 rounded-lg text-[10px] font-bold border ${cur.area === z ? 'bg-rose-600/30 border-rose-400 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-300'}'>${z}</button>`).join('')}</div>
      <input id='hpmArea' value='${esc(cur.area)}' placeholder='Custom zone label' class='w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white'>
      <textarea id='hpmDesc' rows='4' placeholder='Exact instructions, ratios, dimensions for crew...' class='w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white'>${esc(cur.desc)}</textarea>
      <input id='hpmLink' value='${esc(cur.link)}' placeholder='Photo / spec / video URL (optional)' class='w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white'>
      <button id='hpmSave' class='w-full py-2.5 rounded-xl bg-rose-600 text-white text-xs font-black'>${isEdit ? 'Save Pin Changes (Syncs Live)' : 'Drop Red Halo (Syncs Live)'}</button>
    </div>`;
    m.classList.remove('hidden');
    $('hpmClose').onclick = () => m.classList.add('hidden');
    m.querySelectorAll('.hpm-zn').forEach(b => b.onclick = () => { $('hpmArea').value = b.dataset.zn; m.querySelectorAll('.hpm-zn').forEach(x => x.className = x === b ? 'hpm-zn px-2.5 py-1 rounded-lg text-[10px] font-bold border bg-rose-600/30 border-rose-400 text-white' : 'hpm-zn px-2.5 py-1 rounded-lg text-[10px] font-bold border bg-zinc-900 border-zinc-700 text-zinc-300'); });
    $('hpmSave').onclick = () => {
      const title = $('hpmTitle').value.trim(); if (!title) return alert('Enter a pin title.');
      const h = activeHolo(); if (!h) return;
      h.pins = h.pins || [];
      if (isEdit) {
        cur.title = title; cur.area = $('hpmArea').value.trim() || 'Zone'; cur.desc = $('hpmDesc').value.trim(); cur.link = $('hpmLink').value.trim();
      } else {
        const np = { id: 'pin_' + Date.now(), x: Number(posOrPin.x.toFixed(3)), y: Number(posOrPin.y.toFixed(3)), z: Number(posOrPin.z.toFixed(3)), title, area: $('hpmArea').value.trim() || 'Zone', desc: $('hpmDesc').value.trim(), link: $('hpmLink').value.trim(), status: 'OPEN', doneBy: '', doneAt: 0 };
        h.pins.push(np); selectedPinId = np.id;
      }
      m.classList.add('hidden'); setTool('inspect'); commitHolos(); rebuildPins();
    };
  }

  function openAddRoomModal() {
    let m = $('hhRoomModal');
    if (!m) { m = document.createElement('div'); m.id = 'hhRoomModal'; m.className = 'fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-3'; document.body.appendChild(m); }
    m.innerHTML = `<div class='w-full max-w-md bg-zinc-950 border border-cyan-500/50 rounded-2xl p-4 space-y-3 shadow-2xl'>
      <div class='flex items-center justify-between'><span class='text-xs font-black uppercase text-cyan-400'>Add 3D Room Hologram to Goal</span><button id='hrmClose' class='px-2.5 py-1 rounded-lg bg-zinc-800 text-xs text-white font-bold'>Close</button></div>
      <input id='hrmName' placeholder='Room name (e.g. Main Hall, Kitchen Cabinets, Rhino Stall)' class='w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white'>
      <div class='p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2'>
        <div class='text-[11px] font-black text-cyan-300'>Option A: Instant Scaled Ghost Room</div>
        <div class='grid grid-cols-3 gap-2'>
          <label class='text-[10px] text-zinc-400'>Width (ft)<input id='hrmW' type='number' value='20' class='mt-1 w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono'></label>
          <label class='text-[10px] text-zinc-400'>Length (ft)<input id='hrmL' type='number' value='30' class='mt-1 w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono'></label>
          <label class='text-[10px] text-zinc-400'>Ceiling (ft)<input id='hrmH' type='number' value='10' class='mt-1 w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono'></label>
        </div>
      </div>
      <div class='p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2'>
        <div class='text-[11px] font-black text-emerald-300'>Option B: Real 3D Room Scan (.GLB URL for Crew Sync)</div>
        <input id='hrmUrl' placeholder='Optional direct .GLB URL (leave blank for Ghost Shell)' class='w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white'>
        <div class='text-[10px] text-zinc-400'>Scan with KIRI Engine or Scaniverse (blue tape X-marks on blank walls + 4-ft level on floor), export .GLB, host URL or preview locally.</div>
      </div>
      <button id='hrmCreate' class='w-full py-2.5 rounded-xl bg-cyan-600 text-white text-xs font-black'>+ Bundle Room Into Goal</button>
    </div>`;
    m.classList.remove('hidden');
    $('hrmClose').onclick = () => m.classList.add('hidden');
    $('hrmCreate').onclick = () => {
      if (!curGoal) return;
      const name = $('hrmName').value.trim() || 'Room ' + ((curGoal.holos?.length || 0) + 1);
      const nh = { id: 'room_' + Date.now(), name, wFt: Number($('hrmW').value) || 20, lFt: Number($('hrmL').value) || 30, hFt: Number($('hrmH').value) || 10, scanUrl: $('hrmUrl').value.trim(), scaleFtPerUnit: 10, pins: [] };
      curGoal.holos = [...(curGoal.holos || []), nh];
      curIdx = curGoal.holos.length - 1; selectedPinId = null;
      m.classList.add('hidden'); commitHolos(); renderShell(); buildRoomMesh();
    };
  }

  function renderPinCard() {
    const box = $('hhPinCard'); if (!box) return;
    const h = activeHolo();
    if (!h) { box.innerHTML = `<div class='text-xs text-zinc-500 text-center py-2'>No room hologram in this Goal yet.</div>`; return; }
    const pins = h.pins || [];
    const p = pins.find(x => x.id === selectedPinId);
    if (!p) {
      box.innerHTML = `<div class='flex items-center justify-between gap-2'><span class='text-xs font-black text-rose-300'>${pins.length} Red Work Halos in ${esc(h.name)}</span><span class='text-[10px] text-zinc-400'>Tap pin to inspect</span></div><div class='mt-2 space-y-1.5 max-h-48 overflow-y-auto'>${pins.map(x => `<button data-spin='${x.id}' class='w-full text-left px-3 py-2 rounded-xl bg-zinc-900 border ${x.status === 'DONE' ? 'border-emerald-500/45' : 'border-rose-500/40'} flex items-center justify-between gap-2'><div class='min-w-0'><div class='text-xs font-bold ${x.status === 'DONE' ? 'line-through text-emerald-300' : 'text-white'} truncate'>${esc(x.title)}</div><div class='text-[10px] text-zinc-400 truncate'>${esc(x.area || 'Surface')}${x.doneBy ? ` • Done by ${esc(x.doneBy)}` : ''}${x.link ? ' • Link' : ''}</div></div><span class='text-[9px] font-mono font-black ${x.status === 'DONE' ? 'text-emerald-400' : 'text-rose-400'} shrink-0'>${x.status}</span></button>`).join('') || `<div class='text-[11px] text-zinc-500 py-1'>${cfg.isBoss ? 'Tap + Drop Red Pin above, then tap anywhere on the 3D room.' : 'No red pins dropped in this room yet.'}</div>`}</div>`;
      box.querySelectorAll('[data-spin]').forEach(b => b.onclick = () => { selectedPinId = b.dataset.spin; rebuildPins(); });
      return;
    }
    const done = p.status === 'DONE', href = safeLink(p.link);
    box.innerHTML = `<div class='space-y-2'>
      <div class='flex items-start justify-between gap-2'>
        <div><div class='text-[10px] font-mono text-rose-400 uppercase'>${esc(p.area || 'Surface')} • ${p.status}</div><div class='text-sm font-black text-white'>${esc(p.title)}</div></div>
        <button id='hhBackPins' class='px-2.5 py-1 rounded-lg bg-zinc-800 text-[10px] font-bold text-zinc-300 shrink-0'>All Pins</button>
      </div>
      <div class='text-xs text-zinc-200 leading-relaxed bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 whitespace-pre-line'>${esc(p.desc || 'No scope notes added.')}</div>
      ${p.doneBy ? `<div class='text-[10px] font-mono text-emerald-400'>✓ Checked off by ${esc(p.doneBy)} ${fmtTime(p.doneAt)}</div>` : ''}
      ${href ? `<a href='${esc(href)}' target='_blank' rel='noopener noreferrer' class='flex items-center justify-between px-3 py-2 rounded-xl bg-sky-950/80 border border-sky-400/50 text-xs font-black text-sky-300'><span>Open Attached Link / Photo</span><span>➔</span></a>` : ''}
      <div class='flex gap-1.5'>
        <button id='hhTogPin' class='flex-1 py-2 rounded-xl ${done ? 'bg-zinc-800 text-zinc-200' : 'bg-emerald-600 text-white'} text-xs font-black'>${done ? 'Reopen Pin' : '✓ Mark Pin Complete (Syncs Live)'}</button>
        ${cfg.isBoss ? `<button id='hhEdPin' class='px-3 py-2 rounded-xl bg-sky-900 text-sky-200 text-xs font-bold'>Edit</button><button id='hhDelPin' class='px-3 py-2 rounded-xl bg-rose-950 text-rose-300 text-xs font-bold'>Del</button>` : ''}
      </div>
    </div>`;
    $('hhBackPins').onclick = () => { selectedPinId = null; rebuildPins(); };
    $('hhTogPin').onclick = () => {
      p.status = done ? 'OPEN' : 'DONE'; p.doneBy = p.status === 'DONE' ? cfg.actorName : ''; p.doneAt = p.status === 'DONE' ? Date.now() : 0;
      commitHolos(); rebuildPins();
    };
    if ($('hhEdPin')) $('hhEdPin').onclick = () => openPinModal(p, true);
    if ($('hhDelPin')) $('hhDelPin').onclick = () => { h.pins = h.pins.filter(x => x.id !== p.id); selectedPinId = null; commitHolos(); rebuildPins(); };
  }

  function setTool(t) {
    tool = t; measPts = []; drawMeasure();
    document.querySelectorAll('.hh-tool').forEach(b => {
      const on = b.dataset.t === tool;
      b.className = on ? (tool === 'pin' ? 'hh-tool py-2 px-2 rounded-xl border text-[11px] font-black bg-rose-600 border-rose-300 text-white shadow-lg shadow-rose-600/30' : 'hh-tool py-2 px-2 rounded-xl border text-[11px] font-black bg-cyan-600/35 border-cyan-400 text-white') : 'hh-tool py-2 px-2 rounded-xl border text-[11px] font-bold bg-zinc-950 border-zinc-800 text-zinc-300';
    });
    if ($('hhHint')) $('hhHint').innerHTML = tool === 'pin' ? `<span class='text-rose-400 font-black'>TAP ANY 3D WALL, FLOOR, CABINET, OR CEILING TO DROP A RED HALO</span>` : tool === 'measure' ? `<span class='text-cyan-300 font-bold'>Tap Point A, then Point B on the 3D model</span>` : '1-finger orbit • Pinch zoom • Tap any pulsing red halo';
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
      if (ptrs.size === 1) { const dx = e.clientX - prev.x, dy = e.clientY - prev.y; if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) moved = true; theta -= dx * 0.01; phi = Math.max(0.15, Math.min(2.6, phi - dy * 0.01)); }
      else if (ptrs.size === 2) { moved = true; const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (lastDist) radius = Math.max(2, Math.min(24, radius - (d - lastDist) * 0.03)); lastDist = d; }
    };
    const up = e => {
      if (cv.hasPointerCapture(e.pointerId)) cv.releasePointerCapture(e.pointerId);
      ptrs.delete(e.pointerId);
      if (moved || !down || !THREE || !camera) return;
      const r = cv.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, camera);
      const pHit = ray.intersectObjects(pinOrbs, false);
      if (pHit.length && tool !== 'measure') { selectedPinId = pHit[0].object.userData.pinId; rebuildPins(); return; }
      const rHit = ray.intersectObjects(activeMeshes, false);
      if (!rHit.length) return;
      const pt = rHit[0].point;
      if (tool === 'pin' && cfg.isBoss) openPinModal(pt, false);
      else if (tool === 'measure') { if (measPts.length >= 2) measPts = []; measPts.push(pt.clone()); drawMeasure(); }
    };
    cv.onpointerup = up; cv.onpointercancel = up;
  }

  async function bootThree() {
    const cv = $('hhCanvas'); if (!cv) return;
    if (!THREE) { if ($('hhStatus')) $('hhStatus').textContent = 'Starting 3D Engine...'; THREE = await import('https://esm.sh/three@0.160.0'); }
    if (!renderer || renderer.domElement !== cv) {
      renderer?.dispose?.();
      renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      scene = new THREE.Scene(); scene.background = new THREE.Color(0x030712);
      camera = new THREE.PerspectiveCamera(48, (cv.clientWidth || 340) / 350, 0.05, 120);
      scene.add(new THREE.AmbientLight(0xffffff, 0.95));
      const d1 = new THREE.DirectionalLight(0x38bdf8, 1.1); d1.position.set(6, 12, 8); scene.add(d1);
      const d2 = new THREE.DirectionalLight(0xffffff, 0.7); d2.position.set(-6, 5, -6); scene.add(d2);
      scene.add(new THREE.GridHelper(14, 28, 0x0284c7, 0x0f172a));
      roomGrp = new THREE.Group(); pinGrp = new THREE.Group(); measGrp = new THREE.Group();
      scene.add(roomGrp, pinGrp, measGrp);
      bindPointer(cv);
      const onRes = () => { const w = cv.parentElement?.clientWidth || 340; renderer.setSize(w, 350, false); camera.aspect = w / 350; camera.updateProjectionMatrix(); };
      onRes(); window.addEventListener('resize', onRes);
      let t = 0;
      const loop = () => { requestAnimationFrame(loop); t += 0.07; pinGrp?.children.forEach(g => { const h = g.children.find(c => c.userData.isHalo); if (h) { const sc = 1 + Math.sin(t) * 0.34; h.scale.set(sc, sc, 1); } }); updateCamera(); renderer.render(scene, camera); };
      loop();
    }
    buildRoomMesh();
  }

  function renderShell() {
    if (!curHost) return;
    if (!curGoal) { curHost.innerHTML = `<div class='max-w-xl mx-auto p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-center text-xs text-zinc-400'>Select or load a Goal first to view its 3D Room Holograms.</div>`; return; }
    const holos = curGoal.holos || [];
    if (curIdx >= holos.length) curIdx = 0;
    const h = activeHolo();
    const scanHref = safeLink(getScanApp());
    curHost.innerHTML = `<div class='max-w-xl mx-auto space-y-2.5 pb-12'>
      <div class='bg-zinc-900/95 border border-cyan-500/45 rounded-2xl p-3 space-y-2.5'>
        <div class='flex items-center justify-between gap-2'>
          <div class='min-w-0'><div class='text-[10px] font-mono uppercase text-cyan-400 truncate'>${esc(curGoal.title)}</div><div id='hhStatus' class='text-xs font-black text-white truncate'>${esc(h?.name || 'No Rooms Yet')}</div></div>
          ${cfg.isBoss ? `<button id='hhAddRoom' class='px-2.5 py-1.5 rounded-xl bg-cyan-600 text-white text-[11px] font-black shrink-0'>+ Add Room</button>` : ''}
        </div>
        <div class='flex flex-wrap gap-1.5'>${holos.map((rm, i) => `<div class='inline-flex items-center rounded-xl border ${i === curIdx ? 'bg-cyan-600/30 border-cyan-400 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-300'} overflow-hidden'><button data-rmidx='${i}' class='px-2.5 py-1 text-[11px] font-black'>${esc(rm.name)}</button>${cfg.isBoss && holos.length > 1 ? `<button data-rmdel='${i}' class='px-1.5 py-1 text-[10px] text-zinc-500 hover:text-rose-400 border-l border-zinc-800'>✕</button>` : ''}</div>`).join('') || `<span class='text-[11px] text-zinc-500'>Tap + Add Room to build a Ghost Shell or import a .GLB scan.</span>`}</div>
        ${cfg.isBoss && h ? `<div class='grid grid-cols-3 gap-1.5'>
          <label class='py-1.5 px-2 rounded-xl bg-zinc-950 border border-cyan-500/50 text-center text-[11px] font-black text-cyan-300 cursor-pointer'>Preview .GLB<input id='hhFileIn' type='file' accept='.glb,.gltf' class='hidden'></label>
          <button id='hhSetUrl' class='py-1.5 px-2 rounded-xl bg-zinc-950 border border-zinc-700 text-[11px] font-bold text-zinc-200'>Set .GLB URL</button>
          <a href='${esc(scanHref)}' target='_blank' rel='noopener noreferrer' class='py-1.5 px-2 rounded-xl bg-emerald-600/20 border border-emerald-500/50 text-center text-[11px] font-black text-emerald-300'>Scanner ➔</a>
        </div>` : ''}
        <div class='grid grid-cols-3 gap-1.5'>
          <button data-t='inspect' class='hh-tool py-2 px-2 rounded-xl border text-[11px] font-black'>Orbit / Tap</button>
          ${cfg.isBoss ? `<button data-t='pin' class='hh-tool py-2 px-2 rounded-xl border text-[11px] font-black'>+ Drop Red Pin</button>` : `<button id='hhResetCam' class='py-2 px-2 rounded-xl bg-zinc-950 border border-zinc-700 text-[11px] font-bold text-zinc-200'>Reset View</button>`}
          <button data-t='measure' class='hh-tool py-2 px-2 rounded-xl border text-[11px] font-bold'>Laser Measure</button>
        </div>
        <div class='rounded-xl overflow-hidden border border-cyan-500/35 bg-[#030712]'><canvas id='hhCanvas' class='w-full h-[350px] block touch-none'></canvas></div>
        <div class='grid grid-cols-4 gap-1.5'>
          <button data-vm='ghost' class='hh-vm py-1.5 rounded-lg border text-[10px] font-black ${viewMode === 'ghost' ? 'bg-cyan-600/35 border-cyan-400 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}'>Ghost</button>
          <button data-vm='xray' class='hh-vm py-1.5 rounded-lg border text-[10px] font-black ${viewMode === 'xray' ? 'bg-cyan-600/35 border-cyan-400 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}'>X-Ray</button>
          <button data-vm='solid' class='hh-vm py-1.5 rounded-lg border text-[10px] font-black ${viewMode === 'solid' ? 'bg-cyan-600/35 border-cyan-400 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}'>Solid</button>
          <button id='hhCutBtn' class='py-1.5 rounded-lg border text-[10px] font-black ${cutaway ? 'bg-emerald-600/25 border-emerald-400 text-emerald-200' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}'>Cut: ${cutaway ? 'ON' : 'OFF'}</button>
        </div>
        <div id='hhHint' class='text-[11px] font-mono text-zinc-400 text-center'>1-finger orbit • Pinch zoom • Tap red halos</div>
        <div id='hhPinCard' class='p-2.5 rounded-xl bg-zinc-950 border border-zinc-800'></div>
      </div>
    </div>`;
    if ($('hhAddRoom')) $('hhAddRoom').onclick = openAddRoomModal;
    curHost.querySelectorAll('[data-rmidx]').forEach(b => b.onclick = () => { curIdx = Number(b.dataset.rmidx); selectedPinId = null; renderShell(); bootThree(); });
    curHost.querySelectorAll('[data-rmdel]').forEach(b => b.onclick = () => { if (!confirm('Delete this room hologram?')) return; curGoal.holos.splice(Number(b.dataset.rmdel), 1); curIdx = 0; selectedPinId = null; commitHolos(); renderShell(); bootThree(); });
    curHost.querySelectorAll('.hh-tool').forEach(b => b.onclick = () => setTool(b.dataset.t));
    curHost.querySelectorAll('.hh-vm').forEach(b => b.onclick = () => { viewMode = b.dataset.vm; curHost.querySelectorAll('.hh-vm').forEach(x => x.className = x === b ? 'hh-vm py-1.5 rounded-lg border text-[10px] font-black bg-cyan-600/35 border-cyan-400 text-white' : 'hh-vm py-1.5 rounded-lg border text-[10px] font-black bg-zinc-950 border-zinc-800 text-zinc-400'); applyVisualStyle(); });
    $('hhCutBtn').onclick = () => { cutaway = !cutaway; $('hhCutBtn').textContent = 'Cut: ' + (cutaway ? 'ON' : 'OFF'); applyVisualStyle(); };
    if ($('hhResetCam')) $('hhResetCam').onclick = () => { theta = 0.65; phi = 1.05; radius = 10.2; updateCamera(); };
    if ($('hhFileIn')) $('hhFileIn').onchange = async e => { const f = e.target.files?.[0]; if (f) await loadGlbBuffer(await f.arrayBuffer()); e.target.value = ''; };
    if ($('hhSetUrl')) $('hhSetUrl').onclick = () => { const u = prompt('Direct .GLB URL (auto-syncs to Crew):', h.scanUrl || ''); if (u !== null) { h.scanUrl = u.trim(); commitHolos(); buildRoomMesh(); } };
    setTool(tool); renderPinCard();
  }

  window.HeistHolo = {
    mount(host, goal, options = {}) {
      curHost = host; curGoal = goal; cfg = { ...cfg, ...options };
      renderShell(); if (goal) bootThree();
    },
    syncGoal(goal, options = {}) {
      const sameGoal = curGoal?.id === goal?.id;
      curGoal = goal; cfg = { ...cfg, ...options };
      if (!sameGoal) { curIdx = 0; selectedPinId = null; }
      if (curHost && !curHost.classList.contains('hidden')) {
        if (!sameGoal || !$('hhCanvas')) { renderShell(); if (goal) bootThree(); }
        else { rebuildPins(); }
      }
    }
  };
})();