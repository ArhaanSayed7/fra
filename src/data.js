export const TIRES = [
  "Ultrasoft",
  "Soft",
  "Medium",
  "Hard",
  "Ultrahard",
  "Intermediate",
  "Wet",
];
export const seed = {
  version: 1,
  creators: [
    {
      id: "c1",
      name: "Apex Creative",
      description: "Technical circuits. Built for close racing.",
    },
    {
      id: "c2",
      name: "Overdrive Labs",
      description: "Fast lines and late braking.",
    },
  ],
  tracks: [
    {
      id: "t1",
      creator: "c1",
      name: "Coastal Circuit",
      code: "0000-0000-0001",
      released: "2026-10-01",
      image: "assets/coast.svg",
      description:
        "A flowing seaside circuit with fast sweepers and a technical final sector. Find the rhythm, then find the limit.",
      weather: ["Dry", "Light Rain", "Heavy Rain"],
      cars: ["Prevalents", "Whiplashes", "Customs"],
      hasTires: false,
      tires: [],
    },
    {
      id: "t2",
      creator: "c1",
      name: "Neon Speedway",
      code: "0000-0000-0002",
      released: "2026-10-03",
      image: "assets/night.svg",
      description:
        "An after-dark sprint through a tight city layout. Precision on the brakes makes all the difference.",
      weather: ["Dry", "Light Rain"],
      cars: ["Prevalents", "Whiplashes"],
      hasTires: false,
      tires: [],
    },
    {
      id: "t3",
      creator: "c2",
      name: "Dust Valley",
      code: "0000-0000-0003",
      released: "2026-10-05",
      image: "assets/desert.svg",
      description:
        "Wide-open straights meet unforgiving corners. Carry your speed through the desert and make every exit count.",
      weather: ["Dry"],
      cars: ["Prevalents", "Customs"],
      hasTires: false,
      tires: [],
    },
  ],
  drivers: [
    {
      id: "d1",
      name: "Apex.Jett",
      country: "Canada",
      flag: "🇨🇦",
      avatar: "",
      registered: "2026-09-03",
      number: "27",
      bio: "Chasing the perfect lap.",
    },
    {
      id: "d2",
      name: "Vortex",
      country: "United Kingdom",
      flag: "🇬🇧",
      avatar: "",
      registered: "2026-09-08",
      number: "04",
      bio: "Smooth is fast.",
    },
    {
      id: "d3",
      name: "Kairo",
      country: "Japan",
      flag: "🇯🇵",
      avatar: "",
      registered: "2026-09-12",
      number: "88",
      bio: "One more lap.",
    },
    {
      id: "d4",
      name: "Luna.R",
      country: "Germany",
      flag: "🇩🇪",
      avatar: "",
      registered: "2026-09-17",
      number: "16",
      bio: "Late braking enthusiast.",
    },
    {
      id: "d5",
      name: "Solis",
      country: "Brazil",
      flag: "🇧🇷",
      avatar: "",
      registered: "2026-10-01",
      number: "55",
      bio: "All about the racing line.",
    },
    {
      id: "d6",
      name: "Nox",
      country: "United States",
      flag: "🇺🇸",
      avatar: "",
      registered: "2026-10-04",
      number: "13",
      bio: "Racing after dark.",
    },
  ],
  events: [
    {
      id: "e1",
      name: "Coastal Grand Prix",
      track: "t1",
      date: "2026-10-18",
      qualifying: "18:30",
      race: "19:00",
      timezone: "America/Toronto",
      laps: 24,
      round: "01",
      status: "upcoming",
      description:
        "The preview season opener. Fast corners, ocean air, and a grid ready to race.",
    },
    {
      id: "e2",
      name: "Under the Lights",
      track: "t2",
      date: "2026-10-25",
      qualifying: "18:30",
      race: "19:00",
      timezone: "America/Toronto",
      laps: 32,
      round: "02",
      status: "upcoming",
      description: "A night race where precision and patience win out.",
    },
    {
      id: "e3",
      name: "Desert Showdown",
      track: "t3",
      date: "2026-11-01",
      qualifying: "18:30",
      race: "19:00",
      timezone: "America/Toronto",
      laps: 20,
      round: "03",
      status: "upcoming",
      description: "Wide-open desert racing with everything to play for.",
    },
    {
      id: "e4",
      name: "Coastal Test Race",
      track: "t1",
      date: "2026-10-04",
      qualifying: "18:30",
      race: "19:00",
      timezone: "America/Toronto",
      laps: 12,
      round: "T1",
      status: "past",
      description: "An illustrative test event for the results archive.",
      results: [
        {
          driver: "d1",
          position: 1,
          time: "24:12.480",
          qualifying: "1:42.381",
        },
        { driver: "d3", position: 2, time: "+3.214", qualifying: "1:42.706" },
        { driver: "d2", position: 3, time: "+6.991", qualifying: "1:42.552" },
      ],
    },
  ],
  laps: [
    {
      id: "l1",
      driver: "d1",
      track: "t1",
      weather: "Dry",
      car: "Prevalents",
      custom: "",
      ms: 102381,
      status: "approved",
      proof: "",
      date: "2026-10-08",
      sample: true,
    },
    {
      id: "l2",
      driver: "d2",
      track: "t1",
      weather: "Dry",
      car: "Prevalents",
      custom: "",
      ms: 102552,
      status: "approved",
      proof: "",
      date: "2026-10-09",
      sample: true,
    },
    {
      id: "l3",
      driver: "d3",
      track: "t1",
      weather: "Dry",
      car: "Prevalents",
      custom: "",
      ms: 102706,
      status: "approved",
      proof: "",
      date: "2026-10-09",
      sample: true,
    },
    {
      id: "l4",
      driver: "d4",
      track: "t2",
      weather: "Dry",
      car: "Whiplashes",
      custom: "",
      ms: 78521,
      status: "approved",
      proof: "",
      date: "2026-10-10",
      sample: true,
    },
    {
      id: "l5",
      driver: "d5",
      track: "t3",
      weather: "Dry",
      car: "Prevalents",
      custom: "",
      ms: 91484,
      status: "approved",
      proof: "",
      date: "2026-10-10",
      sample: true,
    },
  ],
};
export function normalizeData(data) {
  data.tracks = data.tracks.map((t) => ({
    ...t,
    hasTires: t.hasTires === true,
    tires:
      t.hasTires === true
        ? TIRES.filter((c) => (t.tires || []).includes(c))
        : [],
  }));
  data.laps = data.laps.map((l) => ({
    ...l,
    tire: typeof l.tire === "string" ? l.tire : "",
  }));
  return data;
}
export function load() {
  try {
    let d = JSON.parse(localStorage.getItem("fra-v1"));
    return normalizeData(d?.version === 1 ? d : structuredClone(seed));
  } catch {
    return normalizeData(structuredClone(seed));
  }
}
export function save(d) {
  localStorage.setItem("fra-v1", JSON.stringify(d));
}
export const uid = () => crypto.randomUUID();
export const formatLap = (ms) =>
  `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
export function parseLap(s) {
  const m = /^(\d{1,2}):([0-5]\d)\.(\d{3})$/.exec(s);
  return m ? Number(m[1]) * 60000 + Number(m[2]) * 1000 + Number(m[3]) : 0;
}
export const date = (d) =>
  new Date(d + "T12:00:00").toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
export const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const safeURL = (s) => {
  try {
    const u = new URL(s, location.href);
    return ["https:", "http:"].includes(u.protocol) ? u.href : "";
  } catch {
    return "";
  }
};
