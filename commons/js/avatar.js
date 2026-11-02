// Students in the Commons: blocky little people with a camera for a head.
// The shirt takes the colour they picked at the gate.

import * as THREE from 'three';

export const COLOURS = ['#e60028', '#ff8a00', '#f5c400', '#2fb36d', '#1fa3d6', '#3d5afe', '#8e44ad', '#ff4fa3', '#ececec'];

const dark = new THREE.MeshStandardMaterial({ color: '#1c1c1c', roughness: 0.6 });
const glass = new THREE.MeshStandardMaterial({ color: '#7fd3ff', roughness: 0.1, metalness: 0.3 });
const trouser = new THREE.MeshStandardMaterial({ color: '#2b2b33', roughness: 0.9 });

export function makeAvatar(colour = COLOURS[0], { lecturer = false } = {}) {
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
  const arms = [-0.32, 0.32].map((x) => add(new THREE.BoxGeometry(0.13, 0.5, 0.16), shirtMat, x, 0.98, 0));
  // the camera head: body, lens, viewfinder bump and a red shutter button
  add(new THREE.BoxGeometry(0.5, 0.34, 0.3), dark, 0, 1.47, 0);
  const lens = add(new THREE.CylinderGeometry(0.11, 0.12, 0.16, 12), dark, 0, 1.45, 0.22);
  lens.rotation.x = Math.PI / 2;
  const eye = add(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 12), glass, 0, 1.45, 0.305);
  eye.rotation.x = Math.PI / 2;
  add(new THREE.BoxGeometry(0.16, 0.08, 0.16), dark, 0, 1.68, 0);
  add(new THREE.BoxGeometry(0.07, 0.04, 0.07), new THREE.MeshStandardMaterial({ color: '#e60028' }), 0.17, 1.66, 0.05);
  if (lecturer) add(new THREE.BoxGeometry(0.06, 0.4, 0.02), new THREE.MeshStandardMaterial({ color: '#e60028' }), 0, 1.0, 0.16); // lanyard

  let phase = 0;
  return {
    root,
    setColour(c) { shirtMat.color.set(c); },
    animate(dt, speed, t) {
      if (speed > 0.05) {
        phase += dt * (5 + speed * 2);
        body.position.y = Math.abs(Math.sin(phase)) * 0.07;
        legs[0].rotation.x = Math.sin(phase) * 0.6;
        legs[1].rotation.x = -Math.sin(phase) * 0.6;
        arms[0].rotation.x = -Math.sin(phase) * 0.5;
        arms[1].rotation.x = Math.sin(phase) * 0.5;
      } else {
        body.position.y += (Math.sin(t * 1.8) * 0.015 - body.position.y) * Math.min(1, dt * 6);
        for (const l of [...legs, ...arms]) l.rotation.x *= 0.85;
      }
    },
  };
}
