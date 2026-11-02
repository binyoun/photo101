// The photo hunt: four things hidden around the Commons, a new set for
// each stretch of the course. Each one opens a tip and a small challenge.
// Found items are stamped on a card kept in this browser only.

import { weekNow } from './semester.js';

export const SETS = {
  exposure: {
    title: 'Exposure',
    weeks: [1, 2],
    items: [
      { id: 'exp-lens', kind: 'lens', title: 'A fast lens',
        tip: 'Aperture is the hole in the lens. A wide aperture (small f-number like f/2.8) lets in more light and blurs the background; a narrow one (f/16) keeps everything sharp.',
        challenge: 'Photograph the same object at f/2.8 (or your widest) and at f/16. Compare the background.' },
      { id: 'exp-shutter', kind: 'stopwatch', title: 'A stopwatch',
        tip: 'Shutter speed is how long the sensor sees. 1/1000 s freezes a splash; 1 s turns moving water or traffic into smooth trails.',
        challenge: 'Find something that moves. Shoot it at 1/1000 s, then at 1/4 s or slower on a steady surface.' },
      { id: 'exp-iso', kind: 'meter', title: 'A light meter',
        tip: 'ISO brightens the image after the light arrives, and adds noise as it climbs. Raise it only when aperture and shutter cannot give you enough.',
        challenge: 'Indoors, shoot one frame at ISO 100 and one at your highest ISO. Zoom in on the shadows.' },
      { id: 'exp-tripod', kind: 'tripod', title: 'A tripod',
        tip: 'A long exposure needs a camera that does not move. No tripod? A wall, a bag of rice or a stack of books works, plus the self-timer.',
        challenge: 'Make one long exposure for A1 tonight: at least 2 seconds, camera braced, self-timer on.' },
    ],
  },
  light: {
    title: 'Composition and light',
    weeks: [3],
    items: [
      { id: 'light-frame', kind: 'frame', title: 'An empty frame',
        tip: 'Composition is deciding what stays out. Before you press the shutter, check all four edges of the frame.',
        challenge: 'Shoot one scene three times: wide, closer, and closer again. Which edit tells the story best?' },
      { id: 'light-reflector', kind: 'reflector', title: 'A reflector',
        tip: 'Light has direction. Side light shows texture, back light makes outlines glow, and front light flattens.',
        challenge: 'Photograph one object by a window from the front, the side and behind.' },
      { id: 'light-sun', kind: 'sun', title: 'A little sun',
        tip: 'The hour after sunrise and before sunset gives low, warm light and long shadows. Midday light is hard and from above.',
        challenge: 'Shoot the same street corner at noon and in the last hour of daylight.' },
      { id: 'light-slider', kind: 'slider', title: 'A Lightroom slider',
        tip: 'In Lightroom, set white balance and exposure first, then contrast, then local edits. Small moves; check the histogram.',
        challenge: 'Edit one RAW photo two ways, one warm and one cool, and decide which serves the picture.' },
    ],
  },
  genres: {
    title: 'Genres and analysis',
    weeks: [4, 5, 6, 7],
    items: [
      { id: 'gen-still', kind: 'apple', title: 'A still life apple',
        tip: 'Still life is where you control everything: the object, the background, the light. Simplify until each thing earns its place.',
        challenge: 'Make a still life with three objects and one window light. Remove one object. Better?' },
      { id: 'gen-portrait', kind: 'chair', title: "A sitter's chair",
        tip: 'In a portrait, focus on the nearest eye. A longer focal length (around 85 mm) flatters faces; step back instead of zooming with your feet.',
        challenge: 'Make a portrait with the light coming from one side only.' },
      { id: 'gen-street', kind: 'shoe', title: 'A walking shoe',
        tip: 'Street photography rewards patience. Find a good background and light, then wait for someone to walk into it.',
        challenge: 'Choose one spot and stay 15 minutes. Shoot only what passes through your frame.' },
      { id: 'gen-loupe', kind: 'loupe', title: 'A loupe',
        tip: 'Visual analysis answers three questions: what do I see, how was it made, and what does it make me feel or think?',
        challenge: 'Pick one image from the gallery here and write three sentences answering those questions.' },
    ],
  },
  folio: {
    title: 'Your folio',
    weeks: [8, 9, 10, 11, 12],
    items: [
      { id: 'fol-board', kind: 'board', title: 'A moodboard pin',
        tip: 'A moodboard of 5 to 10 references sets your light, colour and distance before you shoot a single frame.',
        challenge: 'Pin 5 references for each of your two themes. Which theme has the stronger board?' },
      { id: 'fol-card', kind: 'card', title: 'A full memory card',
        tip: 'Shoot far more than you need. A folio of 25 usually comes from several hundred frames.',
        challenge: 'Shoot 100 frames for your theme this week. Keep everything; edit later.' },
      { id: 'fol-sequence', kind: 'film', title: 'A contact sheet',
        tip: 'Sequence like sentences: an opening image, a rhythm of close and far, a quiet one before the end.',
        challenge: 'Lay out your best 30 as thumbnails and cut 5. Read it again from the start.' },
      { id: 'fol-calendar', kind: 'calendar', title: 'A booking card',
        tip: 'The A3 consultation is required. Bring your themes and moodboard; the more you bring, the more useful it is.',
        challenge: 'Book your consultation at the desk by the big letters, if you have not already.' },
    ],
  },
};

const KEY = 'p101-commons-stamps';

export function currentSet(now = new Date()) {
  const w = weekNow(now);
  for (const [id, set] of Object.entries(SETS)) if (set.weeks.includes(w)) return { id, ...set };
  return w < 1 ? { id: 'exposure', ...SETS.exposure } : { id: 'folio', ...SETS.folio };
}

export function stamps() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}');
    return s && typeof s === 'object' ? s : {};
  } catch (e) {
    return {};
  }
}

export function stamp(id) {
  const s = stamps();
  if (s[id]) return false;
  s[id] = new Date().toISOString();
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* blocked */ }
  return true;
}

export const totalStamps = () => Object.keys(stamps()).length;
