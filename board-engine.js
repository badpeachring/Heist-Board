(() => {
  const STORE_KEY = 'heist_board_state_v1';
  const THEMES = ['theme-tactical', 'theme-cork', 'theme-blueprint'];
  const $ = id => document.getElementById(id);
  let editingCardId = null;

  const defaultState = () => ({
    themeIdx: 0,
    activeId: 'h_default',
    heists: [{
      id: 'h_default',
      name: 'First Target Heist',
      grossTake: 25000,
      overhead: 8000,
      crew: [
        { id: 'c1', name: 'Lead Ops', role: 'COO', pct: 50 },
        { id: 'c2', name: 'Partner', role: 'CEO', pct: 50 }
      ],
      cards: [
        { id: 'n1', title: 'Target Recon & Specs', type: 'INTEL', status: 'DONE', x: 14, y: 14, parentId: '', link: '', notes: 'Gather dimensions, photos, and constraints.' },
        { id: 'n2', title: 'Prep & Logistics', type: 'SETUP', status: 'OPEN', x: 52, y: 36, parentId: 'n1', link: '', notes: 'Confirm crew, gear, and schedule.' },
        { id: 'n3', title: 'Execute Finale', type: 'FINALE', status: 'OPEN', x: 28, y: 66, parentId: 'n2', link: '', notes: 'Final delivery and payout.' }
      ]
    }]
  });

  let state = (() => {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || defaultState(); } catch { return defaultState(); }
  })();

  const save = () => localStorage.setItem(STORE_KEY, JSON.stringify(state));
  const activeHeist = () => state.heists.find(h => h.id === state.activeId) || state.heists[0];

  function drawStrings(h) {
    const svg = $('stringLayer');
    const box = $('view-board').getBoundingClientRect();
    svg.innerHTML = '';
    h.cards.forEach(c => {
      if (!c.parentId) return;
      const p = h.cards.find(x => x.id === c.parentId);
      if (!p) return;
      const x1 = (p.x / 100) * box.width + 68;
      const y1 = (p.y / 100) * box.height + 10;
      const x2 = (c.x / 100) * box.width + 68;
      const y2 = (c.y / 100) * box.height + 10;
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2 + 24;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', c.status === 'DONE' ? '#22c55e' : '#ef4444');
      path.setAttribute('stroke-width', '2.5');
      path.setAttribute('stroke-dasharray', c.status === 'DONE' ? '' : '6 4');
      svg.appendChild(path);
    });
  }

  function renderBoard(h) {
    const board = $('view-board');
    THEMES.forEach(t => board.classList.remove(t));
    board.classList.add(THEMES[state.themeIdx % THEMES.length]);

    const layer = $('cardsLayer');
    layer.innerHTML = '';
    const done = h.cards.filter(c => c.status === 'DONE').length;
    const pct = h.cards.length ? Math.round((done / h.cards.length) * 100) : 0;
    $('boardProgressBadge').textContent = `${done}/${h.cards.length} Complete (${pct}%)`;

    h.cards.forEach(c => {
      const el = document.createElement('div');
      const badgeCls = c.type === 'FINALE' ? 'bg-amber-500/25 text-amber-300' : c.type === 'INTEL' ? 'bg-sky-500/25 text-sky-300' : 'bg-rose-500/25 text-rose-300';
      const borderCls = c.status === 'DONE' ? 'border-emerald-500/70' : 'border-zinc-700';
      el.className = `absolute w-36 bg-zinc-950/95 border ${borderCls} rounded-xl p-2 shadow-2xl cursor-grab touch-none select-none`;
      el.style.left = `${c.x}%`;
      el.style.top = `${c.y}%`;
      el.innerHTML = `<div class='flex justify-center -mt-3.5 mb-1'><div class='pin-dot'></div></div><div class='flex items-center justify-between gap-1'><span class='text-[9px] font-black px-1.5 py-0.5 rounded ${badgeCls}'>${c.type}</span><span class='text-[9px] font-mono ${c.status === 'DONE' ? 'text-emerald-400' : 'text-zinc-400'}'>${c.status}</span></div><div class='text-[11px] font-bold text-white mt-1 leading-tight'>${c.title}</div>${c.notes ? `<div class='text-[10px] text-zinc-400 mt-1 line-clamp-2'>${c.notes}</div>` : ''}`;

      let moved = false, startX = 0, startY = 0;
      el.onpointerdown = e => {
        moved = false; startX = e.clientX; startY = e.clientY;
        el.setPointerCapture(e.pointerId);
      };
      el.onpointermove = e => {
        if (!el.hasPointerCapture(e.pointerId)) return;
        if (Math.hypot(e.clientX - startX, e.clientY - startY) > 6) moved = true;
        if (!moved) return;
        const r = board.getBoundingClientRect();
        c.x = Math.max(2, Math.min(68, ((e.clientX - r.left - 68) / r.width) * 100));
        c.y = Math.max(4, Math.min(82, ((e.clientY - r.top - 24) / r.height) * 100));
        el.style.left = `${c.x}%`;
        el.style.top = `${c.y}%`;
        drawStrings(h);
      };
      el.onpointerup = e => {
        if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
        if (moved) { save(); drawStrings(h); }
        else openCardModal(c.id);
      };
      layer.appendChild(el);
    });
    requestAnimationFrame(() => drawStrings(h));
  }

  function renderSetups(h) {
    const box = $('view-setups');
    box.innerHTML = h.cards.map(c => `<div class='bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 flex items-start justify-between gap-2'><div class='min-w-0'><div class='flex items-center gap-1.5'><span class='text-[10px] font-black text-rose-400'>${c.type}</span><span class='text-xs font-bold text-white truncate'>${c.title}</span></div><p class='text-[11px] text-zinc-400 mt-1'>${c.notes || 'No notes'}</p>${c.link ? `<a href='${c.link}' target='_blank' class='inline-block mt-1.5 text-[11px] text-sky-400 underline'>Open Attached Link</a>` : ''}</div><button data-toggle='${c.id}' class='px-2.5 py-1.5 rounded-lg text-[11px] font-black shrink-0 ${c.status === 'DONE' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-300'}'>${c.status === 'DONE' ? 'DONE' : 'MARK'}</button></div>`).join('');
    box.querySelectorAll('[data-toggle]').forEach(b => b.onclick = () => {
      const c = h.cards.find(x => x.id === b.dataset.toggle);
      if (!c) return;
      c.status = c.status === 'DONE' ? 'OPEN' : 'DONE';
      save(); renderAll();
    });
  }

  function renderCrew(h) {
    $('grossTakeInput').value = h.grossTake || 0;
    $('overheadInput').value = h.overhead || 0;
    const net = (Number(h.grossTake) || 0) - (Number(h.overhead) || 0);
    const totalPct = h.crew.reduce((s, m) => s + (Number(m.pct) || 0), 0);
    $('netSummaryBox').textContent = `Net Profit Pool: $${net.toLocaleString()} | Allocated: ${totalPct}%`;
    const list = $('crewList');
    list.innerHTML = h.crew.map(m => {
      const cut = Math.round(net * ((Number(m.pct) || 0) / 100));
      return `<div class='bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 flex items-center justify-between gap-2'><div><div class='text-xs font-bold text-white'>${m.name} <span class='text-zinc-400 font-normal'>(${m.role})</span></div><div class='text-[11px] font-mono text-emerald-400'>${m.pct}% = $${cut.toLocaleString()}</div></div><button data-del-crew='${m.id}' class='px-2 py-1 rounded bg-zinc-900 text-rose-400 text-[11px] font-bold'>Remove</button></div>`;
    }).join('');
    list.querySelectorAll('[data-del-crew]').forEach(b => b.onclick = () => {
      h.crew = h.crew.filter(x => x.id !== b.dataset.delCrew);
      save(); renderCrew(h);
    });
  }

  function openCardModal(cardId = null) {
    const h = activeHeist();
    editingCardId = cardId;
    const c = cardId ? h.cards.find(x => x.id === cardId) : null;
    $('modalHeading').textContent = c ? 'Edit Pinned Card' : 'Pin New Card';
    $('cardTitleIn').value = c ? c.title : '';
    $('cardTypeIn').value = c ? c.type : 'SETUP';
    $('cardStatusIn').value = c ? c.status : 'OPEN';
    $('cardLinkIn').value = c ? (c.link || '') : '';
    $('cardNotesIn').value = c ? (c.notes || '') : '';
    $('cardParentIn').innerHTML = `<option value=''>-- No Red-String Parent --</option>` + h.cards.filter(x => x.id !== cardId).map(x => `<option value='${x.id}' ${c && c.parentId === x.id ? 'selected' : ''}>Link from: ${x.title}</option>`).join('');
    $('deleteCardBtn').classList.toggle('hidden', !c);
    $('cardModal').classList.remove('hidden');
  }

  function renderAll() {
    const h = activeHeist();
    state.activeId = h.id;
    $('heistSelect').innerHTML = state.heists.map(x => `<option value='${x.id}' ${x.id === h.id ? 'selected' : ''}>${x.name}</option>`).join('');
    renderBoard(h); renderSetups(h); renderCrew(h);
  }

  $('heistSelect').onchange = e => { state.activeId = e.target.value; save(); renderAll(); };
  $('themeCycleBtn').onclick = () => { state.themeIdx = (state.themeIdx + 1) % THEMES.length; save(); renderBoard(activeHeist()); };
  $('newHeistBtn').onclick = () => {
    const name = prompt('New Heist Name:');
    if (!name) return;
    const id = 'h_' + Date.now();
    state.heists.push({ id, name, grossTake: 0, overhead: 0, crew: [], cards: [] });
    state.activeId = id; save(); renderAll();
  };
  $('addCardBtn').onclick = () => openCardModal(null);
  $('closeCardModal').onclick = () => $('cardModal').classList.add('hidden');
  $('saveCardBtn').onclick = () => {
    const h = activeHeist();
    const title = $('cardTitleIn').value.trim();
    if (!title) return alert('Enter a title.');
    const payload = { title, type: $('cardTypeIn').value, status: $('cardStatusIn').value, parentId: $('cardParentIn').value, link: $('cardLinkIn').value.trim(), notes: $('cardNotesIn').value.trim() };
    if (editingCardId) {
      Object.assign(h.cards.find(x => x.id === editingCardId), payload);
    } else {
      h.cards.push({ id: 'c_' + Date.now(), x: 18 + (h.cards.length * 10) % 45, y: 14 + (h.cards.length * 14) % 55, ...payload });
    }
    $('cardModal').classList.add('hidden');
    save(); renderAll();
  };
  $('deleteCardBtn').onclick = () => {
    const h = activeHeist();
    h.cards = h.cards.filter(x => x.id !== editingCardId);
    h.cards.forEach(x => { if (x.parentId === editingCardId) x.parentId = ''; });
    $('cardModal').classList.add('hidden');
    save(); renderAll();
  };
  $('grossTakeInput').oninput = e => { activeHeist().grossTake = Number(e.target.value) || 0; save(); renderCrew(activeHeist()); };
  $('overheadInput').oninput = e => { activeHeist().overhead = Number(e.target.value) || 0; save(); renderCrew(activeHeist()); };
  $('addCrewBtn').onclick = () => {
    const name = prompt('Crew / 1099 Member Name:'); if (!name) return;
    const role = prompt('Role (e.g. COO, Subcontractor, Liaison):', '1099 Crew') || 'Crew';
    const pct = Number(prompt('Cut Percentage (%):', '10')) || 0;
    activeHeist().crew.push({ id: 'm_' + Date.now(), name, role, pct });
    save(); renderCrew(activeHeist());
  };

  document.querySelectorAll('.tab-btn').forEach(b => b.onclick = () => {
    const tab = b.dataset.tab;
    ['board', 'setups', 'crew'].forEach(t => $('view-' + t).classList.toggle('hidden', t !== tab));
    document.querySelectorAll('.tab-btn').forEach(x => {
      const on = x.dataset.tab === tab;
      x.className = on ? 'tab-btn px-3 py-1 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-200 text-xs font-bold shrink-0' : 'tab-btn px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-bold shrink-0';
    });
    if (tab === 'board') drawStrings(activeHeist());
  });

  window.addEventListener('resize', () => drawStrings(activeHeist()));
  window.HeistBoard = { getState: () => state, saveState: () => { save(); renderAll(); }, getActiveHeist: activeHeist, renderAll };
  renderAll();
})();