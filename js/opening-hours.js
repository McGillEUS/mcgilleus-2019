function initOpeningHours() {
  const defaultTimezone = "America/Montreal";
  const timeTables = document.querySelectorAll("[data-opening-hours-init]");
  if (!timeTables.length) return;

  timeTables.forEach((root) => {
    const tz = root.getAttribute("data-opening-hours-timezone") || defaultTimezone;

    const timeToMinutes = (str) => {
      const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(str || "");
      return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
    };

    const getNowParts = () => {
      let useTz = tz;
      try {
        new Intl.DateTimeFormat("en-GB", { timeZone: tz });
      } catch {
        useTz = defaultTimezone;
      }
      const fmt = new Intl.DateTimeFormat("en-GB", {
        timeZone: useTz,
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const parts = fmt.formatToParts(new Date());
      const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
      const weekdayIdx = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(map.weekday);
      return {
        weekdayIdx,
        hour: parseInt(map.hour, 10),
        minute: parseInt(map.minute, 10),
      };
    };

    const dayIndex = {
      monday: 0,
      tuesday: 1,
      wednesday: 2,
      thursday: 3,
      friday: 4,
      saturday: 5,
      sunday: 6,
    };
    const rows = Array.from(root.querySelectorAll("[data-opening-hours-day]"));
    if (!rows.length) return;

    const ordered = new Array(7);
    rows.forEach((r) => {
      const d = (r.getAttribute("data-opening-hours-day") || "").trim().toLowerCase();
      if (d in dayIndex) ordered[dayIndex[d]] = r;
    });
    if (ordered.some((r) => !r)) return;

    const schedule = ordered.map((row) => {
      const o = (row.getAttribute("data-opening-hours-open") || "").trim();
      const c = (row.getAttribute("data-opening-hours-close") || "").trim();
      const openMin = timeToMinutes(o);
      const closeMin = timeToMinutes(c);
      if (openMin == null || closeMin == null) {
        return { open: false, openMin: 0, closeMin: 0, overnight: false };
      }
      return {
        open: true,
        openMin,
        closeMin,
        overnight: openMin > closeMin,
      };
    });

    const evaluate = () => {
      const now = getNowParts();
      const curIdx = now.weekdayIdx;
      const nowMin = now.hour * 60 + now.minute;

      ordered.forEach((r) => r.removeAttribute("data-opening-hours-current-day"));
      ordered[curIdx].setAttribute("data-opening-hours-current-day", "");

      const today = schedule[curIdx];
      const yesterday = schedule[(curIdx + 6) % 7];

      let isOpen = false;
      if (today.open) {
        if (!today.overnight) {
          isOpen = nowMin >= today.openMin && nowMin < today.closeMin;
        } else {
          isOpen = nowMin >= today.openMin || nowMin < today.closeMin;
        }
      }
      if (!isOpen && yesterday.open && yesterday.overnight && nowMin < yesterday.closeMin) {
        isOpen = true;
      }

      ordered.forEach((row, idx) => {
        row.setAttribute(
          "data-opening-hours-status",
          idx === curIdx && isOpen ? "open" : "closed"
        );
      });

      root.setAttribute("data-opening-hours-store-status", isOpen ? "open" : "closed");
    };

    evaluate();
    clearInterval(root._openingHoursTimer);
    root._openingHoursTimer = setInterval(evaluate, 60 * 1000);

    const visHandler = () => {
      if (!document.hidden) evaluate();
    };
    if (root._openingHoursVisHandler) {
      document.removeEventListener("visibilitychange", root._openingHoursVisHandler);
    }
    root._openingHoursVisHandler = visHandler;
    document.addEventListener("visibilitychange", visHandler);
  });
}

window.initOpeningHours = initOpeningHours;
