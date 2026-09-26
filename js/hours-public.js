function formatHoursLabel(day) {
  if (day.closed || !day.open || !day.close) return "Closed";
  return `${day.open}–${day.close}`;
}

function formatSlotClock(time) {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(time || "");
  if (!match) return time;
  const hour = parseInt(match[1], 10) % 12 || 12;
  return `${hour}:${match[2]}`;
}

function formatSlotRange(start, end) {
  return `${formatSlotClock(start)}–${formatSlotClock(end)}`;
}

function renderSubtitle(subtitle) {
  const text = String(subtitle || "").trim();
  if (!text) return "";
  const match = /^(.*?)(\d{4})$/.exec(text);
  if (!match) {
    return `<p class="exec-hours__subtitle">${escapeAttr(text)}</p>`;
  }
  const label = match[1].trim();
  const year = match[2];
  return `<p class="exec-hours__subtitle">${escapeAttr(label)} <span class="exec-hours__year">${escapeAttr(year)}</span></p>`;
}

function renderStatusBadge() {
  return `
        <div class="opening-hours__status">
          <div class="opening-hours__status-bg"></div>
          <div class="opening-hours__status-dot"></div>
          <p class="opening-hours__p is--closed">Closed</p>
          <p class="opening-hours__p is--open">Open</p>
        </div>
  `;
}

function renderSummerHoursWidget(data) {
  const title = data.title || "Office hours";
  const message =
    data.summerMessage ||
    "Over the summer, our office hours change often. Check Instagram for the most up-to-date schedule.";
  const url = data.instagramUrl || "https://www.instagram.com/mcgilleus/";
  const label = data.instagramLabel || "Check Instagram";

  return `
    <div class="opening-hours opening-hours--summer">
      <div class="opening-hours__top">
        <h2 class="opening-hours__title">${escapeAttr(title)}</h2>
        <div class="opening-hours__badge">Summer</div>
      </div>
      <p class="opening-hours__summer-message">${escapeAttr(message)}</p>
      <a
        class="opening-hours__instagram"
        href="${escapeAttr(url)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        ${escapeAttr(label)} →
      </a>
    </div>
  `;
}

function renderExecHoursWidget(data) {
  const weekdayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  const slots = Array.isArray(data.slots) ? data.slots : [];
  const days = data.days || [];
  const dayByKey = Object.fromEntries(days.map((day) => [day.day, day]));

  const columns = weekdayOrder
    .map((dayKey) => {
      const day = dayByKey[dayKey] || { day: dayKey, label: dayKey };
      const daySlots = slots
        .filter((slot) => slot.day === dayKey)
        .slice()
        .sort((a, b) => {
          const startCmp = String(a.start).localeCompare(String(b.start));
          return startCmp !== 0 ? startCmp : 0;
        });
      const slotHtml = daySlots
        .map(
          (slot) => `
          <li class="exec-hours__slot">
            <p class="exec-hours__name">${escapeAttr(slot.name)}</p>
            ${slot.role ? `<p class="exec-hours__role">(${escapeAttr(slot.role)})</p>` : ""}
            <p class="exec-hours__time">${escapeAttr(formatSlotRange(slot.start, slot.end))}</p>
          </li>
        `
        )
        .join("");
      const openAttr =
        !day.closed && day.open
          ? ` data-opening-hours-open="${escapeAttr(day.open)}"`
          : "";
      const closeAttr =
        !day.closed && day.close
          ? ` data-opening-hours-close="${escapeAttr(day.close)}"`
          : "";

      return `
        <div
          class="exec-hours__col exec-hours__col--${escapeAttr(dayKey)}"
          data-opening-hours-day="${escapeAttr(dayKey)}"
          ${openAttr}
          ${closeAttr}
        >
          <h3 class="exec-hours__day">${escapeAttr(day.label || dayKey)}</h3>
          <ul class="exec-hours__slots">
            ${slotHtml || '<li class="exec-hours__slot exec-hours__slot--empty">No scheduled hours</li>'}
          </ul>
        </div>
      `;
    })
    .join("");

  const weekendMarkers = ["saturday", "sunday"]
    .map((dayKey) => {
      const day = dayByKey[dayKey] || {};
      const openAttr =
        !day.closed && day.open
          ? ` data-opening-hours-open="${escapeAttr(day.open)}"`
          : "";
      const closeAttr =
        !day.closed && day.close
          ? ` data-opening-hours-close="${escapeAttr(day.close)}"`
          : "";
      return `<div hidden data-opening-hours-day="${escapeAttr(dayKey)}"${openAttr}${closeAttr}></div>`;
    })
    .join("");

  const note = data.note
    ? `<p class="exec-hours__note">${escapeAttr(data.note)}</p>`
    : "";

  return `
    <div
      data-opening-hours-timezone="${escapeAttr(data.timezone || "America/Montreal")}"
      data-opening-hours-init
      class="opening-hours opening-hours--exec"
    >
      <div class="opening-hours__top exec-hours__header">
        <div class="exec-hours__heading">
          <h2 class="opening-hours__title">${escapeAttr(data.title || "Exec Office Hours")}</h2>
          ${renderSubtitle(data.subtitle)}
        </div>
        ${renderStatusBadge()}
      </div>
      <div class="exec-hours__grid">
        ${columns}
      </div>
      ${weekendMarkers}
      ${note}
    </div>
  `;
}

function renderHoursWidget(data) {
  if (data.summerMode) {
    return renderSummerHoursWidget(data);
  }
  if (Array.isArray(data.slots) && data.slots.length) {
    return renderExecHoursWidget(data);
  }

  const days = data.days || [];
  const rows = days
    .map((day) => {
      const openAttr =
        !day.closed && day.open
          ? ` data-opening-hours-open="${escapeAttr(day.open)}"`
          : "";
      const closeAttr =
        !day.closed && day.close
          ? ` data-opening-hours-close="${escapeAttr(day.close)}"`
          : "";
      return `
        <div
          data-opening-hours-day="${escapeAttr(day.day)}"
          ${openAttr}
          ${closeAttr}
          class="opening-hours__row"
        >
          <div class="opening-hours__day">
            <p class="opening-hours__p">${escapeAttr(day.label || day.day)}</p>
          </div>
          <div class="opening-hours__time">
            <p class="opening-hours__p">${escapeAttr(formatHoursLabel(day))}</p>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <div
      data-opening-hours-timezone="${escapeAttr(data.timezone || "America/Montreal")}"
      data-opening-hours-init
      class="opening-hours"
    >
      <div class="opening-hours__top">
        <h2 class="opening-hours__title">${escapeAttr(data.title || "Office hours")}</h2>
        ${renderStatusBadge()}
      </div>
      <div class="opening-hours__timetable">
        ${rows}
      </div>
    </div>
  `;
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function fetchHours() {
  const sources = ["/api/hours", "data/hours.json"];
  for (const url of sources) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) continue;
      const data = await response.json();
      if (data && (Array.isArray(data.days) || data.summerMode)) return data;
    } catch (_error) {
      // try next source
    }
  }
  throw new Error("Could not load office hours");
}

async function loadOfficeHours() {
  const mount = document.getElementById("office-hours");
  if (!mount) return;

  try {
    const data = await fetchHours();
    mount.innerHTML = renderHoursWidget(data);
    if (!data.summerMode && typeof window.initOpeningHours === "function") {
      window.initOpeningHours();
    }
  } catch (error) {
    console.error(error);
    mount.innerHTML =
      '<p class="opening-hours-fallback">Office hours unavailable. Start the server with <code>npm start</code>.</p>';
  }
}

window.loadOfficeHours = loadOfficeHours;
document.addEventListener("DOMContentLoaded", () => {
  if (document.body?.hasAttribute("data-barba")) return;
  loadOfficeHours();
});
