/* global barba, gsap, CustomEase, Lenis, ScrollTrigger */

gsap.registerPlugin(CustomEase);

history.scrollRestoration = "manual";

let lenis = null;
let nextPage = document;
let onceFunctionsInitialized = false;

const hasLenis = typeof window.Lenis !== "undefined";
const hasScrollTrigger = typeof window.ScrollTrigger !== "undefined";

const rmMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
let reducedMotion = rmMQ.matches;
rmMQ.addEventListener?.("change", (e) => {
  reducedMotion = e.matches;
});
rmMQ.addListener?.((e) => {
  reducedMotion = e.matches;
});

const has = (s) => !!nextPage.querySelector(s);

const durationDefault = 0.6;

CustomEase.create("osmo", "0.625, 0.05, 0, 1");
gsap.defaults({ ease: "osmo", duration: durationDefault });

const pixelHorizontalAmount = 12;
const transitionDuration = 1;
const pixelFadeDuration = 0.2;
const pixelOverlap = 0.3;

function navHeight() {
  const nav = document.querySelector("nav.navbar");
  return nav ? Math.round(nav.getBoundingClientRect().height) : 0;
}

function initOnceFunctions() {
  initLenis();
  if (onceFunctionsInitialized) return;
  onceFunctionsInitialized = true;

  document.addEventListener(
    "mouseenter",
    (event) => {
      const link = event.target?.closest?.("nav a");
      if (!link) return;
      const href = link.getAttribute("href") || "";
      if (href.includes("contact-us") && typeof window.prefetchContacts === "function") {
        window.prefetchContacts();
      }
      if (href.includes("getting-involved") && typeof window.prefetchGroups === "function") {
        window.prefetchGroups();
      }
    },
    true
  );
  document.addEventListener(
    "focusin",
    (event) => {
      const link = event.target?.closest?.("nav a");
      if (!link) return;
      const href = link.getAttribute("href") || "";
      if (href.includes("contact-us") && typeof window.prefetchContacts === "function") {
        window.prefetchContacts();
      }
      if (href.includes("getting-involved") && typeof window.prefetchGroups === "function") {
        window.prefetchGroups();
      }
    },
    true
  );
}

function initBeforeEnterFunctions(next) {
  nextPage = next || document;
}

// Content that should already be in the page while the wipe reveals it
async function initPageContent(next) {
  nextPage = next || document;

  if (typeof window.loadSiteContent === "function") {
    await window.loadSiteContent(nextPage);
  }

  if (typeof window.loadContacts === "function" && has("#executive-grid")) {
    window.loadContacts();
  }
  if (typeof window.loadOfficeHours === "function" && has("#office-hours")) {
    window.loadOfficeHours();
  }
  // Build the wheel under the red cover so it isn't empty when the page reveals
  if (typeof window.initRadialCardsSlider === "function" && has("[data-radial-slider-init]")) {
    window.initRadialCardsSlider(nextPage);
  }
  if (typeof window.loadGroupsPublic === "function" && has("#involved-navigator")) {
    window.loadGroupsPublic(nextPage);
  }
}

// Effects that need final layout (after fixed positioning is cleared)
function initPageEffects(next) {
  nextPage = next || document;

  if (typeof window.initFooterParallax === "function" && has("[data-footer-parallax]")) {
    window.initFooterParallax();
  }
  if (typeof window.initOfficeLocator === "function" && has("[data-locator-init]")) {
    window.initOfficeLocator();
  }
  if (typeof window.initMomentumBasedHover === "function" && has("[data-momentum-hover-init]")) {
    window.initMomentumBasedHover();
  }
  if (typeof window.initAccordionCSS === "function" && has("[data-accordion-css-init]")) {
    window.initAccordionCSS(nextPage);
  }
  // When the intro loader will play, it owns the hero reveal on finish.
  const loaderOwnsReveal =
    has(".home-hero") &&
    document.querySelector(".eus-loader") &&
    typeof window.shouldPlayEusLoader === "function" &&
    window.shouldPlayEusLoader();

  if (typeof window.initHomeHero === "function" && has(".home-hero") && !loaderOwnsReveal) {
    window.initHomeHero(nextPage);
  }
}

function initAfterEnterFunctions(next) {
  nextPage = next || document;

  requestAnimationFrame(() => {
    initPageEffects(next);
    if (hasLenis && lenis) {
      lenis.resize();
    }
    if (hasScrollTrigger) {
      ScrollTrigger.refresh();
    }
    window.dispatchEvent(new Event("resize"));
  });
}

function runPageOnceAnimation(next) {
  const tl = gsap.timeline();
  tl.call(() => {
    resetPage(next);
  }, null, 0);
  return tl;
}

function runPageLeaveAnimation(current, next) {
  const tl = gsap.timeline();

  if (reducedMotion) {
    tl.set(current, { autoAlpha: 0 });
    tl.call(() => current.remove(), null, 0);
    return tl;
  }

  const isPortrait = window.innerHeight > window.innerWidth;
  pixelGrid(isPortrait);

  const transitionWrap = document.querySelector("[data-transition-wrap]");
  const transitionPanel = transitionWrap.querySelector("[data-transition-panel]");
  const lines = Array.from(transitionPanel.querySelectorAll("[data-transition-col]"));
  const allPixels = transitionPanel.querySelectorAll("[data-transition-pixel]");

  const overlap = Math.max(0, Math.min(1, pixelOverlap));
  const waveStart = 0;
  const coverDuration = transitionDuration * 0.45;
  const stepDur = coverDuration / Math.max(1, pixelHorizontalAmount);
  // Swap pages only once red pixels have covered the old view
  const swapAt = coverDuration;
  const revealDuration = transitionDuration * 0.45;
  const doneAt = swapAt + revealDuration + pixelFadeDuration;

  gsap.set(allPixels, { opacity: 0, willChange: "opacity" });
  gsap.set(transitionPanel, { opacity: 1, willChange: "opacity" });

  // Old page stays visible; new page waits under the red wipe
  gsap.set(current, { autoAlpha: 1, pointerEvents: "none" });
  gsap.set(next, { autoAlpha: 0, pointerEvents: "none" });

  lines.forEach((line, i) => {
    const pixels = Array.from(line.querySelectorAll("[data-transition-pixel]"));
    if (!pixels.length) return;

    const coverTime = waveStart + i * stepDur;
    const fillStart = Math.max(0, coverTime);
    const fadeStart = swapAt + i * (revealDuration / Math.max(1, pixelHorizontalAmount));
    const perPixelMin = pixelFadeDuration / pixels.length;
    const perPixelDur = perPixelMin * (1 - overlap) + pixelFadeDuration * overlap;
    const spread = Math.max(0, pixelFadeDuration - perPixelDur);

    // Cover old page with red pixels
    tl.to(
      pixels,
      {
        opacity: 1,
        duration: Math.max(0.001, perPixelDur),
        ease: "none",
        stagger: { amount: spread, from: "random" },
      },
      fillStart
    );

    // After swap, lift the red wipe to reveal the new page
    tl.to(
      pixels,
      {
        opacity: 0,
        duration: Math.max(0.001, perPixelDur),
        ease: "none",
        stagger: { amount: spread, from: "random" },
      },
      fadeStart
    );
  });

  // Under full red cover: drop old page, show new page
  tl.call(() => {
    gsap.set(current, { autoAlpha: 0, pointerEvents: "none" });
    gsap.set(next, { autoAlpha: 1 });
    if (current && current.parentNode) current.remove();
  }, null, swapAt);

  tl.set(allPixels, { clearProps: "willChange" }, doneAt);
  tl.set(transitionPanel, { clearProps: "willChange", opacity: 0 }, doneAt);

  return tl;
}

function runPageEnterAnimation(next) {
  const tl = gsap.timeline();
  // Match leave: cover wave + reveal wave
  const readyAt = transitionDuration + pixelFadeDuration;

  if (reducedMotion) {
    tl.set(next, { autoAlpha: 1 });
    tl.add("pageReady");
    tl.call(resetPage, [next], "pageReady");
    return new Promise((resolve) => tl.call(resolve, null, "pageReady"));
  }

  tl.add("pageReady", readyAt);
  tl.call(resetPage, [next], "pageReady");

  return new Promise((resolve) => {
    tl.call(resolve, null, "pageReady");
  });
}

function pixelGrid(isPortrait) {
  const panel = document.querySelector("[data-transition-panel]");
  if (!panel) return;

  const rect = panel.getBoundingClientRect();
  panel.style.flexDirection = isPortrait ? "column" : "row";

  const lineSizePx = isPortrait
    ? rect.height / pixelHorizontalAmount
    : rect.width / pixelHorizontalAmount;
  const crossAmount = Math.ceil((isPortrait ? rect.width : rect.height) / lineSizePx);

  let lines = panel.querySelectorAll("[data-transition-col]");
  const lineTemplate = lines[0];
  const pixelTemplate = lineTemplate.querySelector("[data-transition-pixel]");

  if (lines.length !== pixelHorizontalAmount) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < pixelHorizontalAmount; i++) {
      frag.appendChild(lineTemplate.cloneNode(false));
    }
    panel.replaceChildren(frag);
    lines = panel.querySelectorAll("[data-transition-col]");
  }

  lines.forEach((line) => {
    line.style.flexDirection = isPortrait ? "row" : "column";
    line.style.flex = "1 1 auto";
    line.style.justifyContent = "center";

    const diff = crossAmount - line.childElementCount;

    if (diff > 0) {
      const frag = document.createDocumentFragment();
      for (let i = 0; i < diff; i++) {
        frag.appendChild(pixelTemplate.cloneNode(true));
      }
      line.appendChild(frag);
    } else if (diff < 0) {
      for (let i = diff; i < 0; i++) {
        line.lastElementChild.remove();
      }
    }
  });
}

const themeConfig = {
  light: { nav: "dark", transition: "light" },
  dark: { nav: "light", transition: "dark" },
};

function applyThemeFrom(container) {
  const pageTheme = container?.dataset?.pageTheme || "light";
  const config = themeConfig[pageTheme] || themeConfig.light;

  document.body.dataset.pageTheme = pageTheme;
  const transitionEl = document.querySelector("[data-theme-transition]");
  if (transitionEl) {
    transitionEl.dataset.themeTransition = config.transition;
  }

  const nav = document.querySelector("[data-theme-nav]");
  if (nav) {
    nav.dataset.themeNav = config.nav;
  }

}

function initLenis() {
  if (lenis) return;
  if (!hasLenis) return;

  lenis = new Lenis({
    lerp: 0.165,
    wheelMultiplier: 1.25,
  });

  if (hasScrollTrigger) {
    lenis.on("scroll", ScrollTrigger.update);
  }

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);
}

function lockScroll() {
  // Stop scrolling without hiding the scrollbar (avoids navbar width/height jumps)
  if (lenis && typeof lenis.stop === "function") lenis.stop();
  document.documentElement.classList.add("is-transitioning");
}

function unlockScroll() {
  document.documentElement.classList.remove("is-transitioning");
}

let overlayScrollLocks = 0;

function getSiteScrollY() {
  if (lenis && typeof lenis.scroll === "number") return lenis.scroll;
  return window.scrollY || document.documentElement.scrollTop || 0;
}

function pauseSiteScroll() {
  overlayScrollLocks += 1;
  if (overlayScrollLocks !== 1) return;

  const scrollY = getSiteScrollY();
  const nav = document.querySelector("nav.navbar");
  const navHeight = nav ? Math.round(nav.getBoundingClientRect().height) : 0;

  document.documentElement.dataset.overlayScrollY = String(scrollY);
  document.documentElement.style.setProperty("--overlay-nav-offset", `${navHeight}px`);

  if (lenis && typeof lenis.stop === "function") {
    // Lenis owns scroll — freeze it in place. Avoid body position:fixed
    // (that zeros window.scrollY and sent people back to the top on close).
    lenis.stop();
    document.documentElement.classList.add("is-overlay-scroll-locked", "is-lenis-overlay-lock");
    document.body.classList.add("is-overlay-scroll-locked");
    return;
  }

  document.documentElement.classList.add("is-overlay-scroll-locked");
  document.body.classList.add("is-overlay-scroll-locked");
  document.body.style.top = `-${scrollY}px`;
}

function resumeSiteScroll() {
  overlayScrollLocks = Math.max(0, overlayScrollLocks - 1);
  if (overlayScrollLocks !== 0) return;

  const scrollY = Number(document.documentElement.dataset.overlayScrollY || 0);

  document.documentElement.classList.remove("is-overlay-scroll-locked", "is-lenis-overlay-lock");
  document.body.classList.remove("is-overlay-scroll-locked");
  document.body.style.top = "";
  document.documentElement.style.removeProperty("--overlay-nav-offset");
  delete document.documentElement.dataset.overlayScrollY;

  if (lenis && typeof lenis.start === "function") {
    lenis.start();
    if (typeof lenis.scrollTo === "function") {
      lenis.scrollTo(scrollY, { immediate: true, force: true });
    }
    return;
  }

  window.scrollTo(0, scrollY);
}

window.pauseSiteScroll = pauseSiteScroll;
window.resumeSiteScroll = resumeSiteScroll;

window.scrollSiteTo = function scrollSiteTo(target, options) {
  const el =
    typeof target === "string" ? document.querySelector(target) : target;
  if (!el) return;
  const opts = options || {};
  if (lenis && typeof lenis.scrollTo === "function") {
    lenis.scrollTo(el, {
      offset: typeof opts.offset === "number" ? opts.offset : -24,
      duration: typeof opts.duration === "number" ? opts.duration : 1.1,
      ...opts,
    });
    return;
  }
  el.scrollIntoView({ behavior: "smooth", block: "start" });
};

function resetPage(container) {
  if (lenis && typeof lenis.scrollTo === "function") {
    lenis.scrollTo(0, { immediate: true, force: true });
  } else {
    window.scrollTo(0, 0);
  }

  // Clear every transition-only style so layout matches a cold load
  gsap.set(container, {
    clearProps:
      "position,top,left,right,bottom,width,height,maxHeight,overflow,zIndex,clipPath,webkitClipPath,willChange,force3D,opacity,visibility,transform,pointerEvents,backgroundColor",
  });

  unlockScroll();

  if (hasLenis && lenis) {
    lenis.resize();
    lenis.start();
  }

  // Re-measure the wheel after fixed staging is cleared (keeps drag proxy aligned)
  if (
    typeof window.initRadialCardsSlider === "function" &&
    container?.querySelector?.("[data-radial-slider-init]")
  ) {
    window.initRadialCardsSlider(container);
  }
}

function initBarbaNavUpdate(data) {
  const doc = new DOMParser().parseFromString(data.next.html, "text/html");
  const nextNodes = doc.querySelectorAll("nav [data-barba-update]");
  const currentNodes = document.querySelectorAll("nav [data-barba-update]");

  currentNodes.forEach((curr, index) => {
    const next = nextNodes[index];
    if (!next) return;

    const newStatus = next.getAttribute("aria-current");
    if (newStatus !== null) {
      curr.setAttribute("aria-current", newStatus);
    } else {
      curr.removeAttribute("aria-current");
    }

    const newClassList = next.getAttribute("class") || "";
    curr.setAttribute("class", newClassList);
  });

  if (doc.title) {
    document.title = doc.title;
  }
}

function closeMobileNav() {
  if (typeof window.jQuery === "undefined") return;
  window.jQuery(".navbar-collapse").collapse("hide");
}

function stageContainers(current, next) {
  const top = navHeight();
  const scrollY =
    (lenis && typeof lenis.scroll === "number" ? lenis.scroll : window.scrollY) || 0;

  // Keep the outgoing page frozen at the current scroll position under the wipe
  if (current) {
    gsap.set(current, {
      position: "fixed",
      top: top - scrollY,
      left: 0,
      right: 0,
      width: "100%",
      zIndex: 20,
      autoAlpha: 1,
      pointerEvents: "none",
    });
  }

  // Incoming page waits under the wipe (shown only after red cover)
  gsap.set(next, {
    position: "fixed",
    top,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    zIndex: 30,
    overflow: "hidden",
    autoAlpha: 0,
  });
}

barba.hooks.before(() => {
  closeMobileNav();
  lockScroll();
});

barba.hooks.beforeEnter(async (data) => {
  stageContainers(data.current?.container, data.next.container);
  initBeforeEnterFunctions(data.next.container);
  applyThemeFrom(data.next.container);
  // Start loading CMS + contact cards / hours during the wipe so they aren't empty after
  await initPageContent(data.next.container);
});

barba.hooks.beforeLeave((data) => {
  if (typeof window.stopEusLoaderBleed === "function") {
    window.stopEusLoaderBleed();
  }
  if (typeof window.destroyRadialCardsSlider === "function" && data.current?.container) {
    window.destroyRadialCardsSlider(data.current.container);
  }
  if (typeof window.closeGroupModal === "function") {
    window.closeGroupModal();
  }
  const quiz = data.current?.container?.querySelector?.("#involved-quiz");
  if (quiz?.hasAttribute("data-quiz-open") && typeof window.resumeSiteScroll === "function") {
    window.resumeSiteScroll();
  }
  document.body.classList.remove("involved-quiz-open", "involved-modal-open");
  if (quiz) {
    quiz.hidden = true;
    quiz.removeAttribute("data-quiz-open");
    quiz.innerHTML = "";
  }
});

barba.hooks.afterLeave(() => {
  if (hasScrollTrigger) {
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  }
});

barba.hooks.enter((data) => {
  initBarbaNavUpdate(data);
});

barba.hooks.afterEnter((data) => {
  initAfterEnterFunctions(data.next.container);

  if (hasLenis && lenis) {
    lenis.resize();
    lenis.start();
  }

  if (hasScrollTrigger) {
    ScrollTrigger.refresh();
  }
});

barba.init({
  debug: false,
  timeout: 7000,
  preventRunning: true,
  prevent: ({ el }) =>
    el.getAttribute("target") === "_blank" ||
    el.href?.includes("/admin") ||
    el.classList?.contains("roombooking-button"),
  transitions: [
    {
      name: "default",
      sync: true,

      async once(data) {
        initOnceFunctions();
        applyThemeFrom(data.next.container);
        await initPageContent(data.next.container);
        initPageEffects(data.next.container);

        const isHome =
          data.next.namespace === "home" ||
          !!data.next.container?.querySelector?.(".home-hero");
        if (
          isHome &&
          typeof window.runEusLoader === "function" &&
          typeof window.shouldPlayEusLoader === "function" &&
          window.shouldPlayEusLoader()
        ) {
          await window.runEusLoader();
        }

        return runPageOnceAnimation(data.next.container);
      },

      async leave(data) {
        return runPageLeaveAnimation(data.current.container, data.next.container);
      },

      async enter(data) {
        return runPageEnterAnimation(data.next.container);
      },
    },
  ],
});
