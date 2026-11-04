// The Photo 101 Commons: an optional, casual place to drop into, and the
// start of a small city for photographers. Walk the plaza, find this week's
// photo hunt items, check what is due, book a consultation, see the show in
// the Gallery, take a group photo in the Club Hall, and see who else is
// around. Nothing here is graded or counted as attendance.

import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { buildWorld, drawSign, makeItem, HIDING } from './world.js';
import { makeAvatar, COLOURS, POSES, CAMERAS, CAMERA_IDS } from './avatar.js';
import { buildCity, SOUTH, HALL, STAGE, GALLERY, SHOP, CAMERA_NOTES, inside } from './city.js';
import { pastShows, showDir } from './shows.js';
import { createWalks, TAGS as WALK_TAGS, CITIES as WALK_CITIES } from './walks.js';
import { connect, roomCode, peekCount } from './net.js';
import { SEMESTER, WEEKS, weekNow, nextSession, nextDue, niceDate } from './semester.js';
import { currentSet, stamps, stamp, totalStamps } from './hunt.js';

const $ = (s) => document.querySelector(s);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const COARSE = matchMedia('(pointer: coarse)').matches;
const PREFS_KEY = 'p101-commons-v1';
const R = 0.3;
const HINT = COARSE
  ? 'Tap the ground to walk, drag to look around. Tap anything glowing or anyone to see more.'
  : 'Walk with WASD or click the ground. Drag to look around. E to look at what is in front of you.';
const CITY_HINT = 'Main Street runs south from the square: the Club Hall, the Gallery, the Camera Shop, and at the end the Meeting Point, where you plan photo walks together.';
const ACTS = { walks: 'club', flag: 'meet', ideas: 'meet', log: 'fire', door: 'support', screen: 'support', art: 'gallery', desk: 'desk', assignment: 'kiosk', tool: 'tools', notice: 'notice', work: 'show', curator: 'show', lastphoto: 'club', shutter: 'club', camera: 'shop', counter: 'shop' };
const ACT_TEXT = { support: 'in the support room', gallery: 'in the gallery', desk: 'at the consultation desk', kiosk: 'reading an assignment', tools: 'in the tool corner', notice: 'at the notice board', hunt: 'on the photo hunt', show: 'at the show', club: 'in the Club Hall', shop: 'in the camera shop', meet: 'at the Meeting Point', fire: 'by the campfire' };
const actText = (a) => (a === 'pose-sit' ? 'by the campfire' : a.startsWith('pose-') ? 'in the Club Hall' : ACT_TEXT[a] || '');

// ---- preferences, per viewer ---------------------------------------------------
function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    if (p && typeof p === 'object') return p;
  } catch (e) { /* private mode */ }
  return {};
}
const prefs = loadPrefs();
if (!COLOURS.includes(prefs.colour)) prefs.colour = COLOURS[Math.floor(Math.random() * COLOURS.length)];
if (!CAMERA_IDS.includes(prefs.cam)) prefs.cam = 'dslr';
const camLabel = (id) => (CAMERAS.find((c) => c.id === id) || CAMERAS[2]).label;
function savePrefs() {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) { /* blocked */ }
}

// ---- renderer -----------------------------------------------------------------------
const canvas = $('#world');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, COARSE ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
const labels = new CSS2DRenderer({ element: $('#labels') });

const scene = new THREE.Scene();
scene.background = new THREE.Color('#bfe1f5');
scene.fog = new THREE.Fog('#bfe1f5', 40, 90);
const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
scene.add(new THREE.HemisphereLight('#ffffff', '#7fae5a', 1.4));
const sun = new THREE.DirectionalLight('#fff4dc', 2.6);
sun.position.set(18, 30, 16);
sun.castShadow = true;
sun.shadow.mapSize.set(COARSE ? 1024 : 2048, COARSE ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 22, bottom: -22, near: 1, far: 90 });
sun.shadow.bias = -0.0006;
scene.add(sun, sun.target); // the sun follows the walker so shadows reach the whole city

await Promise.all([
  document.fonts.load('700 48px "Barlow Condensed"'),
  document.fonts.load('400 24px "JetBrains Mono"'),
  document.fonts.load('400 24px "Source Sans 3"'),
]).catch(() => {});
const world = buildWorld(scene);
const city = buildCity(scene, world);

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  labels.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// ---- the notice board and the session screen, painted from the semester --------------
const now = () => new Date(new URLSearchParams(location.search).get('now') || Date.now());

function paintBoards() {
  const w = weekNow(now());
  const due = nextDue(now());
  const ses = nextSession(now());
  const set = currentSet(now());
  const weekLine = w < 1 ? `Starts ${niceDate(new Date(SEMESTER.start + 'T00:00:00+07:00'))}`
    : w > SEMESTER.weeks ? 'Semester finished' : `Week ${w} of ${SEMESTER.weeks}`;
  world.notice.redraw((ctx, cw, ch) => drawSign(ctx, cw, ch, [
    [weekLine.toUpperCase(), 84],
    [w >= 1 && w <= SEMESTER.weeks ? WEEKS[w - 1] : SEMESTER.name, 38, 'body'],
    [due ? `NEXT DUE  ${due.id} ${due.title}` : 'All assignments in', 40, 'accent'],
    [due ? `${niceDate(due.at)}, 18:00` : '', 32, 'mono'],
    [ses ? (ses.today ? `SUPPORT SESSION TODAY (${ses.for})` : `Next support session: ${niceDate(ses.at)} (${ses.for})`) : 'No more support sessions', 34, 'body'],
    [`Photo hunt: ${set.title}`, 32, 'mono'],
  ]));
  const open = !!(ses && ses.today);
  world.door.set(open);
  world.screen.redraw((ctx, cw, ch) => drawSign(ctx, cw, ch, open ? [
    ['TODAY', 120, 'accent'],
    [`Support session for ${ses.for}`, 64],
    [ses.time ? `Starts ${ses.time}, Vietnam time` : 'The time and the Teams link are on Canvas', 40, 'body'],
    ['Open Canvas and join from the announcement.', 34, 'mono'],
  ] : [
    ['SUPPORT SESSIONS', 84],
    [ses ? `Next: ${niceDate(ses.at)}, for ${ses.for}` : 'All sessions done for this semester', 52, 'body'],
    ['Optional, online on Teams. Assignment guidance and a showcase of HD work.', 36, 'body'],
    ['Recordings and slides: the Miro support board', 30, 'mono'],
  ], { bg: '#111' }));
}
paintBoards();
setInterval(paintBoards, 60000);

// ---- the student ----------------------------------------------------------------------------
const me = makeAvatar(prefs.colour, { cam: prefs.cam });
scene.add(me.root);
const meTag = tag(prefs.name || '', 'tag me-tag', 2.05);
me.root.add(meTag);
const player = { x: 0, z: 7, r: Math.PI, speed: 0, path: [], pending: null, stuck: 0, activity: '', pose: '' };
const cam = { yaw: 0, pitch: 0.55, dist: 8, x: 0, z: 7 };

function tag(text, cls, y) {
  const div = document.createElement('div');
  div.className = cls;
  div.textContent = text;
  const o = new CSS2DObject(div);
  o.position.set(0, y, 0);
  return o;
}

// ---- the photo hunt ---------------------------------------------------------------------------
const set = currentSet(now());
const items = [];
{
  // the same four spots for everyone this week, chosen by the set
  const offset = { exposure: 0, light: 1, genres: 2, folio: 3 }[set.id] || 0;
  set.items.forEach((it, i) => {
    const [x, z] = HIDING[(offset + i * 2) % HIDING.length];
    const mesh = makeItem(it.kind);
    mesh.position.set(x, 1.1, z);
    scene.add(mesh);
    const entry = { kind: 'hunt', id: it.id, label: `Pick up: ${it.title.toLowerCase()}`, stand: [x, z + 0.9], face: 0, mesh, data: it };
    world.interactables.push(entry);
    items.push(entry);
  });
}
function refreshHunt() {
  const s = stamps();
  for (const it of items) it.mesh.visible = !s[it.id];
  const found = set.items.filter((i) => s[i.id]).length;
  $('.stamp-btn b').textContent = `${found}/${set.items.length}`;
  $('.stamp-btn').classList.toggle('done', found === set.items.length);
}

// ---- presence ------------------------------------------------------------------------------------
const room = roomCode();
const peers = new Map();
let net = null;
const hidden = new Set();
const hiddenNames = new Set();
const isHidden = (id, name) => hidden.has(id) || hiddenNames.has(name);

function addPeer(p) {
  if ((net && p.id === net.id) || peers.has(p.id)) return;
  const av = makeAvatar(COLOURS.includes(p.ink) ? p.ink : COLOURS[0], { cam: p.cam });
  av.root.position.set(p.x || 0, 0, p.z || 0);
  scene.add(av.root);
  const t = tag(p.name, 'tag peer', 2.05);
  t.element.title = 'Hide or show this person';
  t.element.addEventListener('click', () => askHide(p.id));
  av.root.add(t);
  peers.set(p.id, { av, tagEl: t.element, x: p.x || 0, z: p.z || 0, r: p.r || 0, tx: p.x || 0, tz: p.z || 0, tr: p.r || 0, a: '', pose: '', name: p.name });
  if (p.a) setPeerAct(peers.get(p.id), p.a);
  refreshCount();
}
function removePeer(id) {
  const p = peers.get(id);
  if (!p) return;
  scene.remove(p.av.root);
  p.av.root.traverse((o) => { if (o.isCSS2DObject) o.element.remove(); });
  peers.delete(id);
  refreshCount();
}

function startNet() {
  net = connect({
    room,
    name: prefs.name,
    ink: prefs.colour,
    cam: prefs.cam,
    on: {
      status: (s) => { netStatus = s; refreshCount(); },
      welcome(m) {
        walks.welcome(m);
        for (const id of [...peers.keys()]) removePeer(id);
        m.peers.forEach(addPeer);
        refreshCount();
      },
      join(m) { addPeer(m); feed(`${m.name} dropped in.`, 'sys'); },
      leave(m) {
        const p = peers.get(m.id);
        if (p) feed(`${p.name} headed off.`, 'sys');
        removePeer(m.id);
      },
      pos(m) {
        const p = peers.get(m.id);
        if (!p) return;
        p.tx = m.x; p.tz = m.z; p.tr = m.r;
        if (p.a !== m.a) setPeerAct(p, m.a);
      },
      snap(m) { startTimer(m.name, m.id === net.id); },
      walkadd: (m) => walks.add(m),
      walkmine: (m) => walks.mine(m),
      walkjoin: (m) => walks.join(m),
      walkcontact: (m) => walks.contact(m),
      walkdel: (m) => walks.del(m),
      walkerr: (m) => walks.err(m),
      noteadd: (m) => walks.noteAdd(m),
      notemine: (m) => walks.noteMine(m),
      notedel: (m) => walks.noteDel(m),
      look(m) { const p = peers.get(m.id); if (p) p.av.setCamera(m.cam); },
      chat(m) {
        if (isHidden(m.id, m.name)) return;
        const p = peers.get(m.id);
        feed(m.text, '', m.name, m.id);
        if (p) bubble(p.av.root, m.text);
      },
    },
  });
}

function setPeerAct(p, a) {
  p.a = a;
  p.pose = a.startsWith('pose-') ? a.slice(5) : '';
  p.tagEl.dataset.act = actText(a);
}

let netStatus = 'solo';
function refreshCount() {
  const n = peers.size + 1;
  $('.room-status').textContent = netStatus === 'online'
    ? (n === 1 ? 'Only you here right now' : `${n} people here`)
    : netStatus === 'offline' ? 'Reconnecting' : 'On your own';
}

function askHide(id) {
  const p = peers.get(id);
  if (!p) return;
  const menu = $('.hide-menu');
  const was = hidden.has(id);
  menu.querySelector('p').textContent = was ? `Show ${p.name} again?` : `Hide ${p.name}? You will no longer see their messages.`;
  const yes = menu.querySelector('[data-yes]');
  yes.textContent = was ? 'Show' : 'Hide';
  yes.onclick = () => {
    if (was) { hidden.delete(id); hiddenNames.delete(p.name); } else { hidden.add(id); hiddenNames.add(p.name); }
    p.tagEl.classList.toggle('muted', !was);
    menu.hidden = true;
  };
  menu.hidden = false;
}
$('.hide-menu [data-no]').addEventListener('click', () => { $('.hide-menu').hidden = true; });

// ---- HUD bits ----------------------------------------------------------------------------------------
function feed(text, cls = '', who = '', id = '') {
  const list = $('.feed');
  const li = document.createElement('li');
  if (cls) li.className = cls;
  if (who) {
    const b = document.createElement(id ? 'button' : 'b');
    b.className = 'who';
    b.textContent = who;
    if (id) b.addEventListener('click', () => askHide(id));
    li.append(b, ' ');
  }
  li.append(document.createTextNode(text));
  list.append(li);
  while (list.children.length > 8) list.firstChild.remove();
  setTimeout(() => li.classList.add('fade'), 40000);
  setTimeout(() => li.remove(), 42000);
}
function bubble(root, text) {
  const old = root.children.find((c) => c.isCSS2DObject && c.element.classList.contains('bubble'));
  if (old) { root.remove(old); old.element.remove(); }
  const b = tag(text, 'bubble', 2.5);
  root.add(b);
  setTimeout(() => { root.remove(b); b.element.remove(); }, 6500);
}
let toastTimer = 0;
function toast(text) {
  const t = $('.toast');
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 5200);
}

$('.chat').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('.chat input');
  const text = input.value.trim().slice(0, 140);
  input.value = '';
  input.blur();
  if (!text) return;
  feed(text, 'mine', prefs.name);
  bubble(me.root, text);
  if (net) net.chat(text);
});

// ---- panels: everything you can look at opens one ----------------------------------------------------------
const panel = $('.panel');
let panelOpen = false;
function openPanel(html, act = '') {
  if (walks) walks.closed();
  panel.querySelector('.panel-body').innerHTML = html;
  panel.hidden = false;
  panelOpen = true;
  document.body.classList.add('panel-open');
  player.activity = act;
}
function closePanel() {
  if (!panelOpen) return;
  walks.closed();
  panel.hidden = true;
  panelOpen = false;
  document.body.classList.remove('panel-open');
  player.activity = '';
  canvas.focus();
}
panel.addEventListener('click', (e) => {
  if (e.target === panel || e.target.closest('[data-close]')) closePanel();
});

const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---- the photo walk board (Club Hall), reachable from anywhere -------------------------------------
const walks = createWalks({ panel, openPanel, toast, feed, esc, getNet: () => net, myName: () => prefs.name });
walks.onChange((cards, notes) => {
  city.meet.setFlags(cards);
  city.meet.paintIdeas(notes);
  city.club.paintBoard(cards, (t) => (WALK_TAGS.find((x) => x[0] === t) || [t, t])[1], (c) => (WALK_CITIES.find((x) => x[0] === c) || [c, c])[1]);
  $('.walks-btn b').textContent = cards.length;
});
$('.walks-btn').addEventListener('click', () => walks.open());
const ext = (href, label, primary = false) => `<a class="btn${primary ? ' primary' : ''}" href="${esc(href)}" target="_blank" rel="noopener">${esc(label)}</a>`;

function interact(it) {
  if (!it) return;
  player.r = it.face + Math.PI;
  const act = ACTS[it.kind] || '';
  if (it.kind === 'notice') {
    const w = weekNow(now());
    const due = nextDue(now());
    const ses = nextSession(now());
    openPanel(`
      <span class="label">${w >= 1 && w <= SEMESTER.weeks ? `Week ${w} of ${SEMESTER.weeks}` : esc(SEMESTER.name)}</span>
      <h2>${w >= 1 && w <= SEMESTER.weeks ? esc(WEEKS[w - 1]) : 'Photo 101'}</h2>
      ${due ? `<p><b>Next due:</b> ${esc(due.id)} ${esc(due.title)}, ${niceDate(due.at)} at 18:00.</p>` : '<p>All assignments are in. Well done.</p>'}
      ${ses ? `<p><b>Next support session:</b> ${niceDate(ses.at)}, for ${esc(ses.for)}. Optional, online on Teams; the link is on Canvas.</p>` : ''}
      <p>Everything official lives on Canvas. This place is just for fun and company.</p>
      <div class="row">${ext(SEMESTER.canvas, 'Open Canvas', true)}${ext('../roadmap.html', 'Week-by-week roadmap')}</div>`, act);
  } else if (it.kind === 'assignment') {
    const a = it.data;
    openPanel(`
      <span class="label">${esc(a.id)} · ${esc(a.weeks)} · ${esc(a.weight)}</span>
      <h2>${esc(a.title)}</h2>
      <p>${esc(a.brief)}</p>
      <p class="due">Due ${niceDate(new Date(a.due + 'T18:00:00+07:00'))}, 18:00 · submit on Canvas as a PDF</p>
      <div class="row">${a.templates.map(([l, h]) => ext(h, l)).join('')}${ext(SEMESTER.canvas, 'Canvas', true)}</div>`, act);
  } else if (it.kind === 'desk') {
    const book = SEMESTER.bookings
      ? ext(SEMESTER.bookings, 'Book a consultation', true)
      : `<a class="btn primary" href="mailto:${esc(SEMESTER.email)}?subject=${encodeURIComponent('Photo 101 consultation')}">Email to book a consultation</a>`;
    openPanel(`
      <span class="label">Consultations</span>
      <h2>Talk to your lecturer</h2>
      <p>There are no live classes, so consultations are where you get one-to-one feedback. Book one when you get stuck, and for A3 the consultation is required: bring your two themes and your moodboard.</p>
      <div class="row">${book}</div>`, act);
  } else if (it.kind === 'door' || it.kind === 'screen') {
    const ses = nextSession(now());
    openPanel(ses && ses.today ? `
      <span class="label">Today</span>
      <h2>Support session for ${esc(ses.for)}</h2>
      <p>${ses.time ? `It starts at ${esc(ses.time)}, Vietnam time.` : 'The start time and the Teams link are in the Canvas announcement.'} Come along with questions, or just listen. Optional, and recorded.</p>
      <div class="row">${ext(SEMESTER.canvas, 'Join from Canvas', true)}${ext(SEMESTER.miro, 'Support board (Miro)')}</div>` : `
      <span class="label">Support sessions</span>
      <h2>${ses ? `Next: ${niceDate(ses.at)}` : 'All done for this semester'}</h2>
      <p>Online sessions on Teams with assignment guidance and a showcase of HD work. They are optional; the room opens here on the day.</p>
      <ul>${SEMESTER.sessions.map((s) => `<li>${niceDate(new Date(s.date + 'T00:00:00+07:00'))} for ${esc(s.for)}</li>`).join('')}</ul>
      <div class="row">${ext(SEMESTER.miro, 'Support board (Miro)', true)}</div>`, act);
  } else if (it.kind === 'tool') {
    const t = it.data;
    openPanel(`<span class="label">Tool</span><h2>${esc(t.title)}</h2><p>${esc(t.text)}</p><div class="row">${ext(t.href, 'Open', true)}</div>`, act);
  } else if (it.kind === 'art') {
    const a = it.data;
    openPanel(`
      <img class="art" src="../image/${esc(a.file)}" alt="Photograph from ${esc(a.title)} by ${esc(a.artist)}">
      <h2>${esc(a.title)}</h2>
      <p>${esc(a.artist)} · rễRoute, Pingyao International Photography Festival 2026</p>
      <p class="muted">Try the three questions: what do you see, how was it made, and what does it make you feel?</p>`, act);
  } else if (it.kind === 'hunt') {
    const h = it.data;
    const fresh = stamp(h.id);
    refreshHunt();
    const found = set.items.filter((i) => stamps()[i.id]).length;
    openPanel(`
      <span class="label">Photo hunt · ${esc(set.title)} · ${found} of ${set.items.length}</span>
      <h2>${esc(h.title)}</h2>
      <p>${esc(h.tip)}</p>
      <p class="challenge"><b>Try this:</b> ${esc(h.challenge)}</p>
      ${found === set.items.length ? '<p class="complete">Set complete. A new set appears when the course moves on.</p>' : ''}`, 'hunt');
    if (fresh && found === set.items.length) toast(`All ${set.items.length} found. The ${set.title.toLowerCase()} set is complete.`);
  } else if (it.kind === 'work') {
    const w = it.data;
    const show = city.show;
    openPanel(`
      <img class="art" src="${esc(showDir(show) + w.file)}" alt="${esc(w.title)} by ${esc(w.artist)}">
      <span class="label">${esc(show.title)} · curated by ${esc(show.curator)}</span>
      <h2>${esc(w.title)}</h2>
      <p>${esc(w.artist)}${w.semester ? ` · ${esc(w.semester)}` : ''}</p>
      ${w.caption ? `<p>${esc(w.caption)}</p>` : ''}
      <p class="muted">Try the three questions: what do you see, how was it made, and what does it make you feel?</p>`, act);
  } else if (it.kind === 'curator') {
    const show = it.data;
    const past = pastShows(now());
    openPanel(show ? `
      <span class="label">Now showing · curated by ${esc(show.curator)}</span>
      <h2>${esc(show.title)}</h2>
      <p>${esc(show.note)}</p>
      <p class="muted">${show.works.length} works. Walk up to any of them to see it larger.</p>
      ${past.length ? `<p><b>Past shows:</b> ${past.map((p) => `${esc(p.title)} (${esc(p.curator)})`).join(', ')}</p>` : ''}` : `
      <span class="label">The Gallery</span>
      <h2>The next show is being hung</h2>
      <p>For each show the teaching team picks work by Photo 101 students and hangs it here. There is nothing to submit: keep shooting, and share your best work in the support sessions and on the Miro board.</p>`, act);
  } else if (it.kind === 'shutter') {
    if (timer) { toast('The timer is already running. Get in the frame!'); return; }
    if (net && net.online) net.snap();
    else startTimer(prefs.name, true);
  } else if (it.kind === 'lastphoto') {
    openPanel(lastPrint ? `
      <span class="label">Club Hall · this visit</span>
      <h2>Your last group photo</h2>
      <img class="art" src="${lastPrint}" alt="The last group photo taken in the Club Hall">
      <div class="row"><a class="btn primary" href="${lastPrint}" download="${photoName()}">Save photo</a></div>` : `
      <span class="label">Club Hall</span>
      <h2>No group photo yet</h2>
      <p>Set the timer on the studio camera, then get onto the cream paper with whoever is around. The photo stays in your browser; nothing is uploaded.</p>`, act);
  } else if (it.kind === 'signpost') {
    openPanel(`
      <span class="label">Signpost</span>
      <h2>Where to?</h2>
      <div class="row go">
        <button class="btn primary" data-go="-6.2,21">Club Hall</button>
        <button class="btn primary" data-go="6.2,21">Gallery</button>
        <button class="btn primary" data-go="3.8,38.1">Camera Shop</button>
        <button class="btn primary" data-go="0,46.4">Meeting Point</button>
        <button class="btn" data-go="0,-5.3">Consultation desk</button>
        <button class="btn" data-go="-11.9,0">Support room</button>
        <button class="btn" data-go="0,3.4">Notice board</button>
      </div>`);
  } else if (it.kind === 'walks') {
    walks.open();
  } else if (it.kind === 'flag') {
    walks.openPlan(it.data);
  } else if (it.kind === 'plant') {
    walks.plant(it.data.city, it.data.area);
  } else if (it.kind === 'ideas') {
    walks.openIdeas();
  } else if (it.kind === 'log') {
    setPose('sit');
  } else if (it.kind === 'camera') {
    const c = it.data;
    const mine = prefs.cam === c.id;
    openPanel(`
      <span class="label">Camera Shop</span>
      <h2>${esc(c.label)}</h2>
      <p>${esc(CAMERA_NOTES[c.id])}</p>
      <p class="muted">Everything here is free. Pick the kind closest to what you really shoot with, so others can see it.</p>
      <div class="row">${mine ? '<span class="btn">You carry this one</span>' : `<button class="btn primary" data-cam="${esc(c.id)}">This is my camera</button>`}${ext('../camera-checker.html', 'Camera Checker')}</div>`, act);
  } else if (it.kind === 'counter') {
    openPanel(`
      <span class="label">Camera Shop · the counter</span>
      <h2>Which camera do you have?</h2>
      <p>You are carrying a <b>${esc(camLabel(prefs.cam))}</b>. Pick the kind you shoot with; it becomes your head here.</p>
      <div class="row">${CAMERAS.map((c) => `<button class="btn${c.id === prefs.cam ? ' primary' : ''}" data-cam="${esc(c.id)}">${esc(c.label)}</button>`).join('')}</div>
      <p class="muted">Not sure your camera has the manual controls the course needs? The Camera Checker will tell you.</p>
      <div class="row">${ext('../camera-checker.html', 'Open the Camera Checker', true)}</div>`, act);
  } else if (it.kind === 'lot') {
    openPanel(`
      <span class="label">Coming soon</span>
      <h2>An empty lot</h2>
      <p>This city is just getting started. Something for photographers will be built here.</p>`);
  }
}

panel.addEventListener('click', (e) => {
  const pick = e.target.closest('[data-cam]');
  if (pick) { chooseCamera(pick.dataset.cam); closePanel(); return; }
  const go = e.target.closest('[data-go]');
  if (!go) return;
  const [x, z] = go.dataset.go.split(',').map(Number);
  closePanel();
  walkTo(x, z, null);
});

function chooseCamera(id) {
  if (!CAMERA_IDS.includes(id)) return;
  prefs.cam = id;
  savePrefs();
  me.setCamera(id);
  if (net) net.look(id);
  camButtons.forEach((b) => b.classList.toggle('on', b.dataset.cam === id));
  if (entered) toast(`You now carry a ${camLabel(id).toLowerCase()} camera.`);
}

// ---- the Club Hall: a shared self-timer, and the photo each browser takes --------------------------
let timer = null;
let lastPrint = '';
const countEl = $('.countdown');
const inHall = () => inside(HALL, player.x, player.z);
const onStage = () => inside(STAGE, player.x, player.z);
const photoName = () => `photo101-club-${new Date().toISOString().slice(0, 10)}.png`;

function startTimer(name, mine) {
  if (timer) return;
  const ends = performance.now() + 6000;
  timer = { ends };
  city.club.tally(true);
  if (mine) {
    // whoever sets the timer runs round to join the photo
    closePanel();
    const spots = [[-17.4, 21], [-17.4, 19.4], [-17.4, 22.6], [-18.8, 20.2], [-18.8, 21.8], [-16, 20.2], [-16, 21.8]];
    const [x, z] = spots[Math.floor(Math.random() * spots.length)];
    walkTo(x, z, null);
    feed('Timer set. Six seconds: get on the cream paper!', 'sys');
  } else if (inHall()) {
    feed(`${name} set the timer. Get in the frame!`, 'sys');
  } else {
    feed(`${name} is taking a group photo in the Club Hall.`, 'sys');
  }
}

function tickTimer() {
  if (!timer) return;
  const left = (timer.ends - performance.now()) / 1000;
  const here = inHall();
  countEl.hidden = !here || left <= 0;
  if (here && left > 0) countEl.textContent = Math.ceil(left);
  city.club.tally(Math.ceil(left * 2) % 2 === 0 || left < 1.5);
  // with the shutter about to go, anyone standing on the paper turns to the camera
  if (left < 1.8 && onStage() && !player.path.length && player.speed < 0.05) player.r = Math.PI / 2;
  if (left > 0) return;
  timer = null;
  city.club.tally(false);
  countEl.hidden = true;
  if (here) takePhoto();
}

function takePhoto() {
  const W = 1600;
  const Hh = 800;
  const lens = city.club.lensCam;
  // render through the studio camera at full size, then put the main view back
  const ratio = renderer.getPixelRatio();
  renderer.setPixelRatio(1);
  renderer.setSize(W, Hh, false);
  renderer.render(scene, lens);
  const shot = document.createElement('canvas');
  shot.width = W;
  shot.height = Hh;
  shot.getContext('2d').drawImage(canvas, 0, 0);
  renderer.setPixelRatio(ratio);
  resize();
  renderer.render(scene, camera);

  // who is in the picture, with a name under each
  const people = [{ name: prefs.name, x: player.x, z: player.z }];
  for (const [id, p] of peers) if (!isHidden(id, p.name)) people.push({ name: p.name, x: p.x, z: p.z });
  const v = new THREE.Vector3();
  const inFrame = [];
  for (const p of people) {
    if (!inside(HALL, p.x, p.z) || p.x > lens.position.x - 0.3) continue;
    v.set(p.x, 0, p.z).project(lens);
    if (Math.abs(v.x) > 0.98 || v.y < -1.2 || v.z > 1) continue;
    inFrame.push({ ...p, px: (v.x + 1) / 2 * W, py: Math.min(Hh - 18, (1 - v.y) / 2 * Hh + 26) });
  }
  inFrame.sort((a, b) => a.px - b.px);

  const M = 50;
  const print = document.createElement('canvas');
  print.width = W + M * 2;
  print.height = Hh + M + 150;
  const ctx = print.getContext('2d');
  ctx.fillStyle = '#f7f5f0';
  ctx.fillRect(0, 0, print.width, print.height);
  ctx.drawImage(shot, M, M);
  ctx.textAlign = 'center';
  ctx.font = '700 30px "Barlow Condensed", sans-serif';
  for (const p of inFrame) {
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeText(p.name, M + p.px, M + p.py);
    ctx.fillStyle = '#fff';
    ctx.fillText(p.name, M + p.px, M + p.py);
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e60028';
  ctx.font = '700 54px "Barlow Condensed", sans-serif';
  ctx.fillText('PHOTO 101 CLUB HALL', M, Hh + M + 70);
  ctx.fillStyle = '#555';
  ctx.font = '400 26px "JetBrains Mono", monospace';
  ctx.fillText(inFrame.length ? inFrame.map((p) => p.name).join(' · ') : 'Nobody made it onto the paper this time', M, Hh + M + 115);
  ctx.textAlign = 'right';
  ctx.fillText(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }), W + M, Hh + M + 70);

  lastPrint = print.toDataURL('image/png');
  city.club.hang(print);
  const flash = $('.flash');
  flash.hidden = false;
  flash.classList.remove('go');
  void flash.offsetWidth;
  flash.classList.add('go');
  setTimeout(() => { flash.hidden = true; }, 900);
  setTimeout(() => interact(world.interactables.find((i) => i.kind === 'lastphoto')), 700);
}

// ---- poses, for the photo -------------------------------------------------------------------------------------------
const poseBar = $('.poses');
POSES.forEach((pose, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'pose';
  b.dataset.pose = pose;
  b.innerHTML = `<kbd>${i + 1}</kbd>${pose}`;
  b.addEventListener('click', () => setPose(player.pose === pose ? '' : pose));
  poseBar.append(b);
});
function setPose(pose) {
  player.pose = pose;
  player.path = [];
  player.pending = null;
  // facing the camera whenever you strike a pose on the paper
  if (pose && onStage()) player.r = Math.PI / 2;
  poseBar.querySelectorAll('.pose').forEach((b) => b.classList.toggle('on', b.dataset.pose === pose));
}

$('.stamp-btn').addEventListener('click', () => {
  const s = stamps();
  openPanel(`
    <span class="label">Photo hunt</span>
    <h2>${esc(set.title)}</h2>
    <p>Four things are hidden around the Commons this stretch of the course. Each one has a tip and a small shooting challenge.</p>
    <div class="stamps">${set.items.map((i) => `<div class="stamp${s[i.id] ? ' got' : ''}"><span>${s[i.id] ? 'Found' : '?'}</span>${s[i.id] ? esc(i.title) : 'Still hidden'}</div>`).join('')}</div>
    <p class="muted">${totalStamps()} found all semester. Kept in this browser only.</p>`);
});

// ---- input --------------------------------------------------------------------------------------------------
const keys = new Set();
const typing = () => document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName);
let entered = false;
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closePanel(); $('.chat input').blur(); return; }
  if (panelOpen || typing() || !entered) return;
  const k = e.key.toLowerCase();
  if ((k === 'e' || k === 'enter') && nearest) { interact(nearest); return; }
  if (k === 't' || k === 'enter') { e.preventDefault(); $('.chat input').focus(); return; }
  if (/^[1-5]$/.test(k) && inHall()) { const p = POSES[+k - 1]; setPose(player.pose === p ? '' : p); return; }
  keys.add(k);
  if (k.startsWith('arrow')) e.preventDefault();
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());

const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  if (!entered) return;
  drag = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag || drag.id !== e.pointerId) return;
  const dx = e.clientX - drag.x;
  const dy = e.clientY - drag.y;
  if (!drag.moved && Math.hypot(dx, dy) < 6) return;
  drag.moved = true;
  cam.yaw -= dx * 0.006;
  cam.pitch = Math.min(1.2, Math.max(0.18, cam.pitch + dy * 0.004));
  drag.x = e.clientX;
  drag.y = e.clientY;
});
canvas.addEventListener('pointerup', (e) => {
  if (!drag) return;
  const tapped = !drag.moved;
  drag = null;
  if (tapped) tap(e.clientX, e.clientY);
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  cam.dist = Math.min(14, Math.max(3.5, cam.dist * (1 + Math.sign(e.deltaY) * 0.08)));
}, { passive: false });

function tap(cx, cy) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects([world.ground, ...world.interactables.map((i) => i.mesh)], true);
  for (const h of hits) {
    const it = world.interactables.find((i) => isChild(h.object, i.mesh));
    if (it && (it.kind !== 'hunt' || it.mesh.visible)) { walkTo(it.stand[0], it.stand[1], it); return; }
    if (isChild(h.object, world.ground)) { walkTo(h.point.x, h.point.z, null); return; }
  }
}
function isChild(o, parent) {
  for (let p = o; p; p = p.parent) if (p === parent) return true;
  return false;
}

// ---- walking: A* over a quarter-metre grid, pulled taut -----------------------------------------------------------
const GRID = { x0: -24, z0: -9, cell: 0.25, w: 192, h: 272 };
let grid = null;
let gridDoor = null;
function blocked(x, z, rad = R) {
  for (const [x0, z0, x1, z1] of world.colliders) {
    const cx = Math.max(x0, Math.min(x, x1));
    const cz = Math.max(z0, Math.min(z, z1));
    if ((x - cx) ** 2 + (z - cz) ** 2 < rad * rad) return true;
  }
  // the square, then the city to the south of it
  const square = x >= -23.7 && x <= 23.7 && z >= -8.7 && z <= 8.7;
  return !square && !inside(SOUTH, x, z);
}
function buildGrid() {
  grid = new Uint8Array(GRID.w * GRID.h);
  gridDoor = world.door.open;
  for (let j = 0; j < GRID.h; j++) for (let i = 0; i < GRID.w; i++) {
    grid[j * GRID.w + i] = blocked(GRID.x0 + (i + 0.5) * GRID.cell, GRID.z0 + (j + 0.5) * GRID.cell, R + 0.08) ? 1 : 0;
  }
}
const cellOf = (x, z) => [
  Math.min(GRID.w - 1, Math.max(0, Math.floor((x - GRID.x0) / GRID.cell))),
  Math.min(GRID.h - 1, Math.max(0, Math.floor((z - GRID.z0) / GRID.cell))),
];
const centre = (i, j) => [GRID.x0 + (i + 0.5) * GRID.cell, GRID.z0 + (j + 0.5) * GRID.cell];
function nearestFree(i, j) {
  if (!grid[j * GRID.w + i]) return [i, j];
  for (let r = 1; r < 12; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
    const a = i + di;
    const b = j + dj;
    if (a >= 0 && b >= 0 && a < GRID.w && b < GRID.h && !grid[b * GRID.w + a]) return [a, b];
  }
  return null;
}
function clearLine([ax, az], [bx, bz]) {
  const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.12);
  for (let k = 1; k <= n; k++) {
    const [i, j] = cellOf(ax + (bx - ax) * (k / n), az + (bz - az) * (k / n));
    if (grid[j * GRID.w + i]) return false;
  }
  return true;
}
function findPath(fx, fz, tx, tz) {
  if (!grid || gridDoor !== world.door.open) buildGrid();
  const s = nearestFree(...cellOf(fx, fz));
  const g = nearestFree(...cellOf(tx, tz));
  if (!s || !g) return null;
  const W = GRID.w;
  const start = s[1] * W + s[0];
  const goal = g[1] * W + g[0];
  // full precision, and each cell expanded once: rounding must not loop the search
  const cost = new Float64Array(grid.length).fill(Infinity);
  const from = new Int32Array(grid.length).fill(-1);
  const f = new Float64Array(grid.length);
  const closed = new Uint8Array(grid.length);
  const h = (n) => Math.hypot((n % W) - g[0], Math.floor(n / W) - g[1]);
  const open = [start];
  cost[start] = 0;
  f[start] = h(start);
  const push = (n) => {
    open.push(n);
    for (let k = open.length - 1; k > 0;) {
      const p = (k - 1) >> 1;
      if (f[open[p]] <= f[open[k]]) break;
      [open[p], open[k]] = [open[k], open[p]];
      k = p;
    }
  };
  const pop = () => {
    const top = open[0];
    const last = open.pop();
    if (open.length) {
      open[0] = last;
      for (let k = 0; ;) {
        const l = 2 * k + 1;
        let m = k;
        if (l < open.length && f[open[l]] < f[open[m]]) m = l;
        if (l + 1 < open.length && f[open[l + 1]] < f[open[m]]) m = l + 1;
        if (m === k) break;
        [open[m], open[k]] = [open[k], open[m]];
        k = m;
      }
    }
    return top;
  };
  while (open.length) {
    const n = pop();
    if (closed[n]) continue;
    closed[n] = 1;
    if (n === goal) break;
    const i = n % W;
    const j = Math.floor(n / W);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const a = i + di;
      const b = j + dj;
      if (a < 0 || b < 0 || a >= W || b >= GRID.h) continue;
      const m = b * W + a;
      if (closed[m] || grid[m] || (di && dj && (grid[j * W + a] || grid[b * W + i]))) continue;
      const c = cost[n] + (di && dj ? Math.SQRT2 : 1);
      if (c < cost[m]) { cost[m] = c; from[m] = n; f[m] = c + h(m); push(m); }
    }
  }
  if (from[goal] === -1 && goal !== start) return null;
  const pts = [];
  for (let n = goal; n !== -1; n = from[n]) pts.push(centre(n % W, Math.floor(n / W)));
  pts.reverse();
  const out = [];
  let anchor = [fx, fz];
  for (let k = 1; k < pts.length; k++) {
    if (!clearLine(anchor, pts[k])) { out.push(pts[k - 1]); anchor = pts[k - 1]; }
  }
  const [ti, tj] = cellOf(tx, tz);
  out.push(grid[tj * W + ti] ? pts[pts.length - 1] : [tx, tz]);
  return out;
}
function walkTo(x, z, pending) {
  const path = findPath(player.x, player.z, x, z);
  player.path = path || [];
  player.pending = path ? pending : null;
  player.stuck = 0;
  // a closed door: say why instead of walking into it
  if (!path && pending == null && x < -13 && z < 8) toast('The support room opens on session days.');
}

function step(dt) {
  let mx = 0;
  let mz = 0;
  const fw = (keys.has('w') || keys.has('arrowup')) - (keys.has('s') || keys.has('arrowdown'));
  const rt = (keys.has('d') || keys.has('arrowright')) - (keys.has('a') || keys.has('arrowleft'));
  const run = keys.has('shift') ? 1.7 : 1;
  if ((fw || rt || player.path.length) && player.pose) setPose('');
  if (fw || rt) {
    player.path = [];
    player.pending = null;
    const sy = Math.sin(cam.yaw);
    const cy = Math.cos(cam.yaw);
    mx = -sy * fw + cy * rt;
    mz = -cy * fw - sy * rt;
  } else if (player.path.length) {
    const [tx, tz] = player.path[0];
    const d = Math.hypot(tx - player.x, tz - player.z);
    if (d < 0.12) {
      player.path.shift();
      if (!player.path.length && player.pending) {
        const it = player.pending;
        player.pending = null;
        interact(it);
      }
    } else {
      mx = (tx - player.x) / d;
      mz = (tz - player.z) / d;
    }
  }
  const len = Math.hypot(mx, mz);
  let speed = 0;
  if (len > 0) {
    mx /= len;
    mz /= len;
    const v = 3.4 * run * dt;
    const ox = player.x;
    const oz = player.z;
    if (!blocked(player.x + mx * v, player.z)) player.x += mx * v;
    if (!blocked(player.x, player.z + mz * v)) player.z += mz * v;
    const moved = Math.hypot(player.x - ox, player.z - oz);
    speed = moved / dt;
    if (player.path.length && moved < v * 0.2) {
      player.stuck += dt;
      if (player.stuck > 0.6) {
        const it = player.pending;
        player.path = [];
        player.pending = null;
        if (it && Math.hypot(it.stand[0] - player.x, it.stand[1] - player.z) < 1.8) interact(it);
      }
    } else player.stuck = 0;
    let d = Math.atan2(mx, mz) - player.r;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    player.r += d * Math.min(1, dt * 10);
  }
  player.speed = speed;
}

// ---- what is in front of you ---------------------------------------------------------------------------------------
let nearest = null;
const promptBtn = $('.prompt');
function findNearest() {
  let best = null;
  let bd = 1.7;
  for (const it of world.interactables) {
    if (it.kind === 'hunt' && !it.mesh.visible) continue;
    const d = Math.hypot(it.stand[0] - player.x, it.stand[1] - player.z);
    if (d < bd) { bd = d; best = it; }
  }
  // standing on a district of the Meeting Point maps: plant a flag there
  if (!best) {
    const tile = city.meet.tileAt(player.x, player.z);
    if (tile) {
      if (!tile.plant) tile.plant = { kind: 'plant', id: 'plant', label: `Plant a flag: ${tile.area}`, stand: [0, 0], face: 0, data: tile };
      tile.plant.face = player.r - Math.PI; // keep facing the way you are
      best = tile.plant;
    }
  }
  if (best !== nearest) {
    nearest = best;
    promptBtn.hidden = !best;
    if (best) promptBtn.querySelector('span').textContent = best.label;
  }
}
promptBtn.addEventListener('click', () => nearest && interact(nearest));

// ---- the gate ---------------------------------------------------------------------------------------------------------
const gate = $('.entry');
const nameInput = gate.querySelector('input[name=name]');
nameInput.value = prefs.name || '';
const swatches = gate.querySelector('.swatches');
COLOURS.forEach((c) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'swatch' + (c === prefs.colour ? ' on' : '');
  b.style.background = c;
  b.setAttribute('aria-label', 'Shirt colour');
  b.addEventListener('click', () => {
    prefs.colour = c;
    me.setColour(c);
    swatches.querySelectorAll('.swatch').forEach((s) => s.classList.toggle('on', s === b));
  });
  swatches.append(b);
});
const camButtons = CAMERAS.map((c) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'cam' + (c.id === prefs.cam ? ' on' : '');
  b.dataset.cam = c.id;
  b.textContent = c.label;
  b.addEventListener('click', () => chooseCamera(c.id));
  gate.querySelector('.cams').append(b);
  return b;
});
peekCount(room).then((n) => {
  if (n == null) return;
  gate.querySelector('.entry-count').textContent =
    n >= 100 ? 'The Commons is full right now (100 people). You can still walk in on your own, and you will join everyone as soon as there is room.'
      : n === 0 ? 'Nobody else is here right now.' : n === 1 ? 'One person is here right now.' : `${n} people are here right now.`;
});
gate.querySelector('form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = nameInput.value.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 24);
  if (!name) { nameInput.focus(); return; }
  prefs.name = name;
  savePrefs();
  meTag.element.textContent = name;
  gate.hidden = true;
  $('.hud').hidden = false;
  entered = true;
  refreshHunt();
  startNet();
  refreshCount();
  feed(HINT, 'sys');
  feed(CITY_HINT, 'sys');
  const found = set.items.filter((i) => stamps()[i.id]).length;
  if (found < set.items.length) feed(`Photo hunt: ${set.items.length - found} things are hidden around here this week.`, 'sys');
});

// ---- loop ---------------------------------------------------------------------------------------------------------------
const clock = new THREE.Clock();
let sendTimer = 0;
let wasMoving = false;
const look = new THREE.Vector3();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;
  if (entered && !panelOpen) step(dt);
  else player.speed = 0;
  me.root.position.set(player.x, 0, player.z);
  me.root.rotation.y = player.r;
  me.animate(dt, player.speed, t, player.pose);
  if (entered) findNearest();
  tickTimer();
  city.meet.animate(t, REDUCED);
  poseBar.hidden = !entered || !inHall();
  world.door.animate(dt);
  if (!REDUCED) for (const d of city.displays) d.rotation.y += dt * 0.6;
  for (const it of items) {
    if (!it.mesh.visible) continue;
    it.mesh.rotation.y += dt * (REDUCED ? 0 : 1.2);
    it.mesh.position.y = 1.1 + (REDUCED ? 0 : Math.sin(t * 2 + it.stand[0]) * 0.12);
  }
  for (const p of peers.values()) {
    // moves arrive about twice a second: walk toward each one at walking
    // pace (faster if far behind), facing the way they are going
    const k = Math.min(1, dt * 6);
    const ox = p.x;
    const oz = p.z;
    const gap = Math.hypot(p.tx - p.x, p.tz - p.z);
    let heading = p.tr;
    if (gap > 10) { p.x = p.tx; p.z = p.tz; }
    else if (gap > 0.01) {
      const stepLen = Math.min(gap, Math.max(3.6, gap * 2.5) * dt);
      p.x += ((p.tx - p.x) / gap) * stepLen;
      p.z += ((p.tz - p.z) / gap) * stepLen;
      if (gap > 0.3) heading = Math.atan2(p.tx - ox, p.tz - oz);
    }
    let d = heading - p.r;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    p.r += d * k;
    p.av.root.position.set(p.x, 0, p.z);
    p.av.root.rotation.y = p.r;
    p.av.animate(dt, Math.hypot(p.x - ox, p.z - oz) / dt, t, p.pose);
  }
  if (!entered && !REDUCED) cam.yaw += dt * 0.05;
  const k = 1 - Math.exp(-dt * 6);
  cam.x += (player.x - cam.x) * k;
  cam.z += (player.z - cam.z) * k;
  const cp = Math.cos(cam.pitch) * cam.dist;
  camera.position.set(cam.x + Math.sin(cam.yaw) * cp, 1.2 + Math.sin(cam.pitch) * cam.dist, cam.z + Math.cos(cam.yaw) * cp);
  camera.lookAt(look.set(cam.x, 1.2, cam.z));
  sun.position.set(cam.x + 18, 30, cam.z + 16);
  sun.target.position.set(cam.x, 0, cam.z);
  if (net && entered) {
    sendTimer += dt;
    // Every message counts against the server's free daily allowance, so
    // send little: every 2 s when alone, twice a second with company, and
    // the final spot as soon as you stop
    const moving = player.speed > 0.05;
    const every = peers.size ? 0.5 : 2;
    const act = player.pose ? `pose-${player.pose}` : player.activity || (inHall() ? 'club' : inside(GALLERY, player.x, player.z) ? 'show' : inside(SHOP, player.x, player.z) ? 'shop' : player.z > 45.5 ? 'meet' : '');
    if (sendTimer > every || (wasMoving && !moving)) { sendTimer = 0; net.pos(player.x, player.z, player.r, act); }
    wasMoving = moving;
  }
  renderer.render(scene, camera);
  labels.render(scene, camera);
}

if (new URLSearchParams(location.search).has('debug')) {
  window.__commons = { player, cam, world, city, walkTo, peers, items, interact, startTimer, setPose };
}
document.body.classList.add('ready');
frame();
