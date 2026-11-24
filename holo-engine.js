(() => {
  if (window.HeistHolo && window.__hbHoloVer === 3) return;
  window.__hbHoloVer = 3;
  const $ = id => document.getElementById(id);
  const SCAN_URL_KEY = 'hb_scanner_url_v3';
  const INQ = String.fromCharCode(34);
  const esc = s => String(s || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll(INQ, '&quot;');
  const safeLink = r => { const s = String(r || '').trim(); if (!s) return ''; return /^https?:\/\//i.test(s) ? s : 'https://' + s; };
  const fmtTime = ts => ts ? new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
  const snapHalf = v => Math.round(v * 2) / 2;
  const fmtFt = ft => { const i = Math.round(Math.abs(ft) * 12); return `${Math.floor(i / 12)}' ${i % 12}${INQ} (${ft.toFixed(1)} ft)`; };

  const PROP_PRESETS = [
    { kind: 'base_cab', label: 'Base Cabinet', w: 3, d: 2, h: 3, y: 0, color: '#f59e0b' },
    { kind: 'wall_cab', label: 'Wall Cabinet', w: 3, d: 1, h: 2.5, y: 4.5, color: '#fbbf24' },
    { kind: 'door', label: 'Doorway', w: 3, d: 0.4, h: 7, y: 0, color: '#38bdf8' },
    { kind: 'window', label: 'Window', w: 4, d: 0.4, h: 4, y: 3, color: '#7dd3fc' },
    { kind: 'island', label: 'Bench / Island', w: 6, d: 3, h: 3, y: 0, color: '#a855f7' },
    { kind: 'fan', label: 'Fan / Dehu', w: 2, d: 2, h: 2, y: 0, color: '#22d3ee' },
    { kind: 'block', label: 'Custom Block', w: 4, d: 4, h: 4, y: 0, color: '#94a3b8' }
  ];

  let THREE = null, GLTFLoader = null, renderer = null, scene = null, camera = null;
  let roomGrp = null, pinGrp = null, measGrp = null, activeMeshes = [], pinOrbs = [], wallEntries = [];
  let theta = 0.65, phi = 1.02, radius = 10.2, target = { x: 0, y: 0.9, z: 0 };
  let dispMode = '3d', tool = 'inspect', renderStyle = 'ghost', cutaway = true, buildOpen = false;
  let measPts = [], meas2d = [], wallDraftPt = null, lastRaw = 0;
  let curHost = null, curGoal = null, curIdx = 0, selectedPinId = null, selItem = null;
  let cfg = { isBoss: false, actorName: 'Crew', onSaveHolos: null };

  const activeHolo = () => (curGoal?.holos && curGoal.holos[curIdx]) || null;
  const getScanApp = () => localStorage.getItem(SCAN_URL_KEY) || 'https://play.google.com/store/apps/details?id=com.epicgames.realityscan';
  const scaleOf = h => 6.5 / Math.max(Number(h?.wFt) || 30, Number(h?.lFt) || 40, 1);

  function defaultWalls(h) {
    const hw = (Number(h?.wFt) || 30) / 2, hl = (Number(h?.lFt) || 40) / 2, ht = Number(h?.hFt) || 12;
    return [
      { id: 'w_n', label: 'North Wall', x1: -hw, z1: -hl, x2: hw, z2: -hl, h: ht, thick: 0.5, color: '#38bdf8' },
      { id: 'w_s', label: 'South Wall', x1: -hw, z1: hl, x2: hw, z2: hl, h: ht, thick: 0.5, color: '#38bdf8' },
      { id: 'w_w', label: 'West Wall', x1: -hw, z1: -hl, x2: -hw, z2: hl, h: ht, thick: 0.5, color: '#f59e0b' },
      { id: 'w_e', label: 'East Wall', x1: hw, z1: -hl, x2: hw, z2: hl, h: ht, thick: 0.5, color: '#38bdf8' }
    ];
  }

  function defaultZones(h) {
    if (h?.innerZone && h.innerZone.wFt && h.innerZone.lFt) {
      return [{ id: 'z_inner', label: 'Inner Zone', x: Number(h.innerZone.offX) || 0, z: Number(h.innerZone.offZ) || 0, w: Number(h.innerZone.wFt), l: Number(h.innerZone.lFt), color: '#f43f5e', note: 'Highlighted floor layout zone' }];
    }
    return [];
  }

  function getWalls(h) { return Array.isArray(h?.walls) && h.walls.length ? h.walls : defaultWalls(h); }
  function getZones(h) { return Array.isArray(h?.zones) ? h.zones : defaultZones(h); }
  function getProps(h) { return Array.isArray(h?.props) ? h.props : []; }
  function getModels(h) { return Array.isArray(h?.models) ? h.models : []; }

  function ensureEditable(h) {
    if (!Array.isArray(h.walls) || !h.walls.length) h.walls = defaultWalls(h);
    if (!Array.isArray(h.zones)) h.zones = defaultZones(h);
    if (!Array.isArray(h.props)) h.props = [];
    if (!Array.isArray(h.models)) h.models = [];
    if (!Array.isArray(h.pins)) h.pins = [];
  }

  function commitHolos() { if (curGoal && cfg.onSaveHolos) cfg.onSaveHolos(curGoal.holos || []); }

  function clearGrp(g) {
    if (!g) return;
    while (g.children.length) {
      const c = g.children[0];
      c.traverse?.(o => { o.geometry?.dispose?.(); if (Array.isArray(o.material)) o.material.forEach(m => m.dispose?.()); else o.material?.dispose?.(); });
      g.remove(c);
    }
  }

  function addEdges(mesh, col = 0x22d3ee, op = 0.85) {
    const line = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 20), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op }));
    line.userData.isEdge = true; mesh.add(line); return line;
  }

  function applyVisualStyle() {
    if (!roomGrp || !THREE) return;
    roomGrp.traverse(o => {
      if (!o.isMesh || o.userData.isEdge) return;
      if (!o.userData.origMat) o.userData.origMat = o.material;
      const baseHex = o.userData.hexColor || 0x0284c7;
      if (renderStyle === 'ghost') {
        o.material = new THREE.MeshBasicMaterial({
          color: o.userData.isFloor ? 0x0891b2 : baseHex,
          wireframe: false,
          transparent: true,
          opacity: o.userData.isFloor ? 0.24 : o.userData.isZone ? 0.34 : o.userData.isProp ? 0.45 : 0.22,
          depthWrite: false,
          side: THREE.DoubleSide
        });
      } else if (renderStyle === 'xray') {
        o.material = new THREE.MeshBasicMaterial({ color: o.userData.isProp ? baseHex : 0x38bdf8, wireframe: true, transparent: true, opacity: 0.65, depthWrite: false, side: THREE.DoubleSide });
      } else {
        o.material = o.userData.origMat;
        if (o.material) { o.material.transparent = !!o.userData.isZone; o.material.opacity = o.userData.isZone ? 0.72 : 1; o.material.side = THREE.DoubleSide; o.material.needsUpdate = true; }
      }
      o.userData.baseOp = o.material.opacity;
    });
  }

  function updateSmartWallCutaway() {
    if (!camera || !wallEntries.length) return;
    wallEntries.forEach(w => {
      const hide = cutaway && ((camera.position.x - w.mx) * w.nx + (camera.position.z - w.mz) * w.nz > 0.25);
      w.mesh.userData.cutHidden = hide;
      if (w.mesh.material) {
        w.mesh.material.transparent = hide || renderStyle !== 'solid';
        w.mesh.material.opacity = hide ? 0.05 : (w.mesh.userData.baseOp ?? 0.24);
      }
      if (w.edge?.material) w.edge.material.opacity = hide ? 0.14 : 0.85;
    });
  }

  function mountExtraGlb(mod, s) {
    if (!mod.url || !THREE) return;
    const load = async () => {
      if (!GLTFLoader) { const m = await import('https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js'); GLTFLoader = m.GLTFLoader; }
      const r = await fetch(mod.url); if (!r.ok) throw new Error('HTTP ' + r.status);
      const buf = await r.arrayBuffer();
      new GLTFLoader().parse(buf, '', gltf => {
        const root = gltf.scene || gltf.scenes[0];
        const box = new THREE.Box3().setFromObject(root);
        const sz = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
        const maxD = Math.max(sz.x, sz.y, sz.z) || 1;
        const sc = ((Number(mod.sizeFt) || 6) * s) / maxD;
        root.scale.setScalar(sc);
        root.position.set(-ctr.x * sc, -box.min.y * sc, -ctr.z * sc);
        const wrap = new THREE.Group();
        wrap.position.set((Number(mod.xFt) || 0) * s, (Number(mod.yFt) || 0) * s, (Number(mod.zFt) || 0) * s);
        wrap.rotation.y = ((Number(mod.rotDeg) || 0) * Math.PI) / 180;
        root.traverse(o => { if (o.isMesh) { o.userData.hexColor = 0x22d3ee; activeMeshes.push(o); try { addEdges(o, 0x22d3ee, 0.22); } catch {} } });
        wrap.add(root); roomGrp.add(wrap); applyVisualStyle();
      }, () => {});
    };
    load().catch(() => {});
  }

  function buildRoomMesh() {
    if (!THREE || !roomGrp) return;
    clearGrp(roomGrp); activeMeshes = []; wallEntries = []; measPts = []; drawMeasure3d();
    const h = activeHolo();
    if (!h) { rebuildPins3d(); return; }
    const s = scaleOf(h);
    h.scaleFtPerUnit = 1 / s;
    const wFt = Number(h.wFt) || 30, lFt = Number(h.lFt) || 40, hFt = Number(h.hFt) || 12;
    const W = wFt * s, L = lFt * s, H = Math.max(0.8, hFt * s);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, L), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.75, side: THREE.DoubleSide }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = 0.01; floor.userData = { isFloor: true, hexColor: 0x0891b2 };
    addEdges(floor, 0x0284c7, 0.45); roomGrp.add(floor); activeMeshes.push(floor);

    getWalls(h).forEach(w => {
      const dx = (w.x2 - w.x1) * s, dz = (w.z2 - w.z1) * s;
      const len = Math.hypot(dx, dz); if (len < 0.02) return;
      const wh = Math.max(0.2, (Number(w.h) || hFt) * s), wt = Math.max(0.04, (Number(w.thick) || 0.5) * s);
      const hex = new THREE.Color(w.color || '#38bdf8').getHex();
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(len, wh, wt), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }));
      const mx = ((w.x1 + w.x2) / 2) * s, mz = ((w.z1 + w.z2) / 2) * s;
      mesh.position.set(mx, wh / 2, mz);
      mesh.rotation.y = -Math.atan2(dz, dx);
      mesh.userData = { isWall: true, wallId: w.id, hexColor: hex };
      const edge = addEdges(mesh, hex, 0.85);
      let nx = -dz / len, nz = dx / len;
      if (nx * mx + nz * mz < 0) { nx = -nx; nz = -nz; }
      wallEntries.push({ mesh, edge, mx, mz, nx, nz });
      roomGrp.add(mesh); activeMeshes.push(mesh);
    });

    getZones(h).forEach(z => {
      const hex = new THREE.Color(z.color || '#f43f5e').getHex();
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.1, z.w * s), 0.04, Math.max(0.1, z.l * s)), new THREE.MeshStandardMaterial({ color: hex, roughness: 0.5, transparent: true, opacity: 0.72 }));
      mesh.position.set((Number(z.x) || 0) * s, 0.03, (Number(z.z) || 0) * s);
      mesh.userData = { isZone: true, zoneId: z.id, hexColor: hex };
      addEdges(mesh, hex, 0.9); roomGrp.add(mesh); activeMeshes.push(mesh);
    });

    getProps(h).forEach(p => {
      const hex = new THREE.Color(p.color || '#f59e0b').getHex();
      const pw = Math.max(0.08, (Number(p.w) || 2) * s), ph = Math.max(0.08, (Number(p.h) || 3) * s), pd = Math.max(0.08, (Number(p.d) || 2) * s);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, pd), new THREE.MeshStandardMaterial({ color: hex, roughness: 0.45, metalness: 0.15 }));
      mesh.position.set((Number(p.x) || 0) * s, ((Number(p.y) || 0) * s) + ph / 2, (Number(p.z) || 0) * s);
      mesh.rotation.y = ((Number(p.rotY) || 0) * Math.PI) / 180;
      mesh.userData = { isProp: true, propId: p.id, hexColor: hex };
      addEdges(mesh, hex, 0.95); roomGrp.add(mesh); activeMeshes.push(mesh);
    });

    if (h.scanUrl) loadGlbUrl(h.scanUrl, false);
    getModels(h).forEach(m => mountExtraGlb(m, s));

    target = { x: 0, y: H * 0.4, z: 0 };
    applyVisualStyle(); rebuildPins3d();
    if ($('hhStatus')) $('hhStatus').textContent = `${wFt}' x ${lFt}' • ${getWalls(h).length}W • ${getProps(h).length}P • ${(h.pins || []).length} Pins`;
  }

  async function loadGlbBuffer(buf, clearExisting = true) {
    if (!GLTFLoader) { const m = await import('https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js'); GLTFLoader = m.GLTFLoader; }
    if ($('hhStatus')) $('hhStatus').textContent = 'Parsing .GLB...';
    new GLTFLoader().parse(buf, '', gltf => {
      if (clearExisting) { clearGrp(roomGrp); activeMeshes = []; wallEntries = []; }
      const root = gltf.scene || gltf.scenes[0];
      const box = new THREE.Box3().setFromObject(root);
      const sz = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
      const sc = 6.5 / (Math.max(sz.x, sz.y, sz.z) || 1);
      root.scale.setScalar(sc); root.position.set(-ctr.x * sc, -box.min.y * sc, -ctr.z * sc);
      root.traverse(o => { if (o.isMesh) { o.userData.hexColor = 0x22d3ee; activeMeshes.push(o); try { addEdges(o, 0x22d3ee, 0.22); } catch {} } });
      roomGrp.add(root); applyVisualStyle(); rebuildPins3d();
      if ($('hhStatus')) $('hhStatus').textContent = `3D Scan Loaded (${activeMeshes.length} meshes)`;
    }, e => { if ($('hhStatus')) $('hhStatus').textContent = 'GLB error: ' + e.message; });
  }

  async function loadGlbUrl(url, clearExisting = true) {
    if ($('hhStatus')) $('hhStatus').textContent = 'Loading .GLB...';
    try { const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status); await loadGlbBuffer(await r.arrayBuffer(), clearExisting); }
    catch (e) { if ($('hhStatus')) $('hhStatus').textContent = 'GLB URL failed: ' + e.message; }
  }

  function rebuildPins3d() {
    clearGrp(pinGrp); pinOrbs = [];
    const h = activeHolo();
    if (THREE && pinGrp && h) {
      (h.pins || []).forEach(p => {
        const done = p.status === 'DONE', sel = p.id === selectedPinId;
        const col = done ? 0x10b981 : 0xef4444;
        const g = new THREE.Group(); g.position.set(p.x, p.y, p.z);
        const orb = new THREE.Mesh(new THREE.SphereGeometry(sel ? 0.19 : 0.14, 18, 18), new THREE.MeshBasicMaterial({ color: col }));
        orb.userData.pinId = p.id; orb.position.y = 0.4;
        const halo = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.3, 28), new THREE.MeshBasicMaterial({ color: done ? 0x34d399 : 0xf87171, side: THREE.DoubleSide, transparent: true, opacity: sel ? 1 : 0.85 }));
        halo.rotation.x = -Math.PI / 2; halo.position.y = 0.04; halo.userData.isHalo = true;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.4, 8), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85 }));
        stem.position.y = 0.2;
        g.add(halo, stem, orb); pinGrp.add(g); pinOrbs.push(orb);
      });
    }
    if (dispMode === '2d') render2dBlueprint();
    renderBottomCard();
  }

  function drawMeasure3d() {
    clearGrp(measGrp);
    const h = activeHolo();
    if (!THREE || !measGrp || !measPts.length) return;
    measPts.forEach(pt => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), new THREE.MeshBasicMaterial({ color: 0x22d3ee })); d.position.copy(pt); measGrp.add(d); });
    if (measPts.length === 2 && h) {
      measGrp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(measPts), new THREE.LineBasicMaterial({ color: 0x22d3ee })));
      lastRaw = measPts[0].distanceTo(measPts[1]);
      const ft = lastRaw * (h.scaleFtPerUnit || (1 / scaleOf(h)));
      if ($('hhHint')) $('hhHint').innerHTML = `<span class='text-cyan-300 font-black'>${fmtFt(ft)}</span>${cfg.isBoss ? ` <button id='hhCalBtn' class='ml-2 px-2 py-0.5 rounded bg-cyan-600 text-white text-[10px] font-black'>Calibrate</button>` : ''}`;
      if ($('hhCalBtn')) $('hhCalBtn').onclick = () => { const real = Number(prompt('Enter true feet between these 2 points:')); if (real > 0 && lastRaw > 0) { h.scaleFtPerUnit = real / lastRaw; commitHolos(); drawMeasure3d(); } };
    }
  }

  function render2dBlueprint() {
    const box = $('hhSvgWrap'); if (!box) return;
    const h = activeHolo(); if (!h) { box.innerHTML = ''; return; }
    const wFt = Number(h.wFt) || 30, lFt = Number(h.lFt) || 40, s = scaleOf(h);
    const pad = Math.max(4, Math.round(Math.max(wFt, lFt) * 0.14));
    const vx = -wFt / 2 - pad, vz = -lFt / 2 - pad, vw = wFt + pad * 2, vh = lFt + pad * 2;
    const fs = Math.max(1.1, Math.max(wFt, lFt) * 0.026);
    const gridLines = [];
    const step = Math.max(wFt, lFt) > 40 ? 5 : 2;
    for (let gx = Math.ceil(vx / step) * step; gx <= vx + vw; gx += step) gridLines.push(`<line x1='${gx}' y1='${vz}' x2='${gx}' y2='${vz + vh}' stroke='#0f2942' stroke-width='${fs * 0.08}'/>`);
    for (let gz = Math.ceil(vz / step) * step; gz <= vz + vh; gz += step) gridLines.push(`<line x1='${vx}' y1='${gz}' x2='${vx + vw}' y2='${gz}' stroke='#0f2942' stroke-width='${fs * 0.08}'/>`);

    const zonesSvg = getZones(h).map(z => {
      const sel = selItem?.kind === 'zone' && selItem.id === z.id;
      const sq = Math.round(z.w * z.l);
      return `<g data-s2='zone|${esc(z.id)}' class='cursor-pointer'><rect x='${z.x - z.w / 2}' y='${z.z - z.l / 2}' width='${z.w}' height='${z.l}' fill='${esc(z.color || '#f43f5e')}' fill-opacity='${sel ? '0.42' : '0.22'}' stroke='${esc(z.color || '#f43f5e')}' stroke-width='${fs * (sel ? 0.25 : 0.14)}' stroke-dasharray='${fs * 0.5},${fs * 0.3}'/><text x='${z.x}' y='${z.z - fs * 0.2}' text-anchor='middle' fill='#f8fafc' font-size='${fs * 0.95}' font-family='monospace' font-weight='bold'>${esc(z.label)}</text><text x='${z.x}' y='${z.z + fs * 0.9}' text-anchor='middle' fill='#38bdf8' font-size='${fs * 0.78}' font-family='monospace'>${z.w}'x${z.l}' (${sq} sq ft)</text></g>`;
    }).join('');

    const wallsSvg = getWalls(h).map(w => {
      const sel = selItem?.kind === 'wall' && selItem.id === w.id;
      const len = Math.hypot(w.x2 - w.x1, w.z2 - w.z1);
      const mx = (w.x1 + w.x2) / 2, mz = (w.z1 + w.z2) / 2;
      return `<g data-s2='wall|${esc(w.id)}' class='cursor-pointer'><line x1='${w.x1}' y1='${w.z1}' x2='${w.x2}' y2='${w.z2}' stroke='${sel ? '#fde047' : esc(w.color || '#38bdf8')}' stroke-width='${Math.max(w.thick || 0.5, fs * 0.35)}' stroke-linecap='round'/><text x='${mx}' y='${mz - fs * 0.45}' text-anchor='middle' fill='#e0f2fe' font-size='${fs * 0.72}' font-family='monospace'>${len.toFixed(1)}'</text></g>`;
    }).join('');

    const propsSvg = getProps(h).map(p => {
      const sel = selItem?.kind === 'prop' && selItem.id === p.id;
      return `<g data-s2='prop|${esc(p.id)}' transform='translate(${p.x} ${p.z}) rotate(${-(Number(p.rotY) || 0)})' class='cursor-pointer'><rect x='${-p.w / 2}' y='${-p.d / 2}' width='${p.w}' height='${p.d}' fill='${esc(p.color || '#f59e0b')}' fill-opacity='${sel ? '0.68' : '0.42'}' stroke='${sel ? '#ffffff' : esc(p.color || '#f59e0b')}' stroke-width='${fs * 0.16}'/><text x='0' y='${fs * 0.25}' text-anchor='middle' fill='#ffffff' font-size='${fs * 0.65}' font-family='sans-serif' font-weight='bold'>${esc(p.label.slice(0, 12))}</text></g>`;
    }).join('');

    const modsSvg = getModels(h).map(m => {
      const sel = selItem?.kind === 'model' && selItem.id === m.id;
      const r = (Number(m.sizeFt) || 6) / 2;
      return `<g data-s2='model|${esc(m.id)}' class='cursor-pointer'><circle cx='${m.xFt || 0}' cy='${m.zFt || 0}' r='${r}' fill='#10b981' fill-opacity='0.22' stroke='${sel ? '#ffffff' : '#34d399'}' stroke-width='${fs * 0.15}' stroke-dasharray='${fs * 0.4},${fs * 0.25}'/><text x='${m.xFt || 0}' y='${(m.zFt || 0) + fs * 0.25}' text-anchor='middle' fill='#a7f3d0' font-size='${fs * 0.68}' font-family='monospace'>GLB:${esc(m.name.slice(0, 10))}</text></g>`;
    }).join('');

    const pinsSvg = (h.pins || []).map(p => {
      const px = p.x / s, pz = p.z / s, done = p.status === 'DONE', sel = p.id === selectedPinId;
      const col = done ? '#10b981' : '#ef4444';
      return `<g data-p2='${esc(p.id)}' class='cursor-pointer'><circle cx='${px}' cy='${pz}' r='${fs * (sel ? 1.3 : 0.95)}' fill='${col}' fill-opacity='0.28' stroke='${col}' stroke-width='${fs * 0.18}'/><circle cx='${px}' cy='${pz}' r='${fs * 0.42}' fill='${col}'/></g>`;
    }).join('');

    const measSvg = meas2d.length === 2 ? `<line x1='${meas2d[0].x}' y1='${meas2d[0].z}' x2='${meas2d[1].x}' y2='${meas2d[1].z}' stroke='#22d3ee' stroke-width='${fs * 0.22}'/><circle cx='${meas2d[0].x}' cy='${meas2d[0].z}' r='${fs * 0.35}' fill='#22d3ee'/><circle cx='${meas2d[1].x}' cy='${meas2d[1].z}' r='${fs * 0.35}' fill='#22d3ee'/>` : meas2d.length === 1 ? `<circle cx='${meas2d[0].x}' cy='${meas2d[0].z}' r='${fs * 0.4}' fill='#22d3ee'/>` : '';
    const wallDraftSvg = wallDraftPt ? `<circle cx='${wallDraftPt.x}' cy='${wallDraftPt.z}' r='${fs * 0.5}' fill='#fde047'/>` : '';

    box.innerHTML = `<svg id='hhSvgEl' viewBox='${vx} ${vz} ${vw} ${vh}' class='w-full h-[350px] block bg-[#030712] touch-none select-none'>
      ${gridLines.join('')}
      <rect x='${-wFt / 2}' y='${-lFt / 2}' width='${wFt}' height='${lFt}' fill='#0b1324' fill-opacity='0.72' stroke='#0369a1' stroke-width='${fs * 0.12}'/>
      ${zonesSvg}${wallsSvg}${propsSvg}${modsSvg}${measSvg}${wallDraftSvg}${pinsSvg}
      <text x='0' y='${lFt / 2 + pad * 0.65}' text-anchor='middle' fill='#7dd3fc' font-size='${fs * 0.9}' font-family='monospace' font-weight='bold'>${wFt}' W x ${lFt}' L (${Math.round(wFt * lFt).toLocaleString()} SQ FT) • GRID: ${step}'</text>
    </svg>`;

    const svgEl = $('hhSvgEl');
    svgEl.onclick = e => {
      const pNode = e.target.closest('[data-p2]');
      if (pNode && tool === 'inspect') { selectedPinId = pNode.dataset.p2; selItem = null; rebuildPins3d(); return; }
      const sNode = e.target.closest('[data-s2]');
      if (sNode && tool === 'inspect' && cfg.isBoss) { const [kind, id] = sNode.dataset.s2.split('|'); selItem = { kind, id }; selectedPinId = null; render2dBlueprint(); renderBottomCard(); return; }
      const pt = svgEl.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const ctm = svgEl.getScreenCTM(); if (!ctm) return;
      const loc = pt.matrixTransform(ctm.inverse());
      const fx = snapHalf(loc.x), fz = snapHalf(loc.y);
      if (tool === 'pin' && cfg.isBoss) { openPinModal({ x: fx * s, y: 0.1, z: fz * s }, false); }
      else if (tool === 'wall' && cfg.isBoss) {
        if (!wallDraftPt) { wallDraftPt = { x: fx, z: fz }; render2dBlueprint(); if ($('hhHint')) $('hhHint').innerHTML = `<span class='text-amber-300 font-black'>Start (${fx}', ${fz}') set — tap Wall END point on 2D Plan</span>`; }
        else { const p1 = wallDraftPt; wallDraftPt = null; openWallModal({ x1: p1.x, z1: p1.z, x2: fx, z2: fz, h: Number(h.hFt) || 12, thick: 0.5, color: '#38bdf8', label: 'Wall ' + (getWalls(h).length + 1) }, false); }
      } else if (tool === 'measure') {
        if (meas2d.length >= 2) meas2d = [];
        meas2d.push({ x: fx, z: fz }); render2dBlueprint();
        if (meas2d.length === 2 && $('hhHint')) { const d = Math.hypot(meas2d[1].x - meas2d[0].x, meas2d[1].z - meas2d[0].z); $('hhHint').innerHTML = `<span class='text-cyan-300 font-black'>2D Distance: ${fmtFt(d)}</span>`; }
      }
    };
  }

  function openModalShell(id, borderCol, title, innerHtml) {
    let m = $(id);
    if (!m) { m = document.createElement('div'); m.id = id; m.className = 'fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-3'; document.body.appendChild(m); }
    m.innerHTML = `<div class='w-full max-w-md bg-zinc-950 border ${borderCol} rounded-2xl p-4 space-y-3 shadow-2xl max-h-[88vh] overflow-y-auto'><div class='flex items-center justify-between'><span class='text-xs font-black uppercase text-white'>${title}</span><button id='${id}_x' class='px-2.5 py-1 rounded-lg bg-zinc-800 text-xs text-white font-bold'>Close</button></div>${innerHtml}</div>`;
    m.classList.remove('hidden');
    $(id + '_x').onclick = () => m.classList.add('hidden');
    return m;
  }

  function openPinModal(posOrPin, isEdit = false) {
    const cur = isEdit ? posOrPin : { title: '', area: 'Floor', desc: '', link: '' };
    const zones = ['Floor', 'Wall', 'Ceiling', 'Cabinet / Trim', 'Entry', 'Plumbing / Elec'];
    const m = openModalShell('hhPinModal', 'border-rose-500/50', isEdit ? 'Edit Red Work Halo' : 'Drop Red Work Halo', `
      <input id='hpmTitle' value='${esc(cur.title)}' placeholder='Work title (e.g. Install Base Cabinets)' class='w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white'>
      <div class='flex flex-wrap gap-1.5'>${zones.map(z => `<button type='button' data-zn='${z}' class='hpm-zn px-2 py-1 rounded-lg text-[10px] font-bold border ${cur.area === z ? 'bg-rose-600/30 border-rose-400 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-300'}'>${z}</button>`).join('')}</div>
      <input id='hpmArea' value='${esc(cur.area)}' placeholder='Custom zone label' class='w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white'>
      <textarea id='hpmDesc' rows='4' placeholder='Exact instructions, ratios, measurements...' class='w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white'>${esc(cur.desc)}</textarea>
      <input id='hpmLink' value='${esc(cur.link)}' placeholder='Photo / spec / video URL (optional)' class='w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white'>
      <button id='hpmSave' class='w-full py-2.5 rounded-xl bg-rose-600 text-white text-xs font-black'>${isEdit ? 'Save Pin (Syncs Live)' : 'Drop Red Halo (Syncs Live)'}</button>`);
    m.querySelectorAll('.hpm-zn').forEach(b => b.onclick = () => { $('hpmArea').value = b.dataset.zn; m.querySelectorAll('.hpm-zn').forEach(x => x.className = x === b ? 'hpm-zn px-2 py-1 rounded-lg text-[10px] font-bold border bg-rose-600/30 border-rose-400 text-white' : 'hpm-zn px-2 py-1 rounded-lg text-[10px] font-bold border bg-zinc-900 border-zinc-700 text-zinc-300'); });
    $('hpmSave').onclick = () => {
      const title = $('hpmTitle').value.trim(); if (!title) return alert('Enter a pin title.');
      const h = activeHolo(); if (!h) return;
      ensureEditable(h);
      if (isEdit) { cur.title = title; cur.area = $('hpmArea').value.trim() || 'Zone'; cur.desc = $('hpmDesc').value.trim(); cur.link = $('hpmLink').value.trim(); }
      else { const np = { id: 'pin_' + Date.now(), x: Number(posOrPin.x.toFixed(3)), y: Number(posOrPin.y.toFixed(3)), z: Number(posOrPin.z.toFixed(3)), title, area: $('hpmArea').value.trim() || 'Zone', desc: $('hpmDesc').value.trim(), link: $('hpmLink').value.trim(), status: 'OPEN', doneBy: '', doneAt: 0 }; h.pins.push(np); selectedPinId = np.id; }
      m.classList.add('hidden'); setTool('inspect'); commitHolos(); rebuildPins3d();
    };
  }

  function openWallModal(wall, isEdit = false) {
    const h = activeHolo(); if (!h) return;
    const w = wall || { label: 'Partition Wall', x1: -6, z1: 0, x2: 6, z2: 0, h: Number(h.hFt) || 12, thick: 0.5, color: '#38bdf8' };
    const m = openModalShell('hhWallMod', 'border-cyan-500/50', isEdit ? 'Edit Wall Segment' : 'Add Wall Segment (Feet)', `
      <input id='wmLbl' value='${esc(w.label)}' placeholder='Wall label' class='w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white'>
      <div class='grid grid-cols-2 gap-2'>
        <label class='text-[10px] text-zinc-400'>Start X (ft)<input id='wmX1' type='number' step='0.5' value='${w.x1}' class='mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white'></label>
        <label class='text-[10px] text-zinc-400'>Start Z (ft)<input id='wmZ1' type='number' step='0.5' value='${w.z1}' class='mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white'></label>
        <label class='text-[10px] text-zinc-400'>End X (ft)<input id='wmX2' type='number' step='0.5' value='${w.x2}' class='mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white'></label>
        <label class='text-[10px] text-zinc-400'>End Z (ft)<input id='wmZ2' type='number' step='0.5' value='${w.z2}' class='mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white'></label>
        <label class='text-[10px] text-zinc-400'>Height (ft)<input id='wmH' type='number' step='0.5' value='${w.h}' class='mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white'></label>
        <label class='text-[10px] text-zinc-400'>Color<input id='wmCol' type='color' value='${esc(w.color || '#38bdf8')}' class='mt-1 w-full h-8 bg-zinc-900 border border-zinc-700 rounded-lg'></label>
      </div>
      <button id='wmSave' class='w-full py-2.5 rounded-xl bg-cyan-600 text-white text-xs font-black'>Save Wall (Syncs Live)</button>`);
    $('wmSave').onclick = () => {
      ensureEditable(h);
      const obj = { id: isEdit ? w.id : 'w_' + Date.now(), label: $('wmLbl').value.trim() || 'Wall', x1: Number($('wmX1').value) || 0, z1: Number($('wmZ1').value) || 0, x2: Number($('wmX2').value) || 0, z2: Number($('wmZ2').value) || 0, h: Number($('wmH').value) || 10, thick: 0.5, color: $('wmCol').value || '#38bdf8' };
      if (isEdit) { const i = h.walls.findIndex(x => x.id === w.id); if (i >= 0) h.walls[i] = obj; } else h.walls.push(obj);
      selItem = { kind: 'wall', id: obj.id }; m.classList.add('hidden'); setTool('inspect'); commitHolos(); buildRoomMesh(); render2dBlueprint();
    };
  }

  function openZoneModal(zone, isEdit = false) {
    const h = activeHolo(); if (!h) return;
    const z = zone || { label: 'Floor Zone', x: 0, z: 0, w: 10, l: 10, color: '#f43f5e', note: '' };
    const m = openModalShell('hhZoneMod', 'border-amber-500/50', isEdit ? 'Edit Floor Zone' : 'Add Floor Zone (Feet)', `
      <input id='zmLbl' value='${esc(z.label)}' placeholder='Zone label (e.g. Patch Zone, Rubber Border)' class='w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white'>
      <div class='grid grid-cols-2 gap-2'>
        <label class='text-[10px] text-zinc-400'>Width (ft)<input id='zmW' type='number' step='0.5' value='${z.w}' class='mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white'></label>
        <label class='text-[10px] text-zinc-400'>Length (ft)<input id='zmL' type='number' step='0.5' value='${z.l}' class='mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white'></label>
        <label class='text-[10px] text-zinc-400'>Center X (ft)<input id='zmX' type='number' step='0.5' value='${z.x}' class='mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white'></label>
        <label class='text-[10px] text-zinc-400'>Center Z (ft)<input id='zmZ' type='number' step='0.5' value='${z.z}' class='mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white'></label>
      </div>
      <label class='text-[10px] text-zinc-400 block'>Highlight Color<input id='zmCol' type='color' value='${esc(z.color || '#f43f5e')}' class='mt-1 w-full h-8 bg-zinc-900 border border-zinc-700 rounded-lg'></label>
      <button id='zmSave' class='w-full py-2.5 rounded-xl bg-amber-500 text-zinc-950 text-xs font-black'>Save Floor Zone (Syncs Live)</button>`);
    $('zmSave').onclick = () => {
      ensureEditable(h);
      const obj = { id: isEdit ? z.id : 'z_' + Date.now(), label: $('zmLbl').value.trim() || 'Zone', x: Number($('zmX').value) || 0, z: Number($('zmZ').value) || 0, w: Math.max(1, Number($('zmW').value) || 6), l: Math.max(1, Number($('zmL').value) || 6), color: $('zmCol').value || '#f43f5e' };
      if (isEdit) { const i = h.zones.findIndex(x => x.id === z.id); if (i >= 0) h.zones[i] = obj; } else h.zones.push(obj);
      selItem = { kind: 'zone', id: obj.id }; m.classList.add('hidden'); commitHolos(); buildRoomMesh(); render2dBlueprint();
    };
  }

  function openPropModal(prop, isEdit = false) {
    const h = activeHolo(); if (!h) return;
    const p = prop || { kind: 'base_cab', label: 'Base Cabinet', x: 0, y: 0, z: 0, w: 3, d: 2, h: 3, rotY: 0, color: '#f59e0b' };
    const m = openModalShell('hhPropMod', 'border-amber-500/50', isEdit ? 'Edit 3D Object / Fixture' : 'Add 3D Cabinet / Door / Fixture', `
      <div class='flex flex-wrap gap-1.5'>${PROP_PRESETS.map((pr, idx) => `<button type='button' data-pp='${idx}' class='pp-b px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-[10px] font-bold text-amber-200'>${pr.label}</button>`).join('')}</div>
      <input id='pmLbl' value='${esc(p.label)}' placeholder='Label (e.g. Sink Base, Entry Door)' class='w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white'>
      <div class='grid grid-cols-3 gap-2'>
        <label class='text-[10px] text-zinc-400'>Width (ft)<input id='pmW' type='number' step='0.25' value='${p.w}' class='mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white'></label>
        <label class='text-[10px] text-zinc-400'>Depth (ft)<input id='pmD' type='number' step='0.25' value='${p.d}' class='mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white'></label>
        <label class='text-[10px] text-zinc-400'>Height (ft)<input id='pmH' type='number' step='0.25' value='${p.h}' class='mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white'></label>
        <label class='text-[10px] text-zinc-400'>Pos X (ft)<input id='pmX' type='number' step='0.5' value='${p.x}' class='mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white'></label>
        <label class='text-[10px] text-zinc-400'>Pos Z (ft)<input id='pmZ' type='number' step='0.5' value='${p.z}' class='mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white'></label>
        <label class='text-[10px] text-zinc-400'>Floor Off Y<input id='pmY' type='number' step='0.5' value='${p.y || 0}' class='mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white'></label>
      </div>
      <div class='grid grid-cols-2 gap-2'>
        <label class='text-[10px] text-zinc-400'>Rotate (deg)<input id='pmR' type='number' step='15' value='${p.rotY || 0}' class='mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white'></label>
        <label class='text-[10px] text-zinc-400'>Color<input id='pmCol' type='color' value='${esc(p.color || '#f59e0b')}' class='mt-1 w-full h-8 bg-zinc-900 border border-zinc-700 rounded-lg'></label>
      </div>
      <button id='pmSave' class='w-full py-2.5 rounded-xl bg-amber-500 text-zinc-950 text-xs font-black'>Place 3D Object (Syncs Live)</button>`);
    m.querySelectorAll('.pp-b').forEach(b => b.onclick = () => { const pr = PROP_PRESETS[Number(b.dataset.pp)]; $('pmLbl').value = pr.label; $('pmW').value = pr.w; $('pmD').value = pr.d; $('pmH').value = pr.h; $('pmY').value = pr.y; $('pmCol').value = pr.color; });
    $('pmSave').onclick = () => {
      ensureEditable(h);
      const obj = { id: isEdit ? p.id : 'pr_' + Date.now(), kind: p.kind || 'block', label: $('pmLbl').value.trim() || 'Object', w: Number($('pmW').value) || 2, d: Number($('pmD').value) || 2, h: Number($('pmH').value) || 3, x: Number($('pmX').value) || 0, y: Number($('pmY').value) || 0, z: Number($('pmZ').value) || 0, rotY: Number($('pmR').value) || 0, color: $('pmCol').value || '#f59e0b' };
      if (isEdit) { const i = h.props.findIndex(x => x.id === p.id); if (i >= 0) h.props[i] = obj; } else h.props.push(obj);
      selItem = { kind: 'prop', id: obj.id }; m.classList.add('hidden'); commitHolos(); buildRoomMesh(); render2dBlueprint();
    };
  }

  function openGlbModal(mod, isEdit = false) {
    const h = activeHolo(); if (!h) return;
    const g = mod || { name: 'Scanned Object', url: './models/scan.glb', xFt: 0, yFt: 0, zFt: 0, sizeFt: 6, rotDeg: 0 };
    const m = openModalShell('hhGlbMod', 'border-emerald-500/50', isEdit ? 'Edit .GLB Scan Placement' : 'Drop .GLB 3D Scan Into Floor Plan', `
      <input id='gmName' value='${esc(g.name)}' placeholder='Scan name (e.g. Vanity Scan, North Wall)' class='w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white'>
      <input id='gmUrl' value='${esc(g.url)}' placeholder='./models/your-scan.glb or https://...' class='w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white'>
      <div class='grid grid-cols-3 gap-2'>
        <label class='text-[10px] text-zinc-400'>Pos X (ft)<input id='gmX' type='number' step='0.5' value='${g.xFt || 0}' class='mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white'></label>
        <label class='text-[10px] text-zinc-400'>Pos Z (ft)<input id='gmZ' type='number' step='0.5' value='${g.zFt || 0}' class='mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white'></label>
        <label class='text-[10px] text-zinc-400'>Size (ft)<input id='gmSz' type='number' step='0.5' value='${g.sizeFt || 6}' class='mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white'></label>
      </div>
      <div class='grid grid-cols-2 gap-2'>
        <label class='text-[10px] text-zinc-400'>Floor Off Y (ft)<input id='gmY' type='number' step='0.5' value='${g.yFt || 0}' class='mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white'></label>
        <label class='text-[10px] text-zinc-400'>Rotate (deg)<input id='gmR' type='number' step='15' value='${g.rotDeg || 0}' class='mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white'></label>
      </div>
      <div class='text-[10px] text-zinc-400'>Upload .GLB to your GitHub <code>models/</code> folder and enter <code>./models/file.glb</code> so your crew sees it live.</div>
      <button id='gmSave' class='w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black'>Place .GLB Into Room (Syncs Live)</button>`);
    $('gmSave').onclick = () => {
      ensureEditable(h);
      const obj = { id: isEdit ? g.id : 'glb_' + Date.now(), name: $('gmName').value.trim() || '3D Scan', url: $('gmUrl').value.trim(), xFt: Number($('gmX').value) || 0, yFt: Number($('gmY').value) || 0, zFt: Number($('gmZ').value) || 0, sizeFt: Math.max(0.5, Number($('gmSz').value) || 6), rotDeg: Number($('gmR').value) || 0 };
      if (!obj.url) return alert('Enter a .GLB path or URL.');
      if (isEdit) { const i = h.models.findIndex(x => x.id === g.id); if (i >= 0) h.models[i] = obj; } else h.models.push(obj);
      selItem = { kind: 'model', id: obj.id }; m.classList.add('hidden'); commitHolos(); buildRoomMesh(); render2dBlueprint();
    };
  }

  function openAddRoomModal() {
    const m = openModalShell('hhRoomModal', 'border-cyan-500/50', 'Add Room Blueprint to Goal', `
      <input id='hrmName' placeholder='Room name (e.g. Main Hall, Kitchen, Rhino Stall)' class='w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white'>
      <div class='grid grid-cols-3 gap-2'>
        <label class='text-[10px] text-zinc-400'>Width (ft)<input id='hrmW' type='number' value='24' class='mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white'></label>
        <label class='text-[10px] text-zinc-400'>Length (ft)<input id='hrmL' type='number' value='32' class='mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white'></label>
        <label class='text-[10px] text-zinc-400'>Ceiling (ft)<input id='hrmH' type='number' value='10' class='mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white'></label>
      </div>
      <input id='hrmUrl' placeholder='Optional full-room .GLB URL (or leave blank for Wall Plan)' class='w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white'>
      <button id='hrmCreate' class='w-full py-2.5 rounded-xl bg-cyan-600 text-white text-xs font-black'>+ Create Editable Room Blueprint</button>`);
    $('hrmCreate').onclick = () => {
      if (!curGoal) return;
      const wFt = Number($('hrmW').value) || 24, lFt = Number($('hrmL').value) || 32, hFt = Number($('hrmH').value) || 10;
      const nh = { id: 'room_' + Date.now(), name: $('hrmName').value.trim() || 'Room ' + ((curGoal.holos?.length || 0) + 1), wFt, lFt, hFt, scanUrl: $('hrmUrl').value.trim(), scaleFtPerUnit: 1 / (6.5 / Math.max(wFt, lFt, 1)), walls: [], zones: [], props: [], models: [], pins: [] };
      nh.walls = defaultWalls(nh);
      curGoal.holos = [...(curGoal.holos || []), nh];
      curIdx = curGoal.holos.length - 1; selectedPinId = null; selItem = null;
      m.classList.add('hidden'); commitHolos(); renderShell(); bootThree();
    };
  }

  function openRoomJsonModal() {
    const h = activeHolo(); if (!h) return;
    ensureEditable(h);
    const m = openModalShell('hhJsonMod', 'border-sky-500/50', 'Paste / Copy Single Room Blueprint JSON', `
      <textarea id='rjmTxt' rows='10' class='w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-[10px] font-mono text-white'>${esc(JSON.stringify(h, null, 2))}</textarea>
      <div class='grid grid-cols-2 gap-2'>
        <button id='rjmCopy' class='py-2 rounded-xl bg-zinc-800 text-sky-300 text-xs font-black'>Copy JSON</button>
        <button id='rjmApply' class='py-2 rounded-xl bg-sky-600 text-white text-xs font-black'>Apply JSON Live</button>
      </div>`);
    $('rjmCopy').onclick = () => { navigator.clipboard?.writeText($('rjmTxt').value); alert('Room JSON copied!'); };
    $('rjmApply').onclick = () => {
      try {
        const parsed = JSON.parse($('rjmTxt').value.trim());
        curGoal.holos[curIdx] = { ...h, ...parsed, id: h.id };
        m.classList.add('hidden'); commitHolos(); renderShell(); bootThree();
      } catch (e) { alert('Invalid Room JSON: ' + e.message); }
    };
  }

  function nudgeSelected(dx, dz, drot) {
    const h = activeHolo(); if (!h || !selItem) return;
    ensureEditable(h);
    if (selItem.kind === 'prop') {
      const p = h.props.find(x => x.id === selItem.id); if (!p) return;
      p.x = snapHalf((Number(p.x) || 0) + dx); p.z = snapHalf((Number(p.z) || 0) + dz); p.rotY = ((Number(p.rotY) || 0) + drot) % 360;
    } else if (selItem.kind === 'zone') {
      const z = h.zones.find(x => x.id === selItem.id); if (!z) return;
      z.x = snapHalf((Number(z.x) || 0) + dx); z.z = snapHalf((Number(z.z) || 0) + dz);
    } else if (selItem.kind === 'wall') {
      const w = h.walls.find(x => x.id === selItem.id); if (!w) return;
      w.x1 = snapHalf(w.x1 + dx); w.x2 = snapHalf(w.x2 + dx); w.z1 = snapHalf(w.z1 + dz); w.z2 = snapHalf(w.z2 + dz);
    } else if (selItem.kind === 'model') {
      const md = h.models.find(x => x.id === selItem.id); if (!md) return;
      md.xFt = snapHalf((Number(md.xFt) || 0) + dx); md.zFt = snapHalf((Number(md.zFt) || 0) + dz); md.rotDeg = ((Number(md.rotDeg) || 0) + drot) % 360;
    }
    commitHolos(); buildRoomMesh(); render2dBlueprint();
  }

  function renderBottomCard() {
    const box = $('hhPinCard'); if (!box) return;
    const h = activeHolo();
    if (!h) { box.innerHTML = `<div class='text-xs text-zinc-500 text-center py-2'>No room hologram in this Goal yet.</div>`; return; }

    if (cfg.isBoss && selItem) {
      const list = selItem.kind === 'wall' ? getWalls(h) : selItem.kind === 'zone' ? getZones(h) : selItem.kind === 'prop' ? getProps(h) : getModels(h);
      const obj = list.find(x => x.id === selItem.id);
      if (obj) {
        box.innerHTML = `<div class='space-y-2.5'>
          <div class='flex items-center justify-between gap-2'><div><div class='text-[10px] font-mono uppercase text-amber-400'>Selected ${selItem.kind}</div><div class='text-sm font-black text-white'>${esc(obj.label || obj.name)}</div></div><button id='siDone' class='px-2.5 py-1 rounded-lg bg-zinc-800 text-[10px] font-bold text-zinc-300'>Done</button></div>
          <div class='grid grid-cols-5 gap-1.5'>
            <button id='ndL' class='py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-black text-white'>◀ 1'</button>
            <button id='ndR' class='py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-black text-white'>1' ▶</button>
            <button id='ndU' class='py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-black text-white'>▲ 1'</button>
            <button id='ndD' class='py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-black text-white'>▼ 1'</button>
            <button id='ndRot' class='py-2 rounded-lg bg-zinc-900 border border-cyan-500/40 text-xs font-black text-cyan-300'>↻ 15°</button>
          </div>
          <div class='flex gap-1.5'>
            <button id='siEdit' class='flex-1 py-2 rounded-xl bg-sky-700 text-white text-xs font-black'>Edit Exact Specs</button>
            <button id='siDel' class='px-3 py-2 rounded-xl bg-rose-950 text-rose-300 text-xs font-bold'>Delete</button>
          </div>
        </div>`;
        $('siDone').onclick = () => { selItem = null; render2dBlueprint(); renderBottomCard(); };
        $('ndL').onclick = () => nudgeSelected(-1, 0, 0);
        $('ndR').onclick = () => nudgeSelected(1, 0, 0);
        $('ndU').onclick = () => nudgeSelected(0, -1, 0);
        $('ndD').onclick = () => nudgeSelected(0, 1, 0);
        $('ndRot').onclick = () => nudgeSelected(0, 0, 15);
        $('siEdit').onclick = () => { if (selItem.kind === 'wall') openWallModal(obj, true); else if (selItem.kind === 'zone') openZoneModal(obj, true); else if (selItem.kind === 'prop') openPropModal(obj, true); else openGlbModal(obj, true); };
        $('siDel').onclick = () => {
          ensureEditable(h);
          if (selItem.kind === 'wall') h.walls = h.walls.filter(x => x.id !== obj.id);
          else if (selItem.kind === 'zone') h.zones = h.zones.filter(x => x.id !== obj.id);
          else if (selItem.kind === 'prop') h.props = h.props.filter(x => x.id !== obj.id);
          else h.models = h.models.filter(x => x.id !== obj.id);
          selItem = null; commitHolos(); buildRoomMesh(); render2dBlueprint();
        };
        return;
      }
    }

    const pins = h.pins || [];
    const p = pins.find(x => x.id === selectedPinId);
    if (!p) {
      box.innerHTML = `<div class='flex items-center justify-between gap-2'><span class='text-xs font-black text-rose-300'>${pins.length} Red Work Halos in ${esc(h.name)}</span><span class='text-[10px] text-zinc-400'>Tap pin to inspect</span></div><div class='mt-2 space-y-1.5 max-h-48 overflow-y-auto'>${pins.map(x => `<button data-spin='${x.id}' class='w-full text-left px-3 py-2 rounded-xl bg-zinc-900 border ${x.status === 'DONE' ? 'border-emerald-500/45' : 'border-rose-500/40'} flex items-center justify-between gap-2'><div class='min-w-0'><div class='text-xs font-bold ${x.status === 'DONE' ? 'line-through text-emerald-300' : 'text-white'} truncate'>${esc(x.title)}</div><div class='text-[10px] text-zinc-400 truncate'>${esc(x.area || 'Surface')}${x.doneBy ? ` • Done by ${esc(x.doneBy)}` : ''}${x.link ? ' • Link' : ''}</div></div><span class='text-[9px] font-mono font-black ${x.status === 'DONE' ? 'text-emerald-400' : 'text-rose-400'} shrink-0'>${x.status}</span></button>`).join('') || `<div class='text-[11px] text-zinc-500 py-1'>${cfg.isBoss ? 'Tap + Pin above, then tap anywhere in 2D Plan or 3D Holo.' : 'No red pins dropped in this room yet.'}</div>`}</div>`;
      box.querySelectorAll('[data-spin]').forEach(b => b.onclick = () => { selectedPinId = b.dataset.spin; rebuildPins3d(); });
      return;
    }
    const done = p.status === 'DONE', href = safeLink(p.link);
    box.innerHTML = `<div class='space-y-2'>
      <div class='flex items-start justify-between gap-2'><div><div class='text-[10px] font-mono text-rose-400 uppercase'>${esc(p.area || 'Surface')} • ${p.status}</div><div class='text-sm font-black text-white'>${esc(p.title)}</div></div><button id='hhBackPins' class='px-2.5 py-1 rounded-lg bg-zinc-800 text-[10px] font-bold text-zinc-300 shrink-0'>All Pins</button></div>
      <div class='text-xs text-zinc-200 leading-relaxed bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 whitespace-pre-line'>${esc(p.desc || 'No scope notes added.')}</div>
      ${p.doneBy ? `<div class='text-[10px] font-mono text-emerald-400'>✓ Checked off by ${esc(p.doneBy)} ${fmtTime(p.doneAt)}</div>` : ''}
      ${href ? `<a href='${esc(href)}' target='_blank' rel='noopener noreferrer' class='flex items-center justify-between px-3 py-2 rounded-xl bg-sky-950/80 border border-sky-400/50 text-xs font-black text-sky-300'><span>Open Attached Link / Photo</span><span>➔</span></a>` : ''}
      <div class='flex gap-1.5'><button id='hhTogPin' class='flex-1 py-2 rounded-xl ${done ? 'bg-zinc-800 text-zinc-200' : 'bg-emerald-600 text-white'} text-xs font-black'>${done ? 'Reopen Pin' : '✓ Mark Pin Complete (Syncs Live)'}</button>${cfg.isBoss ? `<button id='hhEdPin' class='px-3 py-2 rounded-xl bg-sky-900 text-sky-200 text-xs font-bold'>Edit</button><button id='hhDelPin' class='px-3 py-2 rounded-xl bg-rose-950 text-rose-300 text-xs font-bold'>Del</button>` : ''}</div>
    </div>`;
    $('hhBackPins').onclick = () => { selectedPinId = null; rebuildPins3d(); };
    $('hhTogPin').onclick = () => { p.status = done ? 'OPEN' : 'DONE'; p.doneBy = p.status === 'DONE' ? cfg.actorName : ''; p.doneAt = p.status === 'DONE' ? Date.now() : 0; commitHolos(); rebuildPins3d(); };
    if ($('hhEdPin')) $('hhEdPin').onclick = () => openPinModal(p, true);
    if ($('hhDelPin')) $('hhDelPin').onclick = () => { h.pins = h.pins.filter(x => x.id !== p.id); selectedPinId = null; commitHolos(); rebuildPins3d(); };
  }

  function setTool(t) {
    tool = t; measPts = []; meas2d = []; wallDraftPt = null; drawMeasure3d(); if (dispMode === '2d') render2dBlueprint();
    document.querySelectorAll('.hh-tool').forEach(b => {
      const on = b.dataset.t === tool;
      b.className = on ? (tool === 'pin' ? 'hh-tool py-2 px-2 rounded-xl border text-[11px] font-black bg-rose-600 border-rose-300 text-white' : 'hh-tool py-2 px-2 rounded-xl border text-[11px] font-black bg-cyan-600/35 border-cyan-400 text-white') : 'hh-tool py-2 px-2 rounded-xl border text-[11px] font-bold bg-zinc-950 border-zinc-800 text-zinc-300';
    });
    if ($('hhHint')) $('hhHint').innerHTML = tool === 'pin' ? `<span class='text-rose-400 font-black'>TAP ANYWHERE IN 2D PLAN OR 3D HOLO TO DROP A RED PIN</span>` : tool === 'wall' ? `<span class='text-amber-300 font-black'>2D WALL DRAW: Tap Start point, then End point on Floor Plan</span>` : tool === 'measure' ? `<span class='text-cyan-300 font-bold'>Tap Point A, then Point B to measure feet &amp; inches</span>` : '1-finger orbit • Pinch zoom • Tap red pins or switch 2D/3D';
  }

  function setDisplayMode(m) {
    dispMode = m;
    $('hhCanvasWrap')?.classList.toggle('hidden', dispMode !== '3d');
    $('hhSvgWrap')?.classList.toggle('hidden', dispMode !== '2d');
    $('hh3dBar')?.classList.toggle('hidden', dispMode !== '3d');
    document.querySelectorAll('.hh-dm').forEach(b => b.className = b.dataset.dm === dispMode ? 'hh-dm py-1.5 px-3 rounded-lg bg-cyan-600 text-white text-[11px] font-black' : 'hh-dm py-1.5 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 text-[11px] font-bold');
    if (dispMode === '2d') render2dBlueprint();
    else { resizeThree(); }
  }

  function resizeThree() {
    const cv = $('hhCanvas'); if (!renderer || !camera || !cv) return;
    const w = cv.parentElement?.clientWidth || 340;
    if (w > 20) { renderer.setSize(w, 350, false); camera.aspect = w / 350; camera.updateProjectionMatrix(); }
  }

  function updateCamera() {
    if (!camera) return;
    camera.position.set(target.x + radius * Math.sin(phi) * Math.sin(theta), target.y + radius * Math.cos(phi), target.z + radius * Math.sin(phi) * Math.cos(theta));
    camera.lookAt(target.x, target.y, target.z);
    updateSmartWallCutaway();
  }

  function bindPointer(cv) {
    const ptrs = new Map(); let down = null, moved = false, lastDist = 0;
    cv.onpointerdown = e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); down = { x: e.clientX, y: e.clientY }; moved = false; lastDist = 0; };
    cv.onpointermove = e => {
      if (!ptrs.has(e.pointerId)) return;
      const prev = ptrs.get(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) { const dx = e.clientX - prev.x, dy = e.clientY - prev.y; if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) moved = true; theta -= dx * 0.01; phi = Math.max(0.12, Math.min(2.6, phi - dy * 0.01)); }
      else if (ptrs.size === 2) { moved = true; const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (lastDist) radius = Math.max(2, Math.min(26, radius - (d - lastDist) * 0.03)); lastDist = d; }
    };
    const up = e => {
      if (cv.hasPointerCapture(e.pointerId)) cv.releasePointerCapture(e.pointerId);
      ptrs.delete(e.pointerId);
      if (moved || !down || !THREE || !camera) return;
      const r = cv.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, camera);
      const pHit = ray.intersectObjects(pinOrbs, false);
      if (pHit.length && tool !== 'measure') { selectedPinId = pHit[0].object.userData.pinId; selItem = null; rebuildPins3d(); return; }
      const hits = ray.intersectObjects(activeMeshes, false).filter(hit => !hit.object.userData.cutHidden);
      if (!hits.length) return;
      const pt = hits[0].point;
      if (tool === 'pin' && cfg.isBoss) openPinModal(pt, false);
      else if (tool === 'measure') { if (measPts.length >= 2) measPts = []; measPts.push(pt.clone()); drawMeasure3d(); }
      else if (tool === 'inspect' && cfg.isBoss) {
        const u = hits[0].object.userData;
        if (u.propId) { selItem = { kind: 'prop', id: u.propId }; selectedPinId = null; renderBottomCard(); }
        else if (u.zoneId) { selItem = { kind: 'zone', id: u.zoneId }; selectedPinId = null; renderBottomCard(); }
        else if (u.wallId) { selItem = { kind: 'wall', id: u.wallId }; selectedPinId = null; renderBottomCard(); }
      }
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
      camera = new THREE.PerspectiveCamera(48, 1, 0.05, 140);
      scene.add(new THREE.AmbientLight(0xffffff, 0.95));
      const d1 = new THREE.DirectionalLight(0x38bdf8, 1.1); d1.position.set(6, 12, 8); scene.add(d1);
      const d2 = new THREE.DirectionalLight(0xffffff, 0.7); d2.position.set(-6, 5, -6); scene.add(d2);
      scene.add(new THREE.GridHelper(14, 28, 0x0284c7, 0x0f172a));
      roomGrp = new THREE.Group(); pinGrp = new THREE.Group(); measGrp = new THREE.Group();
      scene.add(roomGrp, pinGrp, measGrp);
      bindPointer(cv);
      window.addEventListener('resize', resizeThree);
      let t = 0;
      const loop = () => { requestAnimationFrame(loop); t += 0.07; pinGrp?.children.forEach(g => { const h = g.children.find(c => c.userData.isHalo); if (h) { const sc = 1 + Math.sin(t) * 0.34; h.scale.set(sc, sc, 1); } }); if (dispMode === '3d') { updateCamera(); renderer.render(scene, camera); } };
      loop();
    }
    resizeThree(); buildRoomMesh(); if (dispMode === '2d') render2dBlueprint();
  }

  function renderShell() {
    if (!curHost) return;
    if (!curGoal) { curHost.innerHTML = `<div class='max-w-xl mx-auto p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-center text-xs text-zinc-400'>Select or load a Goal first to view its 2D Floor Plan &amp; 3D Hologram.</div>`; return; }
    const holos = curGoal.holos || [];
    if (curIdx >= holos.length) curIdx = 0;
    const h = activeHolo();
    const scanHref = safeLink(getScanApp());
    curHost.innerHTML = `<div class='max-w-xl mx-auto space-y-2.5 pb-12'>
      <div class='bg-zinc-900/95 border border-cyan-500/45 rounded-2xl p-3 space-y-2.5'>
        <div class='flex items-center justify-between gap-2'>
          <div class='min-w-0'><div class='text-[10px] font-mono uppercase text-cyan-400 truncate'>${esc(curGoal.title)}</div><div id='hhStatus' class='text-xs font-black text-white truncate'>${esc(h?.name || 'No Rooms Yet')}</div></div>
          <div class='flex gap-1.5 shrink-0'>
            <button data-dm='3d' class='hh-dm py-1.5 px-2.5 rounded-lg text-[11px] font-black'>3D Holo</button>
            <button data-dm='2d' class='hh-dm py-1.5 px-2.5 rounded-lg text-[11px] font-black'>2D Plan</button>
          </div>
        </div>
        <div class='flex flex-wrap items-center gap-1.5'>${holos.map((rm, i) => `<div class='inline-flex items-center rounded-xl border ${i === curIdx ? 'bg-cyan-600/30 border-cyan-400 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-300'} overflow-hidden'><button data-rmidx='${i}' class='px-2.5 py-1 text-[11px] font-black'>${esc(rm.name)}</button>${cfg.isBoss && holos.length > 1 ? `<button data-rmdel='${i}' class='px-1.5 py-1 text-[10px] text-zinc-500 hover:text-rose-400 border-l border-zinc-800'>✕</button>` : ''}</div>`).join('')}${cfg.isBoss ? `<button id='hhAddRoom' class='px-2.5 py-1 rounded-xl bg-cyan-600/25 border border-cyan-400/60 text-cyan-200 text-[11px] font-black'>+ Room</button>` : ''}</div>
        <div class='grid ${cfg.isBoss ? 'grid-cols-4' : 'grid-cols-3'} gap-1.5'>
          <button data-t='inspect' class='hh-tool py-2 px-1.5 rounded-xl border text-[11px] font-black'>Inspect</button>
          ${cfg.isBoss ? `<button data-t='pin' class='hh-tool py-2 px-1.5 rounded-xl border text-[11px] font-black'>+ Pin</button>` : `<button id='hhResetCam' class='py-2 px-1.5 rounded-xl bg-zinc-950 border border-zinc-700 text-[11px] font-bold text-zinc-200'>Reset</button>`}
          <button data-t='measure' class='hh-tool py-2 px-1.5 rounded-xl border text-[11px] font-bold'>Measure</button>
          ${cfg.isBoss ? `<button id='hhBuildBtn' class='py-2 px-1.5 rounded-xl border text-[11px] font-black ${buildOpen ? 'bg-amber-500 border-amber-300 text-zinc-950' : 'bg-zinc-950 border-amber-500/50 text-amber-300'}'>Build ▾</button>` : ''}
        </div>
        ${cfg.isBoss && buildOpen && h ? `<div class='p-2.5 rounded-xl bg-zinc-950 border border-amber-500/40 space-y-2'>
          <div class='grid grid-cols-4 gap-1.5'>
            <button id='hbDrawWall' class='py-1.5 rounded-lg bg-cyan-950 border border-cyan-500/50 text-[10px] font-black text-cyan-200'>+ Draw Wall</button>
            <button id='hbAddZone' class='py-1.5 rounded-lg bg-rose-950 border border-rose-500/50 text-[10px] font-black text-rose-200'>+ Zone</button>
            <button id='hbAddProp' class='py-1.5 rounded-lg bg-amber-950 border border-amber-500/50 text-[10px] font-black text-amber-200'>+ Cab/Prop</button>
            <button id='hbAddGlb' class='py-1.5 rounded-lg bg-emerald-950 border border-emerald-500/50 text-[10px] font-black text-emerald-200'>+ .GLB</button>
          </div>
          <div class='grid grid-cols-4 gap-1.5'>
            <button id='hbWallNum' class='py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-[10px] font-bold text-zinc-200'>Wall Exact</button>
            <label class='py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-center text-[10px] font-bold text-cyan-300 cursor-pointer'>Test .GLB<input id='hhFileIn' type='file' accept='.glb,.gltf' class='hidden'></label>
            <button id='hbRoomJson' class='py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-[10px] font-bold text-sky-300'>Room JSON</button>
            <a href='${esc(scanHref)}' target='_blank' rel='noopener noreferrer' class='py-1.5 rounded-lg bg-zinc-900 border border-emerald-500/40 text-center text-[10px] font-bold text-emerald-300'>Scanner ➔</a>
          </div>
          <div class='text-[10px] text-zinc-400'>Tip: Tap any wall, zone, or cabinet in <strong>2D Plan</strong> or <strong>3D Holo</strong> (Inspect mode) to nudge, rotate, edit, or delete it.</div>
        </div>` : ''}
        <div id='hhCanvasWrap' class='rounded-xl overflow-hidden border border-cyan-500/35 bg-[#030712]'><canvas id='hhCanvas' class='w-full h-[350px] block touch-none'></canvas></div>
        <div id='hhSvgWrap' class='hidden rounded-xl overflow-hidden border border-cyan-500/45 bg-[#030712]'></div>
        <div id='hh3dBar' class='grid grid-cols-5 gap-1.5'>
          <button data-vm='ghost' class='hh-vm py-1.5 rounded-lg border text-[10px] font-black ${renderStyle === 'ghost' ? 'bg-cyan-600/35 border-cyan-400 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}'>Ghost</button>
          <button data-vm='xray' class='hh-vm py-1.5 rounded-lg border text-[10px] font-black ${renderStyle === 'xray' ? 'bg-cyan-600/35 border-cyan-400 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}'>X-Ray</button>
          <button data-vm='solid' class='hh-vm py-1.5 rounded-lg border text-[10px] font-black ${renderStyle === 'solid' ? 'bg-cyan-600/35 border-cyan-400 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}'>Solid</button>
          <button id='hhCutBtn' class='py-1.5 rounded-lg border text-[10px] font-black ${cutaway ? 'bg-emerald-600/25 border-emerald-400 text-emerald-200' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}'>Cut:${cutaway ? 'ON' : 'OFF'}</button>
          <button id='hhTopCam' class='py-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-[10px] font-bold text-zinc-300'>Top</button>
        </div>
        <div id='hhHint' class='text-[11px] font-mono text-zinc-400 text-center'>1-finger orbit • Pinch zoom • Tap red pins or switch 2D/3D</div>
        <div id='hhPinCard' class='p-2.5 rounded-xl bg-zinc-950 border border-zinc-800'></div>
      </div>
    </div>`;

    curHost.querySelectorAll('.hh-dm').forEach(b => b.onclick = () => setDisplayMode(b.dataset.dm));
    if ($('hhAddRoom')) $('hhAddRoom').onclick = openAddRoomModal;
    curHost.querySelectorAll('[data-rmidx]').forEach(b => b.onclick = () => { curIdx = Number(b.dataset.rmidx); selectedPinId = null; selItem = null; renderShell(); bootThree(); });
    curHost.querySelectorAll('[data-rmdel]').forEach(b => b.onclick = () => { if (!confirm('Delete this room hologram?')) return; curGoal.holos.splice(Number(b.dataset.rmdel), 1); curIdx = 0; selectedPinId = null; selItem = null; commitHolos(); renderShell(); bootThree(); });
    curHost.querySelectorAll('.hh-tool').forEach(b => b.onclick = () => setTool(b.dataset.t));
    if ($('hhBuildBtn')) $('hhBuildBtn').onclick = () => { buildOpen = !buildOpen; renderShell(); bootThree(); };
    if ($('hbDrawWall')) $('hbDrawWall').onclick = () => { setDisplayMode('2d'); setTool('wall'); };
    if ($('hbWallNum')) $('hbWallNum').onclick = () => openWallModal(null, false);
    if ($('hbAddZone')) $('hbAddZone').onclick = () => openZoneModal(null, false);
    if ($('hbAddProp')) $('hbAddProp').onclick = () => openPropModal(null, false);
    if ($('hbAddGlb')) $('hbAddGlb').onclick = () => openGlbModal(null, false);
    if ($('hbRoomJson')) $('hbRoomJson').onclick = openRoomJsonModal;
    curHost.querySelectorAll('.hh-vm').forEach(b => b.onclick = () => { renderStyle = b.dataset.vm; curHost.querySelectorAll('.hh-vm').forEach(x => x.className = x === b ? 'hh-vm py-1.5 rounded-lg border text-[10px] font-black bg-cyan-600/35 border-cyan-400 text-white' : 'hh-vm py-1.5 rounded-lg border text-[10px] font-black bg-zinc-950 border-zinc-800 text-zinc-400'); applyVisualStyle(); });
    $('hhCutBtn').onclick = () => { cutaway = !cutaway; $('hhCutBtn').textContent = 'Cut:' + (cutaway ? 'ON' : 'OFF'); updateSmartWallCutaway(); };
    $('hhTopCam').onclick = () => { phi = phi < 0.25 ? 1.02 : 0.14; theta = 0; updateCamera(); };
    if ($('hhResetCam')) $('hhResetCam').onclick = () => { theta = 0.65; phi = 1.02; radius = 10.2; updateCamera(); };
    if ($('hhFileIn')) $('hhFileIn').onchange = async e => { const f = e.target.files?.[0]; if (f) await loadGlbBuffer(await f.arrayBuffer(), false); e.target.value = ''; };
    setDisplayMode(dispMode); setTool(tool); renderBottomCard();
  }

  window.HeistHolo = {
    mount(host, goal, options = {}) {
      curHost = host; curGoal = goal; cfg = { ...cfg, ...options };
      renderShell(); if (goal) bootThree();
    },
    syncGoal(goal, options = {}) {
      const sameGoal = curGoal?.id === goal?.id;
      curGoal = goal; cfg = { ...cfg, ...options };
      if (!sameGoal) { curIdx = 0; selectedPinId = null; selItem = null; }
      if (curHost && !curHost.classList.contains('hidden')) {
        if (!sameGoal || !$('hhCanvas')) { renderShell(); if (goal) bootThree(); }
        else { buildRoomMesh(); }
      }
    }
  };
})();