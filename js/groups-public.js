(function () {
  const CATEGORIES = [
    "Departmental Societies",
    "Departmental Committees",
    "Clubs",
    "Committees",
    "Design Teams",
    "Publications",
  ];

  const COLLAGE_SHAPES = [
    "is--landscape",
    "",
    "is--landscape",
    "is--portrait",
    "",
    "is--landscape",
    "is--landscape",
    "",
  ];

  let groupsCache = null;
  let groupsPromise = null;
  let lastFocus = null;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function shuffle(list) {
    const arr = [...list];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  async function fetchGroups(force) {
    if (!force && groupsCache) return groupsCache;
    if (force) {
      groupsCache = null;
      groupsPromise = null;
    }
    if (!groupsPromise) {
      groupsPromise = fetch("/api/groups")
        .then((response) => {
          if (!response.ok) throw new Error("Failed to load groups");
          return response.json();
        })
        .then((groups) => {
          groupsCache = Array.isArray(groups) ? groups : [];
          return groupsCache;
        })
        .catch((error) => {
          groupsPromise = null;
          throw error;
        });
    }
    return groupsPromise;
  }

  window.prefetchGroups = function prefetchGroups() {
    fetchGroups().catch(() => {});
  };

  function pickCollageImage(group) {
    return group.logo || "";
  }

  function logoLooksTransparent(src) {
    return /\.(png|svg|webp)(\?|$)/i.test(String(src || ""));
  }

  function imageHasTransparency(img) {
    try {
      const srcW = img.naturalWidth;
      const srcH = img.naturalHeight;
      if (!srcW || !srcH) return logoLooksTransparent(img.currentSrc || img.src);

      const maxSide = 48;
      const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
      const w = Math.max(1, Math.round(srcW * scale));
      const h = Math.max(1, Math.round(srcH * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return logoLooksTransparent(img.currentSrc || img.src);
      ctx.drawImage(img, 0, 0, w, h);
      const { data } = ctx.getImageData(0, 0, w, h);
      for (let i = 3; i < data.length; i += 16) {
        if (data[i] < 250) return true;
      }
      return false;
    } catch (_error) {
      return logoLooksTransparent(img.currentSrc || img.src);
    }
  }

  function applyWhiteBgForTransparentLogos(root, cardSelector) {
    if (!root) return;
    root.querySelectorAll(`${cardSelector} img`).forEach((img) => {
      const card = img.closest(cardSelector);
      if (!card) return;

      const apply = () => {
        if (imageHasTransparency(img)) {
          card.classList.add("has-white-bg");
        } else {
          card.classList.remove("has-white-bg");
        }
      };

      if (img.complete && img.naturalWidth) apply();
      else img.addEventListener("load", apply, { once: true });
    });
  }

  function renderNavigator(mount, groups, onOpen) {
    if (!mount) return;

    const sections = CATEGORIES.map((category) => {
      const items = groups.filter((group) => group.category === category);
      if (!items.length) return null;
      const id = `cat-${category.replace(/\s+/g, "-").toLowerCase()}`;
      return { category, items, id };
    }).filter(Boolean);

    const toc = sections.length
      ? `<nav class="involved-toc" aria-label="Group categories">
          ${sections
            .map(
              (section) => `
            <a class="involved-toc__link" href="#${escapeHtml(section.id)}">
              <span class="involved-toc__label">${escapeHtml(section.category)}</span>
              <span class="involved-toc__count">${section.items.length}</span>
            </a>`
            )
            .join("")}
        </nav>`
      : "";

    mount.innerHTML =
      toc +
      sections
        .map(
          (section) => `
        <section class="involved-section" aria-labelledby="${escapeHtml(section.id)}">
          <header class="involved-section__head">
            <h2 class="involved-category" id="${escapeHtml(section.id)}">${escapeHtml(
              section.category
            )}</h2>
            <p class="involved-section__count">${section.items.length} group${
              section.items.length === 1 ? "" : "s"
            }</p>
          </header>
          <div class="involved-grid">
            ${section.items
              .map(
                (group) => `
              <button type="button" class="involved-item" data-open-group="${escapeHtml(
                group.id
              )}">
                <span class="involved-item__logo" aria-hidden="true">
                  <img src="${escapeHtml(group.logo || "")}" alt="" loading="lazy">
                </span>
                <span class="involved-item__name">${escapeHtml(group.name)}</span>
              </button>`
              )
              .join("")}
          </div>
        </section>`
        )
        .join("");

    mount.querySelectorAll(".involved-toc__link").forEach((link) => {
      link.addEventListener("click", (event) => {
        const id = link.getAttribute("href");
        const target = id ? mount.querySelector(id) || document.querySelector(id) : null;
        if (!target) return;
        event.preventDefault();
        if (typeof window.scrollSiteTo === "function") {
          window.scrollSiteTo(target, { offset: -88 });
        } else {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });

    mount.querySelectorAll("[data-open-group]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const group = groups.find((item) => item.id === btn.getAttribute("data-open-group"));
        if (group) onOpen(group);
      });
    });
  }

  function renderCollage(mount, groups, onOpen) {
    if (!mount) return;
    const sample = shuffle(groups).slice(0, 8);
    while (sample.length < 8 && groups.length) {
      sample.push(groups[sample.length % groups.length]);
    }

    mount.innerHTML = `
      <div data-interactive-collage-init class="interactive-collage">
        <div class="interactive-collage__collection">
          <div data-interactive-collage-list class="interactive-collage__list">
            ${sample
              .map((group, index) => {
                const shape = COLLAGE_SHAPES[index] || "";
                const image = pickCollageImage(group);
                return `
              <div data-interactive-collage-item class="interactive-collage__item is--${
                index + 1
              }" data-open-group="${escapeHtml(group.id)}">
                <div data-interactive-collage-item-inner class="interactive-collage__item-inner">
                  <button type="button" class="involved-collage-card ${shape}" aria-label="${escapeHtml(
                    group.name
                  )}">
                    <img src="${escapeHtml(image)}" alt="" class="cover-image" loading="lazy">
                  </button>
                </div>
              </div>`;
              })
              .join("")}
          </div>
        </div>
      </div>
    `;

    const isTouch = !window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    mount.querySelectorAll("[data-open-group]").forEach((item) => {
      const open = () => {
        const group = groups.find((g) => g.id === item.getAttribute("data-open-group"));
        if (group) onOpen(group);
      };
      if (isTouch) {
        item.addEventListener("collage-activate", open);
      } else {
        item.addEventListener("click", open);
      }
    });

    if (typeof window.initCollageFocusCardOnHover === "function") {
      window.initCollageFocusCardOnHover(mount);
    }

    applyWhiteBgForTransparentLogos(mount, ".involved-collage-card");
  }

  function formatDescription(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed) {
      return `<p class="involved-modal__desc involved-modal__desc--empty">More info coming soon.</p>`;
    }
    return trimmed
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block) => `<p class="involved-modal__desc">${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
      .join("");
  }

  function createSmoothScroller(getEl, isActive) {
    let target = 0;
    let current = 0;
    let velocity = 0;
    let rafId = 0;

    const clamp = (value, el) => {
      const max = Math.max(0, el.scrollHeight - el.clientHeight);
      return Math.min(max, Math.max(0, value));
    };

    const tick = () => {
      const el = getEl();
      if (!el || (isActive && !isActive())) {
        rafId = 0;
        velocity = 0;
        return;
      }

      // Smooth chase + light momentum (Lenis-ish)
      current += (target - current) * 0.16;
      velocity *= 0.82;
      current += velocity;

      const max = Math.max(0, el.scrollHeight - el.clientHeight);
      if (current < 0) {
        current = 0;
        target = 0;
        velocity = 0;
      } else if (current > max) {
        current = max;
        target = max;
        velocity = 0;
      }

      if (Math.abs(target - current) < 0.2 && Math.abs(velocity) < 0.2) {
        current = target;
        velocity = 0;
        el.scrollTop = current;
        rafId = 0;
        return;
      }

      el.scrollTop = current;
      rafId = requestAnimationFrame(tick);
    };

    const start = () => {
      if (!rafId) rafId = requestAnimationFrame(tick);
    };

    const onWheel = (event) => {
      if (isActive && !isActive()) return;
      const el = getEl();
      if (!el) return;

      event.preventDefault();
      event.stopPropagation();

      if (!rafId) {
        current = el.scrollTop;
        target = current;
      }

      let delta = event.deltaY;
      if (event.deltaMode === 1) delta *= 16;
      else if (event.deltaMode === 2) delta *= el.clientHeight;

      // Trackpads send small deltas often; mice send large ones - normalize a bit
      const intensity = Math.abs(delta) > 40 ? 1.05 : 0.95;
      delta *= intensity;

      target = clamp(target + delta, el);
      velocity += delta * 0.08;
      start();
    };

    const reset = () => {
      const el = getEl();
      current = 0;
      target = 0;
      velocity = 0;
      if (el) el.scrollTop = 0;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    return { onWheel, reset };
  }

  function isGroupModalOpen(modal) {
    return modal?.getAttribute("data-modal-group-status") === "active";
  }

  function bindModalSmoothScroll(modal) {
    const scroller = createSmoothScroller(
      () => modal.querySelector("[data-modal-scroll]"),
      () => isGroupModalOpen(modal)
    );
    const coarsePointer =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse), (max-width: 767.98px)").matches;

    // Custom wheel smoothing fights native touch scrolling on phones - skip it there.
    if (!coarsePointer) {
      modal.addEventListener(
        "wheel",
        (event) => {
          if (!isGroupModalOpen(modal)) return;
          const card = modal.querySelector('[data-modal-name="group-detail"]');
          if (!card?.contains(event.target)) return;
          scroller.onWheel(event);
        },
        { passive: false, capture: true }
      );
    } else {
      // Keep page-level Lenis/touch handlers from eating vertical drags inside the sheet.
      modal.addEventListener(
        "touchmove",
        (event) => {
          if (!isGroupModalOpen(modal)) return;
          const scrollEl = modal.querySelector("[data-modal-scroll]");
          if (scrollEl?.contains(event.target)) event.stopPropagation();
        },
        { passive: true, capture: true }
      );
    }

    modal._resetModalScroll = scroller.reset;
  }

  function ensureModal() {
    let modal = document.getElementById("involved-group-modal");
    // Drop older nested-frame markup if still in the page
    if (modal?.querySelector(".involved-modal__scroll-shell")) {
      modal.remove();
      modal = null;
    }
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "involved-group-modal";
    modal.className = "modal involved-modal";
    modal.setAttribute("data-modal-group-status", "not-active");
    modal.innerHTML = `
      <div data-modal-close class="modal__dark" aria-hidden="true"></div>
      <div
        data-modal-name="group-detail"
        data-modal-status="not-active"
        class="modal__card involved-modal__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="involved-modal-title"
      >
        <div class="modal__content involved-modal__body" data-modal-body></div>
        <button type="button" data-modal-close class="modal__btn-close" aria-label="Close">
          <span class="modal__btn-close-bar" aria-hidden="true"></span>
          <span class="modal__btn-close-bar is--second" aria-hidden="true"></span>
        </button>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelectorAll("[data-modal-close]").forEach((closeBtn) => {
      closeBtn.addEventListener("click", closeGroupModal);
    });

    bindModalSmoothScroll(modal);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isGroupModalOpen(modal)) closeGroupModal();
    });

    return modal;
  }

  function openGroupModal(group) {
    const modal = ensureModal();
    const card = modal.querySelector('[data-modal-name="group-detail"]');
    const body = modal.querySelector("[data-modal-body]");
    if (!card || !body) return;

    const links = group.links || {};
    const photos = Array.isArray(group.photos) ? group.photos.filter(Boolean) : [];
    const website = String(links.website || "").trim();
    const instagram = String(links.instagram || "").trim();
    const form = String(links.form || "").trim();

    const actions = [
      website
        ? `<a class="involved-modal__cta" href="${escapeHtml(
            website
          )}" target="_blank" rel="noopener noreferrer"><span>Website</span><span aria-hidden="true">→</span></a>`
        : "",
      instagram
        ? `<a class="involved-modal__cta involved-modal__cta--ghost" href="${escapeHtml(
            instagram
          )}" target="_blank" rel="noopener noreferrer"><span>Instagram</span><span aria-hidden="true">→</span></a>`
        : "",
      form
        ? `<a class="involved-modal__cta involved-modal__cta--ghost" href="${escapeHtml(
            form
          )}" target="_blank" rel="noopener noreferrer"><span>Join / Form</span><span aria-hidden="true">→</span></a>`
        : "",
    ]
      .filter(Boolean)
      .join("");

    body.innerHTML = `
      <div class="involved-modal__header">
        <img class="involved-modal__logo" src="${escapeHtml(group.logo || "")}" alt="">
        <div class="involved-modal__heading">
          <p class="involved-modal__category">${escapeHtml(group.category || "")}</p>
          <h2 id="involved-modal-title" class="involved-modal__title">${escapeHtml(
            group.name
          )}</h2>
        </div>
      </div>
      <div class="involved-modal__scroll" data-modal-scroll>
        <div class="involved-modal__layout${photos.length ? " has-photos" : ""}">
          <div class="involved-modal__copy">
            <div class="involved-modal__desc-wrap">
              ${formatDescription(group.description)}
            </div>
          </div>
          ${
            photos.length
              ? `<aside class="involved-modal__photos" aria-label="Photos">
                  ${photos
                    .map(
                      (src) =>
                        `<img src="${escapeHtml(src)}" alt="" loading="lazy" class="involved-modal__photo">`
                    )
                    .join("")}
                </aside>`
              : ""
          }
        </div>
      </div>
      <div class="involved-modal__footer">
        ${
          actions ||
          `<span class="involved-modal__empty-links">Links coming soon - check back later.</span>`
        }
      </div>
    `;

    card.classList.toggle("is-compact", !photos.length);
    if (typeof modal._resetModalScroll === "function") modal._resetModalScroll();

    lastFocus = document.activeElement;
    const alreadyOpen = isGroupModalOpen(modal);
    delete modal.dataset.closing;
    document.body.classList.add("involved-modal-open");
    if (!alreadyOpen && typeof window.pauseSiteScroll === "function") {
      window.pauseSiteScroll();
    }

    card.setAttribute("data-modal-status", "active");
    modal.setAttribute("data-modal-group-status", "active");
    modal.querySelector(".modal__btn-close")?.focus({ preventScroll: true });
  }

  function closeGroupModal() {
    const modal = document.getElementById("involved-group-modal");
    if (!modal || !isGroupModalOpen(modal) || modal.dataset.closing === "1") return;

    modal.dataset.closing = "1";
    modal.setAttribute("data-modal-group-status", "not-active");
    modal.querySelectorAll("[data-modal-name]").forEach((card) => {
      card.setAttribute("data-modal-status", "not-active");
    });
    document.body.classList.remove("involved-modal-open");
    if (typeof window.resumeSiteScroll === "function") {
      window.resumeSiteScroll();
    }

    window.setTimeout(() => {
      delete modal.dataset.closing;
      if (lastFocus && typeof lastFocus.focus === "function") {
        lastFocus.focus({ preventScroll: true });
      }
    }, 220);
  }

  window.openGroupModal = openGroupModal;
  window.closeGroupModal = closeGroupModal;

  async function loadGroupsPublic(container) {
    const root = container || document;
    const page = root.querySelector?.(".involved-page") || root.closest?.(".involved-page") || root;
    const navMount = page.querySelector?.("#involved-navigator") || root.querySelector?.("#involved-navigator");
    const collageMount =
      page.querySelector?.("#involved-collage") || root.querySelector?.("#involved-collage");
    const quizRoot = page.querySelector?.("#involved-quiz") || root.querySelector?.("#involved-quiz");
    const quizButton =
      page.querySelector?.("[data-open-groups-quiz]") ||
      root.querySelector?.("[data-open-groups-quiz]");

    if (!navMount && !collageMount) return;

    try {
      const groups = await fetchGroups(true);

      renderNavigator(navMount, groups, openGroupModal);
      renderCollage(collageMount, groups, openGroupModal);

      if (quizRoot && typeof window.initGroupsQuiz === "function") {
        window.initGroupsQuiz({
          root: quizRoot,
          groups,
          onOpenGroup: openGroupModal,
          openButton: quizButton,
        });
      }
    } catch (error) {
      if (navMount) {
        navMount.innerHTML = `<p class="involved-error">Couldn’t load groups. Is the server running?</p>`;
      }
    }
  }

  window.loadGroupsPublic = loadGroupsPublic;
})();
