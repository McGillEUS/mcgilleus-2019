/* global gsap, Draggable, InertiaPlugin, CustomEase */

(function () {
  if (typeof gsap === "undefined" || typeof Draggable === "undefined") return;

  gsap.registerPlugin(Draggable, InertiaPlugin, CustomEase);

  try {
    CustomEase.create("radial", "0.25, 0.1, 0, 1");
  } catch (err) {
    // already registered
  }

  function cleanupRadialSlider(container) {
    if (!container) return;
    container.removeAttribute("data-radial-slider-ready");
    container.removeAttribute("data-radial-slider-compact");
    if (container._radialSliderAutoplay) {
      clearInterval(container._radialSliderAutoplay);
      container._radialSliderAutoplay = null;
    }
    if (container._radialSliderAutoplayCleanup) {
      container._radialSliderAutoplayCleanup();
      container._radialSliderAutoplayCleanup = null;
    }
    if (container._radialSliderGestureCleanup) {
      container._radialSliderGestureCleanup();
      container._radialSliderGestureCleanup = null;
    }
    if (container._radialSliderDraggable) {
      container._radialSliderDraggable.kill();
      container._radialSliderDraggable = null;
    }
    if (container._radialSliderProxy) {
      gsap.killTweensOf(container._radialSliderProxy);
      container._radialSliderProxy = null;
    }
    if (container._radialSliderProxyEl) {
      container._radialSliderProxyEl.remove();
      container._radialSliderProxyEl = null;
    }
    container.querySelectorAll("[data-radial-slider-clone]").forEach((el) => el.remove());

    const track = container.querySelector("[data-radial-slider-list]");
    if (track) {
      track.style.height = "";
      track.querySelectorAll("[data-radial-slider-item]").forEach((item) => {
        gsap.set(item, { clearProps: "all" });
      });
    }
  }

  function destroyRadialCardsSlider(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-radial-slider-init]").forEach(cleanupRadialSlider);
  }

  function debounceOnWidthChange(fn, ms) {
    let lastWidth = window.innerWidth;
    let timer;

    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (window.innerWidth === lastWidth) return;
        lastWidth = window.innerWidth;
        fn.apply(this, args);
      }, ms);
    };
  }

  function initRadialCardsSlider(root) {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Flat carousel on narrow phones/tablets - radial wheel stays on desktop.
    const isCompact = window.matchMedia("(max-width: 767.98px)").matches;
    const slideDuration = isCompact ? 0.4 : 1;
    const clickEase = "radial";
    const autoplayMs = isCompact ? 0 : 3000;
    const scope = root || document;

    scope.querySelectorAll("[data-radial-slider-init]").forEach((container) => {
      const collection = container.querySelector("[data-radial-slider-collection]");
      const track = container.querySelector("[data-radial-slider-list]");
      if (!collection || !track) return;

      const originalItems = Array.from(
        container.querySelectorAll("[data-radial-slider-item]:not([data-radial-slider-clone])")
      );
      if (!originalItems.length) return;

      // Don't tear down a working slider if layout isn't measurable yet
      const probeRect = originalItems[0].getBoundingClientRect();
      if (!probeRect.width || !probeRect.height) return;

      const wasReady = container.hasAttribute("data-radial-slider-ready");
      cleanupRadialSlider(container);
      container.toggleAttribute("data-radial-slider-compact", isCompact);

      container.setAttribute("role", "region");
      container.setAttribute("aria-roledescription", "carousel");
      container.setAttribute(
        "aria-label",
        container.getAttribute("aria-label") || "Campus services"
      );

      track.setAttribute("role", "group");
      track.setAttribute("aria-label", "Slides");

      const dotsWrap = container.querySelector("[data-radial-slider-generate-dots]");
      if (dotsWrap) {
        const dots = Array.from(dotsWrap.querySelectorAll("[data-radial-slider-control]"));
        if (dots.length) {
          const firstDot = dots[0];
          dots.slice(1).forEach((dot) => dot.remove());
          firstDot.setAttribute("data-radial-slider-control", "1");
          firstDot.setAttribute("data-radial-slider-control-status", "not-active");

          for (let i = 2; i <= originalItems.length; i++) {
            const dot = firstDot.cloneNode(true);
            dot.setAttribute("data-radial-slider-control", String(i));
            dot.setAttribute("data-radial-slider-control-status", "not-active");
            dotsWrap.appendChild(dot);
          }
        }
      }

      const controls = Array.from(container.querySelectorAll("[data-radial-slider-control]"));
      const totalEl = container.querySelector("[data-radial-slider-total-slide]");
      const indicators = Array.from(container.querySelectorAll("[data-radial-slider-active-slide]"));
      const labelEl = container.querySelector("[data-radial-active-label]");
      const slideLabels = originalItems.map((item) => {
        const title = item.querySelector(".resources-card__title");
        return title ? title.textContent.trim() : "";
      });

      originalItems.forEach((item, index) => {
        item.removeAttribute("data-radial-slider-item-status");
        item.removeAttribute("aria-hidden");
        item.setAttribute("role", "group");
        item.setAttribute("aria-label", `Slide ${index + 1} of ${originalItems.length}`);
      });

      controls.forEach((btn) => {
        const value = btn.getAttribute("data-radial-slider-control");
        if (value === "prev") btn.setAttribute("aria-label", "Previous slide");
        if (value === "next") btn.setAttribute("aria-label", "Next slide");
        if (/^\d+$/.test(value)) {
          btn.setAttribute("aria-label", `Go to slide ${value}`);
          btn.setAttribute("aria-current", "false");
        }
      });

      track.style.height = "";

      const setNumber = (el, value) => {
        if (!el) return;
        el.textContent = value < 10 ? "0" + value : String(value);
      };

      const mod = (value, total) => ((value % total) + total) % total;

      setNumber(totalEl, originalItems.length);

      const firstRect = originalItems[0].getBoundingClientRect();
      const itemWidth = firstRect.width;
      const itemHeight = firstRect.height;
      if (!itemWidth || !itemHeight) return;

      const nearestDelta = (index, realIndex, total) => {
        const loop = Math.round((realIndex - index) / total);
        return index - (realIndex - loop * total);
      };

      /* ------------------------------------------------------------------ */
      /* Compact: flat horizontal carousel (no overlapping radial cards)   */
      /* ------------------------------------------------------------------ */
      if (isCompact) {
        const gap = 14;
        const stepPx = itemWidth + gap;
        const rotateStep = 1;
        const neededItems = originalItems.length * 2;
        const currentItems = Array.from(
          container.querySelectorAll("[data-radial-slider-item]:not([data-radial-slider-clone])")
        );

        for (let i = currentItems.length; i < neededItems; i++) {
          const clone = currentItems[i % currentItems.length].cloneNode(true);
          clone.setAttribute("data-radial-slider-clone", "");
          clone.setAttribute("aria-hidden", "true");
          track.appendChild(clone);
        }

        const items = Array.from(track.querySelectorAll(":scope > [data-radial-slider-item]"));
        const totalItems = items.length;

        track.style.height = `${itemHeight}px`;
        gsap.set(items, {
          position: "absolute",
          left: "50%",
          top: 0,
          xPercent: -50,
          y: 0,
          rotation: 0,
          transformOrigin: "50% 50%",
        });

        const proxy = { index: 0 };
        container._radialSliderProxy = proxy;

        let lastActiveIndex = null;

        const setIndicator = (index) => {
          const value = index + 1;
          const text = value < 10 ? "0" + value : String(value);
          indicators.forEach((el) => {
            el.textContent = text;
          });
          if (labelEl) labelEl.textContent = slideLabels[index] || "";
        };

        const updateControlStatus = (activeIndex) => {
          controls.forEach((btn) => {
            const value = btn.getAttribute("data-radial-slider-control");
            if (!/^\d+$/.test(value)) return;
            const index = Math.max(0, Math.min(originalItems.length - 1, parseInt(value, 10) - 1));
            const isActive = index === activeIndex;
            btn.setAttribute(
              "data-radial-slider-control-status",
              isActive ? "active" : "not-active"
            );
            if (isActive) btn.setAttribute("aria-current", "true");
            else btn.removeAttribute("aria-current");
          });
        };

        const updateActiveUI = (activeIndex) => {
          if (activeIndex === lastActiveIndex) return;
          setIndicator(activeIndex);
          updateControlStatus(activeIndex);
          lastActiveIndex = activeIndex;
        };

        const render = () => {
          const realIndex = Number(proxy.index) || 0;
          const activeIndex = mod(Math.round(realIndex), totalItems);
          const activeSlideIndex = activeIndex % originalItems.length;

          items.forEach((item, index) => {
            const delta = nearestDelta(index, realIndex, totalItems);
            const absDelta = Math.abs(delta);
            const isActive = index === activeIndex;
            let status = "not-active";
            if (isActive) status = "active";
            else if (absDelta <= 1.01) status = "inview";

            item.setAttribute("data-radial-slider-item-status", status);
            item.setAttribute("aria-hidden", absDelta > 1.01 ? "true" : "false");

            gsap.set(item, {
              x: delta * stepPx,
              xPercent: -50,
              scale: isActive ? 1 : 0.92,
              autoAlpha: absDelta > 1.2 ? 0 : isActive ? 1 : 0.55,
              zIndex: isActive ? 3 : Math.max(1, 2 - Math.round(absDelta)),
              pointerEvents: absDelta > 1.01 ? "none" : "auto",
            });
          });

          updateActiveUI(activeSlideIndex);
        };

        const goToDelta = (delta) => {
          gsap.killTweensOf(proxy);
          const target = Math.round(Number(proxy.index) || 0) + delta;
          gsap.to(proxy, {
            index: target,
            duration: slideDuration,
            ease: clickEase,
            onUpdate: render,
          });
        };

        const nearestDeltaToSlideNumber = (targetNumber, realIndex) => {
          let bestDelta = 0;
          let bestDistance = Infinity;
          items.forEach((item, index) => {
            const slideNumber = index % originalItems.length;
            if (slideNumber !== targetNumber) return;
            const delta = nearestDelta(index, realIndex, totalItems);
            const distance = Math.abs(delta);
            if (distance < bestDistance) {
              bestDistance = distance;
              bestDelta = delta;
            }
          });
          return bestDelta;
        };

        controls.forEach((btn) => {
          btn.disabled = false;
          const value = btn.getAttribute("data-radial-slider-control");

          if (value === "next" || value === "prev") {
            btn.onclick = (event) => {
              event.preventDefault();
              event.stopPropagation();
              goToDelta(value === "next" ? 1 : -1);
            };
          }

          if (/^\d+$/.test(value)) {
            const targetSlideNumber = Math.max(
              0,
              Math.min(originalItems.length - 1, parseInt(value, 10) - 1)
            );
            btn.onclick = (event) => {
              event.preventDefault();
              event.stopPropagation();
              gsap.killTweensOf(proxy);
              const currentIndex = Number(proxy.index) || 0;
              const delta = nearestDeltaToSlideNumber(targetSlideNumber, currentIndex);
              gsap.to(proxy, {
                index: currentIndex + delta,
                duration: slideDuration,
                ease: clickEase,
                onUpdate: render,
              });
            };
          }
        });

        let tracking = false;
        let axis = null;
        let startX = 0;
        let startY = 0;
        let baseIndex = 0;

        const isUiTarget = (target) =>
          !!(target && target.closest && target.closest("a, button, input, textarea, label"));

        const endGesture = () => {
          if (axis === "h") {
            const targetIndex = Math.round(Number(proxy.index) || 0);
            gsap.to(proxy, {
              index: targetIndex,
              duration: slideDuration,
              ease: clickEase,
              onUpdate: render,
            });
          }
          tracking = false;
          axis = null;
          container.setAttribute("data-radial-slider-drag-status", "grab");
        };

        const onPointerDown = (event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          if (isUiTarget(event.target)) return;
          tracking = true;
          axis = null;
          startX = event.clientX;
          startY = event.clientY;
          baseIndex = Number(proxy.index) || 0;
          gsap.killTweensOf(proxy);
        };

        const onPointerMove = (event) => {
          if (!tracking) return;
          const x = event.clientX - startX;
          const y = event.clientY - startY;

          if (!axis) {
            if (Math.abs(x) < 8 && Math.abs(y) < 8) return;
            axis = Math.abs(x) > Math.abs(y) * 1.15 ? "h" : "v";
            if (axis === "v") {
              tracking = false;
              return;
            }
            container.setAttribute("data-radial-slider-drag-status", "grabbing");
          }

          if (axis !== "h") return;
          event.preventDefault();
          proxy.index = baseIndex - x / Math.max(stepPx, 1);
          render();
        };

        const onPointerUp = () => {
          if (!tracking && axis !== "h") return;
          endGesture();
        };

        collection.addEventListener("pointerdown", onPointerDown, { passive: true });
        collection.addEventListener("pointermove", onPointerMove, { passive: false });
        collection.addEventListener("pointerup", onPointerUp, { passive: true });
        collection.addEventListener("pointercancel", onPointerUp, { passive: true });
        collection.addEventListener("lostpointercapture", onPointerUp, { passive: true });

        container._radialSliderGestureCleanup = () => {
          collection.removeEventListener("pointerdown", onPointerDown);
          collection.removeEventListener("pointermove", onPointerMove);
          collection.removeEventListener("pointerup", onPointerUp);
          collection.removeEventListener("pointercancel", onPointerUp);
          collection.removeEventListener("lostpointercapture", onPointerUp);
        };

        container.setAttribute("data-radial-slider-drag-status", "grab");
        render();

        if (wasReady) {
          container.setAttribute("data-radial-slider-ready", "");
        } else {
          requestAnimationFrame(() => {
            container.setAttribute("data-radial-slider-ready", "");
          });
        }
        return;
      }

      /* ------------------------------------------------------------------ */
      /* Desktop: radial / arc wheel                                        */
      /* ------------------------------------------------------------------ */
      const containerStyles = getComputedStyle(container);
      const rotateStep = Math.abs(parseFloat(containerStyles.getPropertyValue("--slider-rotate"))) || 18;
      const maxLoopItems = Math.max(1, Math.floor(360 / rotateStep));

      const originParts = getComputedStyle(originalItems[0]).transformOrigin.split(" ");
      const originY = parseFloat(originParts[1]) || itemHeight * 3.75;
      const wheelRadius = Math.max(0, originY - itemHeight / 2);
      const proxyRadius = wheelRadius + Math.max(itemWidth, itemHeight) * 0.525;

      const getBoundsAtAngle = (angle) => {
        const rad = (angle * Math.PI) / 180;
        return {
          x: Math.sin(rad) * wheelRadius,
          y: originY - Math.cos(rad) * wheelRadius,
          halfWidth:
            Math.abs(Math.cos(rad)) * (itemWidth / 2) + Math.abs(Math.sin(rad)) * (itemHeight / 2),
          halfHeight:
            Math.abs(Math.sin(rad)) * (itemWidth / 2) + Math.abs(Math.cos(rad)) * (itemHeight / 2),
        };
      };

      const isOffsetInsideContainer = (offset) => {
        const containerRect = container.getBoundingClientRect();
        const trackRect = track.getBoundingClientRect();
        const originX = trackRect.left + trackRect.width / 2;
        const originYTop = trackRect.top;
        const leftLimit = containerRect.left - originX;
        const rightLimit = containerRect.right - originX;
        const topLimit = containerRect.top - originYTop;
        const bottomLimit = containerRect.bottom - originYTop;
        const bounds = getBoundsAtAngle(offset * rotateStep);
        const cardLeft = bounds.x - bounds.halfWidth;
        const cardRight = bounds.x + bounds.halfWidth;
        const cardTop = bounds.y - bounds.halfHeight;
        const cardBottom = bounds.y + bounds.halfHeight;
        return (
          cardRight >= leftLimit &&
          cardLeft <= rightLimit &&
          cardBottom >= topLimit &&
          cardTop <= bottomLimit
        );
      };

      const getVisibleOffsets = () => {
        const offsets = [0];
        const maxSide = Math.ceil(maxLoopItems / 2);
        let leftEdge = 0;
        let rightEdge = 0;

        for (let i = 1; i <= maxSide; i++) {
          if (!isOffsetInsideContainer(i)) break;
          offsets.push(i);
          rightEdge = i;
        }

        for (let i = 1; i <= maxSide; i++) {
          if (!isOffsetInsideContainer(-i)) break;
          offsets.unshift(-i);
          leftEdge = -i;
        }

        const nextLeft = leftEdge - 1;
        const nextRight = rightEdge + 1;
        if (Math.abs(nextLeft) <= maxSide) offsets.unshift(nextLeft);
        if (Math.abs(nextRight) <= maxSide) offsets.push(nextRight);
        return offsets;
      };

      const visibleOffsets = getVisibleOffsets();
      const minItemsNeeded = Math.min(
        maxLoopItems,
        Math.max(originalItems.length, visibleOffsets.length)
      );
      const neededItems = Math.ceil(minItemsNeeded / originalItems.length) * originalItems.length;
      const currentItems = Array.from(
        container.querySelectorAll("[data-radial-slider-item]:not([data-radial-slider-clone])")
      );

      for (let i = currentItems.length; i < neededItems; i++) {
        const clone = currentItems[i % currentItems.length].cloneNode(true);
        clone.setAttribute("data-radial-slider-clone", "");
        clone.setAttribute("aria-hidden", "true");
        track.appendChild(clone);
      }

      const items = Array.from(track.querySelectorAll(":scope > [data-radial-slider-item]"));
      const totalItems = items.length;

      track.style.height = itemHeight + "px";
      items.forEach((item) => {
        item.setAttribute("data-radial-slider-item-status", "not-active");
      });
      container.setAttribute("data-radial-slider-drag-status", "grab");

      const containerRect = container.getBoundingClientRect();
      const collectionRect = collection.getBoundingClientRect();
      const trackRect = track.getBoundingClientRect();

      const proxyWrap = document.createElement("div");
      proxyWrap.setAttribute("data-radial-slider-proxy-wrap", "");
      Object.assign(proxyWrap.style, {
        position: "absolute",
        left: containerRect.left - collectionRect.left + "px",
        top: containerRect.top - collectionRect.top + "px",
        width: containerRect.width + "px",
        height: containerRect.height + "px",
        overflow: "hidden",
        pointerEvents: "none",
      });

      const proxy = document.createElement("div");
      proxy.setAttribute("data-radial-slider-proxy", "");
      Object.assign(proxy.style, {
        position: "absolute",
        width: proxyRadius * 2 + "px",
        height: proxyRadius * 2 + "px",
        left: trackRect.left + trackRect.width / 2 - containerRect.left + "px",
        top: trackRect.top - containerRect.top + originY - proxyRadius + "px",
        transform: "translateX(-50%)",
        borderRadius: "0",
        pointerEvents: "auto",
        opacity: "0",
      });

      proxyWrap.appendChild(proxy);
      collection.appendChild(proxyWrap);
      container._radialSliderProxy = proxy;
      container._radialSliderProxyEl = proxyWrap;

      const setRotation = items.map((item) => gsap.quickSetter(item, "rotation", "deg"));
      gsap.set(proxy, { rotation: 0 });

      const getIndexFromProxy = () => -gsap.getProperty(proxy, "rotation") / rotateStep;

      const nearestDeltaToSlideNumber = (targetNumber, realIndex) => {
        let bestDelta = 0;
        let bestDistance = Infinity;
        items.forEach((item, index) => {
          const slideNumber = index % originalItems.length;
          if (slideNumber !== targetNumber) return;
          const delta = nearestDelta(index, realIndex, totalItems);
          const distance = Math.abs(delta);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestDelta = delta;
          }
        });
        return bestDelta;
      };

      let lastActiveIndex = null;

      const setIndicator = (index) => {
        const value = index + 1;
        const text = value < 10 ? "0" + value : String(value);
        indicators.forEach((el) => {
          el.textContent = text;
        });
        if (labelEl) labelEl.textContent = slideLabels[index] || "";
      };

      const updateControlStatus = (activeIndex) => {
        controls.forEach((btn) => {
          const value = btn.getAttribute("data-radial-slider-control");
          if (!/^\d+$/.test(value)) return;
          const index = Math.max(0, Math.min(originalItems.length - 1, parseInt(value, 10) - 1));
          const isActive = index === activeIndex;
          btn.setAttribute("data-radial-slider-control-status", isActive ? "active" : "not-active");
          if (isActive) btn.setAttribute("aria-current", "true");
          else btn.removeAttribute("aria-current");
        });
      };

      const updateActiveUI = (activeIndex) => {
        if (activeIndex === lastActiveIndex) return;
        setIndicator(activeIndex);
        updateControlStatus(activeIndex);
        lastActiveIndex = activeIndex;
      };

      const render = () => {
        const realIndex = getIndexFromProxy();
        const activeIndex = mod(Math.round(realIndex), totalItems);
        const activeSlideIndex = activeIndex % originalItems.length;

        items.forEach((item, index) => {
          const rotation = nearestDelta(index, realIndex, totalItems) * rotateStep;
          item.setAttribute(
            "data-radial-slider-item-status",
            index === activeIndex ? "active" : "inview"
          );
          setRotation[index](rotation);
        });

        updateActiveUI(activeSlideIndex);
      };

      const goToDelta = (delta) => {
        gsap.killTweensOf(proxy);
        const currentIndex = getIndexFromProxy();
        const targetIndex = Math.round(currentIndex) + delta;
        gsap.to(proxy, {
          rotation: -targetIndex * rotateStep,
          duration: slideDuration,
          ease: clickEase,
          onUpdate: render,
        });
      };

      let autoplayStopped = !autoplayMs;

      const stopAutoplay = () => {
        if (container._radialSliderAutoplay) {
          clearInterval(container._radialSliderAutoplay);
          container._radialSliderAutoplay = null;
        }
      };

      const disableAutoplay = () => {
        autoplayStopped = true;
        stopAutoplay();
      };

      const startAutoplay = () => {
        stopAutoplay();
        if (prefersReducedMotion || autoplayStopped || !autoplayMs || document.hidden) {
          return;
        }
        container._radialSliderAutoplay = setInterval(() => goToDelta(1), autoplayMs);
      };

      controls.forEach((btn) => {
        btn.disabled = false;
        const value = btn.getAttribute("data-radial-slider-control");

        if (value === "next" || value === "prev") {
          btn.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            disableAutoplay();
            goToDelta(value === "next" ? 1 : -1);
          };
        }

        if (/^\d+$/.test(value)) {
          const targetSlideNumber = Math.max(
            0,
            Math.min(originalItems.length - 1, parseInt(value, 10) - 1)
          );
          btn.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            disableAutoplay();
            gsap.killTweensOf(proxy);
            const currentIndex = getIndexFromProxy();
            const delta = nearestDeltaToSlideNumber(targetSlideNumber, currentIndex);
            gsap.to(proxy, {
              rotation: -(currentIndex + delta) * rotateStep,
              duration: slideDuration,
              ease: clickEase,
              onUpdate: render,
            });
          };
        }
      });

      container._radialSliderDraggable = Draggable.create(proxy, {
        type: "rotation",
        trigger: [proxy, ...items],
        dragClickables: false,
        inertia: typeof InertiaPlugin !== "undefined",
        throwResistance: 2000,
        dragResistance: 0.05,
        maxDuration: 1,
        minDuration: 0.5,
        edgeResistance: 0.75,
        overshootTolerance: 0,
        snap: (value) => Math.round(value / rotateStep) * rotateStep,
        onDrag: render,
        onThrowUpdate: render,
        onThrowComplete: () => {
          container.setAttribute("data-radial-slider-drag-status", "grab");
          render();
        },
        onPress: () => {
          disableAutoplay();
          container.setAttribute("data-radial-slider-drag-status", "grabbing");
        },
        onDragStart: () => {
          disableAutoplay();
          container.setAttribute("data-radial-slider-drag-status", "grabbing");
        },
        onRelease: () => {
          container.setAttribute("data-radial-slider-drag-status", "grab");
        },
      })[0];

      const onInteract = () => disableAutoplay();
      const onVisibility = () => {
        if (document.hidden) stopAutoplay();
        else if (!autoplayStopped) startAutoplay();
      };

      container.addEventListener("pointerdown", onInteract);
      document.addEventListener("visibilitychange", onVisibility);

      container._radialSliderAutoplayCleanup = () => {
        container.removeEventListener("pointerdown", onInteract);
        document.removeEventListener("visibilitychange", onVisibility);
        stopAutoplay();
      };

      render();
      startAutoplay();

      if (wasReady) {
        container.setAttribute("data-radial-slider-ready", "");
      } else {
        requestAnimationFrame(() => {
          container.setAttribute("data-radial-slider-ready", "");
        });
      }
    });

    if (initRadialCardsSlider._resize) {
      window.removeEventListener("resize", initRadialCardsSlider._resize);
    }
    initRadialCardsSlider._resize = debounceOnWidthChange(() => initRadialCardsSlider(), 200);
    window.addEventListener("resize", initRadialCardsSlider._resize);
  }

  window.initRadialCardsSlider = initRadialCardsSlider;
  window.destroyRadialCardsSlider = destroyRadialCardsSlider;
})();
