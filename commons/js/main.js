// The Photo 101 Commons: an optional, casual place to drop into. Walk the
// plaza, find this week's photo hunt items, check what is due, book a
// consultation, and see who else is around. Nothing here is graded or
// counted as attendance.

import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { buildWorld, drawSign, makeItem, HIDING } from './world.js';
import { makeAvatar, COLOURS } from './avatar.js';
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
const ACTS = { door: 'support', screen: 'support', art: 'gallery', desk: 'desk', assignment: 'kiosk', tool: 'tools', notice: 'notice' };
const ACT_TEXT = { support: 'in the support room', gallery: 'in the gallery', desk: 'at the consultation desk', kiosk: 'reading an assignment', tools: 'in the tool corner', notice: 'at the notice board', hunt: 'on the photo hunt' };

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
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 16, bottom: -16, near: 1, far: 90 });
sun.shadow.bias = -0.0006;
scene.add(sun);

await Promise.all([
  document.fonts.load('700 48px "Barlow Condensed"'),
  document.fonts.load('400 24px "JetBrains Mono"'),
  document.fonts.load('400 24px "Source Sans 3"'),
]).catch(() => {});
const world = buildWorld(scene);

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
const me = makeAvatar(prefs.colour);
scene.add(me.root);
const meTag = tag(prefs.name || '', 'tag me-tag', 2.05);
me.root.add(meTag);
const player = { x: 0, z: 7, r: Math.PI, speed: 0, path: [], pending: null, stuck: 0, activity: '' };
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
  const av = makeAvatar(COLOURS.includes(p.ink) ? p.ink : COLOURS[0]);
  av.root.position.set(p.x || 0, 0, p.z || 0);
  scene.add(av.root);
  const t = tag(p.name, 'tag peer', 2.05);
  t.element.title = 'Hide or show this person';
  t.element.addEventListener('click', () => askHide(p.id));
  av.root.add(t);
  peers.set(p.id, { av, tagEl: t.element, x: p.x || 0, z: p.z || 0, r: p.r || 0, tx: p.x || 0, tz: p.z || 0, tr: p.r || 0, a: '', name: p.name });
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
    on: {
      status: (s) => { netStatus = s; refreshCount(); },
      welcome(m) {
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
        if (p.a !== m.a) { p.a = m.a; p.tagEl.dataset.act = ACT_TEXT[m.a] || ''; }
      },
      chat(m) {
        if (isHidden(m.id, m.name)) return;
        const p = peers.get(m.id);
        feed(m.text, '', m.name, m.id);
        if (p) bubble(p.av.root, m.text);
      },
    },
  });
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
  panel.querySelector('.panel-body').innerHTML = html;
  panel.hidden = false;
  panelOpen = true;
  document.body.classList.add('panel-open');
  player.activity = act;
}
function closePanel() {
  if (!panelOpen) return;
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
  }
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
const GRID = { x0: -24, z0: -9, cell: 0.25, w: 192, h: 72 };
let grid = null;
let gridDoor = null;
function blocked(x, z, rad = R) {
  for (const [x0, z0, x1, z1] of world.colliders) {
    const cx = Math.max(x0, Math.min(x, x1));
    const cz = Math.max(z0, Math.min(z, z1));
    if ((x - cx) ** 2 + (z - cz) ** 2 < rad * rad) return true;
  }
  return x < -23.7 || x > 23.7 || z < -8.7 || z > 8.7;
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
  if (!path && pending == null && x < -13) toast('The support room opens on session days.');
}

function step(dt) {
  let mx = 0;
  let mz = 0;
  const fw = (keys.has('w') || keys.has('arrowup')) - (keys.has('s') || keys.has('arrowdown'));
  const rt = (keys.has('d') || keys.has('arrowright')) - (keys.has('a') || keys.has('arrowleft'));
  const run = keys.has('shift') ? 1.7 : 1;
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
peekCount(room).then((n) => {
  if (n == null) return;
  gate.querySelector('.entry-count').textContent =
    n === 0 ? 'Nobody else is here right now.' : n === 1 ? 'One person is here right now.' : `${n} people are here right now.`;
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
  const found = set.items.filter((i) => stamps()[i.id]).length;
  if (found < set.items.length) feed(`Photo hunt: ${set.items.length - found} things are hidden around here this week.`, 'sys');
});

// ---- loop ---------------------------------------------------------------------------------------------------------------
const clock = new THREE.Clock();
let sendTimer = 0;
const look = new THREE.Vector3();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;
  if (entered && !panelOpen) step(dt);
  else player.speed = 0;
  me.root.position.set(player.x, 0, player.z);
  me.root.rotation.y = player.r;
  me.animate(dt, player.speed, t);
  if (entered) findNearest();
  world.door.animate(dt);
  for (const it of items) {
    if (!it.mesh.visible) continue;
    it.mesh.rotation.y += dt * (REDUCED ? 0 : 1.2);
    it.mesh.position.y = 1.1 + (REDUCED ? 0 : Math.sin(t * 2 + it.stand[0]) * 0.12);
  }
  for (const p of peers.values()) {
    const k = Math.min(1, dt * 6);
    const ox = p.x;
    const oz = p.z;
    p.x += (p.tx - p.x) * k;
    p.z += (p.tz - p.z) * k;
    let d = p.tr - p.r;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    p.r += d * k;
    p.av.root.position.set(p.x, 0, p.z);
    p.av.root.rotation.y = p.r;
    p.av.animate(dt, Math.hypot(p.x - ox, p.z - oz) / dt, t);
  }
  if (!entered && !REDUCED) cam.yaw += dt * 0.05;
  const k = 1 - Math.exp(-dt * 6);
  cam.x += (player.x - cam.x) * k;
  cam.z += (player.z - cam.z) * k;
  const cp = Math.cos(cam.pitch) * cam.dist;
  camera.position.set(cam.x + Math.sin(cam.yaw) * cp, 1.2 + Math.sin(cam.pitch) * cam.dist, cam.z + Math.cos(cam.yaw) * cp);
  camera.lookAt(look.set(cam.x, 1.2, cam.z));
  if (net && entered) {
    sendTimer += dt;
    if (sendTimer > 0.25) { sendTimer = 0; net.pos(player.x, player.z, player.r, player.activity); }
  }
  renderer.render(scene, camera);
  labels.render(scene, camera);
}

if (new URLSearchParams(location.search).has('debug')) {
  window.__commons = { player, world, walkTo, peers, items, interact };
}
document.body.classList.add('ready');
frame();
