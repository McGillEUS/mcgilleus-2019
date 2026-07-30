function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function yearSortKey(year) {
  const match = String(year || "").match(/(\d{4})/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function initialsFromName(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function mediaHtml(contact) {
  const name = escapeHtml(contact.name);
  const role = escapeHtml(contact.role);
  const photo = String(contact.photo_path || "").trim();

  if (photo) {
    return `
      <div class="demo-card__media">
        <img src="${escapeHtml(photo)}" alt="${name}, ${role}" class="demo-card__image" loading="lazy">
      </div>
    `;
  }

  const initials = escapeHtml(initialsFromName(contact.name) || "?");
  return `
    <div class="demo-card__media demo-card__media--initials" aria-label="${name}, ${role}">
      <span class="demo-card__initials">${initials}</span>
    </div>
  `;
}

function pastPersonHtml(contact) {
  const name = escapeHtml(contact.name);
  const role = escapeHtml(contact.role);
  return `
    <li class="past-executives__person">
      <span class="past-executives__person-role">${role}</span>
      <span class="past-executives__person-name">${name}</span>
    </li>
  `;
}

function cardHtml(contact) {
  const name = escapeHtml(contact.name);
  const role = escapeHtml(contact.role);
  const email = String(contact.email || "").trim();
  const emailHtml = email
    ? `<p class="demo-card__email">${escapeHtml(email)}</p>`
    : "";
  const tagName = email ? "a" : "div";
  const hrefAttr = email ? ` href="mailto:${escapeHtml(email)}"` : "";

  return `
    <div class="section-resource__item">
      <div data-momentum-hover-element class="demo-card__wrap">
        <${tagName} data-momentum-hover-target class="demo-card"${hrefAttr}>
          ${mediaHtml(contact)}
          <div class="demo-card__content">
            <div class="demo-card__name">
              <h3 class="demo-card__h3">${name}</h3>
            </div>
            <p class="demo-card__job-title-p">${role}</p>
            ${emailHtml}
          </div>
        </${tagName}>
      </div>
    </div>
  `;
}

function renderSection(container, contacts) {
  if (!container) return;
  if (!contacts.length) {
    container.innerHTML = '<p class="contact-empty">No contacts listed yet.</p>';
    return;
  }
  container.innerHTML = contacts.map((c) => cardHtml(c)).join("");
}

function groupPastByYear(contacts) {
  const groups = new Map();
  contacts.forEach((contact) => {
    const year = String(contact.year || "").trim();
    if (!year) return;
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(contact);
  });

  return Array.from(groups.entries()).sort(
    (a, b) => yearSortKey(b[0]) - yearSortKey(a[0])
  );
}

function renderPastExecutives(container, contacts) {
  if (!container) return;
  if (!contacts.length) {
    container.hidden = true;
    container.innerHTML = "";
    return;
  }

  const groups = groupPastByYear(contacts);
  const yearsHtml = groups
    .map(([year, people]) => {
      const sorted = people.slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      return `
        <div class="past-executives__year">
          <h3 class="past-executives__year-title">${escapeHtml(year)}</h3>
          <ul class="past-executives__list">
            ${sorted.map(pastPersonHtml).join("")}
          </ul>
        </div>
      `;
    })
    .join("");

  container.hidden = false;
  container.innerHTML = `
    <details class="past-executives__details">
      <summary class="past-executives__summary">
        <span>${escapeHtml(
          (window.__contactPageCopy && window.__contactPageCopy.pastHeading) || "Past Executives"
        )}</span>
        <span class="past-executives__count">${contacts.length}</span>
      </summary>
      <div class="past-executives__panel">
        ${yearsHtml}
      </div>
    </details>
  `;
}

function normalizeContacts(contacts) {
  return contacts
    .filter((c) => c.active !== false)
    .sort((a, b) => {
      if (a.section !== b.section) {
        return a.section === "executive" ? -1 : 1;
      }
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
}

function normalizePastExecutives(contacts) {
  return contacts
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

async function fetchJsonArray(urls) {
  let lastError = null;
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "default" });
      if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error(`Invalid payload from ${url}`);
      return data;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Could not load data");
}

let contactsBundlePromise = null;

function fetchContactsBundle() {
  if (!contactsBundlePromise) {
    contactsBundlePromise = Promise.all([
      fetchJsonArray(["/api/contacts", "data/contacts.json"]).then(normalizeContacts),
      fetchJsonArray(["/api/past-executives"])
        .then(normalizePastExecutives)
        .catch(async () => {
          const all = await fetchJsonArray(["data/contacts.json"]);
          return normalizePastExecutives(all);
        })
        .catch(() => []),
    ]);
  }
  return contactsBundlePromise;
}

async function loadContacts() {
  const executiveEl = document.getElementById("executive-grid");
  const representationEl = document.getElementById("representation-grid");
  const pastEl = document.getElementById("past-executives");
  const statusEl = document.getElementById("contact-status");

  try {
    const [contacts, past] = await fetchContactsBundle();

    renderSection(
      executiveEl,
      contacts.filter((c) => c.section === "executive")
    );
    renderSection(
      representationEl,
      contacts.filter((c) => c.section === "representation")
    );
    renderPastExecutives(pastEl, past);

    if (statusEl) statusEl.hidden = true;
    if (typeof window.initMomentumBasedHover === "function") {
      window.initMomentumBasedHover();
    }
  } catch (error) {
    console.error(error);
    contactsBundlePromise = null;
    if (statusEl) {
      statusEl.hidden = false;
      if (window.location.protocol === "file:") {
        statusEl.innerHTML =
          'Open this page through the local server: <a href="http://localhost:3000/contact-us.html">http://localhost:3000/contact-us.html</a> (run <code>npm start</code> first).';
      } else {
        statusEl.innerHTML =
          'Could not load contacts. Run <code>npm start</code> and open <a href="http://localhost:3000/contact-us.html">http://localhost:3000/contact-us.html</a>.';
      }
    }
  }
}

window.prefetchContacts = fetchContactsBundle;
window.loadContacts = loadContacts;
document.addEventListener("DOMContentLoaded", () => {
  if (document.body?.hasAttribute("data-barba")) return;
  loadContacts();
});
