const loginView = document.getElementById("login-view");
const adminView = document.getElementById("admin-view");
const passwordView = document.getElementById("password-view");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const passwordForm = document.getElementById("password-form");
const passwordError = document.getElementById("password-error");
const passwordStatus = document.getElementById("password-status");
const passwordLead = document.getElementById("password-lead");
const passwordSkipBtn = document.getElementById("password-skip-btn");
const changePasswordBtn = document.getElementById("change-password-btn");
const createForm = document.getElementById("create-form");
const contactsList = document.getElementById("contacts-list");
const adminStatus = document.getElementById("admin-status");
const logoutBtn = document.getElementById("logout-btn");
const hoursForm = document.getElementById("hours-form");
const hoursDays = document.getElementById("hours-days");
const hoursStatus = document.getElementById("hours-status");
const createGroupForm = document.getElementById("create-group-form");
const groupsList = document.getElementById("groups-list");
const groupsStatus = document.getElementById("groups-status");
const createGroupCategory = document.getElementById("create-group-category");
const createGroupTags = document.getElementById("create-group-tags");

let forcePasswordChange = false;

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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
window.escapeHtml = escapeHtml;

function showStatus(message, isError = false) {
  adminStatus.hidden = false;
  adminStatus.textContent = message;
  adminStatus.style.color = isError ? "#8a1f0f" : "#1f6b3a";
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}
window.api = api;

function setAuthed(isAuthed, options = {}) {
  const needsPassword = Boolean(options.mustChangePassword);
  forcePasswordChange = needsPassword;
  loginView.hidden = isAuthed;
  if (passwordView) {
    passwordView.hidden = !isAuthed || (!needsPassword && options.showPassword !== true);
  }
  adminView.hidden = !isAuthed || needsPassword || options.showPassword === true;
  if (passwordSkipBtn) {
    passwordSkipBtn.hidden = needsPassword;
  }
  if (passwordLead && needsPassword) {
    passwordLead.textContent =
      "You’re still using the example admin password. Set a unique password before editing the site.";
  } else if (passwordLead) {
    passwordLead.textContent =
      "Choose a strong password (14+ characters, letters and numbers).";
  }
}

async function enterAdmin() {
  initGroupsUi();
  await Promise.all([
    loadContacts(),
    loadHours(),
    loadGroups(),
    typeof window.loadAllCms === "function" ? window.loadAllCms() : Promise.resolve(),
  ]);
}

function showHoursStatus(message, isError = false) {
  hoursStatus.hidden = false;
  hoursStatus.textContent = message;
  hoursStatus.style.color = isError ? "#8a1f0f" : "#1f6b3a";
}

function syncSummerModeUi() {
  const enabled = Boolean(hoursForm.summerMode && hoursForm.summerMode.checked);
  const fields = document.getElementById("summer-mode-fields");
  const daysWrap = document.getElementById("hours-days-wrap");
  if (fields) fields.hidden = !enabled;
  if (daysWrap) daysWrap.hidden = enabled;
}

function renderHoursForm(data) {
  hoursForm.title.value = data.title || "Office hours";
  hoursForm.timezone.value = data.timezone || "America/Montreal";
  if (hoursForm.summerMode) {
    hoursForm.summerMode.checked = Boolean(data.summerMode);
  }
  if (hoursForm.summerMessage) {
    hoursForm.summerMessage.value =
      data.summerMessage ||
      "Over the summer, our office hours change often. Check Instagram for the most up-to-date schedule.";
  }
  if (hoursForm.instagramUrl) {
    hoursForm.instagramUrl.value =
      data.instagramUrl || "https://www.instagram.com/mcgilleus/";
  }
  if (hoursForm.instagramLabel) {
    hoursForm.instagramLabel.value = data.instagramLabel || "Check Instagram";
  }
  syncSummerModeUi();
  hoursDays.innerHTML = "";

  (data.days || []).forEach((day) => {
    const row = document.createElement("div");
    row.className = "hours-day-row";
    row.dataset.day = day.day;
    row.innerHTML = `
      <strong>${escapeHtml(day.label || day.day)}</strong>
      <label class="inline">
        <input type="checkbox" name="closed" ${day.closed ? "checked" : ""}>
        Closed
      </label>
      <label>
        Open
        <input type="text" name="open" value="${escapeHtml(day.open || "")}" placeholder="10:00" pattern="([01]?\\d|2[0-3]):[0-5]\\d">
      </label>
      <label>
        Close
        <input type="text" name="close" value="${escapeHtml(day.close || "")}" placeholder="17:00" pattern="([01]?\\d|2[0-3]):[0-5]\\d">
      </label>
    `;
    const closedInput = row.querySelector('input[name="closed"]');
    const openInput = row.querySelector('input[name="open"]');
    const closeInput = row.querySelector('input[name="close"]');
    const syncDisabled = () => {
      openInput.disabled = closedInput.checked;
      closeInput.disabled = closedInput.checked;
    };
    closedInput.addEventListener("change", syncDisabled);
    syncDisabled();
    hoursDays.appendChild(row);
  });
}

async function loadHours() {
  const data = await api("/api/admin/hours");
  renderHoursForm(data);
}

function syncYearField(form) {
  const activeSelect = form.querySelector('select[name="active"]');
  const yearField = form.querySelector(".year-field");
  const yearInput = form.querySelector('input[name="year"]');
  const emailInput = form.querySelector('input[name="email"]');
  if (!activeSelect || !yearField) return;
  const isPast = activeSelect.value === "false";
  yearField.hidden = !isPast;
  if (yearInput) yearInput.required = isPast;
  if (emailInput) emailInput.required = !isPast;
}

function contactCard(contact) {
  const photo = escapeHtml(contact.photo_path || "/img/contacts/placeholder.svg");
  const isPast = contact.active === false;
  const card = document.createElement("article");
  card.className = `contact-card${isPast ? " contact-card--past" : ""}`;
  card.innerHTML = `
    <img src="${photo}" alt="">
    <form class="edit-form">
      ${isPast ? '<p class="past-badge">Past</p>' : ""}
      <label>Name <input name="name" value="${escapeHtml(contact.name)}" required></label>
      <label>Role <input name="role" value="${escapeHtml(contact.role)}" required></label>
      <label>Email <input name="email" type="email" value="${escapeHtml(contact.email)}" required></label>
      <label>
        Section
        <select name="section">
          <option value="executive" ${contact.section === "executive" ? "selected" : ""}>Executive</option>
          <option value="representation" ${contact.section === "representation" ? "selected" : ""}>Representation</option>
        </select>
      </label>
      <label>Sort order <input name="sort_order" type="number" value="${escapeHtml(contact.sort_order)}"></label>
      <label>
        Active
        <select name="active">
          <option value="true" ${!isPast ? "selected" : ""}>Yes</option>
          <option value="false" ${isPast ? "selected" : ""}>No (past)</option>
        </select>
      </label>
      <label class="year-field" ${isPast ? "" : "hidden"}>
        Year / term
        <input name="year" value="${escapeHtml(contact.year || "")}" placeholder="2024–25" ${isPast ? "required" : ""}>
      </label>
      <label class="photo-field">
        Replace photo
        <input name="photo" type="file" accept="image/*">
      </label>
      <div class="contact-actions">
        <button type="submit">Save</button>
        <button type="button" class="danger delete-btn">Delete</button>
        <span class="muted">${escapeHtml(contact.id)}</span>
      </div>
    </form>
  `;

  const form = card.querySelector(".edit-form");
  const activeSelect = form.querySelector('select[name="active"]');
  if (activeSelect) {
    activeSelect.addEventListener("change", () => syncYearField(form));
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    try {
      await api(`/api/admin/contacts/${contact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          role: formData.get("role"),
          email: formData.get("email"),
          section: formData.get("section"),
          sort_order: formData.get("sort_order"),
          active: formData.get("active") === "true",
          year: formData.get("year") || "",
        }),
      });

      const photoInput = form.querySelector('input[name="photo"]');
      if (photoInput.files && photoInput.files[0]) {
        const uploadData = new FormData();
        uploadData.append("photo", photoInput.files[0]);
        await api(`/api/admin/contacts/${contact.id}/photo`, {
          method: "POST",
          body: uploadData,
        });
      }

      showStatus(`Saved ${formData.get("name")}`);
      await loadContacts();
    } catch (error) {
      showStatus(error.message, true);
    }
  });

  card.querySelector(".delete-btn").addEventListener("click", async () => {
    if (!confirm(`Delete ${contact.name}?`)) return;
    try {
      await api(`/api/admin/contacts/${contact.id}`, { method: "DELETE" });
      showStatus(`Deleted ${contact.name}`);
      await loadContacts();
    } catch (error) {
      showStatus(error.message, true);
    }
  });

  return card;
}

async function loadContacts() {
  const contacts = await api("/api/admin/contacts");
  contactsList.innerHTML = "";
  contacts.forEach((contact) => contactsList.appendChild(contactCard(contact)));
}

function showGroupsStatus(message, isError = false) {
  if (!groupsStatus) return;
  groupsStatus.hidden = false;
  groupsStatus.textContent = message;
  groupsStatus.style.color = isError ? "#8a1f0f" : "#1f6b3a";
}

function renderTagCheckboxes(container, selected = []) {
  if (!container) return;
  const selectedSet = new Set(selected);
  container.innerHTML = GROUP_TAGS.map(
    (tag) => `
    <label>
      <input type="checkbox" name="tags" value="${escapeHtml(tag)}" ${
        selectedSet.has(tag) ? "checked" : ""
      }>
      ${escapeHtml(tag)}
    </label>
  `
  ).join("");
}

function fillCategorySelect(select, selected) {
  if (!select) return;
  select.innerHTML = GROUP_CATEGORIES.map(
    (category) =>
      `<option value="${escapeHtml(category)}" ${
        category === selected ? "selected" : ""
      }>${escapeHtml(category)}</option>`
  ).join("");
}

function selectedTagsFrom(root) {
  return Array.from(root.querySelectorAll('input[name="tags"]:checked')).map(
    (input) => input.value
  );
}

function groupCard(group) {
  const card = document.createElement("article");
  card.className = "group-card";
  const logo = escapeHtml(group.logo || "");
  const links = group.links || {};

  card.innerHTML = `
    <img class="group-logo" src="${logo}" alt="${escapeHtml(group.name)} logo">
    <form>
      <label>Name <input name="name" value="${escapeHtml(group.name)}" required></label>
      <label>
        Category
        <select name="category"></select>
      </label>
      <label>Sort order <input name="sort_order" type="number" value="${escapeHtml(
        group.sort_order ?? 0
      )}"></label>
      <label>
        Active
        <select name="active">
          <option value="true" ${group.active !== false ? "selected" : ""}>Yes</option>
          <option value="false" ${group.active === false ? "selected" : ""}>No</option>
        </select>
      </label>
      <label>Instagram <input name="instagram" type="url" value="${escapeHtml(
        links.instagram || ""
      )}"></label>
      <label>Website <input name="website" type="url" value="${escapeHtml(
        links.website || ""
      )}"></label>
      <label>Form <input name="form" type="url" value="${escapeHtml(
        links.form || ""
      )}"></label>
      <label class="full-width">Description <textarea name="description" rows="3">${escapeHtml(
        group.description || ""
      )}</textarea></label>
      <fieldset class="full-width tags-fieldset">
        <legend>Tags</legend>
        <div class="tags-grid" data-tags></div>
      </fieldset>
      <label class="full-width">Replace logo <input name="logo" type="file" accept="image/*"></label>
      <label class="full-width">Add gallery photo <input name="photo" type="file" accept="image/*"></label>
      <div class="group-photos" data-photos></div>
      <div class="contact-actions">
        <button type="submit">Save</button>
        <button type="button" class="danger" data-delete>Delete</button>
      </div>
    </form>
  `;

  const form = card.querySelector("form");
  fillCategorySelect(form.querySelector('select[name="category"]'), group.category);
  renderTagCheckboxes(form.querySelector("[data-tags]"), group.tags || []);

  const photosWrap = form.querySelector("[data-photos]");
  (group.photos || []).forEach((photoPath) => {
    const chip = document.createElement("div");
    chip.className = "group-photo-chip";
    chip.innerHTML = `
      <img src="${escapeHtml(photoPath)}" alt="">
      <button type="button" class="danger" data-remove-photo="${escapeHtml(photoPath)}">×</button>
    `;
    photosWrap.appendChild(chip);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await api(`/api/admin/groups/${group.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.value.trim(),
          category: form.category.value,
          sort_order: form.sort_order.value,
          active: form.active.value === "true",
          description: form.description.value.trim(),
          website: form.querySelector('[name="website"]').value.trim(),
          instagram: form.querySelector('[name="instagram"]').value.trim(),
          form: form.querySelector('[name="form"]').value.trim(),
          tags: selectedTagsFrom(form),
        }),
      });

      const logoInput = form.querySelector('[name="logo"]');
      if (logoInput?.files?.[0]) {
        const logoData = new FormData();
        logoData.append("logo", logoInput.files[0]);
        await api(`/api/admin/groups/${group.id}/logo`, {
          method: "POST",
          body: logoData,
        });
      }

      const photoInput = form.querySelector('[name="photo"]');
      if (photoInput?.files?.[0]) {
        const photoData = new FormData();
        photoData.append("photo", photoInput.files[0]);
        await api(`/api/admin/groups/${group.id}/photos`, {
          method: "POST",
          body: photoData,
        });
      }

      showGroupsStatus("Group saved");
      await loadGroups();
    } catch (error) {
      showGroupsStatus(error.message, true);
    }
  });

  form.querySelector("[data-delete]").addEventListener("click", async () => {
    if (!window.confirm(`Delete ${group.name}?`)) return;
    try {
      await api(`/api/admin/groups/${group.id}`, { method: "DELETE" });
      showGroupsStatus("Group deleted");
      await loadGroups();
    } catch (error) {
      showGroupsStatus(error.message, true);
    }
  });

  form.querySelectorAll("[data-remove-photo]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await api(`/api/admin/groups/${group.id}/photos`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: button.getAttribute("data-remove-photo") }),
        });
        showGroupsStatus("Photo removed");
        await loadGroups();
      } catch (error) {
        showGroupsStatus(error.message, true);
      }
    });
  });

  return card;
}

async function loadGroups() {
  if (!groupsList) return;
  const groups = await api("/api/admin/groups");
  groupsList.innerHTML = "";
  groups.forEach((group) => groupsList.appendChild(groupCard(group)));
}

function initGroupsUi() {
  fillCategorySelect(createGroupCategory, GROUP_CATEGORIES[0]);
  renderTagCheckboxes(createGroupTags, []);
}

async function refreshSession() {
  const session = await api("/api/admin/session");
  if (!session.authenticated) {
    setAuthed(false);
    return;
  }
  setAuthed(true, { mustChangePassword: session.mustChangePassword });
  if (!session.mustChangePassword) {
    await enterAdmin();
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.hidden = true;
  const formData = new FormData(loginForm);
  try {
    const result = await api("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: formData.get("username"),
        password: formData.get("password"),
      }),
    });
    loginForm.reset();
    setAuthed(true, { mustChangePassword: result.mustChangePassword });
    if (!result.mustChangePassword) {
      await enterAdmin();
    }
  } catch (error) {
    loginError.hidden = false;
    loginError.textContent = error.message;
  }
});

if (passwordForm) {
  passwordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (passwordError) passwordError.hidden = true;
    if (passwordStatus) passwordStatus.hidden = true;
    const formData = new FormData(passwordForm);
    const next = String(formData.get("newPassword") || "");
    const confirm = String(formData.get("confirmPassword") || "");
    if (next !== confirm) {
      if (passwordError) {
        passwordError.hidden = false;
        passwordError.textContent = "New passwords do not match.";
      }
      return;
    }
    try {
      await api("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: formData.get("currentPassword"),
          newPassword: next,
        }),
      });
      passwordForm.reset();
      forcePasswordChange = false;
      setAuthed(true, { mustChangePassword: false });
      if (passwordStatus) {
        passwordStatus.hidden = false;
        passwordStatus.textContent = "Password updated.";
        passwordStatus.style.color = "#1f6b3a";
      }
      await enterAdmin();
    } catch (error) {
      if (passwordError) {
        passwordError.hidden = false;
        passwordError.textContent = error.message;
      }
    }
  });
}

if (changePasswordBtn) {
  changePasswordBtn.addEventListener("click", () => {
    setAuthed(true, { showPassword: true, mustChangePassword: forcePasswordChange });
  });
}

if (passwordSkipBtn) {
  passwordSkipBtn.addEventListener("click", async () => {
    if (forcePasswordChange) return;
    setAuthed(true, { mustChangePassword: false });
    await enterAdmin();
  });
}

if (createGroupForm) {
  createGroupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(createGroupForm);
    try {
      await api("/api/admin/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          category: formData.get("category"),
          sort_order: formData.get("sort_order"),
          active: formData.get("active") === "true",
          description: formData.get("description") || "",
          website: formData.get("website") || "",
          instagram: formData.get("instagram") || "",
          form: formData.get("form") || "",
          tags: selectedTagsFrom(createGroupForm),
        }),
      });
      createGroupForm.reset();
      createGroupForm.sort_order.value = "10";
      createGroupForm.active.value = "true";
      fillCategorySelect(createGroupCategory, GROUP_CATEGORIES[0]);
      renderTagCheckboxes(createGroupTags, []);
      showGroupsStatus("Group added");
      await loadGroups();
    } catch (error) {
      showGroupsStatus(error.message, true);
    }
  });
}

const summerModeToggle = document.getElementById("summer-mode-toggle");
if (summerModeToggle) {
  summerModeToggle.addEventListener("change", syncSummerModeUi);
}

hoursForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const days = Array.from(hoursDays.querySelectorAll(".hours-day-row")).map((row) => {
    const closed = row.querySelector('input[name="closed"]').checked;
    return {
      day: row.dataset.day,
      label: row.querySelector("strong").textContent,
      closed,
      open: closed ? "" : row.querySelector('input[name="open"]').value.trim(),
      close: closed ? "" : row.querySelector('input[name="close"]').value.trim(),
    };
  });

  try {
    await api("/api/admin/hours", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: hoursForm.title.value.trim(),
        timezone: hoursForm.timezone.value.trim(),
        summerMode: Boolean(hoursForm.summerMode && hoursForm.summerMode.checked),
        summerMessage: hoursForm.summerMessage
          ? hoursForm.summerMessage.value.trim()
          : "",
        instagramUrl: hoursForm.instagramUrl
          ? hoursForm.instagramUrl.value.trim()
          : "",
        instagramLabel: hoursForm.instagramLabel
          ? hoursForm.instagramLabel.value.trim()
          : "",
        days,
      }),
    });
    showHoursStatus("Office hours saved");
    await loadHours();
  } catch (error) {
    showHoursStatus(error.message, true);
  }
});

const createActiveSelect = createForm.querySelector('select[name="active"]');
if (createActiveSelect) {
  createActiveSelect.addEventListener("change", () => syncYearField(createForm));
  syncYearField(createForm);
}

createForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(createForm);
  try {
    await api("/api/admin/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        role: formData.get("role"),
        email: formData.get("email"),
        section: formData.get("section"),
        sort_order: formData.get("sort_order"),
        active: formData.get("active") === "true",
        year: formData.get("year") || "",
      }),
    });
    createForm.reset();
    createForm.sort_order.value = "10";
    createForm.active.value = "true";
    syncYearField(createForm);
    showStatus("Contact added");
    await loadContacts();
  } catch (error) {
    showStatus(error.message, true);
  }
});

logoutBtn.addEventListener("click", async () => {
  await api("/api/admin/logout", { method: "POST" });
  setAuthed(false);
});

// Defer so admin-cms.js can register loadAllCms first
queueMicrotask(() => {
  refreshSession().catch((error) => {
    loginError.hidden = false;
    loginError.textContent = error.message + " — is the server running (npm start)?";
  });
});
