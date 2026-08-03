(function () {
  const MQ = window.matchMedia("(max-width: 767.98px)");
  let lastFocus = null;
  let scrollPaused = false;

  function toggleBtn() {
    return document.querySelector("[data-nav-toggle]");
  }

  function panel() {
    return document.querySelector("[data-nav-panel]");
  }

  function isOpen() {
    return document.documentElement.classList.contains("is-nav-open");
  }

  function setExpanded(open) {
    const btn = toggleBtn();
    const p = panel();
    if (btn) {
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
    if (p) {
      p.setAttribute("aria-hidden", open ? "false" : "true");
    }
  }

  function openSiteNav() {
    if (!MQ.matches || isOpen()) return;

    lastFocus = document.activeElement;
    document.documentElement.classList.add("is-nav-open");
    document.body.classList.add("is-nav-open");
    setExpanded(true);

    if (!scrollPaused && typeof window.pauseSiteScroll === "function") {
      window.pauseSiteScroll();
      scrollPaused = true;
    }

    const firstLink = panel()?.querySelector("a.nav-link");
    window.setTimeout(() => firstLink?.focus?.({ preventScroll: true }), 10);
  }

  function closeSiteNav() {
    if (!isOpen()) {
      setExpanded(false);
      return;
    }

    document.documentElement.classList.remove("is-nav-open");
    document.body.classList.remove("is-nav-open");
    setExpanded(false);

    if (scrollPaused && typeof window.resumeSiteScroll === "function") {
      window.resumeSiteScroll();
      scrollPaused = false;
    }

    const btn = toggleBtn();
    if (lastFocus && typeof lastFocus.focus === "function") {
      lastFocus.focus({ preventScroll: true });
    } else {
      btn?.focus?.({ preventScroll: true });
    }
    lastFocus = null;
  }

  function toggleSiteNav() {
    if (isOpen()) closeSiteNav();
    else openSiteNav();
  }

  window.openSiteNav = openSiteNav;
  window.closeSiteNav = closeSiteNav;
  window.closeMobileNav = closeSiteNav;

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-nav-toggle]")) {
      event.preventDefault();
      toggleSiteNav();
      return;
    }

    if (!isOpen()) return;

    const link = event.target.closest("[data-nav-panel] a");
    if (link) {
      // Let navigation proceed; close sheet immediately for a snappy feel
      closeSiteNav();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen()) {
      event.preventDefault();
      closeSiteNav();
    }
  });

  function onBreakpointChange() {
    if (!MQ.matches) {
      closeSiteNav();
      const p = panel();
      if (p) p.setAttribute("aria-hidden", "false");
      return;
    }
    setExpanded(false);
  }

  if (typeof MQ.addEventListener === "function") {
    MQ.addEventListener("change", onBreakpointChange);
  } else if (typeof MQ.addListener === "function") {
    MQ.addListener(onBreakpointChange);
  }

  // Closed on mobile; exposed inline nav on desktop
  if (MQ.matches) setExpanded(false);
  else {
    const p = panel();
    if (p) p.setAttribute("aria-hidden", "false");
  }
})();
