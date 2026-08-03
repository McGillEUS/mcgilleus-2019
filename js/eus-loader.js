(function () {
  const STORAGE_KEY = "eus-intro-played";

  let syncing = false;
  let bleedEl = null;
  let heroEl = null;

  function isMobileViewport() {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 767.98px)").matches
    );
  }

  function shouldPlay() {
    if (typeof window.matchMedia === "function") {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    }
    // Skip the cinematic intro on phones - go straight to content.
    if (isMobileViewport()) return false;
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") return false;
    } catch (_) {
      /* ignore */
    }
    return true;
  }

  function markPlayed() {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch (_) {
      /* ignore */
    }
  }

  function heroRect() {
    const hero = heroEl || document.querySelector(".home-hero");
    if (!hero) {
      return {
        top: 0,
        left: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }
    return hero.getBoundingClientRect();
  }

  function applyBleedRect(el, rect) {
    // Plain styles - avoid GSAP transforms that can desync on handoff.
    // Keep z-index under the hero copy (home-hero.is-intro-bridged is z-index 2)
    // so the photo acts as a background, not a cover over the text.
    el.style.position = "fixed";
    el.style.top = `${rect.top}px`;
    el.style.left = `${rect.left}px`;
    el.style.width = `${rect.width}px`;
    el.style.height = `${rect.height}px`;
    el.style.margin = "0";
    el.style.transform = "none";
    el.style.zIndex = "1";
  }

  function syncBleed() {
    if (!syncing || !bleedEl || !heroEl) return;
    applyBleedRect(bleedEl, heroEl.getBoundingClientRect());
  }

  function startBleedSync(bleed, hero) {
    bleedEl = bleed;
    heroEl = hero;
    syncing = true;
    syncBleed();
    window.addEventListener("scroll", syncBleed, { passive: true });
    window.addEventListener("resize", syncBleed);
    if (typeof gsap !== "undefined" && gsap.ticker) {
      gsap.ticker.add(syncBleed);
    }
  }

  function stopBleedSync() {
    syncing = false;
    window.removeEventListener("scroll", syncBleed);
    window.removeEventListener("resize", syncBleed);
    if (typeof gsap !== "undefined" && gsap.ticker) {
      gsap.ticker.remove(syncBleed);
    }
    if (bleedEl) {
      bleedEl.setAttribute("hidden", "");
      bleedEl.hidden = true;
      bleedEl.style.cssText = "";
    }
    bleedEl = null;
    heroEl = null;
  }

  function finish(loader, bleed) {
    markPlayed();

    const hero = document.querySelector(".home-hero");
    if (!hero || !bleed) {
      document.documentElement.classList.remove("eus-loader-active");
      document.body.classList.remove("eus-loader-active");
      loader?.classList.add("is--done");
      loader?.setAttribute("hidden", "");
      if (typeof window.revealHomeHero === "function") {
        window.revealHomeHero(
          document.querySelector("[data-barba-namespace='home']") || document
        );
      }
      return;
    }

    // Freeze the photo exactly over the hero - never reparent / never swap layers
    gsap.killTweensOf(bleed);
    gsap.set(bleed, { clearProps: "transform,x,y,scale,scaleX,scaleY" });
    applyBleedRect(bleed, heroRect());
    hero.classList.add("is-intro-bridged");

    // Hold hero copy hidden before dropping the loader shell (avoids a text flash)
    if (typeof window.prepareHomeHeroForReveal === "function") {
      window.prepareHomeHeroForReveal(hero);
    }

    // Hide only the wordmark shell (bleed is a sibling, stays put)
    loader.classList.remove("is--loading");
    loader.classList.add("is--done");
    loader.setAttribute("hidden", "");
    gsap.set(loader, { clearProps: "opacity,visibility,backgroundColor" });

    document.documentElement.classList.remove("eus-loader-active");
    document.body.classList.remove("eus-loader-active");

    // Re-assert rect after nav becomes visible (layout can shift by a subpixel)
    applyBleedRect(bleed, hero.getBoundingClientRect());

    // Keep this same DOM node as the visible hero photo (no second image)
    startBleedSync(bleed, hero);

    requestAnimationFrame(() => {
      syncBleed();
      if (typeof window.resumeSiteScroll === "function") {
        window.resumeSiteScroll();
      }
      requestAnimationFrame(() => {
        syncBleed();
        if (typeof window.revealHomeHero === "function") {
          window.revealHomeHero(
            document.querySelector("[data-barba-namespace='home']") || document
          );
        }
      });
    });
  }

  function runEusLoader() {
    const loader = document.querySelector(".eus-loader");
    const bleed = document.querySelector("[data-loader-bleed]");
    if (!loader || typeof gsap === "undefined") return Promise.resolve();

    stopBleedSync();

    if (!shouldPlay()) {
      loader.setAttribute("hidden", "");
      loader.classList.remove("is--loading");
      loader.classList.add("is--done");
      if (bleed) {
        bleed.setAttribute("hidden", "");
        bleed.hidden = true;
      }
      return Promise.resolve();
    }

    const brand = loader.querySelector(".eus-loader__brand");
    const mcgill = loader.querySelector(".eus-loader__mcgill");
    const eus = loader.querySelector(".eus-loader__eus");
    const slot = loader.querySelector("[data-loader-slot]");
    const shots = Array.from(loader.querySelectorAll("[data-loader-shot]"));

    document.documentElement.classList.add("eus-loader-active");
    document.body.classList.add("eus-loader-active");
    loader.removeAttribute("hidden");
    loader.classList.add("is--loading");
    gsap.set(loader, { autoAlpha: 1, backgroundColor: "#fff" });

    if (typeof window.pauseSiteScroll === "function") {
      window.pauseSiteScroll();
    }

    shots.forEach((img, i) => img.classList.toggle("is-active", i === 0));
    gsap.set([mcgill, slot, eus], { autoAlpha: 0, y: 18 });
    if (bleed) {
      bleed.hidden = true;
      bleed.setAttribute("hidden", "");
      bleed.style.cssText = "";
    }

    return new Promise((resolve) => {
      const tl = gsap.timeline({
        defaults: { ease: "power3.out" },
        onComplete: () => {
          finish(loader, bleed);
          resolve();
        },
      });

      tl.to([mcgill, slot, eus], {
        autoAlpha: 1,
        y: 0,
        duration: 0.55,
        stagger: 0.07,
      });

      shots.forEach((_, index) => {
        if (index === 0) return;
        tl.call(
          () => {
            shots.forEach((img, i) => img.classList.toggle("is-active", i === index));
          },
          null,
          index === 1 ? "+=0.28" : "+=0.12"
        );
      });

      tl.to({}, { duration: 0.22 });

      tl.add(() => {
        if (!bleed || !slot) return;
        const from = slot.getBoundingClientRect();
        bleed.hidden = false;
        bleed.removeAttribute("hidden");
        applyBleedRect(bleed, from);
        // Mirror into GSAP so the expand tween has a clean starting point
        gsap.set(bleed, {
          position: "fixed",
          top: from.top,
          left: from.left,
          width: from.width,
          height: from.height,
          x: 0,
          y: 0,
          zIndex: 2001,
        });
        gsap.set(slot, { autoAlpha: 0 });
      });

      tl.to(
        bleed,
        {
          duration: 1.15,
          ease: "power4.inOut",
          top: () => heroRect().top,
          left: () => heroRect().left,
          width: () => heroRect().width,
          height: () => heroRect().height,
          zIndex: 2001,
        },
        "<"
      );

      tl.to(
        brand,
        {
          autoAlpha: 0,
          duration: 0.4,
          ease: "power2.out",
        },
        "<0.2"
      );

      // Only clear the white shell once the photo fully covers the hero
      tl.add(() => {
        gsap.set(loader, { backgroundColor: "transparent" });
        if (bleed) {
          gsap.killTweensOf(bleed);
          applyBleedRect(bleed, heroRect());
          gsap.set(bleed, {
            top: heroRect().top,
            left: heroRect().left,
            width: heroRect().width,
            height: heroRect().height,
          });
        }
      });

      tl.to({}, { duration: 0.1 });
    });
  }

  window.runEusLoader = runEusLoader;
  window.shouldPlayEusLoader = shouldPlay;
  window.stopEusLoaderBleed = stopBleedSync;
})();
