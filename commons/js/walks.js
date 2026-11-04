// Photo walks: students post a plan to shoot together (what, where, when)
// and others join it. Plans stand as flags on the Meeting Point's maps and
// are listed on the Club Hall board; posting is all taps. A plan's contact (a
// Teams name or an Instagram handle) only reaches people who join, straight
// from the server. Plans expire after their date. The ideas wall beside the
// campfire takes short notes for a week. Walks are organised by students,
// optional, and not part of the course.

export const TAGS = [
  ['street', 'Street'], ['portrait', 'Portrait'], ['night', 'Night'], ['architecture', 'Architecture'],
  ['nature', 'Nature'], ['food', 'Food'], ['documentary', 'Documentary'], ['film', 'Film'],
  ['macro', 'Macro'], ['events', 'Events'],
];
export const CITIES = [['saigon', 'Saigon'], ['hanoi', 'Hanoi'], ['online', 'Online']];

// The maps on the Meeting Point floor: a schematic grid, not to scale.
// c and r are the column and row of each district tile; column 3 is the river.
export const PLACES = {
  saigon: [
    ['Tan Binh', 0, 0], ['Phu Nhuan', 1, 0], ['Binh Thanh', 2, 0], ['Thu Duc', 4, 0],
    ['District 10', 0, 1], ['District 3', 1, 1], ['District 1', 2, 1], ['Thu Thiem', 4, 1],
    ['District 5 · Cho Lon', 0, 2], ['District 8', 1, 2], ['District 4', 2, 2],
    ['Somewhere else', 0, 3], ['District 7 · RMIT', 2, 3],
  ],
  hanoi: [
    ['Tay Ho · West Lake', 1, 0],
    ['Cau Giay', 0, 1], ['Ba Dinh · RMIT', 1, 1], ['Hoan Kiem · Old Quarter', 2, 1], ['Long Bien', 4, 1],
    ['Somewhere else', 0, 2], ['Dong Da', 1, 2], ['Hai Ba Trung', 2, 2],
  ],
  online: [['Online', 0, 0]],
};

const WHEN = [['today', 'Today'], ['tomorrow', 'Tomorrow'], ['weekend', 'This weekend'], ['next', 'Next weekend'], ['date', 'Pick a date']];
const TIMES = [['Morning', 'Morning'], ['Afternoon', 'Afternoon'], ['Golden hour', 'Golden hour'], ['Night', 'Night']];

const tagLabel = (id) => (TAGS.find((t) => t[0] === id) || [id, id])[1];
const cityLabel = (id) => (CITIES.find((c) => c[0] === id) || [id, id])[1];

export const SAFETY = 'Photo walks are organised by students. They are optional and not part of the course. Meet in a busy public place in daylight, go in a group of three or more, tell someone where you are going and when you will be back, and look after your gear. If anything feels wrong, leave.';

const ERRORS = {
  code: "That board code doesn't match. Ask your teacher for this semester's code.",
  slow: 'Give it a moment before posting again.',
  form: 'Pick a place and at least one thing to shoot.',
  phone: 'Phone numbers cannot go on the board. Use your Teams name or Instagram handle.',
  safe: 'Please read and tick the safety note for an in-person walk.',
  date: 'That date is in the past or too far ahead.',
  many: 'You can have three plans up at once. Take one down first.',
  gone: 'That plan has just been taken down.',
};

// dates in Vietnam time, as YYYY-MM-DD
function vnToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}
function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function whenDate(when, picked) {
  const today = vnToday();
  const dow = new Date(today + 'T12:00:00Z').getUTCDay(); // 0 = Sunday
  if (when === 'today') return today;
  if (when === 'tomorrow') return addDays(today, 1);
  if (when === 'weekend') return addDays(today, (7 - dow) % 7); // this Sunday
  if (when === 'next') return addDays(today, ((7 - dow) % 7) + 7);
  return picked || '';
}

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
  store.myNotes = store.myNotes || [];
  store.filter = store.filter || { city: '', tags: [] };
  store.me = store.me || { kind: 'teams', contact: '' }; // remembered, so the next plan is taps only
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* blocked */ } };
  save();

  let cards = [];
  let notes = [];
  let needCode = false;
  let view = 'find';
  let showing = false;
  let focus = null; // a single plan opened from its flag
  let draft = null;
  const listeners = new Set();
  const freshDraft = (city = '', area = '') => ({ tags: [], city, area, when: 'weekend', time: '', date: '', note: '', safe: false, kind: store.me.kind, contact: store.me.contact });

  const send = (msg) => {
    const net = getNet();
    if (!net || !net.online) { toast('The board needs a connection. Try again in a moment.'); return false; }
    net.send(msg);
    return true;
  };
  const changed = () => { for (const fn of listeners) fn(cards, notes); if (showing) render(); };

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
      <li class="walk${mine ? ' is-mine' : ''}" style="--who:${esc(c.ink || '#e60028')}">
        <div class="walk-head"><b>${esc(c.name)}</b><span>${esc(cityLabel(c.city))}${c.area ? ` · ${esc(c.area)}` : ''}</span></div>
        <p class="walk-when">${esc(niceWhen(c))}</p>
        <div class="walk-tags">${c.tags.map((t) => `<span>${esc(tagLabel(t))}</span>`).join('')}</div>
        ${c.note ? `<p>${esc(c.note)}</p>` : ''}
        ${going}
        <div class="walk-act">${action}</div>
        ${c.city !== 'online' ? '<p class="walk-safe">In person: meet in a busy public place in daylight, in a group of three or more.</p>' : ''}
      </li>`;
  }

  const chip = (attr, id, label, on) => `<button type="button" class="chip${on ? ' on' : ''}" ${attr}="${esc(id)}">${esc(label)}</button>`;
  const codeBar = () => (needCode && !store.code ? `<form class="walk-code"><label class="field"><span>Board code: your teacher shares it in class news and support sessions</span>
    <input name="code" maxlength="24" autocomplete="off" required></label><button class="btn primary" type="submit">Unlock</button></form>` : '');

  function findView() {
    const f = store.filter;
    const list = cards.filter((c) => (!f.city || c.city === f.city) && (!f.tags.length || c.tags.some((t) => f.tags.includes(t))));
    return `
      <div class="chips">${chip('data-walk-city', '', 'Anywhere', !f.city)}${CITIES.map(([id, l]) => chip('data-walk-city', id, l, f.city === id)).join('')}</div>
      <div class="chips">${TAGS.map(([id, l]) => chip('data-walk-tag', id, l, f.tags.includes(id))).join('')}</div>
      ${list.length ? `<ul class="walks">${list.map(cardHtml).join('')}</ul>`
        : `<p class="muted">${cards.length ? 'No plans match these filters yet.' : 'No plans yet.'} Post the first one: someone may be looking for the same thing.</p>`}
      <p class="walk-safety"><b>Stay safe.</b> ${esc(SAFETY)}</p>`;
  }

  function postView() {
    const d = draft;
    const online = d.city === 'online';
    const places = d.city ? PLACES[d.city].map(([label]) => label) : [];
    return `
      <form class="walk-form" autocomplete="off">
        <div class="field"><span>1  Where</span>
          <div class="chips">${CITIES.map(([id, l]) => chip('data-draft-city', id, l, d.city === id)).join('')}</div>
          ${d.city && !online ? `<div class="chips">${places.map((p) => chip('data-draft-area', p, p, d.area === p)).join('')}</div>` : ''}</div>
        <div class="field"><span>2  What to shoot: up to three</span>
          <div class="chips">${TAGS.map(([id, l]) => chip('data-draft-tag', id, l, d.tags.includes(id))).join('')}</div></div>
        <div class="field"><span>3  When</span>
          <div class="chips">${WHEN.map(([id, l]) => chip('data-draft-when', id, l, d.when === id)).join('')}</div>
          ${d.when === 'date' ? `<input name="date" type="date" value="${esc(d.date)}" min="${vnToday()}">` : ''}
          <div class="chips">${TIMES.map(([id, l]) => chip('data-draft-time', id, l, d.time === id)).join('')}</div></div>
        <div class="field"><span>4  How people who join reach you</span>
          <div class="chips">${chip('data-draft-kind', 'teams', 'Teams', d.kind === 'teams')}${chip('data-draft-kind', 'instagram', 'Instagram', d.kind === 'instagram')}</div>
          <input name="contact" maxlength="40" value="${esc(d.contact)}" placeholder="${d.kind === 'instagram' ? '@yourhandle' : 'Your name as it shows in Teams'}" required>
          <small>Only people who tap I'm in see this. Remembered for next time. No phone numbers.</small></div>
        <label class="field"><span>A line about it (optional)</span>
          <input name="note" maxlength="160" value="${esc(d.note)}" placeholder="${online ? 'Same theme all week, share results on Sunday' : 'Golden hour by the river, then street food'}"></label>
        ${online ? '' : `<label class="check"><input type="checkbox" name="safe"${d.safe ? ' checked' : ''}><span>${esc(SAFETY)}</span></label>`}
        <div class="row"><button class="btn primary" type="submit">Plant the flag</button></div>
      </form>`;
  }

  function ideasView() {
    const mine = new Set(store.myNotes);
    return `
      <p>Thoughts, places worth shooting, questions for whoever passes by. Notes stay for a week.</p>
      <form class="note-form" autocomplete="off"><input name="text" maxlength="100" placeholder="The light under the Thu Thiem bridge at 5pm is great" required><button class="btn primary" type="submit">Stick it up</button></form>
      ${notes.length ? `<ul class="notes">${notes.map((n) => `<li style="--who:${esc(n.ink || '#f5c400')}"><p>${esc(n.text)}</p><span>${esc(n.name)}${mine.has(n.id) ? ` · <button class="linkish" data-note-del="${esc(n.id)}">remove</button>` : ''}</span></li>`).join('')}</ul>`
        : '<p class="muted">The wall is empty. Be the first.</p>'}`;
  }

  function render() {
    let body;
    let title = 'Find people to shoot with';
    let label = 'Photo walks';
    let tabs = true;
    if (view === 'ideas') { body = ideasView(); title = 'Ideas wall'; label = 'Meeting Point'; tabs = false; }
    else if (view === 'one') {
      const c = cards.find((x) => x.id === focus);
      body = c ? `<ul class="walks">${cardHtml(c)}</ul><p class="muted">Stand by the flag to meet whoever else is in.</p>` : '<p class="muted">This plan has been taken down.</p>';
      body += '<div class="row"><button type="button" class="btn" data-walk-view="find">See all plans</button></div>';
      title = c ? `${c.name}'s plan` : 'Plan';
      tabs = false;
    } else body = view === 'find' ? findView() : postView();
    openPanel(`
      <span class="label">${esc(label)}</span>
      <h2>${esc(title)}</h2>
      ${tabs ? `<div class="tabs">
        <button type="button" class="tab${view === 'find' ? ' on' : ''}" data-walk-view="find">Find a plan (${cards.length})</button>
        <button type="button" class="tab${view === 'post' ? ' on' : ''}" data-walk-view="post">Plant a flag</button>
      </div>` : ''}
      ${codeBar()}
      ${body}`, 'club');
    showing = true;
  }

  // keep typed text when the form re-renders
  function readDraft() {
    const form = panel.querySelector('.walk-form');
    if (!form || !draft) return;
    for (const k of ['date', 'note', 'contact']) if (form.elements[k]) draft[k] = form.elements[k].value;
    if (form.elements.safe) draft.safe = form.elements.safe.checked;
  }

  panel.addEventListener('click', (e) => {
    if (!showing) return;
    const t = e.target.closest('button');
    if (!t) return;
    const d = t.dataset;
    if (d.walkView) {
      readDraft();
      view = d.walkView;
      if (view === 'post' && !draft) draft = freshDraft();
      render();
    } else if (d.walkCity !== undefined) { store.filter.city = d.walkCity; save(); render(); }
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
    } else if (d.draftCity) { readDraft(); if (draft.city !== d.draftCity) draft.area = ''; draft.city = d.draftCity; render(); }
    else if (d.draftArea) { readDraft(); draft.area = d.draftArea; render(); }
    else if (d.draftWhen) { readDraft(); draft.when = d.draftWhen; render(); }
    else if (d.draftTime) { readDraft(); draft.time = draft.time === d.draftTime ? '' : d.draftTime; render(); }
    else if (d.draftKind) { readDraft(); draft.kind = d.draftKind; render(); }
    else if (d.walkJoin) {
      if (needCode && !store.code) { toast('Enter the board code first.'); return; }
      send({ t: 'walkjoin', id: d.walkJoin, code: store.code || '' });
    } else if (d.walkDel) send({ t: 'walkdel', id: d.walkDel, token: store.token });
    else if (d.noteDel) send({ t: 'notedel', id: d.noteDel, token: store.token, code: store.code || '' });
  });

  panel.addEventListener('submit', (e) => {
    if (!showing) return;
    const form = e.target;
    e.preventDefault();
    if (form.classList.contains('walk-code')) {
      readDraft();
      store.code = form.elements.code.value.trim();
      save();
      render();
      return;
    }
    if (needCode && !store.code) { toast('Enter the board code first.'); return; }
    if (form.classList.contains('note-form')) {
      const text = form.elements.text.value.trim();
      if (text && send({ t: 'note', text, token: store.token, code: store.code || '' })) form.elements.text.value = '';
      return;
    }
    if (!form.classList.contains('walk-form')) return;
    readDraft();
    const online = draft.city === 'online';
    if (!draft.city || (!online && !draft.area) || !draft.tags.length) { toast(ERRORS.form); return; }
    if (!draft.contact.trim()) { toast('Add your Teams name or Instagram handle.'); return; }
    if (!online && !draft.safe) { toast(ERRORS.safe); return; }
    const date = whenDate(draft.when, draft.date);
    if (draft.when === 'date' && !date) { toast('Pick a date.'); return; }
    const whenText = [draft.when === 'weekend' ? 'This weekend' : draft.when === 'next' ? 'Next weekend' : '', draft.time].filter(Boolean).join(', ');
    store.me = { kind: draft.kind, contact: draft.contact.trim() };
    save();
    send({
      t: 'walk', tags: draft.tags, city: draft.city, area: online ? 'Online' : draft.area, date, when: whenText,
      note: draft.note || '', kind: draft.kind, contact: draft.contact.trim(), safe: !!draft.safe, token: store.token, code: store.code || '',
    });
  });

  return {
    open(v = 'find') { view = v; if (v === 'post' && !draft) draft = freshDraft(); render(); },
    // planting a flag on a district tile: the place is already chosen
    plant(city, area) { draft = { ...(draft || freshDraft()), city, area: city === 'online' ? '' : area }; view = 'post'; render(); },
    openPlan(id) { focus = id; view = 'one'; render(); },
    openIdeas() { view = 'ideas'; render(); },
    closed() { showing = false; },
    onChange(fn) { listeners.add(fn); fn(cards, notes); },
    get cards() { return cards; },
    welcome(m) { cards = m.walks || []; notes = m.notes || []; needCode = !!m.walkCode; changed(); },
    add(m) {
      if (cards.some((c) => c.id === m.card.id)) return;
      cards.unshift(m.card);
      if (m.card.name !== myName()) feed(`${m.card.name} planted a photo walk flag: ${m.card.tags.map(tagLabel).join(', ').toLowerCase()}, ${m.card.area || cityLabel(m.card.city)}.`, 'sys');
      changed();
    },
    mine(m) {
      store.mine.push(m.id);
      store.mine = store.mine.slice(-20);
      store.contacts[m.id] = { contact: store.me.contact, kind: store.me.kind };
      save();
      draft = null;
      focus = m.id;
      view = 'one';
      toast('Flag planted. People who join will see how to reach you.');
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
    noteAdd(m) {
      if (notes.some((n) => n.id === m.note.id)) return;
      notes.unshift(m.note);
      if (m.note.name !== myName()) feed(`${m.note.name} stuck a note on the ideas wall.`, 'sys');
      changed();
    },
    noteMine(m) { store.myNotes.push(m.id); store.myNotes = store.myNotes.slice(-40); save(); changed(); },
    noteDel(m) { notes = notes.filter((n) => n.id !== m.id); changed(); },
    err(m) {
      if (m.why === 'code') { delete store.code; save(); if (showing) render(); }
      toast(ERRORS[m.why] || 'That did not work. Try again.');
    },
  };
}
