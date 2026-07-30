/* global gsap, InertiaPlugin */

function initMomentumBasedHover() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    return;
  }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }
  if (typeof gsap === "undefined" || typeof InertiaPlugin === "undefined") {
    return;
  }

  gsap.registerPlugin(InertiaPlugin);

  const xyMultiplier = 30;
  const rotationMultiplier = 20;
  const inertiaResistance = 200;
  const clampXY = gsap.utils.clamp(-1080, 1080);
  const clampRot = gsap.utils.clamp(-60, 60);

  document.querySelectorAll("[data-momentum-hover-init]").forEach((root) => {
    let prevX = 0;
    let prevY = 0;
    let velX = 0;
    let velY = 0;
    let rafId = null;

    root.addEventListener("mousemove", (e) => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        velX = e.clientX - prevX;
        velY = e.clientY - prevY;
        prevX = e.clientX;
        prevY = e.clientY;
        rafId = null;
      });
    });

    root.querySelectorAll("[data-momentum-hover-element]").forEach((el) => {
      el.addEventListener("mouseenter", (e) => {
        const target = el.querySelector("[data-momentum-hover-target]");
        if (!target) return;

        const { left, top, width, height } = target.getBoundingClientRect();
        const centerX = left + width / 2;
        const centerY = top + height / 2;
        const offsetX = e.clientX - centerX;
        const offsetY = e.clientY - centerY;
        const rawTorque = offsetX * velY - offsetY * velX;
        const leverDist = Math.hypot(offsetX, offsetY) || 1;
        const angularForce = rawTorque / leverDist;

        gsap.to(target, {
          inertia: {
            x: { velocity: clampXY(velX * xyMultiplier), end: 0 },
            y: { velocity: clampXY(velY * xyMultiplier), end: 0 },
            rotation: { velocity: clampRot(angularForce * rotationMultiplier), end: 0 },
            resistance: inertiaResistance,
          },
        });
      });
    });
  });
}

window.initMomentumBasedHover = initMomentumBasedHover;
