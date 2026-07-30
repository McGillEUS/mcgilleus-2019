const fs = require("fs");
const path = require("path");

/** Distinctive tags per group — used by the Find-a-group quiz */
const TAGS_BY_ID = {
  asa: ["department", "academic", "creative", "social", "leadership"],
  buss: ["department", "academic", "research", "career", "social", "leadership"],
  ceus: ["department", "academic", "social", "networking", "leadership"],
  chess: ["department", "academic", "career", "networking", "social", "leadership"],
  ecsess: ["department", "academic", "software", "hardware", "social", "leadership"],
  mame: ["department", "academic", "hands-on", "makerspace", "social", "leadership"],
  meus: ["department", "academic", "social", "leadership"],
  cmeus: ["department", "academic", "career", "networking", "social", "leadership"],

  ieee: ["department", "academic", "hardware", "software", "hands-on", "career"],
  "the-factory": ["department", "hands-on", "hardware", "makerspace", "design"],
  codejam: ["department", "software", "competitive", "hands-on", "gaming"],
  fishbowl: ["department", "hands-on", "makerspace", "social"],
  csce: ["department", "academic", "career", "networking"],

  "brewing-club": ["social", "campus", "creative"],
  "engineers-in-action": ["service", "hands-on", "advocacy", "campus", "leadership"],
  gamedev: ["software", "gaming", "creative", "competitive", "hands-on", "campus"],
  nobe: ["career", "networking", "leadership", "campus"],
  nsbe: ["equity", "advocacy", "career", "networking", "campus", "leadership"],
  powe: ["equity", "advocacy", "career", "networking", "campus", "leadership"],
  "queer-engineer": ["equity", "advocacy", "social", "campus", "wellness"],
  reboot: ["service", "hardware", "software", "hands-on", "campus"],
  "flying-club": ["aviation", "campus", "hands-on", "social"],
  mtsc: ["campus", "social", "events"],

  "blues-pub": ["events", "social", "music", "campus"],
  "e-line": ["events", "social", "campus", "first-year"],
  "engineering-adventures": ["events", "social", "campus"],
  enggames: ["competitive", "sports", "social", "events", "campus"],
  esc: ["events", "social", "campus"],
  elections: ["governance", "leadership", "advocacy", "campus"],
  equity: ["equity", "advocacy", "wellness", "campus", "leadership"],
  sports: ["sports", "social", "events", "campus"],
  "grad-committee": ["events", "social", "campus", "leadership"],
  "junior-council": ["first-year", "social", "events", "leadership", "campus"],
  "mental-wellness": ["wellness", "social", "campus", "advocacy"],
  "open-air-pub": ["events", "social", "music", "campus"],
  psd: ["creative", "design", "media", "service", "campus"],
  seam: ["sustainability", "advocacy", "campus", "leadership"],
  pnu: ["social", "events", "campus", "creative"],
  ppu: ["photography", "creative", "media", "events", "campus"],
  yearbook: ["media", "creative", "publications", "campus"],

  biodesign: ["design", "hands-on", "research", "competitive", "hardware"],
  "rocket-team": ["design", "hands-on", "aerospace", "competitive", "hardware"],
  "chem-e-car": ["design", "hands-on", "competitive", "racing"],
  "concrete-canoe": ["design", "hands-on", "competitive"],
  "formula-electric": ["design", "hands-on", "racing", "competitive", "hardware"],
  robotics: ["design", "hands-on", "hardware", "software", "competitive"],
  "bridge-building": ["design", "hands-on", "competitive"],
  mdvfs: ["design", "hands-on", "aerospace", "hardware", "software", "competitive"],
  baja: ["design", "hands-on", "racing", "competitive", "hardware"],
  igem: ["design", "hands-on", "research", "competitive"],

  "plumber-s-faucet": ["media", "creative", "publications", "campus"],
  "mcgill-eus": ["media", "campus", "leadership"],
};

const groupsPath = path.join(__dirname, "..", "data", "groups.json");
const groups = JSON.parse(fs.readFileSync(groupsPath, "utf8"));
let updated = 0;

for (const group of groups) {
  const tags = TAGS_BY_ID[group.id];
  if (!tags) {
    console.warn("No tag map for", group.id);
    continue;
  }
  group.tags = [...tags];
  updated += 1;
}

fs.writeFileSync(groupsPath, `${JSON.stringify(groups, null, 2)}\n`);
console.log(`Updated tags for ${updated}/${groups.length} groups`);
