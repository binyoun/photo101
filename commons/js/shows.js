// Curated shows in the city's gallery. Staff pick the works; nothing is
// uploaded by students. To hang a show: put the images in
// commons/shows/<show id>/ (long side about 1600px, JPEG), add an entry
// below, newest first. The newest show whose opening date has passed is the
// one on the walls; older ones stay listed as past shows.
//
// {
//   id: '2026s3-light',
//   title: 'Chasing Light',
//   curator: 'Bin Youn',
//   opens: '2026-11-16',
//   note: 'One or two short paragraphs from the curator.',
//   works: [
//     { file: 'nguyen-an-01.jpg', title: 'Morning, District 4', artist: 'Nguyen An', semester: 'Semester 3, 2026', caption: 'Optional line about the work.' },
//   ],
// }

export const SHOWS = [];

// The gallery holds up to this many works at a time
export const SLOTS = 12;

// ?demo previews the layout with work already on the hub (rễRoute at
// Pingyao), so the rooms can be checked before a real show is hung
const DEMO = {
  id: 'demo',
  title: 'Layout preview',
  curator: 'Photo 101 teaching team',
  opens: '2026-01-01',
  note: 'This is a preview of how a show hangs, using work from rễRoute at the Pingyao International Photography Festival 2026. It is not a curated show.',
  dir: '../image/',
  works: [
    ['pingyao-diem-nguyen-vo-hong.jpg', 'Stitching My Roots', 'Diem Nguyen Vo Hong'],
    ['pingyao-chau-ngo-bao.jpg', 'Untitled series (Sa Pa and Ha Noi)', 'Chau Ngo Bao'],
    ['pingyao-cuc-ca-thi.jpg', 'Untitled series (Sa Pa)', 'Cuc Ca Thi'],
    ['pingyao-ton-nguyen.jpg', "There Is a Place I Can't Enter", 'Ton Nguyen'],
    ['pingyao-hao-tran-quoc.jpg', 'The Bond', 'Hao Tran Quoc'],
    ['pingyao-nga-le-thi-tuyet.jpg', 'Fallen leaves return to their roots', 'Nga Le Thi Tuyet'],
    ['pingyao-anh-tran-dang-minh.jpg', 'I Miss', 'Anh Tran Dang Minh'],
    ['pingyao-trang-pham-ha-hoang.jpg', 'Ca Dao', 'Trang Pham Ha Hoang'],
  ].map(([file, title, artist]) => ({ file, title, artist, semester: 'rễRoute, Pingyao 2026' })),
};

const local = (iso) => new Date(iso + 'T00:00:00+07:00'); // Vietnam time

export function currentShow(now = new Date()) {
  if (new URLSearchParams(location.search).has('demo')) return DEMO;
  return SHOWS.find((s) => now >= local(s.opens)) || null;
}

export function pastShows(now = new Date()) {
  const cur = currentShow(now);
  return SHOWS.filter((s) => s !== cur && now >= local(s.opens));
}

export const showDir = (show) => show.dir || `shows/${show.id}/`;
