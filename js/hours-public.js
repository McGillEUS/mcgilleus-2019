function formatHoursLabel(day) {
  if (day.closed || !day.open || !day.close) return "Closed";
  return `${day.open}–${day.close}`;
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

function renderHoursWidget(data) {
  if (data.summerMode) {
    return renderSummerHoursWidget(data);
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
        <div class="opening-hours__status">
          <div class="opening-hours__status-bg"></div>
          <div class="opening-hours__status-dot"></div>
          <p class="opening-hours__p is--closed">Closed</p>
          <p class="opening-hours__p is--open">Open</p>
        </div>
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
