const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const session = require("express-session");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const { createCms } = require("./cms");

const ROOT = __dirname;
const DATA_PATH = path.join(ROOT, "data", "contacts.json");
const GROUPS_PATH = path.join(ROOT, "data", "groups.json");
const HOURS_PATH = path.join(ROOT, "data", "hours.json");
const OFFICE_PATH = path.join(ROOT, "data", "office.json");
const CONFIG_PATH = path.join(ROOT, "config.local.json");
const EXAMPLE_CONFIG_PATH = path.join(ROOT, "config.example.json");
const UPLOAD_DIR = path.join(ROOT, "img", "contacts");
const GROUPS_UPLOAD_DIR = path.join(ROOT, "img", "getinvolved");
const DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const GROUP_CATEGORIES = [
  "Departmental Societies",
  "Departmental Committees",
  "Clubs",
  "Committees",
  "Design Teams",
  "Publications",
];
const GROUP_TAGS = [
  "social",
  "design",
  "academic",
  "hands-on",
  "equity",
  "sports",
  "media",
  "leadership",
  "competitive",
  "creative",
  "department",
  "campus",
  "hardware",
  "software",
  "racing",
  "aerospace",
  "research",
  "career",
  "service",
  "events",
  "music",
  "photography",
  "wellness",
  "advocacy",
  "sustainability",
  "gaming",
  "aviation",
  "makerspace",
  "first-year",
  "publications",
  "governance",
  "networking",
];

function loadConfig() {
  const configFile = fs.existsSync(CONFIG_PATH) ? CONFIG_PATH : EXAMPLE_CONFIG_PATH;
  return JSON.parse(fs.readFileSync(configFile, "utf8"));
}

function readContacts() {
  return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
}

function writeContacts(contacts) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(contacts, null, 2) + "\n", "utf8");
}

function readHours() {
  return JSON.parse(fs.readFileSync(HOURS_PATH, "utf8"));
}

function writeHours(hours) {
  fs.writeFileSync(HOURS_PATH, JSON.stringify(hours, null, 2) + "\n", "utf8");
}

function readGroups() {
  if (!fs.existsSync(GROUPS_PATH)) return [];
  return JSON.parse(fs.readFileSync(GROUPS_PATH, "utf8"));
}

function writeGroups(groups) {
  fs.writeFileSync(GROUPS_PATH, JSON.stringify(groups, null, 2) + "\n", "utf8");
}

function slugifyId(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function sanitizeOptionalUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) {
    throw new Error("Links must start with http:// or https://");
  }
  return url;
}

function sanitizeGroup(input, existing) {
  const name = String(input.name || "").trim();
  const category = GROUP_CATEGORIES.includes(input.category)
    ? input.category
    : GROUP_CATEGORIES[0];
  const description = String(input.description || "").trim();
  const active = input.active === false || input.active === "false" ? false : true;
  const sortOrder = Number.parseInt(input.sort_order, 10);
  const tags = Array.isArray(input.tags)
    ? [...new Set(input.tags.map((tag) => String(tag).trim()).filter((tag) => GROUP_TAGS.includes(tag)))]
    : existing
      ? existing.tags || []
      : [];

  const linksInput = input.links && typeof input.links === "object" ? input.links : {};
  const links = {
    website: sanitizeOptionalUrl(
      linksInput.website !== undefined
        ? linksInput.website
        : input.website !== undefined
          ? input.website
          : existing?.links?.website
    ),
    instagram: sanitizeOptionalUrl(
      linksInput.instagram !== undefined
        ? linksInput.instagram
        : input.instagram !== undefined
          ? input.instagram
          : existing?.links?.instagram
    ),
    form: sanitizeOptionalUrl(
      linksInput.form !== undefined
        ? linksInput.form
        : input.form !== undefined
          ? input.form
          : existing?.links?.form
    ),
  };

  let id = existing?.id || slugifyId(input.id || name);
  if (!id) id = `group-${crypto.randomBytes(4).toString("hex")}`;

  return {
    id,
    name,
    category,
    logo: existing ? existing.logo || "" : String(input.logo || "").trim(),
    description,
    photos: existing ? (Array.isArray(existing.photos) ? existing.photos : []) : [],
    links,
    tags,
    active,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : existing?.sort_order || 0,
  };
}

function sortGroups(groups) {
  return [...groups].sort((a, b) => {
    const catA = GROUP_CATEGORIES.indexOf(a.category);
    const catB = GROUP_CATEGORIES.indexOf(b.category);
    if (catA !== catB) return catA - catB;
    return (a.sort_order || 0) - (b.sort_order || 0) || a.name.localeCompare(b.name);
  });
}

function sanitizeHours(input) {
  const timePattern = /^([01]?\d|2[0-3]):([0-5]\d)$/;
  const title = String(input.title || "Office hours").trim() || "Office hours";
  const timezone = String(input.timezone || "America/Montreal").trim() || "America/Montreal";
  const incoming = Array.isArray(input.days) ? input.days : [];
  const byDay = Object.fromEntries(
    incoming.map((day) => [(day.day || "").toLowerCase(), day])
  );

  const days = DAY_ORDER.map((dayKey) => {
    const source = byDay[dayKey] || {};
    const label =
      String(source.label || dayKey.charAt(0).toUpperCase() + dayKey.slice(1)).trim() ||
      dayKey;
    const closed = source.closed === true || source.closed === "true";
    const open = String(source.open || "").trim();
    const close = String(source.close || "").trim();

    if (closed || !open || !close) {
      return { day: dayKey, label, open: "", close: "", closed: true };
    }
    if (!timePattern.test(open) || !timePattern.test(close)) {
      throw new Error(`Invalid time for ${dayKey}. Use HH:MM (24-hour).`);
    }
    return { day: dayKey, label, open, close, closed: false };
  });

  const summerMode = input.summerMode === true || input.summerMode === "true";
  const summerMessage =
    String(
      input.summerMessage ||
        "Over the summer, our office hours change often. Check Instagram for the most up-to-date schedule."
    ).trim() ||
    "Over the summer, our office hours change often. Check Instagram for the most up-to-date schedule.";
  let instagramUrl = String(
    input.instagramUrl || "https://www.instagram.com/mcgilleus/"
  ).trim();
  if (!/^https?:\/\//i.test(instagramUrl)) {
    instagramUrl = "https://www.instagram.com/mcgilleus/";
  }
  const instagramLabel =
    String(input.instagramLabel || "Check Instagram").trim() || "Check Instagram";

  return {
    timezone,
    title,
    summerMode,
    summerMessage,
    instagramUrl,
    instagramLabel,
    days,
  };
}

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized" });
}

function yearSortKey(year) {
  const match = String(year || "").match(/(\d{4})/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function sanitizeContact(input, existing) {
  const section = input.section === "representation" ? "representation" : "executive";
  const sortOrder = Number.parseInt(input.sort_order, 10);
  const active = input.active === false || input.active === "false" ? false : true;
  let year = String(input.year || "").trim();

  if (active) {
    year = "";
  } else if (section === "executive" && !year) {
    throw new Error("Year / term is required for past executives (e.g. 2024–25).");
  }

  return {
    id: existing ? existing.id : crypto.randomUUID(),
    name: String(input.name || "").trim(),
    role: String(input.role || "").trim(),
    email: String(input.email || "").trim(),
    section,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 99,
    photo_path: existing ? existing.photo_path || "" : "",
    active,
    year,
  };
}

function readPastExecutives() {
  return readContacts()
    .filter(
      (c) =>
        c.section === "executive" &&
        c.active === false &&
        String(c.year || "").trim()
    )
    .sort((a, b) => {
      const yearDiff = yearSortKey(b.year) - yearSortKey(a.year);
      if (yearDiff !== 0) return yearDiff;
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
}

const config = loadConfig();
const app = express();

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(GROUPS_UPLOAD_DIR, { recursive: true });

function makeImageUpload(destination) {
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, destination),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
        const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"].includes(ext)
          ? ext
          : ".jpg";
        cb(null, `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${safeExt}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (/^image\//.test(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Only image uploads are allowed"));
      }
    },
  });
}

const upload = makeImageUpload(UPLOAD_DIR);
const uploadGroupImage = makeImageUpload(GROUPS_UPLOAD_DIR);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: config.sessionSecret || "change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

app.get("/api/contacts", (_req, res) => {
  const contacts = readContacts()
    .filter((c) => c.active !== false)
    .sort((a, b) => {
      if (a.section !== b.section) {
        return a.section === "executive" ? -1 : 1;
      }
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
  res.json(contacts);
});

app.get("/api/past-executives", (_req, res) => {
  res.json(readPastExecutives());
});

app.get("/api/hours", (_req, res) => {
  res.json(readHours());
});

app.get("/api/office", (_req, res) => {
  res.json(JSON.parse(fs.readFileSync(OFFICE_PATH, "utf8")));
});

const cms = createCms({
  ROOT,
  requireAuth,
  GROUP_CATEGORIES,
  GROUP_TAGS,
  makeImageUpload,
});
cms.mount(app);

app.get("/api/public-config", (_req, res) => {
  res.json({
    mapboxToken: config.mapboxToken || "",
  });
});

app.get("/api/admin/hours", requireAuth, (_req, res) => {
  res.json(readHours());
});

app.put("/api/admin/hours", requireAuth, (req, res) => {
  try {
    const hours = sanitizeHours(req.body);
    writeHours(hours);
    res.json(hours);
  } catch (error) {
    res.status(400).json({ error: error.message || "Invalid hours payload" });
  }
});

app.get("/api/admin/session", (req, res) => {
  res.json({ authenticated: Boolean(req.session && req.session.authenticated) });
});

app.post("/api/admin/login", (req, res) => {
  const username = String(req.body.username || "");
  const password = String(req.body.password || "");
  const userOk = username === config.adminUsername;
  const passOk = bcrypt.compareSync(password, config.adminPasswordHash || "");
  if (!userOk || !passOk) {
    return res.status(401).json({ error: "Invalid username or password" });
  }
  req.session.authenticated = true;
  res.json({ ok: true });
});

app.post("/api/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get("/api/admin/contacts", requireAuth, (_req, res) => {
  const contacts = readContacts().sort((a, b) => {
    if (a.section !== b.section) {
      return a.section === "executive" ? -1 : 1;
    }
    return (a.sort_order || 0) - (b.sort_order || 0);
  });
  res.json(contacts);
});

app.post("/api/admin/contacts", requireAuth, (req, res) => {
  try {
    const contacts = readContacts();
    const contact = sanitizeContact(req.body);
    if (!contact.name || !contact.role) {
      return res.status(400).json({ error: "Name and role are required" });
    }
    if (contact.active && !contact.email) {
      return res.status(400).json({ error: "Email is required for active contacts" });
    }
    contacts.push(contact);
    writeContacts(contacts);
    res.status(201).json(contact);
  } catch (error) {
    res.status(400).json({ error: error.message || "Invalid contact" });
  }
});

app.put("/api/admin/contacts/:id", requireAuth, (req, res) => {
  try {
    const contacts = readContacts();
    const index = contacts.findIndex((c) => c.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: "Contact not found" });
    }
    const updated = sanitizeContact(req.body, contacts[index]);
    if (!updated.name || !updated.role) {
      return res.status(400).json({ error: "Name and role are required" });
    }
    if (updated.active && !updated.email) {
      return res.status(400).json({ error: "Email is required for active contacts" });
    }
    contacts[index] = updated;
    writeContacts(contacts);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message || "Invalid contact" });
  }
});

app.delete("/api/admin/contacts/:id", requireAuth, (req, res) => {
  const contacts = readContacts();
  const index = contacts.findIndex((c) => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Contact not found" });
  }
  const [removed] = contacts.splice(index, 1);
  writeContacts(contacts);
  res.json({ ok: true, removed });
});

app.post("/api/admin/contacts/:id/photo", requireAuth, (req, res) => {
  upload.single("photo")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Upload failed" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No photo uploaded" });
    }

    const contacts = readContacts();
    const index = contacts.findIndex((c) => c.id === req.params.id);
    if (index === -1) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: "Contact not found" });
    }

    const previous = contacts[index].photo_path;
    contacts[index].photo_path = path.posix.join("img/contacts", req.file.filename);
    writeContacts(contacts);

    if (previous && previous.startsWith("img/contacts/") && !previous.includes("placeholder")) {
      const previousPath = path.join(ROOT, previous);
      if (fs.existsSync(previousPath)) {
        fs.unlinkSync(previousPath);
      }
    }

    res.json(contacts[index]);
  });
});

app.get("/api/groups", (_req, res) => {
  res.json(sortGroups(readGroups().filter((group) => group.active !== false)));
});

app.get("/api/groups/meta", (_req, res) => {
  res.json({ categories: GROUP_CATEGORIES, tags: GROUP_TAGS });
});

app.get("/api/admin/groups", requireAuth, (_req, res) => {
  res.json(sortGroups(readGroups()));
});

app.post("/api/admin/groups", requireAuth, (req, res) => {
  try {
    const groups = readGroups();
    const group = sanitizeGroup(req.body);
    if (!group.name) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (groups.some((item) => item.id === group.id)) {
      group.id = `${group.id}-${crypto.randomBytes(2).toString("hex")}`;
    }
    if (!group.sort_order) {
      group.sort_order = groups.length + 1;
    }
    groups.push(group);
    writeGroups(groups);
    res.status(201).json(group);
  } catch (error) {
    res.status(400).json({ error: error.message || "Invalid group" });
  }
});

app.put("/api/admin/groups/:id", requireAuth, (req, res) => {
  try {
    const groups = readGroups();
    const index = groups.findIndex((group) => group.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: "Group not found" });
    }
    const updated = sanitizeGroup(req.body, groups[index]);
    if (!updated.name) {
      return res.status(400).json({ error: "Name is required" });
    }
    updated.id = groups[index].id;
    groups[index] = updated;
    writeGroups(groups);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message || "Invalid group" });
  }
});

app.delete("/api/admin/groups/:id", requireAuth, (req, res) => {
  const groups = readGroups();
  const index = groups.findIndex((group) => group.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Group not found" });
  }
  const [removed] = groups.splice(index, 1);
  writeGroups(groups);
  res.json({ ok: true, removed });
});

app.post("/api/admin/groups/:id/logo", requireAuth, (req, res) => {
  uploadGroupImage.single("logo")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Upload failed" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No logo uploaded" });
    }

    const groups = readGroups();
    const index = groups.findIndex((group) => group.id === req.params.id);
    if (index === -1) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: "Group not found" });
    }

    const previous = groups[index].logo;
    groups[index].logo = path.posix.join("img/getinvolved", req.file.filename);
    writeGroups(groups);

    if (
      previous &&
      previous.startsWith("img/getinvolved/") &&
      previous !== groups[index].logo &&
      !previous.match(/\b(asa|buss|ceus)\b/i)
    ) {
      // Only delete generated uploads (timestamped filenames), never seed logos
      if (/\/\d{10,}-[a-f0-9]+\./i.test(previous)) {
        const previousPath = path.join(ROOT, previous);
        if (fs.existsSync(previousPath)) fs.unlinkSync(previousPath);
      }
    }

    res.json(groups[index]);
  });
});

app.post("/api/admin/groups/:id/photos", requireAuth, (req, res) => {
  uploadGroupImage.single("photo")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Upload failed" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No photo uploaded" });
    }

    const groups = readGroups();
    const index = groups.findIndex((group) => group.id === req.params.id);
    if (index === -1) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: "Group not found" });
    }

    if (!Array.isArray(groups[index].photos)) groups[index].photos = [];
    groups[index].photos.push(path.posix.join("img/getinvolved", req.file.filename));
    writeGroups(groups);
    res.json(groups[index]);
  });
});

app.delete("/api/admin/groups/:id/photos", requireAuth, (req, res) => {
  const photoPath = String(req.body?.path || "").trim();
  if (!photoPath.startsWith("img/getinvolved/")) {
    return res.status(400).json({ error: "Invalid photo path" });
  }

  const groups = readGroups();
  const index = groups.findIndex((group) => group.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Group not found" });
  }

  const photos = Array.isArray(groups[index].photos) ? groups[index].photos : [];
  const photoIndex = photos.indexOf(photoPath);
  if (photoIndex === -1) {
    return res.status(404).json({ error: "Photo not found on group" });
  }

  photos.splice(photoIndex, 1);
  groups[index].photos = photos;
  writeGroups(groups);

  if (/\/\d{10,}-[a-f0-9]+\./i.test(photoPath)) {
    const absolute = path.join(ROOT, photoPath);
    if (fs.existsSync(absolute)) fs.unlinkSync(absolute);
  }

  res.json(groups[index]);
});

app.use(express.static(ROOT, { extensions: ["html"] }));

const port = Number(config.port) || 3000;
app.listen(port, () => {
  console.log(`EUS site running at http://localhost:${port}`);
  console.log(`Admin panel: http://localhost:${port}/admin/`);
});
