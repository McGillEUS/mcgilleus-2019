(function () {
  const STORAGE_KEY = "eus-home-hero-played";
  let homeCtx = null;
  let revealing = false;

  function hasPlayed() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch (_error) {
      return false;
    }
  }

  function markPlayed() {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch (_error) {
      /* ignore */
    }
  }

  function prefersReducedMotion() {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function getHero(root) {
    const scope = root || document;
    return scope.querySelector?.(".home-hero") || document.querySelector(".home-hero");
  }

  function showStatic(hero) {
    if (!hero || typeof gsap === "undefined") return;
    const items = hero.querySelectorAll("[data-home-animate]");
    const words = hero.querySelectorAll(".home-hero__title-word");
    gsap.set(items, { autoAlpha: 1, y: 0, x: 0, filter: "none", clearProps: "transform,filter" });
    if (words.length) gsap.set(words, { yPercent: 0, clearProps: "transform" });
  }

  function splitTitle(titleEl) {
    if (!titleEl || titleEl.dataset.split === "1") return titleEl.querySelectorAll(".home-hero__title-word");

    const text = titleEl.textContent.trim();
    if (!text) return [];

    titleEl.textContent = "";
    titleEl.dataset.split = "1";

    text.split(/(\s+)/).forEach((part) => {
      if (/^\s+$/.test(part)) {
        titleEl.appendChild(document.createTextNode(part));
        return;
      }
      const mask = document.createElement("span");
      mask.className = "home-hero__title-mask";
      mask.setAttribute("aria-hidden", "true");
      const word = document.createElement("span");
      word.className = "home-hero__title-word";
      word.textContent = part;
      mask.appendChild(word);
      titleEl.appendChild(mask);
    });

    titleEl.setAttribute("aria-label", text);
    return titleEl.querySelectorAll(".home-hero__title-word");
  }

  /**
   * Cinematic reveal — intended to run right after the intro loader finishes.
   */
  function revealHomeHero(root) {
    const hero = getHero(root);
    if (!hero || typeof gsap === "undefined") return;

    if (homeCtx) {
      homeCtx.revert();
      homeCtx = null;
    }

    const eyebrow = hero.querySelector(".home-hero__eyebrow");
    const title = hero.querySelector(".home-hero__title");
    const lead = hero.querySelector(".home-hero__lead");
    const actions = hero.querySelector(".home-hero__actions");
    const ctas = actions ? Array.from(actions.querySelectorAll(".home-hero__cta")) : [];
    const items = hero.querySelectorAll("[data-home-animate]");

    if (!items.length) return;

    if (prefersReducedMotion()) {
      showStatic(hero);
      markPlayed();
      return;
    }

    revealing = true;
    markPlayed();

    const words = title ? splitTitle(title) : [];
    const ease = typeof CustomEase !== "undefined" ? "osmo" : "power3.out";

    homeCtx = gsap.context(() => {
      gsap.set(items, { autoAlpha: 1 });
      if (eyebrow) gsap.set(eyebrow, { autoAlpha: 0, y: 18, filter: "blur(8px)" });
      if (words.length) gsap.set(words, { yPercent: 115 });
      else if (title) gsap.set(title, { autoAlpha: 0, y: 28 });
      if (lead) gsap.set(lead, { autoAlpha: 0, y: 22, filter: "blur(6px)" });
      if (ctas.length) gsap.set(ctas, { autoAlpha: 0, y: 16 });
      else if (actions) gsap.set(actions, { autoAlpha: 0, y: 16 });

      const tl = gsap.timeline({
        defaults: { ease },
        delay: 0.08,
        onComplete: () => {
          revealing = false;
        },
      });

      if (eyebrow) {
        tl.to(
          eyebrow,
          {
            autoAlpha: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.7,
          },
          0
        );
      }

      if (words.length) {
        tl.to(
          words,
          {
            yPercent: 0,
            duration: 0.95,
            stagger: 0.055,
          },
          0.12
        );
      } else if (title) {
        tl.to(
          title,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.85,
          },
          0.12
        );
      }

      if (lead) {
        tl.to(
          lead,
          {
            autoAlpha: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.75,
          },
          0.38
        );
      }

      if (ctas.length) {
        tl.to(
          ctas,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.55,
            stagger: 0.07,
          },
          0.52
        );
      } else if (actions) {
        tl.to(
          actions,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.55,
          },
          0.52
        );
      }
    }, hero);
  }

  /**
   * Page enter helper. Skips if the loader will own the reveal, or if a reveal
   * already ran this session.
   */
  function initHomeHero(root) {
    const hero = getHero(root);
    if (!hero) return;

    if (revealing || homeCtx) return;

    if (hasPlayed() || prefersReducedMotion()) {
      showStatic(hero);
      return;
    }

    // Loader still pending — keep copy hidden; revealHomeHero runs on finish.
    if (
      typeof window.shouldPlayEusLoader === "function" &&
      window.shouldPlayEusLoader() &&
      document.querySelector(".eus-loader")
    ) {
      const items = hero.querySelectorAll("[data-home-animate]");
      if (typeof gsap !== "undefined" && items.length) {
        gsap.set(items, { autoAlpha: 0 });
      }
      return;
    }

    // No intro this visit (e.g. returning via Barba) — soft reveal once.
    revealHomeHero(root);
  }

  function prepareHomeHeroForReveal(root) {
    const hero = getHero(root);
    if (!hero || typeof gsap === "undefined") return;
    const items = hero.querySelectorAll("[data-home-animate]");
    if (items.length) gsap.set(items, { autoAlpha: 0 });
  }

  window.initHomeHero = initHomeHero;
  window.revealHomeHero = revealHomeHero;
  window.prepareHomeHeroForReveal = prepareHomeHeroForReveal;
})();
