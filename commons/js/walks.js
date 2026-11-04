// The photo walk board in the Club Hall: students post a plan to shoot
// together (what, where, when) and others join it. A card's contact (a Teams
// name or an Instagram handle) only reaches people who join, straight from
// the server. Cards expire after their date. Walks are organised by
// students, optional, and not part of the course.

export const TAGS = [
  ['street', 'Street'], ['portrait', 'Portrait'], ['night', 'Night'], ['architecture', 'Architecture'],
  ['nature', 'Nature'], ['food', 'Food'], ['documentary', 'Documentary'], ['film', 'Film'],
  ['macro', 'Macro'], ['events', 'Events'],
];
export const CITIES = [['saigon', 'Saigon'], ['hanoi', 'Hanoi'], ['online', 'Online']];
const tagLabel = (id) => (TAGS.find((t) => t[0] === id) || [id, id])[1];
const cityLabel = (id) => (CITIES.find((c) => c[0] === id) || [id, id])[1];

export const SAFETY = 'Photo walks are organised by students. They are optional and not part of the course. Meet in a busy public place in daylight, go in a group of three or more, tell someone where you are going and when you will be back, and look after your gear. If anything feels wrong, leave.';

const ERRORS = {
  code: "That board code doesn't match. Ask your teacher for this semester's code.",
  slow: 'Give it half a minute before posting another plan.',
  form: 'Pick at least one interest and a city.',
  phone: 'Phone numbers cannot go on the board. Use your Teams name or Instagram handle.',
  safe: 'Please read and tick the safety note for an in-person walk.',
  date: 'That date is in the past or too far ahead.',
  many: 'You can have three plans up at once. Remove one first.',
  gone: 'That plan has just been taken down.',
};

const KEY = 'p101-walks-v1';
function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (v && typeof v === 'object') return v;
  } catch (e) { /* private mode */ }
  return {};
}

export function createWalks({ panel, openPanel, toast, feed, esc, getNet, myName }) {
  const store = load();
  if (!store.token) store.token = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => (b % 36).toString(36)).join('');
  store.contacts = store.contacts || {};
  store.mine = store.mine || [];
  store.filter = store.filter || { city: '', tags: [] };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* blocked */ } };
  save();

  let cards = [];
  let needCode = false;
  let view = 'find';
  let showing = false;
  let draft = { tags: [], city: '', kind: 'teams' };
  const listeners = new Set();

  const send = (msg) => {
    const net = getNet();
    if (!net || !net.online) { toast('The board needs a connection. Try again in a moment.'); return false; }
    net.send(msg);
    return true;
  };
  const changed = () => { for (const fn of listeners) fn(cards); if (showing) render(); };

  function niceWhen(c) {
    const parts = [];
    if (c.date) parts.push(new Date(c.date + 'T12:00:00+07:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Ho_Chi_Minh' }));
    if (c.when) parts.push(c.when);
    return parts.join(', ') || 'Flexible';
  }

  function cardHtml(c) {
    const mine = store.mine.includes(c.id);
    const contact = store.contacts[c.id];
    const going = c.joined.length ? `<p class="going">Going: ${c.joined.map(esc).join(', ')}</p>` : '';
    let action;
    if (mine) action = `<span class="walk-mine">Your plan</span><button class="btn" data-walk-del="${esc(c.id)}">Take it down</button>`;
    else if (contact) action = `<p class="reach">Reach ${esc(c.name)} on ${contact.kind === 'instagram' ? 'Instagram' : 'Teams'}: <b>${esc(contact.contact)}</b></p>`;
    else action = `<button class="btn primary" data-walk-join="${esc(c.id)}">I'm in</button>`;
    return `
      <li class="walk${mine ? ' is-mine' : ''}" style="--ink:${esc(c.ink || '#e60028')}">
        <div class="walk-head"><b>${esc(c.name)}</b><span>${esc(cityLabel(c.city))}${c.area ? ` · ${esc(c.area)}` : ''}</span></div>
        <p class="walk-when">${esc(niceWhen(c))}</p>
        <div class="walk-tags">${c.tags.map((t) => `<span>${esc(tagLabel(t))}</span>`).join('')}</div>
        ${c.note ? `<p>${esc(c.note)}</p>` : ''}
        ${going}
        <div class="walk-act">${action}</div>
        ${c.city !== 'online' ? '<p class="walk-safe">In person: meet in a busy public place in daylight, in a group of three or more.</p>' : ''}
      </li>`;
  }

  function render() {
    const f = store.filter;
    const chip = (attr, id, label, on) => `<button type="button" class="chip${on ? ' on' : ''}" ${attr}="${esc(id)}">${esc(label)}</button>`;
    let body;
    if (view === 'find') {
      const list = cards.filter((c) => (!f.city || c.city === f.city) && (!f.tags.length || c.tags.some((t) => f.tags.includes(t))));
      body = `
        <div class="chips">${chip('data-walk-city', '', 'Anywhere', !f.city)}${CITIES.map(([id, l]) => chip('data-walk-city', id, l, f.city === id)).join('')}</div>
        <div class="chips">${TAGS.map(([id, l]) => chip('data-walk-tag', id, l, f.tags.includes(id))).join('')}</div>
        ${list.length ? `<ul class="walks">${list.map(cardHtml).join('')}</ul>`
          : `<p class="muted">${cards.length ? 'No plans match these filters yet.' : 'No plans on the board yet.'} Post the first one: someone may be looking for the same thing.</p>`}
        <p class="walk-safety"><b>Stay safe.</b> ${esc(SAFETY)}</p>`;
    } else {
      const d = draft;
      const online = d.city === 'online';
      body = `
        <form class="walk-form" autocomplete="off">
          <div class="field"><span>What do you want to shoot? Up to three</span>
            <div class="chips">${TAGS.map(([id, l]) => chip('data-draft-tag', id, l, d.tags.includes(id))).join('')}</div></div>
          <div class="field"><span>Where</span>
            <div class="chips">${CITIES.map(([id, l]) => chip('data-draft-city', id, l, d.city === id)).join('')}</div></div>
          <label class="field"><span>${online ? 'Theme or idea (optional)' : 'Area or meeting point (optional)'}</span>
            <input name="area" maxlength="30" value="${esc(d.area || '')}" placeholder="${online ? 'Reflections, one week, one theme' : 'District 1, Nguyen Hue walking street'}"></label>
          <div class="two">
            <label class="field"><span>Date (optional)</span><input name="date" type="date" value="${esc(d.date || '')}"></label>
            <label class="field"><span>Or when</span><input name="when" maxlength="30" value="${esc(d.when || '')}" placeholder="Weekend mornings"></label>
          </div>
          <label class="field"><span>A line about your plan (optional)</span>
            <input name="note" maxlength="160" value="${esc(d.note || '')}" placeholder="Golden hour along the river, then street food"></label>
          <div class="field"><span>How people who join can reach you</span>
            <div class="chips">${chip('data-draft-kind', 'teams', 'Teams', d.kind === 'teams')}${chip('data-draft-kind', 'instagram', 'Instagram', d.kind === 'instagram')}</div>
            <input name="contact" maxlength="40" value="${esc(d.contact || '')}" placeholder="${d.kind === 'instagram' ? '@yourhandle' : 'Your name as it shows in Teams'}" required>
            <small>Only people who tap I'm in see this. No phone numbers.</small></div>
          ${online ? '' : `<label class="check"><input type="checkbox" name="safe"${d.safe ? ' checked' : ''}><span>${esc(SAFETY)}</span></label>`}
          <div class="row"><button class="btn primary" type="submit">Pin it to the board</button></div>
        </form>`;
    }
    openPanel(`
      <span class="label">Club Hall · Photo walks</span>
      <h2>Find people to shoot with</h2>
      <div class="tabs">
        <button type="button" class="tab${view === 'find' ? ' on' : ''}" data-walk-view="find">Find a plan (${cards.length})</button>
        <button type="button" class="tab${view === 'post' ? ' on' : ''}" data-walk-view="post">Post a plan</button>
      </div>
      ${needCode && !store.code ? `<form class="walk-code"><label class="field"><span>Board code: your teacher shares it in class news and support sessions</span>
        <input name="code" maxlength="24" autocomplete="off" required></label><button class="btn primary" type="submit">Unlock</button></form>` : ''}
      ${body}`, 'club');
    showing = true;
  }

  // keep typed text when the form re-renders
  function readDraft() {
    const form = panel.querySelector('.walk-form');
    if (!form) return;
    for (const k of ['area', 'date', 'when', 'note', 'contact']) draft[k] = form.elements[k].value;
    if (form.elements.safe) draft.safe = form.elements.safe.checked;
  }

  panel.addEventListener('click', (e) => {
    if (!showing) return;
    const t = e.target.closest('button');
    if (!t) return;
    const d = t.dataset;
    if (d.walkView) { readDraft(); view = d.walkView; render(); }
    else if (d.walkCity !== undefined) { store.filter.city = d.walkCity; save(); render(); }
    else if (d.walkTag) {
      const s = new Set(store.filter.tags);
      s.has(d.walkTag) ? s.delete(d.walkTag) : s.add(d.walkTag);
      store.filter.tags = [...s];
      save();
      render();
    } else if (d.draftTag) {
      readDraft();
      const s = new Set(draft.tags);
      if (s.has(d.draftTag)) s.delete(d.draftTag); else if (s.size < 3) s.add(d.draftTag);
      draft.tags = [...s];
      render();
    } else if (d.draftCity) { readDraft(); draft.city = d.draftCity; render(); }
    else if (d.draftKind) { readDraft(); draft.kind = d.draftKind; render(); }
    else if (d.walkJoin) {
      if (needCode && !store.code) { toast('Enter the board code first.'); return; }
      send({ t: 'walkjoin', id: d.walkJoin, code: store.code || '' });
    } else if (d.walkDel) send({ t: 'walkdel', id: d.walkDel, token: store.token });
  });

  panel.addEventListener('submit', (e) => {
    if (!showing) return;
    if (e.target.classList.contains('walk-code')) {
      e.preventDefault();
      readDraft();
      store.code = e.target.elements.code.value.trim();
      save();
      render();
      return;
    }
    if (!e.target.classList.contains('walk-form')) return;
    e.preventDefault();
    readDraft();
    if (!draft.tags.length || !draft.city) { toast(ERRORS.form); return; }
    if (!draft.contact || !draft.contact.trim()) { toast('Add your Teams name or Instagram handle.'); return; }
    if (draft.city !== 'online' && !draft.safe) { toast(ERRORS.safe); return; }
    if (needCode && !store.code) { toast('Enter the board code first.'); return; }
    send({
      t: 'walk', tags: draft.tags, city: draft.city, area: draft.area || '', date: draft.date || '', when: draft.when || '',
      note: draft.note || '', kind: draft.kind, contact: draft.contact.trim(), safe: !!draft.safe, token: store.token, code: store.code || '',
    });
  });

  return {
    open(v = 'find') { view = v; render(); },
    closed() { showing = false; },
    onChange(fn) { listeners.add(fn); fn(cards); },
    get cards() { return cards; },
    welcome(m) { cards = m.walks || []; needCode = !!m.walkCode; changed(); },
    add(m) {
      if (cards.some((c) => c.id === m.card.id)) return;
      cards.unshift(m.card);
      if (m.card.name !== myName()) feed(`${m.card.name} pinned a photo walk: ${m.card.tags.map(tagLabel).join(', ').toLowerCase()}, ${cityLabel(m.card.city)}.`, 'sys');
      changed();
    },
    mine(m) {
      store.mine.push(m.id);
      store.mine = store.mine.slice(-20);
      store.contacts[m.id] = { contact: draft.contact.trim(), kind: draft.kind };
      save();
      draft = { tags: [], city: '', kind: draft.kind, contact: draft.contact };
      view = 'find';
      toast('Pinned. People who join will see how to reach you.');
      changed();
    },
    join(m) {
      const c = cards.find((x) => x.id === m.id);
      if (c && !c.joined.includes(m.name)) c.joined.push(m.name);
      changed();
    },
    contact(m) {
      store.contacts[m.id] = { contact: m.contact, kind: m.kind };
      save();
      changed();
    },
    del(m) { cards = cards.filter((c) => c.id !== m.id); changed(); },
    err(m) {
      if (m.why === 'code') { delete store.code; save(); if (showing) { view = 'post'; render(); } }
      toast(ERRORS[m.why] || 'That did not work. Try again.');
    },
  };
}
