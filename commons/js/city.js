// The city grows south of the Commons. Through the gap in the square's south
// hedge runs Main Street: the Club Hall on the west side, where people meet
// and take a group photo together, and the Gallery on the east side, which
// hangs a show of work picked by the teaching team. Further down, the Camera
// Shop, where you pick the camera you carry as your head, and one lot
// waiting for whatever the city needs next. Main Street ends at the Meeting
// Point: maps of Saigon and Hanoi on the ground where photo walk plans stand
// as flags, an Online island, a campfire to sit around, and an ideas wall.

import * as THREE from 'three';
import { mat, canvasTexture, drawSign } from './world.js';
import { currentShow, showDir, SLOTS } from './shows.js';
import { PLACES, TAGS } from './walks.js';
import { CAMERAS, cameraHead } from './avatar.js';

const RED = '#e60028';
const INK = '#141414';

// Where things are, for main.js: walkable ground and the two buildings
export const SOUTH = { x0: -22.2, z0: 8.5, x1: 22.2, z1: 58.2 };
export const FIRE = { x: 16.4, z: 54.6 };
export const HALL = { x0: -21, z0: 13, x1: -5, z1: 29 };
export const STAGE = { x0: -20.3, z0: 16.6, x1: -14.5, z1: 25.4 };
export const GALLERY = { x0: 5, z0: 13, x1: 21, z1: 29 };
export const SHOP = { x0: 5, z0: 32.5, x1: 21, z1: 43.8 };

// What each camera is like for Photo 101. The Camera Checker has the detail.
export const CAMERA_NOTES = {
  phone: 'Check that your camera app has a Pro or manual mode, so you can set shutter speed and ISO yourself. Many phones have a fixed aperture: the Camera Checker explains what that means for the assignments.',
  compact: 'Small enough for a pocket. Look for a manual (M) mode, or shutter and aperture priority, so you can control the exposure.',
  dslr: 'Interchangeable lenses, an optical viewfinder and full manual control. It covers everything Photo 101 asks for.',
  mirrorless: 'Interchangeable lenses and full manual control in a lighter body. The electronic viewfinder previews your exposure before you press the shutter.',
  bridge: 'A long built-in zoom and, on most models, full manual control. Handy for subjects you cannot get close to.',
  film: 'A film SLR with manual control. Every frame costs film and processing, so slow down and meter carefully. You will need scans to submit on Canvas.',
  instant: 'The print comes out of the camera. Exposure control is limited, so check the Camera Checker before using one for an assignment.',
  tlr: 'A medium-format film camera you look down into from the top, with square frames. Slow and deliberate. You will need scans to submit on Canvas.',
};
export const inside = (r, x, z) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1;

export function buildCity(scene, { colliders, interactables, ground }) {
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
  function floor(w, d, color, x, z, y = 0.01, map) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), map ? new THREE.MeshStandardMaterial({ map, roughness: 0.95 }) : mat(color));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    m.receiveShadow = true;
    ground.add(m);
    return m;
  }
  function wall(x0, z0, x1, z1, colour = '#efefef', cap = RED, h = 3, m) {
    const w = Math.max(0.3, Math.abs(x1 - x0));
    const d = Math.max(0.3, Math.abs(z1 - z0));
    box(w, h, d, colour, (x0 + x1) / 2, h / 2, (z0 + z1) / 2, scene, { collide: true, m });
    box(w + 0.02, 0.15, d + 0.02, cap, (x0 + x1) / 2, h, (z0 + z1) / 2);
  }
  function sign(w, h, lines, opts, x, y, z, rot, size = [512, Math.round(512 * h / w)]) {
    const tex = canvasTexture(size[0], size[1], (ctx, cw, ch) => drawSign(ctx, cw, ch, lines, opts));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex.texture }));
    m.position.set(x, y, z);
    m.rotation.y = rot;
    scene.add(m);
    return { mesh: m, ...tex };
  }

  // ---- Main Street -------------------------------------------------------------
  const paving = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#b9b2a6';
    ctx.fillRect(0, 0, w, h);
    for (let j = 0; j < 8; j++) for (let i = 0; i < 4; i++) {
      ctx.fillStyle = `hsl(32, 10%, ${70 + ((i * 5 + j * 3) % 4) * 2}%)`;
      ctx.fillRect(i * 64 + (j % 2) * 32 + 2, j * 32 + 2, 60, 28);
    }
  });
  paving.texture.wrapS = paving.texture.wrapT = THREE.RepeatWrapping;
  paving.texture.repeat.set(44 / 4, 50 / 4);
  floor(44.4, 50, '', 0, 33.7, 0.005, paving.texture);
  const street = canvasTexture(64, 256, (ctx, w, h) => {
    ctx.fillStyle = '#4a4a4d';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f5c400';
    for (let y = 0; y < h; y += 64) ctx.fillRect(w / 2 - 2, y + 8, 4, 36);
  });
  street.texture.wrapT = THREE.RepeatWrapping;
  street.texture.repeat.set(1, 36 / 6);
  floor(5, 35.4, '', 0, 27, 0.012, street.texture);

  // hedges around the city edge (the square's south hedge is the north edge)
  const hedge = (x0, z0, x1, z1) => box(Math.max(0.6, x1 - x0), 0.8, Math.max(0.6, z1 - z0), '#4f8a3a', (x0 + x1) / 2, 0.4, (z0 + z1) / 2, scene, { collide: true });
  hedge(-23.1, 9.3, -22.5, 59.1);
  hedge(22.5, 9.3, 23.1, 59.1);
  hedge(-23.1, 58.8, 23.1, 59.4);

  // street lamps and a few trees
  const lamp = (x, z) => {
    box(0.14, 3.2, 0.14, INK, x, 1.6, z, scene, { collide: true });
    box(0.5, 0.12, 0.5, INK, x, 3.25, z);
    box(0.36, 0.18, 0.36, '#fff3c4', x, 3.1, z, scene, { m: mat('#fff3c4', { emissive: '#ffe08a', emissiveIntensity: 0.6 }) });
  };
  for (const z of [11.5, 18.5, 25.5, 32.5, 39.5]) { lamp(-3.2, z); lamp(3.2, z); }
  const tree = (x, z, s = 1) => {
    box(0.4 * s, 1.6 * s, 0.4 * s, '#7a5232', x, 0.8 * s, z, scene, { collide: true });
    [[0, 2.0, 0, 1.6, '#3f8f3a'], [0.5, 2.6, 0.2, 1.0, '#4ca043'], [-0.4, 2.7, -0.3, 1.0, '#378a35'], [0, 3.2, 0, 0.8, '#3f8f3a']]
      .forEach(([dx, dy, dz, sz, c]) => box(sz * s, sz * s, sz * s, c, x + dx * s, dy * s, z + dz * s));
  };
  tree(-20.5, 10.8, 0.9);
  tree(20.5, 10.8);
  tree(-4.2, 30.5, 0.8);
  tree(4.2, 30.5, 0.85);

  // the signpost just through the gate, read by people walking south
  const post = new THREE.Group();
  post.position.set(-4.4, 0, 11.4);
  scene.add(post);
  box(0.16, 2.6, 0.16, INK, 0, 1.3, 0, post);
  const arrow = (text, y, west) => {
    const tex = canvasTexture(512, 128, (ctx, w, h) => {
      ctx.fillStyle = west ? '#f5c400' : '#ececec';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = INK;
      ctx.font = '700 72px "Barlow Condensed", sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = west ? 'right' : 'left';
      // facing south, west is on your right
      ctx.fillText(west ? `${text}  >` : `<  ${text}`, west ? w - 28 : 28, h / 2 + 4);
    });
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.36, 0.06), [mat(INK), mat(INK), mat(INK), mat(INK), mat(INK), new THREE.MeshStandardMaterial({ map: tex.texture })]);
    m.position.set(west ? -0.5 : 0.5, y, 0);
    m.castShadow = true;
    post.add(m);
  };
  arrow('GALLERY', 2.3, false);
  arrow('CLUB HALL', 1.85, true);
  arrow('CAMERA SHOP', 1.4, false);
  colliders.push([-4.55, 11.25, -4.25, 11.55]);
  interactables.push({ kind: 'signpost', id: 'signpost', label: 'Read the signpost', stand: [-3.6, 10.4], face: 2.5, mesh: post });

  // ---- the Club Hall (west) ----------------------------------------------------------
  const H = HALL;
  const wood = canvasTexture(256, 256, (ctx, w, h) => {
    for (let j = 0; j < 8; j++) {
      ctx.fillStyle = `hsl(28, 45%, ${40 + (j * 7) % 9}%)`;
      ctx.fillRect(0, j * 32, w, 31);
    }
  });
  wood.texture.wrapS = wood.texture.wrapT = THREE.RepeatWrapping;
  wood.texture.repeat.set(4, 4);
  floor(H.x1 - H.x0, H.z1 - H.z0, '', (H.x0 + H.x1) / 2, (H.z0 + H.z1) / 2, 0.02, wood.texture);
  const CLUB_WALL = '#2b2d42';
  wall(H.x0, H.z0, H.x1, H.z0, CLUB_WALL, '#f5c400');
  wall(H.x0, H.z1, H.x1, H.z1, CLUB_WALL, '#f5c400');
  wall(H.x0, H.z0, H.x0, H.z1, CLUB_WALL, '#f5c400');
  wall(H.x1, H.z0, H.x1, 19.5, CLUB_WALL, '#f5c400');
  wall(H.x1, 22.5, H.x1, H.z1, CLUB_WALL, '#f5c400');
  sign(3.2, 0.8, [['CLUB HALL', 68], ['Meet up. Group photo inside.', 30, 'mono']], { bg: CLUB_WALL, accent: '#f5c400' }, H.x1 + 0.17, 2.35, 24.4, Math.PI / 2);

  // string lights across the hall
  const bulbColours = ['#ffd36b', '#ff6b6b', '#7fd3ff', '#9be36b'];
  const wire = new THREE.LineBasicMaterial({ color: '#1c1c1c' });
  for (let k = 0; k < 4; k++) {
    const z = 15 + k * 4;
    const pts = [];
    for (let i = 0; i <= 28; i++) {
      const x = H.x0 + 0.1 + i * (H.x1 - H.x0 - 0.2) / 28;
      const y = 2.95 - Math.sin((i / 28) * Math.PI) * 0.55;
      pts.push(new THREE.Vector3(x, y, z));
      if (i % 2 && i < 28) box(0.12, 0.12, 0.12, '', x, y - 0.08, z, scene, { shadow: false, m: mat(bulbColours[(i + k) % 4], { emissive: bulbColours[(i + k) % 4], emissiveIntensity: 0.9 }) });
    }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wire));
  }

  // the backdrop: a paper sweep with the club banner, along the west wall
  const sweep = new THREE.Group();
  scene.add(sweep);
  box(0.06, 4.2, 11.6, '#efe6d2', H.x0 + 0.35, 2.1, 21, sweep);
  box(1.6, 0.04, 11.6, '#efe6d2', H.x0 + 1.15, 0.03, 21, sweep);
  box(0.26, 0.26, 12.2, '#d9cfb8', H.x0 + 0.4, 4.3, 21, sweep);
  for (const z of [14.9, 27.1]) box(0.08, 4.4, 0.08, INK, H.x0 + 0.4, 2.2, z, sweep);
  sign(6, 0.75, [['PHOTO 101 CLUB', 82]], { bg: RED, ink: '#fff', accent: '#f5c400' }, H.x0 + 0.4, 3.55, 21, Math.PI / 2, [1024, 128]);
  // tape marks on the floor in front of the backdrop
  const tape = (w, d, x, z) => box(w, 0.015, d, '', x, 0.03, z, scene, { shadow: false, m: mat('#f5c400') });
  tape(STAGE.x1 - STAGE.x0, 0.08, (STAGE.x0 + STAGE.x1) / 2, STAGE.z0);
  tape(STAGE.x1 - STAGE.x0, 0.08, (STAGE.x0 + STAGE.x1) / 2, STAGE.z1);
  tape(0.08, STAGE.z1 - STAGE.z0, STAGE.x1, (STAGE.z0 + STAGE.z1) / 2);
  floor(STAGE.x1 - STAGE.x0, STAGE.z1 - STAGE.z0, '#d8cdb4', (STAGE.x0 + STAGE.x1) / 2, (STAGE.z0 + STAGE.z1) / 2, 0.025);

  // two softboxes
  const softbox = (x, z, rot) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    scene.add(g);
    box(0.08, 2.0, 0.08, INK, 0, 1.0, 0, g);
    box(0.9, 0.9, 0.35, INK, 0, 2.1, 0, g);
    box(0.84, 0.84, 0.02, '', 0, 2.1, 0.18, g, { m: mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.7 }) });
    colliders.push([x - 0.3, z - 0.3, x + 0.3, z + 0.3]);
  };
  softbox(-13.2, 15.0, -2.3);
  softbox(-13.2, 27.0, -0.85);

  // the studio camera on its tripod, facing the backdrop
  const cam = new THREE.Group();
  cam.position.set(-11.2, 0, 21);
  scene.add(cam);
  for (const [dx, dz] of [[0.3, 0], [-0.18, 0.26], [-0.18, -0.26]]) {
    const leg = box(0.05, 1.5, 0.05, INK, dx * 0.5, 0.72, dz * 0.5, cam);
    leg.rotation.set(dz * 0.5, 0, -dx * 0.5);
  }
  box(0.5, 0.42, 0.62, '#1c1c1c', 0, 1.62, 0, cam);
  box(0.24, 0.12, 0.3, '#1c1c1c', 0, 1.9, 0, cam);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.4, 14), mat('#2a2a2a'));
  lens.rotation.z = Math.PI / 2;
  lens.position.set(-0.42, 1.6, 0);
  lens.castShadow = true;
  cam.add(lens);
  const tallyMat = new THREE.MeshStandardMaterial({ color: '#550010', emissive: RED, emissiveIntensity: 0 });
  box(0.08, 0.08, 0.08, '', -0.2, 1.88, 0.2, cam, { m: tallyMat });
  colliders.push([-11.65, 20.55, -10.75, 21.45]);
  interactables.push({ kind: 'shutter', id: 'shutter', label: 'Group photo: set the timer', stand: [-10.1, 21], face: Math.PI / 2, mesh: cam });

  // the lens the group photo is actually taken through: wide enough for
  // everyone on the paper, about chest height
  const lensCam = new THREE.PerspectiveCamera(41, 2, 0.1, 60);
  lensCam.position.set(-11.7, 1.45, 21);
  lensCam.lookAt(-20, 1.55, 21);

  // sofas along the south wall, and the club's own wall on the north side
  const sofa = (x, z, colour) => {
    box(2.2, 0.45, 0.9, colour, x, 0.3, z, scene, { collide: true });
    box(2.2, 0.55, 0.22, colour, x, 0.75, z + 0.36);
    for (const sx of [-1.05, 1.05]) box(0.2, 0.35, 0.9, colour, x + sx, 0.6, z);
  };
  sofa(-11, 27.9, '#3d5afe');
  sofa(-7.4, 27.9, '#ff8a00');
  // the photo walk board above the sofas: plans to go and shoot together
  const walkBoard = canvasTexture(1024, 336, () => {});
  const cork = new THREE.Group();
  cork.position.set(-9.2, 2.05, H.z1 - 0.2);
  cork.rotation.y = Math.PI;
  scene.add(cork);
  box(4.8, 1.7, 0.06, '#f5c400', 0, 0, 0, cork);
  const corkFace = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.5), new THREE.MeshStandardMaterial({ map: walkBoard.texture }));
  corkFace.position.z = 0.04;
  cork.add(corkFace);
  interactables.push({ kind: 'walks', id: 'walks', label: 'Photo walks: find people to shoot with', stand: [-9.2, 26.6], face: Math.PI, mesh: cork });
  const paintBoard = (cards, tagLabel, cityLabel) => walkBoard.redraw((ctx, w, h) => {
    ctx.fillStyle = '#b98a55';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#141414';
    ctx.font = '700 54px "Barlow Condensed", sans-serif';
    ctx.fillText('PHOTO WALKS', 24, 60);
    ctx.font = '400 24px "JetBrains Mono", monospace';
    ctx.fillText(cards.length ? `${cards.length} plan${cards.length === 1 ? '' : 's'} pinned. Find people to shoot with.` : 'Nothing pinned yet. Post a plan to shoot together.', 26, 96);
    cards.slice(0, 4).forEach((c, i) => {
      const x = 24 + i * 248;
      ctx.save();
      ctx.translate(x + 110, 222);
      ctx.rotate(((i % 2) - 0.5) * 0.06);
      ctx.fillStyle = '#fffdf6';
      ctx.fillRect(-110, -95, 220, 200);
      ctx.fillStyle = c.ink || '#e60028';
      ctx.fillRect(-110, -95, 220, 10);
      ctx.fillStyle = '#e60028';
      ctx.beginPath();
      ctx.arc(0, -80, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#141414';
      ctx.font = '700 34px "Barlow Condensed", sans-serif';
      ctx.fillText(c.name.slice(0, 14), -96, -38);
      ctx.font = '400 22px "Source Sans 3", sans-serif';
      ctx.fillText(cityLabel(c.city), -96, -6);
      ctx.fillStyle = '#555';
      c.tags.forEach((t, k) => ctx.fillText(tagLabel(t), -96, 26 + k * 24));
      ctx.restore();
    });
  });
  paintBoard([], (t) => t, (c) => c);
  sign(3.0, 2.0, [
    ['GROUP PHOTO', 60],
    ['1  Set the timer on the camera.', 30, 'body'],
    ['2  Stand on the cream paper.', 30, 'body'],
    ['3  Strike a pose: keys 1 to 5.', 30, 'body'],
    ['Everyone in the hall gets the photo.', 24, 'mono'],
  ], { bg: CLUB_WALL, accent: '#f5c400' }, -15.6, 1.7, H.z0 + 0.17, 0);
  // the last group photo taken here, in this browser only
  const lastPhoto = canvasTexture(768, 576, (ctx, w, h) => {
    ctx.fillStyle = '#f7f5f0';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#9c9c9c';
    ctx.font = '400 30px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Your group photo', w / 2, h / 2 - 10);
    ctx.fillText('will hang here', w / 2, h / 2 + 30);
  });
  const photoFrame = new THREE.Group();
  photoFrame.position.set(-10.2, 1.7, H.z0 + 0.2);
  scene.add(photoFrame);
  box(2.6, 2.0, 0.06, '#f5c400', 0, 0, 0, photoFrame);
  const photoFace = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.8), new THREE.MeshBasicMaterial({ map: lastPhoto.texture, toneMapped: false }));
  photoFace.position.z = 0.04;
  photoFrame.add(photoFace);
  interactables.push({ kind: 'lastphoto', id: 'lastphoto', label: 'Your last group photo', stand: [-10.2, 14.6], face: 0, mesh: photoFrame });

  // ---- the Gallery (east) ---------------------------------------------------------------
  const G = GALLERY;
  const show = currentShow(new Date(new URLSearchParams(location.search).get('now') || Date.now()));
  floor(G.x1 - G.x0, G.z1 - G.z0, '#e3dccf', (G.x0 + G.x1) / 2, (G.z0 + G.z1) / 2, 0.02);
  // white cube: a little self-light so the walls stay white in the shade
  const white = mat('#f7f7f5', { emissive: '#ffffff', emissiveIntensity: 0.22 });
  wall(G.x0, G.z0, G.x1, G.z0, '', INK, 3, white);
  wall(G.x0, G.z1, G.x1, G.z1, '', INK, 3, white);
  wall(G.x1, G.z0, G.x1, G.z1, '', INK, 3, white);
  wall(G.x0, G.z0, G.x0, 19.5, '', INK, 3, white);
  wall(G.x0, 22.5, G.x0, G.z1, '', INK, 3, white);
  sign(3.2, 0.8, [['GALLERY', 68], [show ? `Now showing: ${show.title}` : 'Next show coming soon', 30, 'mono']], {}, G.x0 - 0.17, 2.35, 17.6, -Math.PI / 2);
  // a long bench in the middle of the room
  box(3.2, 0.45, 0.7, '#d9a441', 13.6, 0.23, 21, scene, { collide: true });

  // the title wall, just inside the door
  const titleLines = show ? [
    [show.title.toUpperCase(), 70],
    [`Curated by ${show.curator}`, 34, 'accent'],
    [show.note, 27, 'body'],
  ] : [
    ['NEXT SHOW', 70],
    ['Being hung', 34, 'accent'],
    ['The teaching team picks work by Photo 101 students for each show. Keep shooting.', 30, 'body'],
  ];
  const titleWall = sign(4.4, 2.6, titleLines, { bg: '#f7f7f5', ink: INK, accent: RED }, G.x0 + 0.17, 1.75, 25.8, Math.PI / 2, [880, 520]);
  interactables.push({ kind: 'curator', id: 'curator', label: show ? `About the show: ${show.title}` : 'About the gallery', stand: [6.6, 25.8], face: Math.PI / 2, mesh: titleWall.mesh, data: show });

  // twelve places to hang, middle of each wall first
  const north = [11.2, 14.8, 7.6, 18.4].map((x) => [x, G.z0 + 0.17, 0]);
  const east = [19.2, 22.8, 15.6, 26.4].map((z) => [G.x1 - 0.17, z, -Math.PI / 2]);
  const south = [14.8, 11.2, 18.4, 7.6].map((x) => [x, G.z1 - 0.17, Math.PI]);
  const slots = [east[0], east[1], north[0], north[1], south[0], south[1], east[2], east[3], north[2], north[3], south[2], south[3]];
  if (show) {
    show.works.slice(0, SLOTS).forEach((work, i) => {
      const [x, z, rot] = slots[i];
      const g = new THREE.Group();
      g.position.set(x, 1.65, z);
      g.rotation.y = rot;
      scene.add(g);
      const frame = box(2.36, 1.76, 0.05, INK, 0, 0, 0, g);
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#ddd', toneMapped: false }));
      pic.position.z = 0.035;
      pic.scale.set(2.2, 1.6, 1);
      g.add(pic);
      const label = canvasTexture(384, 120, (ctx, w, h) => {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = INK;
        ctx.font = '700 40px "Barlow Condensed", sans-serif';
        ctx.fillText(work.title.length > 26 ? work.title.slice(0, 25) + '…' : work.title, 16, 50);
        ctx.fillStyle = '#555';
        ctx.font = '400 26px "Source Sans 3", sans-serif';
        ctx.fillText(work.artist, 16, 92);
      });
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.25), new THREE.MeshStandardMaterial({ map: label.texture }));
      plate.position.set(0, -1.12, 0.01);
      g.add(plate);
      loader.load(showDir(show) + work.file, (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        const a = t.image.width / t.image.height;
        const w = a >= 2.2 / 1.6 ? 2.2 : 1.6 * a;
        const h = a >= 2.2 / 1.6 ? 2.2 / a : 1.6;
        pic.material.map = t;
        pic.material.color.set('#fff');
        pic.material.needsUpdate = true;
        pic.scale.set(w, h, 1);
        frame.scale.set((w + 0.16) / 2.36, (h + 0.16) / 1.76, 1);
        plate.position.y = -h / 2 - 0.3;
      });
      interactables.push({ kind: 'work', id: `work-${i}`, label: `${work.title}, ${work.artist}`, stand: [x + Math.sin(rot) * 1.6, z + Math.cos(rot) * 1.6], face: rot, mesh: g, data: work });
    });
  }

  // ---- two lots, waiting --------------------------------------------------------------------
  const lot = (x0, z0, x1, z1, signX, rot) => {
    floor(x1 - x0, z1 - z0, '#b59a72', (x0 + x1) / 2, (z0 + z1) / 2, 0.015);
    const fence = (ax, az, bx, bz) => {
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.round(len / 1.2);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const along = Math.abs(bx - ax) > Math.abs(bz - az);
        box(along ? 1.1 : 0.12, 0.8, along ? 0.12 : 1.1, i % 2 ? '#ececec' : '#ff8a00', ax + (bx - ax) * t, 0.4, az + (bz - az) * t);
      }
      colliders.push([Math.min(ax, bx) - 0.1, Math.min(az, bz) - 0.1, Math.max(ax, bx) + 0.1, Math.max(az, bz) + 0.1]);
    };
    fence(x0, z0, x1, z0);
    fence(x0, z1, x1, z1);
    fence(x0, z0, x0, z1);
    fence(x1, z0, x1, z1);
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    for (const [dx, dz, s] of [[-2, -1, 1], [-1.1, -1.4, 0.7], [2.4, 2, 0.9]]) box(s, s, s, '#a0784a', cx + dx, s / 2, cz + dz);
    box(0.4, 0.6, 0.4, '#ff8a00', cx + 1, 0.3, cz - 2.5);
    const s = sign(2.6, 1.0, [['COMING SOON', 64], ['The next place in the city', 30, 'mono']], { accent: '#ff8a00' }, signX, 1.4, cz, rot);
    box(0.1, 0.9, 0.1, INK, signX, 0.45, cz);
    interactables.push({ kind: 'lot', id: `lot-${x0}`, label: 'An empty lot', stand: [signX + Math.sin(rot) * 1.2, cz], face: rot, mesh: s.mesh });
  };
  lot(-21, 32.5, -5, 43.8, -4.8, Math.PI / 2);

  // ---- the Camera Shop (east, past the Gallery) ----------------------------------------------
  const S = SHOP;
  floor(S.x1 - S.x0, S.z1 - S.z0, '#2a2a2a', (S.x0 + S.x1) / 2, (S.z0 + S.z1) / 2, 0.02);
  wall(S.x0, S.z0, S.x1, S.z0, '#ececec', RED);
  wall(S.x0, S.z1, S.x1, S.z1, '#ececec', RED);
  wall(S.x1, S.z0, S.x1, S.z1, '#ececec', RED);
  wall(S.x0, S.z0, S.x0, 36.6, '#ececec', RED);
  wall(S.x0, 39.6, S.x0, S.z1, '#ececec', RED);
  sign(3.2, 0.8, [['CAMERA SHOP', 68], ['Pick the camera you shoot with', 28, 'mono']], {}, S.x0 - 0.17, 2.35, 34.6, -Math.PI / 2);
  // a red stripe of shop window along the street side
  box(0.04, 0.5, 2.6, '', S.x0 - 0.17, 1.4, 42, scene, { m: mat('#7fd3ff', { roughness: 0.1, metalness: 0.3 }) });
  box(0.04, 0.5, 2.6, '', S.x0 - 0.17, 1.4, 34.4, scene, { shadow: false, m: mat('#7fd3ff', { roughness: 0.1, metalness: 0.3 }) });
  const displays = [];
  CAMERAS.forEach((c, i) => {
    const north = i < 4;
    const x = 8 + (i % 4) * 3.5;
    const z = north ? S.z0 + 1.3 : S.z1 - 1.3;
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    scene.add(g);
    box(0.8, 1.0, 0.8, '#f4f4f4', 0, 0.5, 0, g);
    box(0.82, 0.05, 0.82, RED, 0, 1.0, 0, g);
    const head = cameraHead(c.id);
    head.scale.setScalar(1.5);
    head.position.y = 1.45;
    g.add(head);
    displays.push(head);
    const tag = canvasTexture(256, 72, (ctx, w, h) => {
      ctx.fillStyle = '#141414';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fff';
      ctx.font = '700 44px "Barlow Condensed", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(c.label.toUpperCase(), w / 2, 52);
    });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.2), new THREE.MeshStandardMaterial({ map: tag.texture }));
    plate.position.set(0, 0.7, north ? 0.41 : -0.41);
    if (!north) plate.rotation.y = Math.PI;
    g.add(plate);
    colliders.push([x - 0.45, z - 0.45, x + 0.45, z + 0.45]);
    interactables.push({ kind: 'camera', id: `cam-${c.id}`, label: `Try: ${c.label}`, stand: [x, north ? z + 1.2 : z - 1.2], face: north ? 0 : Math.PI, mesh: g, data: c });
  });
  // the counter, with the Camera Checker on a screen
  const counter = new THREE.Group();
  counter.position.set(19.4, 0, 38.1);
  scene.add(counter);
  box(1.0, 1.0, 3.0, INK, 0, 0.5, 0, counter);
  box(1.1, 0.06, 3.1, '#d9a441', 0, 1.02, 0, counter);
  box(0.06, 0.4, 0.6, '#1c1c1c', 0.1, 1.3, 0.6, counter);
  box(0.02, 0.34, 0.54, '', 0.06, 1.3, 0.6, counter, { m: mat('#1f3a5c', { emissive: '#4fa3ff', emissiveIntensity: 0.5 }) });
  colliders.push([18.85, 36.55, 19.95, 39.65]);
  interactables.push({ kind: 'counter', id: 'counter', label: 'Ask at the counter', stand: [17.9, 38.1], face: -Math.PI / 2, mesh: counter });


  // ---- the Meeting Point, at the end of Main Street ---------------------------------------------
  // the gateway
  for (const x of [-3.4, 3.4]) box(0.5, 3.6, 0.5, INK, x, 1.8, 45.3, scene, { collide: true });
  sign(7.3, 0.9, [['MEETING POINT', 72], ['Plan photo walks together', 30, 'mono']], { accent: '#2fb36d' }, 0, 3.3, 45.3, Math.PI, [1024, 128]);
  sign(7.3, 0.9, [['MEETING POINT', 72], ['Plan photo walks together', 30, 'mono']], { accent: '#2fb36d' }, 0, 3.3, 45.32, 0, [1024, 128]);
  box(7.4, 0.95, 0.04, INK, 0, 3.3, 45.31);

  // the two maps: schematic district tiles, not to scale; column 3 is the river
  const TW = 3.0;
  const TD = 2.3;
  const GAP = 0.12;
  const RIVER = 1.2;
  const colX = (x0, c) => (c < 3 ? x0 + c * (TW + GAP) : c === 3 ? x0 + 3 * (TW + GAP) : x0 + 3 * (TW + GAP) + RIVER + GAP);
  const tiles = [];
  const tile = (city, label, x0, z0, w, d, fill, ink, extra, turned = false) => {
    const tex = canvasTexture(256, 196, (ctx, cw, ch) => {
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, cw, ch);
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, cw - 6, ch - 6);
      if (extra) extra(ctx, cw, ch);
      if (!label) return;
      ctx.fillStyle = ink;
      ctx.textAlign = 'center';
      const [main, sub] = label.split(' · ');
      ctx.font = `700 ${main.length > 11 ? 34 : 42}px "Barlow Condensed", sans-serif`;
      ctx.fillText(main.toUpperCase(), cw / 2, sub ? ch / 2 - 4 : ch / 2 + 14);
      if (sub) {
        ctx.font = '600 26px "Source Sans 3", sans-serif';
        ctx.fillText(sub, cw / 2, ch / 2 + 30);
      }
    });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), [mat(fill), mat(fill), new THREE.MeshStandardMaterial({ map: tex.texture, roughness: 0.9 }), mat(fill), mat(fill), mat(fill)]);
    m.position.set(x0 + w / 2, 0.03, z0 + d / 2);
    if (turned) m.rotation.y = Math.PI; // labels read upright for people walking in from Main Street
    m.receiveShadow = true;
    ground.add(m);
    if (label) tiles.push({ city, area: label, x0, z0, x1: x0 + w, z1: z0 + d, cx: x0 + w / 2, cz: z0 + d / 2 });
  };
  const water = (ctx, w, h) => {
    ctx.fillStyle = '#5fb4e6';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 4;
    for (let y = 24; y < h; y += 34) { ctx.beginPath(); ctx.moveTo(10, y); ctx.quadraticCurveTo(w / 2, y - 14, w - 10, y); ctx.stroke(); }
  };
  const rmit = (ctx, w) => { ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(w - 30, 30, 14, 0, Math.PI * 2); ctx.fill(); };
  // Visitors arrive from the north facing south, so each map is turned
  // round: north at the far end, east on their right, as a map in the hand.
  const buildMap = (city, x0, z0, rows, fillCol, title, lakes = []) => {
    const W = colX(x0, 4) + TW - x0;
    const D = rows * (TD + GAP) - GAP;
    const put = (label, c, r, w, fill, extra) => {
      const tx = c === 3 ? colX(x0, 3) : colX(x0, c);
      const tz = z0 + r * (TD + GAP);
      tile(city, label, 2 * x0 + W - (tx + w), 2 * z0 + D - (tz + TD), w, TD, fill, INK, extra, true);
    };
    for (const [label, c, r] of PLACES[city]) put(label, c, r, TW, label === 'Somewhere else' ? '#e8e3d8' : fillCol, /RMIT/.test(label) ? rmit : null);
    for (let r = 0; r < rows; r++) put('', 3, r, RIVER, '#5fb4e6', water);
    for (const [c, r] of lakes) put('', c, r, TW, '#5fb4e6', water);
    sign(4.2, 0.62, [[title, 46], ['Schematic, not to scale', 22, 'mono']], { accent: '#2fb36d' }, x0 + 6.3, 0.75, z0 - 0.35, Math.PI, [640, 96]);
    box(4.3, 0.7, 0.05, INK, x0 + 6.3, 0.75, z0 - 0.33);
  };
  const SG = { x0: -20.6, z0: 47.2 };
  const HN = { x0: -1.6, z0: 47.2 };
  buildMap('saigon', SG.x0, SG.z0, 4, '#f2d9b1', 'SAIGON');
  buildMap('hanoi', HN.x0, HN.z0, 3, '#cfe3d6', 'HANOI', [[0, 0]]); // West Lake, beside Tay Ho
  // the Online island
  const island = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.1, 0.12, 24), mat('#c9b8ff'));
  island.position.set(15.6, 0.06, 48.6);
  island.receiveShadow = true;
  ground.add(island);
  const islandTex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#c9b8ff';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.font = '700 48px "Barlow Condensed", sans-serif';
    ctx.fillText('ONLINE', w / 2, h / 2);
    ctx.font = '600 24px "Source Sans 3", sans-serif';
    ctx.fillText('same theme, same week', w / 2, h / 2 + 34);
  });
  const islandTop = new THREE.Mesh(new THREE.CircleGeometry(1.85, 24), new THREE.MeshStandardMaterial({ map: islandTex.texture }));
  islandTop.rotation.x = -Math.PI / 2;
  islandTop.position.set(15.6, 0.125, 48.6);
  ground.add(islandTop);
  tiles.push({ city: 'online', area: 'Online', x0: 13.9, z0: 46.9, x1: 17.3, z1: 50.3, cx: 15.6, cz: 48.6 });

  // the campfire, with logs to sit on
  const fire = new THREE.Group();
  fire.position.set(FIRE.x, 0, FIRE.z);
  scene.add(fire);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    box(0.32, 0.22, 0.32, '#8d8a85', Math.sin(a) * 0.75, 0.11, Math.cos(a) * 0.75, fire);
  }
  const flames = [['#ff6a00', 0.5, 0.45], ['#ffb300', 0.34, 0.75], ['#ffe08a', 0.2, 1.0]].map(([c, s, y]) => {
    const f = box(s, s, s, '', 0, y, 0, fire, { shadow: false, m: mat(c, { emissive: c, emissiveIntensity: 1.4 }) });
    return f;
  });
  const fireLight = new THREE.PointLight(0xff9a3c, 3, 9, 1.6);
  fireLight.position.y = 1.0;
  fire.add(fireLight);
  colliders.push([FIRE.x - 0.85, FIRE.z - 0.85, FIRE.x + 0.85, FIRE.z + 0.85]);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const lx = FIRE.x + Math.sin(a) * 2.45;
    const lz = FIRE.z + Math.cos(a) * 2.45;
    const log = box(1.3, 0.34, 0.42, '#7a5232', lx, 0.17, lz);
    log.rotation.y = a + Math.PI / 2;
    const sx = FIRE.x + Math.sin(a) * 2.15;
    const sz = FIRE.z + Math.cos(a) * 2.15;
    interactables.push({ kind: 'log', id: `log-${i}`, label: 'Sit by the fire', stand: [sx, sz], face: a, mesh: log });
  }

  // the ideas wall
  const ideas = canvasTexture(1024, 320, () => {});
  const wallG = new THREE.Group();
  wallG.position.set(5, 1.5, 57.7);
  wallG.rotation.y = Math.PI;
  scene.add(wallG);
  box(7.2, 2.3, 0.1, '#2fb36d', 0, 0, 0, wallG);
  const ideasFace = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.1), new THREE.MeshStandardMaterial({ map: ideas.texture }));
  ideasFace.position.z = 0.06;
  wallG.add(ideasFace);
  for (const x of [-3.2, 3.2]) box(0.12, 1.5, 0.12, INK, x, -1.0, 0, wallG);
  colliders.push([1.3, 57.55, 8.7, 57.85]);
  interactables.push({ kind: 'ideas', id: 'ideas', label: 'Ideas wall: read and add a note', stand: [5, 56.4], face: Math.PI, mesh: wallG });
  const paintIdeas = (notes) => ideas.redraw((ctx, w, h) => {
    ctx.fillStyle = '#e9f5ec';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = INK;
    ctx.font = '700 46px "Barlow Condensed", sans-serif';
    ctx.fillText('IDEAS WALL', 22, 50);
    ctx.font = '400 22px "JetBrains Mono", monospace';
    ctx.fillText(notes.length ? 'Thoughts and places to shoot. Walk up and add yours.' : 'Empty for now. Walk up and add the first note.', 260, 46);
    notes.slice(0, 7).forEach((n, i) => {
      ctx.save();
      ctx.translate(22 + i * 142 + 66, 190);
      ctx.rotate(((i % 3) - 1) * 0.04);
      ctx.fillStyle = ['#fff3a8', '#ffd0d8', '#cfeaff', '#d8f5c8'][i % 4];
      ctx.fillRect(-66, -100, 132, 200);
      ctx.fillStyle = INK;
      ctx.font = '600 19px "Source Sans 3", sans-serif';
      const words = n.text.split(' ');
      let line = '';
      let y = -72;
      for (const word of words) {
        const t = line ? line + ' ' + word : word;
        if (ctx.measureText(t).width > 116 && line) { ctx.fillText(line, -58, y); line = word; y += 22; } else line = t;
        if (y > 50) break;
      }
      if (y <= 50) ctx.fillText(line, -58, y);
      ctx.fillStyle = '#555';
      ctx.font = '700 18px "Barlow Condensed", sans-serif';
      ctx.fillText(n.name.slice(0, 14), -58, 88);
      ctx.restore();
    });
  });
  paintIdeas([]);

  // plan flags: one per photo walk plan, on its district tile
  const flags = new Map();
  const tagName = (t) => (TAGS.find((x) => x[0] === t) || [t, t])[1];
  function tileFor(c) {
    return tiles.find((t) => t.city === c.city && t.area === c.area)
      || tiles.find((t) => t.city === c.city && (t.area === 'Somewhere else' || t.city === 'online'))
      || tiles[0];
  }
  function makeFlag(c) {
    const g = new THREE.Group();
    box(0.07, 2.3, 0.07, '#ececec', 0, 1.15, 0, g);
    box(0.9, 0.55, 0.04, '', 0.48, 1.98, 0, g, { m: mat(c.ink || RED) });
    box(0.5, 0.06, 0.5, INK, 0, 0.03, 0, g);
    const label = canvasTexture(320, 112, () => {});
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: label.texture, depthWrite: false }));
    sprite.scale.set(1.9, 0.665, 1);
    sprite.position.y = 2.75;
    g.add(sprite);
    scene.add(g);
    const f = { g, label, card: c, it: null };
    paintFlag(f);
    return f;
  }
  function paintFlag(f) {
    const c = f.card;
    f.label.redraw((ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.94)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = c.ink || RED;
      ctx.fillRect(0, 0, 8, h);
      ctx.fillStyle = INK;
      ctx.font = '700 34px "Barlow Condensed", sans-serif';
      ctx.fillText(`${c.name.slice(0, 12)}${c.joined.length ? ` +${c.joined.length}` : ''}`, 20, 40);
      ctx.font = '600 24px "Source Sans 3", sans-serif';
      ctx.fillText(c.tags.map(tagName).join(', ').slice(0, 24), 20, 72);
      ctx.fillStyle = '#555';
      ctx.font = '400 20px "JetBrains Mono", monospace';
      ctx.fillText((c.when || c.date || '').slice(0, 24), 20, 100);
    });
  }
  function setFlags(cards) {
    const ids = new Set(cards.map((c) => c.id));
    for (const [id, f] of flags) {
      if (ids.has(id)) continue;
      scene.remove(f.g);
      const k = interactables.indexOf(f.it);
      if (k >= 0) interactables.splice(k, 1);
      flags.delete(id);
    }
    const perTile = new Map();
    for (const c of [...cards].reverse()) {
      const t = tileFor(c);
      const n = perTile.get(t) || 0;
      perTile.set(t, n + 1);
      let f = flags.get(c.id);
      if (!f) {
        f = makeFlag(c);
        flags.set(c.id, f);
        f.it = { kind: 'flag', id: `flag-${c.id}`, label: `${c.name}'s photo walk`, stand: [0, 0], face: 0, mesh: f.g, data: c.id };
        interactables.push(f.it);
      } else { f.card = c; paintFlag(f); }
      // up to six flags share a tile, in two rows
      const col = n % 3;
      const row = Math.floor(n / 3) % 2;
      const x = t.city === 'online' ? t.cx + Math.sin(n * 2.1) * 1.1 : t.x0 + 0.55 + col * ((t.x1 - t.x0 - 1.1) / 2);
      const z = t.city === 'online' ? t.cz + Math.cos(n * 2.1) * 1.1 : t.z0 + 0.6 + row * (t.z1 - t.z0 - 1.2);
      f.g.position.set(x, 0, z);
      f.it.stand = [x, z + 0.8];
    }
  }

  // which tile the walker stands on, for planting a flag there
  const tileAt = (x, z) => tiles.find((t) => x >= t.x0 && x <= t.x1 && z >= t.z0 && z <= t.z1) || null;

  return {
    show,
    meet: {
      tiles,
      tileAt,
      setFlags,
      paintIdeas,
      animate(t, reduced) {
        if (reduced) return;
        flames.forEach((f, i) => { const s = 1 + Math.sin(t * (7 + i * 3) + i) * 0.15; f.scale.set(s, 1 + Math.sin(t * (9 + i * 2)) * 0.2, s); });
        fireLight.intensity = 3 + Math.sin(t * 11) * 0.5 + Math.sin(t * 17) * 0.3;
      },
    },
    displays,
    club: {
      lensCam,
      paintBoard,
      tally(on) { tallyMat.emissiveIntensity = on ? 2.5 : 0; },
      hang(img) {
        lastPhoto.redraw((ctx, w, h) => {
          ctx.fillStyle = '#f7f5f0';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
        });
      },
    },
  };
}
