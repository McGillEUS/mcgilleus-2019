/* global gsap, CustomEase */

(function () {
  if (typeof gsap === "undefined") return;

  gsap.registerPlugin(CustomEase);
  try {
    CustomEase.create("move", "0.3, 0.075, 0, 1");
  } catch (err) {
    // already registered
  }

  function initCollageFocusCardOnHover(root) {
    const activeScale = 1.06;
    const inactiveScale = 0.94;
    const gapPercent = 1.5;
    const secondCardBoost = 1.1;
    const centerPullPercent = 12;
    const duration = 0.8;
    const ease = "move";

    const scope = root || document;

    scope.querySelectorAll("[data-interactive-collage-init]").forEach((collageRoot) => {
      collageRoot._interactiveCollageAbort?.abort();

      const list = collageRoot.querySelector("[data-interactive-collage-list]");
      const items = [...collageRoot.querySelectorAll("[data-interactive-collage-item]")];
      const isTouch = !window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      const isCompact = window.matchMedia("(max-width: 767.98px)").matches;
      if (!list || !items.length) return;

      const controller = new AbortController();
      const { signal } = controller;
      let activeItem = null;
      const getInner = (item) => item.querySelector("[data-interactive-collage-item-inner]");

      // Phones: plain tap-to-open grid - the hover “push apart” effect doesn’t fit.
      if (isCompact) {
        items.forEach((item) => {
          item.addEventListener(
            "click",
            () => {
              item.dispatchEvent(new CustomEvent("collage-activate", { bubbles: true }));
            },
            { signal }
          );
        });
        collageRoot._interactiveCollageAbort = controller;
        return;
      }

      const getMoveStrength = (distance) => {
        const strength = 1 / (1 + Math.pow(distance - 1, 1.2) * 0.45);
        return distance === 2 ? strength * secondCardBoost : strength;
      };

      const animateItem = (item, xPercent, yPercent, scale) => {
        const inner = getInner(item);
        if (!inner) return;
        gsap.to(inner, {
          xPercent,
          yPercent,
          scale,
          duration,
          ease,
          overwrite: true,
        });
      };

      const resetCollage = () => {
        activeItem = null;
        items.forEach((item) => {
          item.removeAttribute("data-interactive-collage-focus");
          animateItem(item, 0, 0, 1);
        });
      };

      const focusItem = (active) => {
        if (activeItem === active) return;
        activeItem = active;

        items.forEach((item) => {
          if (item === active) item.setAttribute("data-interactive-collage-focus", "");
          else item.removeAttribute("data-interactive-collage-focus");
        });

        const listRect = list.getBoundingClientRect();
        const listCenterY = listRect.top + listRect.height / 2;
        const gap = (listRect.width * gapPercent) / 100;

        const orderedItems = [...items].sort((a, b) => {
          const aRect = a.getBoundingClientRect();
          const bRect = b.getBoundingClientRect();
          return aRect.left + aRect.width / 2 - (bRect.left + bRect.width / 2);
        });

        const activeIndex = orderedItems.indexOf(active);
        const activeRect = active.getBoundingClientRect();
        const activeCenterX = activeRect.left + activeRect.width / 2;
        const activeLeft = activeCenterX - (activeRect.width * activeScale) / 2;
        const activeRight = activeCenterX + (activeRect.width * activeScale) / 2;

        const leftItem = orderedItems[activeIndex - 1];
        const rightItem = orderedItems[activeIndex + 1];

        let leftMove = 0;
        let rightMove = 0;

        if (leftItem) {
          const rect = leftItem.getBoundingClientRect();
          const itemRight = rect.left + rect.width / 2 + (rect.width * inactiveScale) / 2;
          leftMove = Math.min(0, activeLeft - gap - itemRight);
        }

        if (rightItem) {
          const rect = rightItem.getBoundingClientRect();
          const itemLeft = rect.left + rect.width / 2 - (rect.width * inactiveScale) / 2;
          rightMove = Math.max(0, activeRight + gap - itemLeft);
        }

        orderedItems.forEach((item, index) => {
          if (item === active) {
            animateItem(item, 0, 0, activeScale);
            return;
          }

          const rect = item.getBoundingClientRect();
          const difference = index - activeIndex;
          const distance = Math.abs(difference);
          const strength = getMoveStrength(distance);
          const itemCenterY = rect.top + rect.height / 2;
          const centerProgress = (listCenterY - itemCenterY) / (listRect.height / 2);
          const moveX = difference < 0 ? leftMove * strength : rightMove * strength;
          const scale = inactiveScale - (1 - strength) * 0.12;

          animateItem(
            item,
            (moveX / rect.width) * 100,
            centerPullPercent * centerProgress * strength,
            scale
          );
        });
      };

      const getHoveredItem = (event) => {
        if (activeItem) {
          const rect = getInner(activeItem).getBoundingClientRect();
          if (
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom
          ) {
            return activeItem;
          }
        }
        return (
          document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest("[data-interactive-collage-item]") || null
        );
      };

      if (isTouch) {
        items.forEach((item) => {
          item.addEventListener(
            "click",
            (event) => {
              if (activeItem === item) {
                item.dispatchEvent(
                  new CustomEvent("collage-activate", { bubbles: true })
                );
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              focusItem(item);
            },
            { signal }
          );
        });

        document.addEventListener(
          "click",
          (event) => {
            if (!collageRoot.contains(event.target)) resetCollage();
          },
          { signal }
        );
      } else {
        collageRoot.addEventListener(
          "pointermove",
          (event) => {
            const item = getHoveredItem(event);
            if (item) focusItem(item);
            else resetCollage();
          },
          { signal }
        );
        collageRoot.addEventListener("pointerleave", resetCollage, { signal });
      }

      collageRoot._interactiveCollageAbort = controller;
    });
  }

  window.initCollageFocusCardOnHover = initCollageFocusCardOnHover;
})();
