/* global gsap, ScrollTrigger */

function resetFooterParallaxStyles(root) {
  const scope = root && root.querySelectorAll ? root : document;
  scope.querySelectorAll("[data-footer-parallax]").forEach((el) => {
    const inner = el.querySelector("[data-footer-parallax-inner]");
    const dark = el.querySelector("[data-footer-parallax-dark]");
    if (inner && typeof gsap !== "undefined") {
      gsap.set(inner, { clearProps: "transform,translate,y,yPercent" });
    } else if (inner) {
      inner.style.transform = "";
    }
    if (dark && typeof gsap !== "undefined") {
      gsap.set(dark, { clearProps: "opacity" });
    } else if (dark) {
      dark.style.opacity = "";
    }
  });
}

function initFooterParallax(root) {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    return;
  }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    resetFooterParallaxStyles(root);
    return;
  }
  // Parallax + overflow clipping is unreliable on phones (Lenis/iOS)
  if (window.matchMedia("(max-width: 900px), (pointer: coarse)").matches) {
    resetFooterParallaxStyles(root);
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const scope = root && root.querySelectorAll ? root : document;
  scope.querySelectorAll("[data-footer-parallax]").forEach((el) => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start: "clamp(top bottom)",
        end: "clamp(top top)",
        scrub: true,
      },
    });

    const inner = el.querySelector("[data-footer-parallax-inner]");
    const dark = el.querySelector("[data-footer-parallax-dark]");

    if (inner) {
      tl.from(inner, {
        yPercent: -12,
        ease: "none",
      });
    }

    if (dark) {
      tl.from(
        dark,
        {
          opacity: 0.12,
          ease: "none",
        },
        "<"
      );
    }
  });
}

window.initFooterParallax = initFooterParallax;
document.addEventListener("DOMContentLoaded", () => {
  if (document.body?.hasAttribute("data-barba")) return;
  initFooterParallax();
});
