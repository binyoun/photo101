// Semester facts for the Commons. Update at the start of each semester,
// together with index.html and roadmap.html (same facts, same day).

export const SEMESTER = {
  name: 'Semester 3, 2026',
  start: '2026-10-26', // Monday of Week 1
  weeks: 12,
  room: 'p101-2026s3', // presence room; change each semester for a fresh Commons
  canvas: 'https://rmit.instructure.com/courses/174712',
  miro: 'https://au.miro.com/app/board/u3jVOf_GAsc=/?share_link_id=675895750787',
  // Microsoft Bookings page for consultations; empty falls back to email
  bookings: '',
  email: 'bin.youn@rmit.edu.vn',
  // The Teams link is posted on Canvas, so the door sends students there
  // rather than publishing a meeting link on a public page.
  sessions: [
    { date: '2026-11-04', for: 'A1', time: '' },
    { date: '2026-11-25', for: 'A2', time: '' },
    { date: '2026-12-23', for: 'A3', time: '' },
  ],
};

export const ASSIGNMENTS = [
  {
    id: 'A1', title: 'Photographic Techniques', weeks: 'Weeks 1 to 3', weight: '15%', due: '2026-11-13',
    brief: '4 images with technical captions: one long exposure, one frozen movement, and one scene at a large then a small aperture. Plus a 200-word reflection.',
    templates: [['Template 16:9', 'https://canva.link/9ny8ccegmn9ccqa'], ['Template A4', 'https://canva.link/1t5v7ya23sfvo5y']],
  },
  {
    id: 'A2', title: 'Photographic Craft and Visual Analysis', weeks: 'Weeks 4 to 6', weight: '45%', due: '2026-12-04',
    brief: '16 images (4 composition, 12 genre), 4 short reflections and one 400-word visual analysis.',
    templates: [['Template 16:9', 'https://canva.link/1z4qaogxe5k54w3'], ['Template A4', 'https://canva.link/le1hc7ofyp45g05']],
  },
  {
    id: 'A3', title: 'Final Folio', weeks: 'Weeks 8 to 12', weight: '40%', due: '2027-01-15',
    brief: '20 to 30 connected images. Develop two themes, build a moodboard, and attend the required consultation with your lecturer.',
    templates: [['Template 16:9', 'https://canva.link/6uixzxmn0iou77k'], ['Template A4', 'https://canva.link/uq79roivngmbe6s']],
  },
];

// What each week is about, from the roadmap
export const WEEKS = [
  'Module 0 + Module 1: getting set up, the fundamentals',
  'Module 1: the exposure triangle',
  'Module 2 + Module 3: composition, colour, light and post-production',
  'Module 4: photographic genres',
  'Module 4: visual analysis',
  'Self-study week: finish and submit A2',
  'Module 4 wrap-up: look ahead to your folio',
  'Module 5: plan your project, book your consultation',
  'Module 5: shoot',
  'Module 5: edit, select and sequence',
  'Module 5: finish your folio',
  'Hand in your folio',
];

export const TOOLS = [
  { id: 'checker', title: 'Camera Checker', text: 'Check whether your camera has the manual controls the course needs.', href: '../camera-checker.html' },
  { id: 'roadmap', title: 'Student Roadmap', text: 'The whole semester on one page: modules, attendance, support sessions and every due date.', href: '../roadmap.html' },
  { id: 'miro', title: 'Support Board', text: 'Assignment guidance and a showcase of HD work from the online support sessions.', href: SEMESTER.miro },
  { id: 'lightroom', title: 'Lightroom Tutorials', text: "Adobe's own step-by-step lessons for importing, editing and exporting in Lightroom Classic.", href: 'https://helpx.adobe.com/lightroom-classic/tutorials.html' },
];

// Student work already shown on the hub (rễRoute at Pingyao 2026)
export const GALLERY = [
  ['pingyao-diem-nguyen-vo-hong.jpg', 'Stitching My Roots', 'Diem Nguyen Vo Hong'],
  ['pingyao-chau-ngo-bao.jpg', 'Untitled series (Sa Pa and Ha Noi)', 'Chau Ngo Bao'],
  ['pingyao-cuc-ca-thi.jpg', 'Untitled series (Sa Pa)', 'Cuc Ca Thi'],
  ['pingyao-ton-nguyen.jpg', "There Is a Place I Can't Enter", 'Ton Nguyen'],
  ['pingyao-hao-tran-quoc.jpg', 'The Bond', 'Hao Tran Quoc'],
  ['pingyao-nga-le-thi-tuyet.jpg', 'Fallen leaves return to their roots', 'Nga Le Thi Tuyet'],
  ['pingyao-anh-tran-dang-minh.jpg', 'I Miss', 'Anh Tran Dang Minh'],
  ['pingyao-trang-pham-ha-hoang.jpg', 'Ca Dao', 'Trang Pham Ha Hoang'],
];

// ---- dates ---------------------------------------------------------------
const DAY = 86400000;
const local = (iso) => new Date(iso + 'T00:00:00+07:00'); // Vietnam time

export function weekNow(now = new Date()) {
  const w = Math.floor((now - local(SEMESTER.start)) / (7 * DAY)) + 1;
  return w; // may be < 1 before the semester or > weeks after it
}

export function nextSession(now = new Date()) {
  for (const s of SEMESTER.sessions) {
    const d = local(s.date);
    if (now < new Date(+d + DAY)) return { ...s, today: now >= d, at: d };
  }
  return null;
}

export function nextDue(now = new Date()) {
  for (const a of ASSIGNMENTS) {
    const d = new Date(local(a.due).getTime() + 18 * 3600000); // 18:00
    if (now < d) return { ...a, at: d };
  }
  return null;
}

export function niceDate(d) {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Ho_Chi_Minh' });
}
