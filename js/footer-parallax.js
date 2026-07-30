/* global gsap, ScrollTrigger */

function initFooterParallax() {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    return;
  }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  document.querySelectorAll("[data-footer-parallax]").forEach((el) => {
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
