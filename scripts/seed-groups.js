const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "getting-involved.html"), "utf8");

const tagMap = {
  "Departmental Societies": ["academic", "leadership", "department"],
  "Departmental Committees": ["academic", "hands-on", "department"],
  Clubs: ["social", "campus"],
  Committees: ["leadership", "social", "campus"],
  "Design Teams": ["hands-on", "design", "competitive"],
  Publications: ["media", "creative"],
};

function slug(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const sections = [];
let current = null;
const re =
  /<h2 class="involved-category">([^<]+)<\/h2>|href="([^"]+)"[^>]*>\s*<img src="([^"]+)" alt="([^"]+)"/g;
let match;
while ((match = re.exec(html))) {
  if (match[1]) {
    current = match[1].trim();
    sections.push({ category: current, items: [] });
  } else if (current && match[2]) {
    sections[sections.length - 1].items.push({
      href: match[2],
      logo: match[3].replace(/\\/g, "/"),
      name: match[4],
    });
  }
}

const groups = [];
let order = 0;
for (const section of sections) {
  for (const item of section.items) {
    order += 1;
    groups.push({
      id: slug(item.name),
      name: item.name,
      category: section.category,
      logo: item.logo,
      description: "",
      photos: [],
      links: {
        website: "",
        instagram: item.href,
        form: "",
      },
      tags: tagMap[section.category] || ["campus"],
      active: true,
      sort_order: order,
    });
  }
}

const outPath = path.join(ROOT, "data", "groups.json");
fs.writeFileSync(outPath, JSON.stringify(groups, null, 2) + "\n", "utf8");
console.log(`Wrote ${groups.length} groups to ${outPath}`);
