(() => {
  if (window.__hbGoogleLoaded) return;
  window.__hbGoogleLoaded = true;
  const $ = id => document.getElementById(id);
  const CID_KEY = 'hb_google_client_id_v1';
  const HOOK_KEY = 'hb_webhook_url_v1';
  let accessToken = '';

  function loadGis() {
    return new Promise((res, rej) => {
      if (window.google?.accounts?.oauth2) return res();
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.onload = res; s.onerror = () => rej(new Error('Failed to load Google GIS'));
      document.head.appendChild(s);
    });
  }

  async function connectGoogle() {
    const cid = ($('gClientIdIn')?.value || localStorage.getItem(CID_KEY) || '').trim();
    if (!cid) return alert('Paste your Google Cloud OAuth Client ID first.');
    localStorage.setItem(CID_KEY, cid);
    $('gStatus').textContent = 'Opening Google OAuth...';
    await loadGis();
    const client = google.accounts.oauth2.initTokenClient({
      client_id: cid,
      scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.events',
      callback: resp => {
        if (resp.error) { $('gStatus').textContent = 'Auth error: ' + resp.error; return; }
        accessToken = resp.access_token;
        $('gStatus').textContent = 'Connected to Gmail & Calendar!';
      }
    });
    client.requestAccessToken();
  }

  async function searchGmail() {
    if (!accessToken) return alert('Tap Connect Google first.');
    const q = $('gmailQueryIn').value.trim() || window.HeistBoard.getActiveHeist().name;
    $('gmailResults').innerHTML = '<div class="text-xs text-zinc-400">Scanning inbox...</div>';
    const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=6&q=' + encodeURIComponent(q), {
      headers: { Authorization: 'Bearer ' + accessToken }
    });
    const data = await r.json();
    const msgs = data.messages || [];
    if (!msgs.length) { $('gmailResults').innerHTML = '<div class="text-xs text-zinc-400">No emails matched.</div>'; return; }
    const items = [];
    for (const m of msgs) {
      const mr = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/' + m.id + '?format=metadata&metadataHeaders=Subject&metadataHeaders=From', {
        headers: { Authorization: 'Bearer ' + accessToken }
      });
      const md = await mr.json();
      const hdrs = md.payload?.headers || [];
      const subj = (hdrs.find(x => x.name === 'Subject')?.value || '(No Subject)').replace(/</g, '&lt;');
      const from = (hdrs.find(x => x.name === 'From')?.value || '').replace(/</g, '&lt;');
      items.push({ id: m.id, subj, from, snip: (md.snippet || '').replace(/</g, '&lt;') });
    }
    $('gmailResults').innerHTML = items.map((it, idx) => `<div class='p-2 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1'><div class='text-xs font-bold text-white'>${it.subj}</div><div class='text-[10px] text-zinc-400 truncate'>${it.from}</div><div class='text-[10px] text-zinc-500 line-clamp-2'>${it.snip}</div><button data-pin='${idx}' class='mt-1 px-2.5 py-1 rounded bg-rose-600 text-white text-[10px] font-black'>Pin to Board</button></div>`).join('');
    $('gmailResults').querySelectorAll('[data-pin]').forEach(b => b.onclick = () => {
      const it = items[Number(b.dataset.pin)];
      const h = window.HeistBoard.getActiveHeist();
      h.cards.push({
        id: 'g_' + Date.now(), title: 'Email: ' + it.subj.slice(0, 32), type: 'INTEL', status: 'OPEN',
        x: 15 + (h.cards.length * 8) % 50, y: 15 + (h.cards.length * 10) % 55, parentId: '',
        link: 'https://mail.google.com/mail/u/0/#inbox/' + it.id, notes: it.from + ' — ' + it.snip
      });
      window.HeistBoard.saveState();
      b.textContent = 'Pinned!';
    });
  }

  async function pushCalendar() {
    if (!accessToken) return alert('Tap Connect Google first.');
    const h = window.HeistBoard.getActiveHeist();
    const dateStr = prompt('Event Date (YYYY-MM-DD):', new Date().toISOString().slice(0, 10));
    if (!dateStr) return;
    const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary: 'Heist: ' + h.name, start: { date: dateStr }, end: { date: dateStr } })
    });
    alert(r.ok ? 'Added to Google Calendar!' : 'Calendar error (HTTP ' + r.status + ')');
  }

  async function fireWebhook() {
    const url = ($('webhookIn')?.value || localStorage.getItem(HOOK_KEY) || '').trim();
    if (!url) return alert('Enter a Webhook URL first.');
    localStorage.setItem(HOOK_KEY, url);
    const h = window.HeistBoard.getActiveHeist();
    try {
      await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ heist: h.name, cards: h.cards.length, grossTake: h.grossTake }) });
      alert('Webhook fired!');
    } catch (e) { alert('Webhook sent (check CORS): ' + e.message); }
  }

  function renderGoogle() {
    const cid = localStorage.getItem(CID_KEY) || '';
    const hook = localStorage.getItem(HOOK_KEY) || '';
    $('view-google').innerHTML = `<div class='space-y-3'>
      <div class='bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 space-y-2'>
        <div class='text-xs font-black uppercase tracking-wider text-sky-400'>Google Workspace Bridge</div>
        <input id='gClientIdIn' value='${cid}' placeholder='Paste Google OAuth Client ID' class='w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white'>
        <div class='flex gap-2'>
          <button id='gConnBtn' class='flex-1 py-2 rounded-lg bg-sky-600 text-white text-xs font-black'>Connect Google</button>
          <button id='gCalBtn' class='px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold'>+ Calendar</button>
        </div>
        <div id='gStatus' class='text-[11px] font-mono text-emerald-300'>${accessToken ? 'Connected' : 'Not connected'}</div>
      </div>
      <div class='bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 space-y-2'>
        <div class='text-xs font-black uppercase tracking-wider text-rose-400'>Gmail Intel Scanner</div>
        <div class='flex gap-1.5'>
          <input id='gmailQueryIn' placeholder='Search inbox (e.g. Detroit Zoo, quote)' class='flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white'>
          <button id='gmailSearchBtn' class='px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-black'>Scan</button>
        </div>
        <div id='gmailResults' class='space-y-1.5'></div>
      </div>
      <div class='bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 space-y-2'>
        <div class='text-xs font-black uppercase tracking-wider text-amber-400'>Webhook Automation</div>
        <div class='flex gap-1.5'>
          <input id='webhookIn' value='${hook}' placeholder='Make / Zapier / Discord Webhook URL' class='flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white'>
          <button id='webhookBtn' class='px-3 py-1.5 rounded-lg bg-amber-500 text-zinc-950 text-xs font-black'>Fire</button>
        </div>
      </div>
    </div>`;
    $('gConnBtn').onclick = connectGoogle;
    $('gCalBtn').onclick = pushCalendar;
    $('gmailSearchBtn').onclick = searchGmail;
    $('webhookBtn').onclick = fireWebhook;
  }

  function init() {
    const nav = $('mainTabs');
    const main = document.querySelector('main');
    if (!nav || !main || $('view-google')) return;
    const btn = document.createElement('button');
    btn.dataset.tab = 'google';
    btn.className = 'tab-btn px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-bold shrink-0';
    btn.textContent = 'Google & Tools';
    nav.appendChild(btn);
    const sec = document.createElement('section');
    sec.id = 'view-google';
    sec.className = 'hidden p-3 overflow-y-auto flex-1';
    main.appendChild(sec);
    nav.addEventListener('click', e => {
      if (e.target.closest('.tab-btn')?.dataset.tab === 'google') renderGoogle();
    });
  }
  init();
})();