// The Photo 101 Commons: a sunny voxel plaza in the hub's red and black.
// Support session room to the west, gallery pavilion to the east, the
// lecturer's desk under big pixel letters to the north, assignment kiosks
// and a tool corner either side of the notice board.

import * as THREE from 'three';
import { ASSIGNMENTS, TOOLS, GALLERY } from './semester.js';

const RED = '#e60028';
const INK = '#141414';

const mats = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts }));
  return mats.get(key);
}

export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  // redraw() repaints with the original painter, redraw(fn) with a new one
  const redraw = (painter = draw) => {
    painter(c.getContext('2d'), w, h);
    t.needsUpdate = true;
  };
  redraw();
  return { texture: t, redraw };
}

// A sign in the hub's type: condensed caps for headings, mono for detail.
export function drawSign(ctx, w, h, lines, { bg = '#0d0d0d', ink = '#ececec', accent = RED } = {}) {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, w, Math.round(h * 0.035));
  let y = h * 0.14;
  for (const [text, size, kind] of lines) {
    const font = kind === 'mono' ? '"JetBrains Mono", monospace'
      : kind === 'body' ? '"Source Sans 3", sans-serif'
      : '"Barlow Condensed", sans-serif';
    ctx.font = `${kind === 'head' || !kind ? 700 : 400} ${size}px ${font}`;
    ctx.fillStyle = kind === 'accent' ? accent : kind === 'mono' ? '#9c9c9c' : ink;
    if (kind === 'accent') ctx.font = `700 ${size}px "Barlow Condensed", sans-serif`;
    for (const line of wrap(ctx, text, w * 0.88)) {
      ctx.fillText(line, w * 0.06, y + size * 0.8);
      y += size * 1.18;
    }
    y += size * 0.25;
  }
}

function wrap(ctx, text, max) {
  const words = String(text).split(' ');
  const out = [];
  let line = '';
  for (const word of words) {
    const t = line ? line + ' ' + word : word;
    if (ctx.measureText(t).width > max && line) { out.push(line); line = word; } else line = t;
  }
  if (line) out.push(line);
  return out;
}

const GLYPHS = {
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
};

export function buildWorld(scene) {
  const colliders = []; // [x0, z0, x1, z1]
  const interactables = []; // { kind, id, label, stand, face, mesh, data }
  const loader = new THREE.TextureLoader();

  function box(w, h, d, color, x, y, z, parent = scene, { collide = false, shadow = true, m } = {}) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m || mat(color));
    mesh.position.set(x, y, z);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    parent.add(mesh);
    if (collide) colliders.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]);
    return mesh;
  }

  // ---- ground --------------------------------------------------------------
  const ground = new THREE.Group();
  scene.add(ground);
  const tiles = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#c9c6bf';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      ctx.fillStyle = `hsl(40, 6%, ${80 + ((i * 7 + j * 3) % 5)}%)`;
      ctx.fillRect(i * 64 + 2, j * 64 + 2, 60, 60);
    }
  });
  tiles.texture.wrapS = tiles.texture.wrapT = THREE.RepeatWrapping;
  tiles.texture.repeat.set(24, 9);
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(48, 18), new THREE.MeshStandardMaterial({ map: tiles.texture, roughness: 0.95 }));
  plaza.rotation.x = -Math.PI / 2;
  plaza.receiveShadow = true;
  ground.add(plaza);
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), mat('#7fae5a'));
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.y = -0.02;
  lawn.receiveShadow = true;
  scene.add(lawn);

  // hedges around the plaza
  const hedge = (x0, z0, x1, z1) => {
    const w = Math.max(0.6, Math.abs(x1 - x0));
    const d = Math.max(0.6, Math.abs(z1 - z0));
    box(w, 0.8, d, '#4f8a3a', (x0 + x1) / 2, 0.4, (z0 + z1) / 2, scene, { collide: true });
  };
  hedge(-24.3, -9.3, 24.3, -9.3);
  hedge(-24.3, 9.3, -3, 9.3);
  hedge(3, 9.3, 24.3, 9.3);
  hedge(-24.3, -9.3, -24.3, 9.3);
  hedge(24.3, -9.3, 24.3, 9.3);

  // ---- voxel trees and benches ------------------------------------------------
  const tree = (x, z, s = 1) => {
    box(0.4 * s, 1.6 * s, 0.4 * s, '#7a5232', x, 0.8 * s, z, scene, { collide: true });
    const greens = ['#3f8f3a', '#4ca043', '#378a35'];
    [[0, 2.0, 0, 1.6], [0.5, 2.6, 0.2, 1.0], [-0.4, 2.7, -0.3, 1.0], [0, 3.2, 0, 0.8]].forEach(([dx, dy, dz, sz], i) => {
      box(sz * s, sz * s, sz * s, greens[i % 3], x + dx * s, dy * s, z + dz * s);
    });
  };
  tree(-11, 7.6);
  tree(11, 7.6, 1.1);
  tree(-11, -7.8, 0.9);
  tree(11.2, -7.8);
  const bench = (x, z, rot = 0) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    scene.add(g);
    box(1.6, 0.1, 0.5, '#d9a441', 0, 0.45, 0, g);
    box(1.6, 0.4, 0.08, '#d9a441', 0, 0.7, -0.22, g);
    for (const sx of [-0.7, 0.7]) box(0.1, 0.45, 0.4, INK, sx, 0.22, 0, g);
    const quarter = Math.abs(Math.sin(rot)) > 0.5;
    colliders.push(quarter ? [x - 0.3, z - 0.85, x + 0.3, z + 0.85] : [x - 0.85, z - 0.3, x + 0.85, z + 0.3]);
  };
  bench(-3.5, 7.8);
  bench(3.5, 7.8);

  // ---- PHOTO 101 in red pixels, behind the lecturer's desk ----------------------
  const text = 'PHOTO 101';
  const px = 0.28;
  let cols = 0;
  for (const ch of text) cols += ch === ' ' ? 3 : 6;
  cols -= 1;
  const cubes = [];
  let cx = 0;
  for (const ch of text) {
    if (ch === ' ') { cx += 3; continue; }
    GLYPHS[ch].forEach((row, r) => {
      [...row].forEach((bit, c) => { if (bit === '1') cubes.push([cx + c, 6 - r]); });
    });
    cx += 6;
  }
  const letters = new THREE.InstancedMesh(new THREE.BoxGeometry(px * 0.94, px * 0.94, px * 0.94), mat(RED, { roughness: 0.5 }), cubes.length);
  const m4 = new THREE.Matrix4();
  cubes.forEach(([c, r], i) => {
    m4.makeTranslation(-cols * px / 2 + c * px, 0.6 + r * px, -8.55);
    letters.setMatrixAt(i, m4);
  });
  letters.castShadow = true;
  scene.add(letters);
  box(cols * px + 0.6, 0.45, 0.6, INK, 0, 0.22, -8.55, scene, { collide: true });

  // ---- the lecturer's desk -------------------------------------------------------
  const desk = new THREE.Group();
  desk.position.set(0, 0, -6.6);
  scene.add(desk);
  box(2.4, 0.1, 1.0, '#f2f2f2', 0, 0.85, 0, desk);
  box(2.3, 0.8, 0.9, INK, 0, 0.4, 0, desk);
  box(0.5, 0.35, 0.04, '#222', -0.6, 1.08, -0.15, desk); // laptop screen
  box(0.5, 0.02, 0.35, '#333', -0.6, 0.91, 0.05, desk);
  box(0.3, 0.2, 0.2, '#1c1c1c', 0.6, 1.0, 0, desk); // a camera
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 12), mat('#2a2a2a'));
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0.6, 1.0, 0.16);
  desk.add(lens);
  const plate = canvasTexture(512, 128, (ctx, w, h) => drawSign(ctx, w, h, [['CONSULTATIONS', 54], ['Bin Youn · Lecturer', 30, 'mono']]));
  const nameplate = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.35), new THREE.MeshStandardMaterial({ map: plate.texture }));
  nameplate.position.set(0, 0.5, 0.46);
  desk.add(nameplate);
  colliders.push([-1.25, -7.15, 1.25, -6.05]);
  interactables.push({ kind: 'desk', id: 'desk', label: 'Book a consultation', stand: [0, -5.3], face: 0, mesh: desk });

  // ---- notice board ------------------------------------------------------------------
  const notice = canvasTexture(1024, 640, () => {});
  const board = new THREE.Group();
  board.position.set(0, 0, 2.2);
  scene.add(board);
  box(3.4, 2.2, 0.15, INK, 0, 1.9, 0, board);
  for (const sx of [-1.5, 1.5]) box(0.15, 0.9, 0.15, INK, sx, 0.45, 0, board);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.0), new THREE.MeshStandardMaterial({ map: notice.texture, roughness: 0.9 }));
  face.position.set(0, 1.9, 0.08);
  board.add(face);
  const back = face.clone();
  back.rotation.y = Math.PI;
  back.position.z = -0.08;
  board.add(back);
  colliders.push([-1.75, 2.05, 1.75, 2.35]);
  interactables.push({ kind: 'notice', id: 'notice', label: 'Read the notice board', stand: [0, 3.4], face: 0, mesh: board });

  // ---- assignment kiosks (west of the plaza) ------------------------------------------
  ASSIGNMENTS.forEach((a, i) => {
    const z = -3.6 + i * 3.6;
    const g = new THREE.Group();
    g.position.set(-8, 0, z);
    g.rotation.y = Math.PI / 2; // screens face east, toward the plaza
    scene.add(g);
    box(0.5, 1.1, 0.5, INK, 0, 0.55, 0, g);
    const sign = canvasTexture(512, 400, (ctx, w, h) => drawSign(ctx, w, h, [[a.id, 150, 'accent'], [a.title, 44], [`${a.weight} · due ${a.due.slice(5).replace('-', '/')}`, 30, 'mono']]));
    const scr = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.86, 0.08), [mat(INK), mat(INK), mat(INK), mat(INK), new THREE.MeshStandardMaterial({ map: sign.texture }), mat(INK)]);
    scr.position.set(0, 1.5, 0);
    scr.rotation.x = -0.25;
    scr.castShadow = true;
    g.add(scr);
    colliders.push([-8.35, z - 0.35, -7.65, z + 0.35]);
    interactables.push({ kind: 'assignment', id: a.id, label: `${a.id}: ${a.title}`, stand: [-6.9, z], face: Math.PI / 2, mesh: g, data: a });
  });

  // ---- tool corner (east of the plaza) ---------------------------------------------------
  const toolProps = {
    checker(g) { box(0.5, 0.35, 0.3, '#1c1c1c', 0, 1.25, 0, g); const l = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 12), mat('#2a2a2a')); l.rotation.x = Math.PI / 2; l.position.set(0, 1.25, 0.25); g.add(l); },
    roadmap(g) { box(0.08, 1.6, 0.08, '#d9a441', 0, 1.3, 0, g); box(0.9, 0.25, 0.04, RED, 0.3, 1.8, 0, g); box(0.9, 0.25, 0.04, '#ececec', -0.3, 1.45, 0, g); },
    miro(g) { box(1.1, 0.8, 0.05, '#fafafa', 0, 1.45, 0, g); box(0.25, 0.25, 0.02, '#ffd02f', -0.25, 1.55, 0.04, g); box(0.25, 0.25, 0.02, '#4262ff', 0.15, 1.4, 0.04, g); },
    lightroom(g) { box(0.9, 0.6, 0.06, '#001e36', 0, 1.4, 0, g); box(0.4, 0.15, 0.02, '#31a8ff', 0, 1.42, 0.04, g); },
  };
  TOOLS.forEach((t, i) => {
    const z = -4.5 + i * 3;
    const g = new THREE.Group();
    g.position.set(8, 0, z);
    g.rotation.y = -Math.PI / 2; // facing west, toward the plaza
    scene.add(g);
    box(0.7, 1.0, 0.7, '#ececec', 0, 0.5, 0, g);
    box(0.72, 0.06, 0.72, RED, 0, 1.0, 0, g);
    toolProps[t.id](g);
    colliders.push([7.6, z - 0.4, 8.4, z + 0.4]);
    interactables.push({ kind: 'tool', id: t.id, label: `Open: ${t.title}`, stand: [6.9, z], face: -Math.PI / 2, mesh: g, data: t });
  });

  // ---- support session room (west) ----------------------------------------------------------
  const WALL = '#efefef';
  const wall = (x0, z0, x1, z1, h = 3) => {
    const w = Math.max(0.3, Math.abs(x1 - x0));
    const d = Math.max(0.3, Math.abs(z1 - z0));
    box(w, h, d, WALL, (x0 + x1) / 2, h / 2, (z0 + z1) / 2, scene, { collide: true });
    box(w + 0.02, 0.15, d + 0.02, RED, (x0 + x1) / 2, h, (z0 + z1) / 2);
  };
  const roomFloor = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 15), mat('#3a3a3a'));
  roomFloor.rotation.x = -Math.PI / 2;
  roomFloor.position.set(-18.25, 0.01, 0);
  roomFloor.receiveShadow = true;
  ground.add(roomFloor);
  wall(-23.5, -7.5, -13, -7.5);
  wall(-23.5, 7.5, -13, 7.5);
  wall(-23.5, -7.5, -23.5, 7.5);
  wall(-13, -7.5, -13, -1.4);
  wall(-13, 1.4, -13, 7.5);
  const roomSign = canvasTexture(512, 160, (ctx, w, h) => drawSign(ctx, w, h, [['SUPPORT SESSIONS', 64], ['Online, on Teams, via Canvas', 30, 'mono']]));
  const rs = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.75), new THREE.MeshStandardMaterial({ map: roomSign.texture }));
  rs.position.set(-12.83, 2.45, 2.6);
  rs.rotation.y = Math.PI / 2;
  scene.add(rs);
  // the door slides open on session days
  const doorMesh = box(0.2, 2.6, 2.8, RED, -13, 1.3, 0);
  const doorCollider = [-13.15, -1.4, -12.85, 1.4];
  const door = {
    open: false,
    set(open) {
      this.open = open;
      const i = colliders.indexOf(doorCollider);
      if (open && i >= 0) colliders.splice(i, 1);
      if (!open && i < 0) colliders.push(doorCollider);
    },
    animate(dt) {
      const target = this.open ? 2.75 : 0;
      doorMesh.position.z += (target - doorMesh.position.z) * Math.min(1, dt * 3);
    },
  };
  door.set(false);
  interactables.push({ kind: 'door', id: 'door', label: 'Support sessions', stand: [-11.9, 0], face: Math.PI / 2, mesh: doorMesh });
  // inside: the big screen and rows of seats
  const screen = canvasTexture(1024, 576, () => {});
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.6), new THREE.MeshBasicMaterial({ map: screen.texture }));
  scr.position.set(-23.3, 2.0, 0);
  scr.rotation.y = Math.PI / 2;
  scene.add(scr);
  for (let r = 0; r < 3; r++) {
    for (const z of [-4.2, -1.8, 1.8, 4.2]) {
      const x = -20.5 + r * 2.2;
      box(0.6, 0.45, 0.6, ['#e60028', '#ececec', '#262626'][r], x, 0.22, z, scene, { collide: true });
    }
  }
  interactables.push({ kind: 'screen', id: 'screen', label: 'The session screen', stand: [-21.6, 0], face: Math.PI / 2, mesh: scr });

  // ---- gallery pavilion (east) ------------------------------------------------------------------
  const gFloor = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 15), mat('#f4f4f4'));
  gFloor.rotation.x = -Math.PI / 2;
  gFloor.position.set(18.25, 0.01, 0);
  gFloor.receiveShadow = true;
  ground.add(gFloor);
  wall(13, -7.5, 23.5, -7.5);
  wall(13, 7.5, 23.5, 7.5);
  wall(23.5, -7.5, 23.5, 7.5);
  const gSign = canvasTexture(512, 160, (ctx, w, h) => drawSign(ctx, w, h, [['STUDENT WORK', 64], ['Out in the world', 30, 'mono']]));
  const gs = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.75), new THREE.MeshStandardMaterial({ map: gSign.texture }));
  gs.position.set(14.6, 2.45, -7.3);
  scene.add(gs);
  const spots = [
    [15.5, -7.32, 0], [18.5, -7.32, 0], [21.5, -7.32, 0],
    [23.32, -2.6, -Math.PI / 2], [23.32, 2.6, -Math.PI / 2],
    [15.5, 7.32, Math.PI], [18.5, 7.32, Math.PI], [21.5, 7.32, Math.PI],
  ];
  GALLERY.forEach(([file, title, artist], i) => {
    const [x, z, rot] = spots[i];
    const g = new THREE.Group();
    g.position.set(x, 1.65, z);
    g.rotation.y = rot;
    scene.add(g);
    const frame = box(1.9, 1.4, 0.06, INK, 0, 0, 0, g);
    const tex = loader.load(`../image/${file}`, (t) => {
      const a = t.image.width / t.image.height;
      const w = a >= 1.3 ? 1.76 : 1.26 * a;
      const h = a >= 1.3 ? 1.76 / a : 1.26;
      pic.scale.set(w, h, 1);
    });
    tex.colorSpace = THREE.SRGBColorSpace;
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
    pic.position.z = 0.04;
    pic.scale.set(1.76, 1.26, 1);
    g.add(pic);
    const nx = Math.sin(rot);
    const nz = Math.cos(rot);
    interactables.push({ kind: 'art', id: file, label: `${title}, ${artist}`, stand: [x + nx * 1.4, z + nz * 1.4], face: rot, mesh: g, data: { file, title, artist } });
    void frame;
  });

  return { colliders, interactables, ground, notice, screen, door };
}

// ---------------------------------------------------------------------------
// Hunt items: tiny voxel still lifes that float, spin and glint.

const KINDS = {
  lens: [[0.3, 0.3, 0.3, '#1c1c1c', 0, 0, 0], [0.22, 0.22, 0.12, '#7fd3ff', 0, 0, 0.2]],
  stopwatch: [[0.32, 0.32, 0.1, '#ececec', 0, 0, 0], [0.08, 0.1, 0.08, RED, 0, 0.2, 0], [0.03, 0.12, 0.02, INK, 0, 0.04, 0.06]],
  meter: [[0.22, 0.34, 0.12, '#1c1c1c', 0, 0, 0], [0.16, 0.1, 0.02, '#cfe8c8', 0, 0.06, 0.07], [0.12, 0.12, 0.06, '#f4f4f4', 0, 0.2, 0]],
  tripod: [[0.06, 0.5, 0.06, '#333', -0.12, -0.1, 0], [0.06, 0.5, 0.06, '#333', 0.12, -0.1, 0], [0.06, 0.5, 0.06, '#333', 0, -0.1, -0.12], [0.24, 0.08, 0.24, '#1c1c1c', 0, 0.18, 0]],
  frame: [[0.4, 0.06, 0.04, INK, 0, 0.17, 0], [0.4, 0.06, 0.04, INK, 0, -0.17, 0], [0.06, 0.4, 0.04, INK, 0.17, 0, 0], [0.06, 0.4, 0.04, INK, -0.17, 0, 0]],
  reflector: [[0.42, 0.42, 0.03, '#f5c400', 0, 0, 0]],
  sun: [[0.3, 0.3, 0.3, '#ffcf3a', 0, 0, 0], [0.5, 0.06, 0.06, '#ffb300', 0, 0, 0], [0.06, 0.5, 0.06, '#ffb300', 0, 0, 0]],
  slider: [[0.5, 0.05, 0.05, '#888', 0, 0, 0], [0.08, 0.16, 0.08, '#31a8ff', 0.08, 0, 0]],
  apple: [[0.28, 0.28, 0.28, RED, 0, 0, 0], [0.04, 0.1, 0.04, '#5b3a1e', 0, 0.18, 0], [0.1, 0.03, 0.06, '#3f8f3a', 0.06, 0.2, 0]],
  chair: [[0.3, 0.05, 0.3, '#d9a441', 0, 0, 0], [0.3, 0.3, 0.05, '#d9a441', 0, 0.16, -0.13], [0.05, 0.25, 0.05, INK, -0.12, -0.14, 0.12], [0.05, 0.25, 0.05, INK, 0.12, -0.14, 0.12]],
  shoe: [[0.4, 0.14, 0.18, '#ececec', 0, 0, 0], [0.18, 0.14, 0.18, '#ececec', -0.11, 0.12, 0], [0.42, 0.04, 0.2, RED, 0, -0.08, 0]],
  loupe: [[0.26, 0.26, 0.06, '#7fd3ff', 0, 0.06, 0], [0.06, 0.22, 0.06, INK, 0, -0.18, 0]],
  board: [[0.46, 0.34, 0.03, '#d6b98c', 0, 0, 0], [0.12, 0.12, 0.02, RED, -0.1, 0.05, 0.02], [0.12, 0.1, 0.02, '#4262ff', 0.1, -0.05, 0.02]],
  card: [[0.26, 0.34, 0.04, '#1c1c1c', 0, 0, 0], [0.2, 0.08, 0.02, RED, 0, 0.08, 0.03]],
  film: [[0.18, 0.3, 0.18, '#f5c400', 0, 0, 0], [0.12, 0.06, 0.12, '#1c1c1c', 0, 0.18, 0]],
  calendar: [[0.36, 0.34, 0.04, '#fafafa', 0, 0, 0], [0.36, 0.08, 0.05, RED, 0, 0.15, 0]],
};

export function makeItem(kind) {
  const g = new THREE.Group();
  for (const [w, h, d, color, x, y, z] of KINDS[kind] || KINDS.lens) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, { roughness: 0.5 }));
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
  }
  g.scale.setScalar(1.3);
  const glow = new THREE.PointLight(0xffd36b, 2, 2.5, 2);
  g.add(glow);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.025, 6, 24), new THREE.MeshBasicMaterial({ color: RED }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.55;
  g.add(ring);
  return g;
}

// Places a set's four items can hide, around the Commons
export const HIDING = [
  [-11.9, -5.2], // outside the support room, north
  [20.5, 0.0],   // gallery, in front of the east wall
  [-9.6, 7.9],   // under the west tree
  [4.8, -7.9],   // beside the big letters
  [-4.5, -1.5],  // open plaza
  [10.6, 6.2],   // tool corner, south
  [-11.9, 5.0],  // outside the support room, south
  [15.0, 4.6],   // gallery, south side
];
