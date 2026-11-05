// The city map: a plan of the whole Commons, seen from above with the
// notice board end at the top (the way you face when you walk in).
// It opens once on a first visit, then from the Map button or the M key.
// Tap a place to walk there.

import { HALL, GALLERY, SHOP, FIRE } from './city.js';

const VB = { x: -24.5, z: -9.6, w: 49, h: 69.6 };

// [label, rect or point, where to walk, short note]
export const PLACES = [
  { id: 'desk', name: 'Consultation desk', at: [0, -6.6], go: [0, -5.3], note: 'Book a one-to-one' },
  { id: 'notice', name: 'Notice board', at: [0, 2.2], go: [0, 3.4], note: 'This week, what is due' },
  { id: 'kiosks', name: 'Assignments', rect: [-8.8, -5, -7.2, 5], go: [-6.9, 0], note: 'Briefs and templates' },
  { id: 'tools', name: 'Tool corner', rect: [7.2, -5, 8.8, 5], go: [6.9, 0], note: 'Camera Checker, roadmap' },
  { id: 'support', name: 'Support sessions', rect: [-23.5, -7.5, -13, 7.5], go: [-11.9, 0], note: 'Opens on session days' },
  { id: 'work', name: 'Student work', rect: [13, -7.5, 23.5, 7.5], go: [15.2, 0], note: 'Out in the world' },
  { id: 'club', name: 'Club Hall', rect: [HALL.x0, HALL.z0, HALL.x1, HALL.z1], go: [-9, 21], note: 'Group photo, photo walks' },
  { id: 'gallery', name: 'Gallery', rect: [GALLERY.x0, GALLERY.z0, GALLERY.x1, GALLERY.z1], go: [9, 21], note: 'The current show' },
  { id: 'shop', name: 'Camera Shop', rect: [SHOP.x0, SHOP.z0, SHOP.x1, SHOP.z1], go: [9, 38], note: 'Pick your camera' },
  { id: 'meet', name: 'Meeting Point', rect: [-22.2, 45.3, 22.2, 58.2], go: [0, 47], note: 'Plan photo walks together' },
];

const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r1 = (n) => Math.round(n * 100) / 100;

function rect([x0, z0, x1, z1], cls) {
  return `<rect class="${cls}" x="${r1(x0)}" y="${r1(z0)}" width="${r1(x1 - x0)}" height="${r1(z1 - z0)}"/>`;
}

// tiles: the Meeting Point districts from city.meet.tiles
export function mapHTML({ tiles = [], me, peers = [] }) {
  const sg = bounds(tiles.filter((t) => t.city === 'saigon'));
  const hn = bounds(tiles.filter((t) => t.city === 'hanoi'));
  const on = tiles.find((t) => t.city === 'online');
  const ground = [
    rect([-22.2, 8.7, 22.2, 58.2], 'm-city'),
    rect([-3.2, 8.4, 3.2, 45.3], 'm-street'),
    rect([-23.7, -8.7, 23.7, 8.7], 'm-square'),
    rect([-21, 32.5, -5, 43.8], 'm-lot'),
  ];
  const meetBits = [
    sg && rect(sg, 'm-district'), hn && rect(hn, 'm-district'),
    on && `<circle class="m-district" cx="${on.cx}" cy="${on.cz}" r="1.9"/>`,
    `<circle class="m-fire" cx="${FIRE.x}" cy="${FIRE.z}" r="1.1"/>`,
    rect([1.5, 56.9, 8.5, 57.5], 'm-wall'),
  ].filter(Boolean);
  const small = [
    sg && label('SAIGON', (sg[0] + sg[2]) / 2, (sg[1] + sg[3]) / 2 + 1, 'm-sub'),
    hn && label('HANOI', (hn[0] + hn[2]) / 2, (hn[1] + hn[3]) / 2 + 1, 'm-sub'),
    on && label('Online', on.cx, on.cz - 2.6, 'm-sub'),
    label('Campfire', FIRE.x + 3.6, FIRE.z + 0.5, 'm-sub'),
    label('Ideas wall', 5, 58.9, 'm-sub'),
    label('Coming soon', -13, 38.6, 'm-sub dim'),
    label('Main Street', 0, 31.5, 'm-sub dim', -90),
    label('The Square', 0, -2.4, 'm-sub dim'),
  ].filter(Boolean);
  const spots = PLACES.map((p) => {
    const shape = p.rect ? rect(p.rect, 'm-place') : `<circle class="m-place" cx="${p.at[0]}" cy="${p.at[1]}" r="1.2"/>`;
    const [lx, lz] = p.rect ? [(p.rect[0] + p.rect[2]) / 2, p.id === 'meet' ? 46.9 : (p.rect[1] + p.rect[3]) / 2] : [p.at[0], p.at[1] + (p.id === 'desk' ? 2.1 : -2)];
    const tall = p.rect && p.rect[2] - p.rect[0] < 3;
    const narrow = p.rect && p.rect[2] - p.rect[0] < 12 && !tall && p.name.includes(' ');
    const name = narrow ? stack(p.name.split(' '), lx, lz) : tall ? label(p.name, lx, lz, 'm-name', -90) : label(p.name, lx, lz, 'm-name');
    return `<g class="m-spot" data-go="${p.go.join(',')}" data-name="${esc(p.name)}" tabindex="0" role="button" aria-label="Walk to the ${esc(p.name)}">
      ${shape}${name}
    </g>`;
  });
  const people = peers.map((p) => `<circle class="m-peer" cx="${r1(p.x)}" cy="${r1(p.z)}" r="0.55"/>`);
  const you = me ? `<g class="m-you" transform="translate(${r1(me.x)} ${r1(me.z)})">
      <circle class="m-you-ring" r="1.6" style="stroke:${esc(me.colour)}"/>
      <circle r="0.8" style="fill:${esc(me.colour)}"/>
    </g>${label('You', me.x, me.z + 2.4, 'm-you-label')}` : '';

  return `<span class="label">Map</span>
    <h2>The Commons</h2>
    <p>You start in the Square. Main Street runs south from it, behind you as you walk in, to the
    Club Hall, the Gallery, the Camera Shop and the Meeting Point. Tap a place to walk there.</p>
    <svg class="city-map" viewBox="${VB.x} ${VB.z} ${VB.w} ${VB.h}" role="img" aria-label="Map of the Commons">
      ${ground.join('')}${meetBits.join('')}${small.join('')}${spots.join('')}${people.join('')}${you}
    </svg>
    <p class="muted">Open this map any time with the Map button${matchMedia('(pointer: coarse)').matches ? '' : ' or the M key'}.</p>`;
}

function label(text, x, z, cls, rot = 0) {
  const t = rot ? ` transform="rotate(${rot} ${r1(x)} ${r1(z)})"` : '';
  return `<text class="${cls}" x="${r1(x)}" y="${r1(z)}"${t}>${esc(text)}</text>`;
}

function stack(words, x, z) {
  const top = z - ((words.length - 1) * 2) / 2;
  return `<text class="m-name" x="${r1(x)}" y="${r1(top)}">${words.map((w, i) => `<tspan x="${r1(x)}" y="${r1(top + i * 2)}">${esc(w)}</tspan>`).join('')}</text>`;
}

function bounds(list) {
  if (!list.length) return null;
  return [
    Math.min(...list.map((t) => t.x0)), Math.min(...list.map((t) => t.z0)),
    Math.max(...list.map((t) => t.x1)), Math.max(...list.map((t) => t.z1)),
  ];
}
