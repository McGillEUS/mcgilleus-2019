const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

function createCms({ ROOT, requireAuth, GROUP_CATEGORIES, GROUP_TAGS, makeImageUpload }) {
  const DOCS = {
    site: path.join(ROOT, "data", "site.json"),
    home: path.join(ROOT, "data", "home.json"),
    involved: path.join(ROOT, "data", "involved.json"),
    "contact-page": path.join(ROOT, "data", "contact-page.json"),
    resources: path.join(ROOT, "data", "resources.json"),
    quiz: path.join(ROOT, "data", "quiz.json"),
    office: path.join(ROOT, "data", "office.json"),
  };

  const UPLOAD_DIR = path.join(ROOT, "img", "uploads");
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const upload = makeImageUpload(UPLOAD_DIR);

  function readDoc(key) {
    const file = DOCS[key];
    if (!file || !fs.existsSync(file)) {
      throw new Error(`Unknown content document: ${key}`);
    }
    return JSON.parse(fs.readFileSync(file, "utf8"));
  }

  function writeDoc(key, data) {
    const file = DOCS[key];
    if (!file) throw new Error(`Unknown content document: ${key}`);
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
  }

  function trimStr(value, max = 2000) {
    return String(value ?? "").trim().slice(0, max);
  }

  function sanitizeHref(value, { allowRelative = true } = {}) {
    const href = trimStr(value, 2000);
    if (!href) return "";
    if (/^https?:\/\//i.test(href) || /^tel:/i.test(href) || /^mailto:/i.test(href)) {
      return href;
    }
    if (allowRelative && /^[./a-zA-Z0-9_-]+\.html([?#].*)?$/.test(href)) {
      return href;
    }
    if (allowRelative && /^img\//i.test(href)) {
      return href;
    }
    if (allowRelative && href.startsWith("#")) {
      return href.slice(0, 200);
    }
    throw new Error(`Invalid link: ${href}`);
  }

  function sanitizeImagePath(value) {
    const image = trimStr(value, 300);
    if (!image) return "";
    if (/^img\//i.test(image) || /^https?:\/\//i.test(image)) return image;
    throw new Error(`Invalid image path: ${image}`);
  }

  function sanitizeSite(input) {
    const brand = input.brand || {};
    const nav = Array.isArray(input.nav) ? input.nav : [];
    const footer = input.footer || {};
    return {
      brand: {
        name: trimStr(brand.name, 80) || "McGill EUS",
        logo: sanitizeImagePath(brand.logo) || "img/eus_logo.png",
        homeHref: sanitizeHref(brand.homeHref || "index.html"),
      },
      nav: nav.map((item) => ({
        label: trimStr(item.label, 60),
        href: sanitizeHref(item.href, { allowRelative: true }),
        external: Boolean(item.external),
        className: trimStr(item.className || "", 80),
      })).filter((item) => item.label && item.href),
      footer: {
        pageLinks: (Array.isArray(footer.pageLinks) ? footer.pageLinks : []).map((item) => ({
          label: trimStr(item.label, 60),
          href: sanitizeHref(item.href),
        })).filter((item) => item.label && item.href),
        socials: (Array.isArray(footer.socials) ? footer.socials : []).map((item) => ({
          label: trimStr(item.label, 60),
          href: sanitizeHref(item.href, { allowRelative: false }),
        })).filter((item) => item.label && item.href),
        visit: {
          lines: (Array.isArray(footer.visit?.lines) ? footer.visit.lines : [])
            .map((line) => trimStr(line, 120))
            .filter(Boolean)
            .slice(0, 6),
          phone: trimStr(footer.visit?.phone, 40),
          phoneHref: sanitizeHref(footer.visit?.phoneHref || "", { allowRelative: false }) || "",
        },
      },
    };
  }

  function sanitizeHome(input) {
    const hero = input.hero || {};
    const loader = input.loader || {};
    return {
      hero: {
        image: sanitizeImagePath(hero.image) || "img/background_trottier.jpg",
        eyebrow: trimStr(hero.eyebrow, 80),
        title: trimStr(hero.title, 120) || "Engineering Undergraduate Society",
        lead: trimStr(hero.lead, 600),
        ctas: (Array.isArray(hero.ctas) ? hero.ctas : []).map((cta) => ({
          label: trimStr(cta.label, 60),
          href: sanitizeHref(cta.href),
          external: Boolean(cta.external),
          style: cta.style === "primary" ? "primary" : "ghost",
        })).filter((cta) => cta.label && cta.href),
      },
      loader: {
        shots: (Array.isArray(loader.shots) ? loader.shots : [])
          .map((shot) => sanitizeImagePath(shot))
          .filter(Boolean)
          .slice(0, 12),
        finalImage: sanitizeImagePath(loader.finalImage) || "img/background_trottier.jpg",
        brandLeft: trimStr(loader.brandLeft, 40) || "McGill",
        brandRight: trimStr(loader.brandRight, 40) || "EUS",
      },
    };
  }

  function sanitizeInvolved(input) {
    const hero = input.hero || {};
    const quizUi = input.quizUi || {};
    return {
      hero: {
        title: trimStr(hero.title, 80) || "Get Involved",
        lead: trimStr(hero.lead, 400),
        ctaLabel: trimStr(hero.ctaLabel, 60) || "Find a group for you",
      },
      mainTitle: trimStr(input.mainTitle, 80) || "All groups",
      quizUi: {
        resultsTitle: trimStr(quizUi.resultsTitle, 80) || "Your top matches",
        emptyMessage: trimStr(quizUi.emptyMessage, 300),
        retakeLabel: trimStr(quizUi.retakeLabel, 60) || "Retake quiz",
        browseLabel: trimStr(quizUi.browseLabel, 60) || "Browse all groups",
        closeLabel: trimStr(quizUi.closeLabel, 40) || "Close",
        progressTemplate: trimStr(quizUi.progressTemplate, 80) || "Question {n} of {total}",
      },
    };
  }

  function sanitizeContactPage(input) {
    const directory = input.directory || {};
    return {
      heroTitle: trimStr(input.heroTitle, 80) || "Contact Us",
      executiveHeading: trimStr(input.executiveHeading, 80) || "Executive Team",
      representationHeading: trimStr(input.representationHeading, 80) || "Representation",
      mapLabel: trimStr(input.mapLabel, 80) || "EUS Office",
      pastHeading: trimStr(input.pastHeading, 80) || "Past Executives",
      directory: {
        title: trimStr(directory.title, 80),
        body: trimStr(directory.body, 600),
        linkLabel: trimStr(directory.linkLabel, 80),
        href: directory.href ? sanitizeHref(directory.href, { allowRelative: false }) : "",
      },
    };
  }

  function sanitizeOffice(input) {
    const lat = Number(input.lat);
    const lng = Number(input.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error("Office lat/lng must be numbers");
    }
    return {
      id: trimStr(input.id, 64) || "eus-office",
      name: trimStr(input.name, 80) || "EUS Office",
      eyebrow: trimStr(input.eyebrow, 80),
      shortAddress: trimStr(input.shortAddress, 120),
      address: trimStr(input.address, 240),
      lat,
      lng,
      phone: trimStr(input.phone, 40),
      phoneHref: sanitizeHref(input.phoneHref || "", { allowRelative: false }),
      mapsUrl: sanitizeHref(input.mapsUrl || "", { allowRelative: false }),
    };
  }

  function sanitizeResources(input) {
    const featured = input.featured || {};
    const directory = input.directory || {};
    const shortLinks = input.shortLinks || {};
    return {
      hero: {
        title: trimStr(input.hero?.title, 80) || "Resources",
        lead: trimStr(input.hero?.lead, 400),
      },
      featured: {
        ariaLabel: trimStr(featured.ariaLabel, 80) || "Services and wiki",
        items: (Array.isArray(featured.items) ? featured.items : []).map((item, index) => ({
          id: trimStr(item.id, 64) || `item-${index + 1}`,
          logo: sanitizeImagePath(item.logo),
          title: trimStr(item.title, 120),
          text: trimStr(item.text, 500),
          ctaLabel: trimStr(item.ctaLabel, 80) || "Visit website →",
          href: sanitizeHref(item.href, { allowRelative: false }),
        })).filter((item) => item.title && item.href),
      },
      directory: {
        title: trimStr(directory.title, 80) || "Forms & documents",
        intro: trimStr(directory.intro, 400),
        categories: (Array.isArray(directory.categories) ? directory.categories : []).map((cat, index) => ({
          id: trimStr(cat.id, 64) || `category-${index + 1}`,
          title: trimStr(cat.title, 120),
          links: (Array.isArray(cat.links) ? cat.links : []).map((link) => ({
            name: trimStr(link.name, 120),
            desc: trimStr(link.desc, 300),
            href: sanitizeHref(link.href, { allowRelative: false }),
          })).filter((link) => link.name && link.href),
        })).filter((cat) => cat.title),
      },
      shortLinks: {
        title: trimStr(shortLinks.title, 80) || "All short links",
        items: (Array.isArray(shortLinks.items) ? shortLinks.items : []).map((item) => ({
          label: trimStr(item.label, 120),
          href: sanitizeHref(item.href, { allowRelative: false }),
          hostLabel: trimStr(item.hostLabel, 120),
        })).filter((item) => item.label && item.href),
      },
    };
  }

  function sanitizeQuiz(input) {
    const questionsIn = input.questions && typeof input.questions === "object" ? input.questions : {};
    const questions = {};
    Object.entries(questionsIn).forEach(([id, question]) => {
      const qid = trimStr(id, 64);
      if (!qid) return;
      questions[qid] = {
        prompt: trimStr(question.prompt, 200),
        options: (Array.isArray(question.options) ? question.options : []).map((option) => {
          const boost = {};
          Object.entries(option.boost || {}).forEach(([tag, weight]) => {
            if (!GROUP_TAGS.includes(tag)) return;
            const n = Number(weight);
            if (Number.isFinite(n)) boost[tag] = n;
          });
          const penalize = {};
          Object.entries(option.penalize || {}).forEach(([tag, weight]) => {
            if (!GROUP_TAGS.includes(tag)) return;
            const n = Number(weight);
            if (Number.isFinite(n)) penalize[tag] = n;
          });
          const next = option.next ? trimStr(option.next, 64) : "";
          return {
            label: trimStr(option.label, 160),
            why: trimStr(option.why, 160),
            boost,
            ...(Object.keys(penalize).length ? { penalize } : {}),
            preferCategories: (Array.isArray(option.preferCategories) ? option.preferCategories : [])
              .filter((cat) => GROUP_CATEGORIES.includes(cat)),
            avoidCategories: (Array.isArray(option.avoidCategories) ? option.avoidCategories : [])
              .filter((cat) => GROUP_CATEGORIES.includes(cat)),
            ...(next ? { next } : {}),
          };
        }).filter((option) => option.label),
      };
    });

    const startId = trimStr(input.startId, 64) || "start";
    if (!questions[startId]) {
      throw new Error(`Quiz start question "${startId}" is missing`);
    }

    const whyLabels = {};
    Object.entries(input.whyLabels || {}).forEach(([tag, label]) => {
      if (GROUP_TAGS.includes(tag)) whyLabels[tag] = trimStr(label, 80);
    });

    const pathDepth = Number(input.pathDepth);
    return {
      startId,
      pathDepth: Number.isFinite(pathDepth) && pathDepth > 0 ? Math.round(pathDepth) : 3,
      whyLabels,
      questions,
    };
  }

  const SANITIZERS = {
    site: sanitizeSite,
    home: sanitizeHome,
    involved: sanitizeInvolved,
    "contact-page": sanitizeContactPage,
    resources: sanitizeResources,
    quiz: sanitizeQuiz,
    office: sanitizeOffice,
  };

  function mount(app) {
    Object.keys(DOCS).forEach((key) => {
      app.get(`/api/${key}`, (_req, res) => {
        try {
          res.json(readDoc(key));
        } catch (error) {
          res.status(500).json({ error: error.message || "Failed to read content" });
        }
      });

      app.get(`/api/admin/${key}`, requireAuth, (_req, res) => {
        try {
          res.json(readDoc(key));
        } catch (error) {
          res.status(500).json({ error: error.message || "Failed to read content" });
        }
      });

      app.put(`/api/admin/${key}`, requireAuth, (req, res) => {
        try {
          const data = SANITIZERS[key](req.body || {});
          writeDoc(key, data);
          res.json(data);
        } catch (error) {
          res.status(400).json({ error: error.message || "Invalid content" });
        }
      });
    });

    app.post("/api/admin/upload", requireAuth, (req, res) => {
      upload.single("image")(req, res, (err) => {
        if (err) {
          return res.status(400).json({ error: err.message || "Upload failed" });
        }
        if (!req.file) {
          return res.status(400).json({ error: "No image uploaded" });
        }
        res.status(201).json({
          path: path.posix.join("img/uploads", req.file.filename),
        });
      });
    });
  }

  return { mount, readDoc, writeDoc };
}

module.exports = { createCms };
