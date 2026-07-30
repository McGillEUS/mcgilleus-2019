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

function cleanDesc(raw) {
  return String(raw || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanWebsite(raw) {
  let s = String(raw || "").trim();
  if (!s) return "";
  // Drop trailing notes in parentheses
  s = s.replace(/\s*\([^)]*\)\s*$/g, "").trim();
  if (
    /^(n\/?a|n\.a\.?|none|no|norp|-|<coming soon>|coming soon)(\s*\?)?$/i.test(s)
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
  if (!s || /^(n\/?a|none|no)$/i.test(s)) return "";
  // Prefer the first @handle when several are listed
  const handles = [...s.matchAll(/@([\w.]+)/g)].map((m) => m[1]);
  if (handles.length) {
    return `https://www.instagram.com/${handles[0]}`;
  }
  if (/instagram\.com\//i.test(s)) {
    const m = s.match(/instagram\.com\/([^/?\s]+)/i);
    return m ? `https://www.instagram.com/${m[1]}` : "";
  }
  const first = s.split(/[,;\s]+/)[0].replace(/^@/, "");
  if (!/^[\w.]+$/.test(first)) return "";
  return `https://www.instagram.com/${first}`;
}

const csvPath =
  process.argv[2] ||
  "c:/Users/celes/Downloads/Departments Handbook Information 2026-2027.csv/Departments Handbook Information 2026-2027.csv";
const groupsPath = path.join(__dirname, "..", "data", "groups.json");

const rows = parseCSV(fs.readFileSync(csvPath, "utf8"));
const header = rows[0];
const data = rows.slice(1);

const idx = {
  dept: header.findIndex((h) => /Department Name/i.test(h)),
  overview: header.findIndex((h) => /Overview of your council/i.test(h)),
  intro: header.findIndex((h) => /President Introduction/i.test(h)),
  website: header.findIndex((h) => /Website URL/i.test(h)),
  ig: header.findIndex((h) => /Instagram Username/i.test(h)),
};

const aliases = {
  mechanical: "mame",
  "mcgill association of mechanical engineers": "mame",
  mame: "mame",
  "co op mining engineering undergraduate society cmeus": "cmeus",
  cmeus: "cmeus",
  mining: "cmeus",
  ecsess: "ecsess",
  "electrical computer and software engineering student society": "ecsess",
  bioengineering: "buss",
  "bioengineering undergraduate student society": "buss",
  buss: "buss",
  "architecture student association": "asa",
  asa: "asa",
  "civil engineering": "ceus",
  ceus: "ceus",
  chess: "chess",
  "chemical engineering students society": "chess",
};

const groups = JSON.parse(fs.readFileSync(groupsPath, "utf8"));
const matched = [];
const unmatched = [];

for (const r of data) {
  const deptName = (r[idx.dept] || "").trim();
  if (!deptName) continue;

  const overview = cleanDesc(r[idx.overview]);
  const intro = cleanDesc(r[idx.intro]);
  const description = overview || intro;
  const website = cleanWebsite(r[idx.website]);
  const instagram = cleanInstagram(r[idx.ig]);

  const n = norm(deptName);
  let id = aliases[n];
  if (!id) {
    // try contains key
    const hit = Object.keys(aliases).find((key) => n.includes(key) || key.includes(n));
    id = hit ? aliases[hit] : null;
  }

  const group = id ? groups.find((g) => g.id === id) : null;
  if (!group) {
    unmatched.push(deptName);
    continue;
  }

  matched.push({ dept: deptName, id: group.id });
  if (description) group.description = description;
  group.links = group.links || { website: "", instagram: "", form: "" };
  if (website) group.links.website = website;
  if (instagram) group.links.instagram = instagram;
}

fs.writeFileSync(groupsPath, `${JSON.stringify(groups, null, 2)}\n`);
console.log(`Matched: ${matched.length}`);
matched.forEach((m) => console.log(`  ${m.dept} => ${m.id}`));
console.log(`Unmatched: ${unmatched.length}`);
unmatched.forEach((n) => console.log(`  ${n}`));
matched.forEach((m) => {
  const g = groups.find((x) => x.id === m.id);
  console.log(
    `  [${m.id}] desc=${(g.description || "").length}c web=${g.links.website || "-"} ig=${g.links.instagram || "-"}`
  );
});
