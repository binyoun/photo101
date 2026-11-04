// Students in the Commons: blocky little people with a camera for a head,
// the kind of camera they shoot with (picked at the gate or in the camera
// shop). The shirt takes the colour they picked at the gate. In the Club Hall they
// can strike a pose for the group photo.

import * as THREE from 'three';

export const POSES = ['wave', 'peace', 'cheer', 'jump', 'crouch'];

export const COLOURS = ['#e60028', '#ff8a00', '#f5c400', '#2fb36d', '#1fa3d6', '#3d5afe', '#8e44ad', '#ff4fa3', '#ececec'];

// camera types, not brands, so anyone can match what they have
export const CAMERAS = [
  { id: 'phone', label: 'Phone' },
  { id: 'compact', label: 'Compact' },
  { id: 'dslr', label: 'DSLR' },
  { id: 'mirrorless', label: 'Mirrorless' },
  { id: 'bridge', label: 'Bridge' },
  { id: 'film', label: 'Film SLR' },
  { id: 'instant', label: 'Instant' },
  { id: 'tlr', label: 'Twin-lens' },
];
export const CAMERA_IDS = CAMERAS.map((c) => c.id);

const dark = new THREE.MeshStandardMaterial({ color: '#1c1c1c', roughness: 0.6 });
const silver = new THREE.MeshStandardMaterial({ color: '#c9ccd1', roughness: 0.35, metalness: 0.6 });
const cream = new THREE.MeshStandardMaterial({ color: '#f2efe8', roughness: 0.7 });
const red = new THREE.MeshStandardMaterial({ color: '#e60028' });
const screenMat = new THREE.MeshStandardMaterial({ color: '#1f3a5c', emissive: '#4fa3ff', emissiveIntensity: 0.5 });
const STRIPES = ['#e8403b', '#f59b1c', '#f5c400', '#3fae49', '#2f8fd6'].map((c) => new THREE.MeshStandardMaterial({ color: c }));

// A camera centred on the origin, lens facing +z, about head-sized.
export function cameraHead(kind = 'dslr') {
  const g = new THREE.Group();
  const add = (w, h, d, m, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    g.add(mesh);
    return mesh;
  };
  const lens = (r, len, x, y, z, m = dark) => {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, len, 14), m);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(x, y, z + len / 2);
    barrel.castShadow = true;
    g.add(barrel);
    const eye = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.68, r * 0.68, 0.02, 14), glass);
    eye.rotation.x = Math.PI / 2;
    eye.position.set(x, y, z + len + 0.005);
    g.add(eye);
  };
  if (kind === 'phone') {
    add(0.36, 0.5, 0.05, dark, 0, 0.02, 0);
    add(0.32, 0.46, 0.01, screenMat, 0, 0.02, -0.03);
    add(0.12, 0.16, 0.02, dark, -0.09, 0.14, 0.035);
    lens(0.025, 0.02, -0.09, 0.18, 0.04);
    lens(0.025, 0.02, -0.09, 0.1, 0.04);
  } else if (kind === 'compact') {
    add(0.44, 0.26, 0.16, silver, 0, -0.04, 0);
    lens(0.08, 0.08, -0.05, -0.05, 0.08, silver);
    add(0.09, 0.04, 0.04, dark, 0.13, 0.05, 0.08);
    add(0.06, 0.03, 0.06, red, 0.15, 0.1, 0);
  } else if (kind === 'mirrorless') {
    add(0.48, 0.28, 0.18, dark, 0, -0.03, 0);
    add(0.14, 0.08, 0.14, dark, -0.1, 0.14, 0);
    add(0.1, 0.24, 0.1, dark, 0.2, -0.04, 0.08);
    lens(0.11, 0.18, 0, -0.04, 0.09);
    add(0.06, 0.03, 0.06, red, 0.2, 0.12, 0.05);
  } else if (kind === 'bridge') {
    add(0.48, 0.32, 0.26, dark, 0, 0, 0);
    add(0.16, 0.1, 0.16, dark, 0, 0.2, 0);
    lens(0.12, 0.32, 0, -0.02, 0.13);
    add(0.06, 0.03, 0.06, red, 0.18, 0.18, 0.06);
  } else if (kind === 'film') {
    add(0.5, 0.24, 0.24, dark, 0, -0.06, 0);
    add(0.5, 0.08, 0.24, silver, 0, 0.1, 0);
    add(0.16, 0.12, 0.18, silver, 0, 0.2, 0);
    add(0.12, 0.02, 0.04, silver, 0.17, 0.15, 0.06); // film advance lever
    lens(0.1, 0.16, 0, -0.04, 0.12, silver);
  } else if (kind === 'instant') {
    add(0.46, 0.38, 0.36, cream, 0, 0.0, 0);
    STRIPES.forEach((m, i) => add(0.03, 0.2, 0.01, m, -0.06 + i * 0.03, 0.06, 0.18));
    add(0.42, 0.06, 0.3, dark, 0, -0.17, 0.02);
    lens(0.09, 0.08, 0, -0.04, 0.18, dark);
    add(0.1, 0.06, 0.02, cream, -0.15, 0.13, 0.19);
    add(0.06, 0.06, 0.03, red, 0.17, 0.13, 0.17);
  } else if (kind === 'tlr') {
    add(0.3, 0.46, 0.3, dark, 0, 0.02, 0);
    add(0.3, 0.1, 0.3, silver, 0, 0.29, 0); // the folded viewing hood
    lens(0.08, 0.08, 0, 0.13, 0.15);
    lens(0.08, 0.1, 0, -0.08, 0.15);
  } else {
    // dslr: body, grip, prism hump, lens and a red shutter button
    add(0.5, 0.34, 0.3, dark, 0, 0, 0);
    add(0.12, 0.3, 0.12, dark, 0.2, -0.02, 0.12);
    add(0.16, 0.08, 0.16, dark, 0, 0.21, 0);
    lens(0.12, 0.16, 0, -0.02, 0.15);
    add(0.07, 0.04, 0.07, red, 0.17, 0.19, 0.05);
  }
  return g;
}

const glass = new THREE.MeshStandardMaterial({ color: '#7fd3ff', roughness: 0.1, metalness: 0.3 });
const trouser = new THREE.MeshStandardMaterial({ color: '#2b2b33', roughness: 0.9 });

export function makeAvatar(colour = COLOURS[0], { lecturer = false, cam = 'dslr' } = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const shirtMat = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.8 });
  const add = (geo, m, x, y, z) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    body.add(mesh);
    return mesh;
  };
  add(new THREE.BoxGeometry(0.5, 0.6, 0.3), shirtMat, 0, 0.95, 0);
  const legs = [-0.12, 0.12].map((x) => add(new THREE.BoxGeometry(0.18, 0.55, 0.2), trouser, x, 0.37, 0));
  // arms hang from a shoulder joint so they can be raised
  const arms = [-0.32, 0.32].map((x) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(x, 1.22, 0);
    body.add(shoulder);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.5, 0.16), shirtMat);
    arm.position.y = -0.24;
    arm.castShadow = true;
    shoulder.add(arm);
    return shoulder;
  });
  // the camera head, sitting on the shoulders
  let head = null;
  const setCamera = (kind) => {
    if (head) body.remove(head);
    head = cameraHead(CAMERA_IDS.includes(kind) ? kind : 'dslr');
    head.position.set(0, 1.47, 0);
    body.add(head);
  };
  setCamera(cam);
  if (lecturer) add(new THREE.BoxGeometry(0.06, 0.4, 0.02), new THREE.MeshStandardMaterial({ color: '#e60028' }), 0, 1.0, 0.16); // lanyard

  let phase = 0;
  return {
    root,
    setColour(c) { shirtMat.color.set(c); },
    setCamera,
    animate(dt, speed, t, pose = '') {
      const k = Math.min(1, dt * 12);
      const ease = (o, key, v) => { o[key] += (v - o[key]) * k; };
      if (speed > 0.05) {
        phase += dt * (5 + speed * 2);
        body.position.y = Math.abs(Math.sin(phase)) * 0.07;
        legs[0].rotation.x = Math.sin(phase) * 0.6;
        legs[1].rotation.x = -Math.sin(phase) * 0.6;
        arms[0].rotation.x = -Math.sin(phase) * 0.5;
        arms[1].rotation.x = Math.sin(phase) * 0.5;
        arms[0].rotation.z = arms[1].rotation.z = 0;
        return;
      }
      // [left arm x, left arm z, right arm x, right arm z, body y, leg x]
      const p = {
        wave: [0, 0, 0, 2.5 + Math.sin(t * 9) * 0.35, Math.sin(t * 1.8) * 0.015, 0],
        peace: [0, 0, -2.5, 0.3, 0, 0],
        cheer: [0, -2.8, 0, 2.8, Math.abs(Math.sin(t * 4)) * 0.05, 0],
        jump: [0, -2.6, 0, 2.6, Math.abs(Math.sin(t * 5)) * 0.4, 0],
        crouch: [-0.5, -0.2, -0.5, 0.2, -0.24, -1.1],
      }[pose] || [0, 0, 0, 0, Math.sin(t * 1.8) * 0.015, 0];
      ease(arms[0].rotation, 'x', p[0]);
      ease(arms[0].rotation, 'z', p[1]);
      ease(arms[1].rotation, 'x', p[2]);
      ease(arms[1].rotation, 'z', p[3]);
      ease(body.position, 'y', p[4]);
      for (const l of legs) ease(l.rotation, 'x', p[5]);
    },
  };
}
