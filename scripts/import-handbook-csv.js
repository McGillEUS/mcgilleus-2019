const fs = require("fs");
const path = require("path");

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || (c === "\r" && next === "\n")) {
      if (c === "\r") i++;
      row.push(field);
      field = "";
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    if (row.some((v) => v.trim())) rows.push(row);
  }
  return rows;
}

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''`’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanWebsite(raw) {
  let s = String(raw || "").trim();
  if (
    !s ||
    /^(n\/?a|n\.a\.?|none|no website|we don'?t have one|no|norp|nuh ?huh|-)$/i.test(s)
  ) {
    return "";
  }
  if (/^linktr\.ee\//i.test(s)) s = `https://${s}`;
  if (/^www\./i.test(s)) s = `https://${s}`;
  if (!/^https?:\/\//i.test(s) && /\./.test(s)) s = `https://${s}`;
  try {
    // eslint-disable-next-line no-new
    new URL(s);
    return s;
  } catch {
    return "";
  }
}

function cleanInstagram(raw) {
  let s = String(raw || "").trim();
  if (!s || /^(n\/?a|none|no|norp)$/i.test(s)) return "";
  if (/none \(put/i.test(s)) return "";
  if (/instagram\.com\//i.test(s)) {
    const m = s.match(/instagram\.com\/([^/?\s]+)/i);
    return m ? `https://www.instagram.com/${m[1]}` : "";
  }
  const labeled = s.match(/(?:instagram\s*:?\s*)?@?([\w.]+)/i);
  if (labeled) s = labeled[1];
  s = s.replace(/^@/, "").replace(/\/$/, "").trim();
  if (!/^[\w.]+$/.test(s)) return "";
  return `https://www.instagram.com/${s}`;
}

function cleanDesc(raw) {
  return String(raw || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const csvPath =
  process.argv[2] ||
  "c:/Users/celes/Downloads/EUS Groups Handbook Description.csv/EUS Groups Handbook Description.csv";
const groupsPath = path.join(__dirname, "..", "data", "groups.json");

const rows = parseCSV(fs.readFileSync(csvPath, "utf8"));
const header = rows[0];
const data = rows.slice(1);

const idx = {
  name: header.indexOf("Name of Group"),
  desc: header.findIndex((h) => /Description/i.test(h)),
  website: header.findIndex((h) => /Website URL/i.test(h)),
  ig: header.findIndex((h) => /Instagram Username/i.test(h)),
};

const handbook = data
  .map((r) => ({
    name: (r[idx.name] || "").trim(),
    description: cleanDesc(r[idx.desc]),
    website: cleanWebsite(r[idx.website]),
    instagram: cleanInstagram(r[idx.ig]),
  }))
  .filter((g) => g.name);

const byNorm = new Map();
for (const g of handbook) {
  const key = norm(g.name);
  const prev = byNorm.get(key);
  if (!prev || g.description.length > prev.description.length) byNorm.set(key, g);
}
const uniqueHandbook = [...byNorm.values()];

const groups = JSON.parse(fs.readFileSync(groupsPath, "utf8"));

const aliases = {
  "plumbers student design": "psd",
  "mcgill international genetically engineered machine igem": "igem",
  "promoting opportunities for women in engineering powe": "powe",
  "national society of black engineers": "nsbe",
  "mcgill robotics": "robotics",
  "gamedev mcgill": "gamedev",
  "queer engineer": "queer-engineer",
  "elections eus": "elections",
  "eus sports": "sports",
  "national organization for business engineering nobe": "nobe",
  "mcgill baja racing": "baja",
  "junior council": "junior-council",
  "mental wellness committee": "mental-wellness",
  "sustainability in engineering at mcgill seam": "seam",
  "sustainability at engineering at mcgill seam": "seam",
  "the plumbers faucet": "plumber-s-faucet",
  "plumbers faucet": "plumber-s-faucet",
  "plumbers noble uniform": "pnu",
  "yearbook committee": "yearbook",
  oap: "open-air-pub",
  "reboot mcgill": "reboot",
  "mcgill rocket team": "rocket-team",
  "graduation committee": "grad-committee",
  "engineering socials committee": "esc",
  "ppu plumbers photographer union": "ppu",
  "adventure committee": "engineering-adventures",
  "engineering adventure committee": "engineering-adventures",
  "eus equity mental health": "equity",
  "eus equity": "equity",
  "mcgill enggames": "enggames",
  "mcgill flying club": "flying-club",
  mdvfs: "mdvfs",
  "engineers in action": "engineers-in-action",
  "blues pub": "blues-pub",
  "ieee mcgill": "ieee",
};

function findGroup(hbName) {
  const n = norm(hbName);
  if (Object.prototype.hasOwnProperty.call(aliases, n)) {
    const id = aliases[n];
    if (!id) return null;
    const g = groups.find((x) => x.id === id);
    if (g) return g;
  }
  let hit = groups.find((g) => norm(g.name) === n);
  if (hit) return hit;
  // Exact id/slug only for fuzzy leftover — avoid partial name collisions (BRIDGE ≠ Bridge Building)
  const slug = n.replace(/\s+/g, "-");
  return groups.find((g) => g.id === slug) || null;
}

const matched = [];
const unmatched = [];

for (const hb of uniqueHandbook) {
  const group = findGroup(hb.name);
  if (!group) {
    unmatched.push(hb.name);
    continue;
  }
  matched.push({ handbook: hb.name, id: group.id });
  if (hb.description) group.description = hb.description;
  group.links = group.links || { website: "", instagram: "", form: "" };
  if (hb.website) group.links.website = hb.website;
  if (hb.instagram) group.links.instagram = hb.instagram;
}

fs.writeFileSync(groupsPath, `${JSON.stringify(groups, null, 2)}\n`);
console.log(`Handbook unique: ${uniqueHandbook.length}`);
console.log(`Matched: ${matched.length}`);
matched.forEach((m) => console.log(`  ${m.handbook} => ${m.id}`));
console.log(`Unmatched (${unmatched.length}):`);
unmatched.forEach((n) => console.log(`  ${n}`));
console.log(
  `With description: ${groups.filter((g) => g.description && g.description.trim()).length}/${groups.length}`
);
