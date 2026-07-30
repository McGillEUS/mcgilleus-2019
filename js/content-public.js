(function () {
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function fetchDoc(name) {
    const sources = [`/api/${name}`, `data/${name}.json`];
    for (const url of sources) {
      try {
        const response = await fetch(url, { credentials: "same-origin" });
        if (!response.ok) continue;
        return await response.json();
      } catch (_error) {
        /* try next */
      }
    }
    return null;
  }

  function currentPageFile() {
    const pathName = (location.pathname || "").split("/").pop() || "index.html";
    return pathName.toLowerCase() || "index.html";
  }

  function applySiteChrome(site, root) {
    if (!site) return;
    const scope = root && root.querySelector ? root : document;

    document.querySelectorAll("[data-site-brand-logo]").forEach((img) => {
      if (site.brand?.logo) img.src = site.brand.logo;
      if (site.brand?.name) img.alt = site.brand.name;
    });

    document.querySelectorAll("[data-site-brand-link]").forEach((link) => {
      if (site.brand?.homeHref) link.setAttribute("href", site.brand.homeHref);
    });

    const navList = document.querySelector("[data-site-nav]");
    if (navList && Array.isArray(site.nav)) {
      const page = currentPageFile();
      navList.innerHTML = site.nav
        .map((item) => {
          const href = item.href || "#";
          const file = href.split("/").pop()?.split(/[?#]/)[0]?.toLowerCase() || "";
          const active = !item.external && file === page;
          const cls = ["nav-link", item.className || "", active ? "active" : ""]
            .filter(Boolean)
            .join(" ");
          const extra = item.external
            ? ' target="_blank" rel="noopener noreferrer"'
            : " data-barba-update";
          const current = active ? ' aria-current="page"' : "";
          return `<li class="nav-item"><a class="${cls}" href="${escapeHtml(href)}"${extra}${current}>${escapeHtml(
            item.label
          )}</a></li>`;
        })
        .join("");
    }

    const pageLinks =
      scope.querySelector("[data-site-footer-pages]") ||
      document.querySelector("[data-site-footer-pages]");
    if (pageLinks && Array.isArray(site.footer?.pageLinks)) {
      pageLinks.innerHTML = site.footer.pageLinks
        .map(
          (item) =>
            `<a class="site-footer__a" href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`
        )
        .join("");
    }

    const socials =
      scope.querySelector("[data-site-footer-socials]") ||
      document.querySelector("[data-site-footer-socials]");
    if (socials && Array.isArray(site.footer?.socials)) {
      socials.innerHTML = site.footer.socials
        .map(
          (item) =>
            `<a class="site-footer__a" href="${escapeHtml(
              item.href
            )}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.label)}</a>`
        )
        .join("");
    }

    const visit =
      scope.querySelector("[data-site-footer-visit]") ||
      document.querySelector("[data-site-footer-visit]");
    if (visit && site.footer?.visit) {
      const lines = (site.footer.visit.lines || []).map(escapeHtml).join("<br>");
      const phone = site.footer.visit.phone
        ? `<div class="site-footer__links"><a class="site-footer__a" href="${escapeHtml(
            site.footer.visit.phoneHref || "#"
          )}">${escapeHtml(site.footer.visit.phone)}</a></div>`
        : "";
      visit.innerHTML = `${lines ? `<p class="site-footer__muted">${lines}</p>` : ""}${phone}`;
    }

    scope.querySelectorAll?.("[data-site-brand-logo]").forEach((img) => {
      if (site.brand?.logo) img.src = site.brand.logo;
      if (site.brand?.name) img.alt = site.brand.name;
    });
    scope.querySelectorAll?.("[data-site-brand-link]").forEach((link) => {
      if (site.brand?.homeHref) link.setAttribute("href", site.brand.homeHref);
    });
  }

  function applyHome(home, root) {
    if (!home?.hero) return;
    const scope = root || document;
    const hero = scope.querySelector?.(".home-hero") || document.querySelector(".home-hero");
    if (!hero) return;

    const img = hero.querySelector(".home-hero__img");
    if (img && home.hero.image) img.src = home.hero.image;

    const eyebrow = hero.querySelector(".home-hero__eyebrow");
    if (eyebrow) eyebrow.textContent = home.hero.eyebrow || "";

    const title = hero.querySelector(".home-hero__title");
    if (title) {
      title.textContent = home.hero.title || "";
      delete title.dataset.split;
      title.removeAttribute("aria-label");
    }

    const lead = hero.querySelector(".home-hero__lead");
    if (lead) lead.textContent = home.hero.lead || "";

    const actions = hero.querySelector(".home-hero__actions");
    if (actions && Array.isArray(home.hero.ctas)) {
      actions.innerHTML = home.hero.ctas
        .map((cta) => {
          const cls =
            cta.style === "primary" ? "home-hero__cta" : "home-hero__cta home-hero__cta--ghost";
          const extra = cta.external
            ? ' target="_blank" rel="noopener noreferrer"'
            : " data-barba-update";
          return `<a class="${cls}" href="${escapeHtml(cta.href)}"${extra}>${escapeHtml(
            cta.label
          )}</a>`;
        })
        .join("");
    }

    const slot = document.querySelector("[data-loader-slot]");
    if (slot && home.loader) {
      const shots = home.loader.shots || [];
      const finalImage = home.loader.finalImage || home.hero.image;
      slot.innerHTML = [
        ...shots.map(
          (src) =>
            `<img data-loader-shot src="${escapeHtml(src)}" alt="" loading="eager">`
        ),
        `<img data-loader-shot data-loader-final src="${escapeHtml(
          finalImage
        )}" alt="" loading="eager">`,
      ].join("");
    }

    const bleedImg = document.querySelector(".eus-loader__bleed-img");
    if (bleedImg && (home.loader?.finalImage || home.hero.image)) {
      bleedImg.src = home.loader?.finalImage || home.hero.image;
    }

    const mcgill = document.querySelector(".eus-loader__mcgill");
    const eus = document.querySelector(".eus-loader__eus");
    if (mcgill && home.loader?.brandLeft) mcgill.textContent = home.loader.brandLeft;
    if (eus && home.loader?.brandRight) eus.textContent = home.loader.brandRight;
  }

  function applyInvolved(data, root) {
    if (!data) return;
    const scope = root || document;
    const page = scope.querySelector?.(".involved-page") || document.querySelector(".involved-page");
    if (!page) return;

    const title = page.querySelector(".involved-hero__copy h1");
    if (title && data.hero?.title) title.textContent = data.hero.title;

    const lead = page.querySelector(".involved-hero__lead");
    if (lead && data.hero?.lead) lead.textContent = data.hero.lead;

    const cta = page.querySelector("[data-open-groups-quiz]");
    if (cta && data.hero?.ctaLabel) cta.textContent = data.hero.ctaLabel;

    const mainTitle = page.querySelector(".involved-main__title");
    if (mainTitle && data.mainTitle) mainTitle.textContent = data.mainTitle;

    window.__involvedPageCopy = data;
  }

  function applyContactPage(data, root) {
    if (!data) return;
    const scope = root || document;

    const heroTitle =
      scope.querySelector?.("[data-contact-hero-title]") ||
      document.querySelector("[data-contact-hero-title]");
    if (heroTitle) heroTitle.textContent = data.heroTitle || "Contact Us";

    const exec =
      scope.querySelector?.("[data-contact-exec-heading]") ||
      document.querySelector("[data-contact-exec-heading]");
    if (exec) exec.textContent = data.executiveHeading || exec.textContent;

    const rep =
      scope.querySelector?.("[data-contact-rep-heading]") ||
      document.querySelector("[data-contact-rep-heading]");
    if (rep) rep.textContent = data.representationHeading || rep.textContent;

    const map =
      scope.querySelector?.("[data-contact-map-label]") ||
      document.querySelector("[data-contact-map-label]");
    if (map) map.textContent = data.mapLabel || map.textContent;

    const dirTitle =
      scope.querySelector?.("[data-contact-directory-title]") ||
      document.querySelector("[data-contact-directory-title]");
    if (dirTitle) dirTitle.textContent = data.directory?.title || dirTitle.textContent;

    const dirBody =
      scope.querySelector?.("[data-contact-directory-body]") ||
      document.querySelector("[data-contact-directory-body]");
    if (dirBody) dirBody.textContent = data.directory?.body || dirBody.textContent;

    const dirLink =
      scope.querySelector?.("[data-contact-directory-link]") ||
      document.querySelector("[data-contact-directory-link]");
    if (dirLink && data.directory) {
      if (data.directory.href) dirLink.href = data.directory.href;
      if (data.directory.linkLabel) dirLink.textContent = data.directory.linkLabel;
    }

    window.__contactPageCopy = data;
  }

  function accordionIcon() {
    return `<span class="accordion-css__item-icon" aria-hidden="true">
      <svg class="accordion-css__item-icon-svg" xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 36 36" fill="none"><path d="M28.5 22.5L18 12L7.5 22.5" stroke="currentColor" stroke-width="3" stroke-miterlimit="10"></path></svg>
    </span>`;
  }

  function applyResources(data, root) {
    if (!data) return;
    const scope = root || document;
    const page =
      scope.querySelector?.(".resources-page") || document.querySelector(".resources-page");
    if (!page) return;

    const title = page.querySelector(".resources-hero h1");
    if (title) title.textContent = data.hero?.title || title.textContent;

    const lead = page.querySelector(".resources-hero__lead");
    if (lead) lead.textContent = data.hero?.lead || lead.textContent;

    const slider = page.querySelector("[data-radial-slider-init]");
    if (slider && data.featured?.ariaLabel) {
      slider.setAttribute("aria-label", data.featured.ariaLabel);
    }

    const list = page.querySelector("[data-radial-slider-list]");
    const items = data.featured?.items || [];
    if (list && items.length) {
      list.innerHTML = items
        .map(
          (item, index) => `
        <div data-radial-slider-item-status="${
          index === 0 ? "active" : "inview"
        }" data-radial-slider-item class="radial-gsap-slider__item">
          <article class="resources-card">
            <div class="resources-card__media">
              <img src="${escapeHtml(item.logo || "")}" alt="" class="resources-card__logo">
            </div>
            <div class="resources-card__info">
              <h3 class="resources-card__title">${escapeHtml(item.title)}</h3>
              <p class="resources-card__text">${escapeHtml(item.text)}</p>
              <a class="resources-card__cta" href="${escapeHtml(
                item.href
              )}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.ctaLabel)}</a>
            </div>
          </article>
        </div>`
        )
        .join("");

      const total = page.querySelector("[data-radial-slider-total-slide]");
      if (total) total.textContent = String(items.length).padStart(2, "0");
      const label = page.querySelector("[data-radial-active-label]");
      if (label) label.textContent = items[0]?.title || "";
    }

    const dirTitle = page.querySelector("#directory-heading");
    if (dirTitle) dirTitle.textContent = data.directory?.title || dirTitle.textContent;
    const dirIntro = page.querySelector(".resources-section__intro");
    if (dirIntro) dirIntro.textContent = data.directory?.intro || dirIntro.textContent;

    const accordion = page.querySelector(".accordion-css__list");
    if (accordion && Array.isArray(data.directory?.categories)) {
      accordion.innerHTML = data.directory.categories
        .map(
          (cat) => `
        <li data-accordion-status="not-active" class="accordion-css__item">
          <button type="button" data-accordion-toggle class="accordion-css__item-top">
            <span class="accordion-css__item-h3">${escapeHtml(cat.title)}</span>
            ${accordionIcon()}
          </button>
          <div class="accordion-css__item-bottom">
            <div class="accordion-css__item-bottom-wrap">
              <div class="accordion-css__item-bottom-content">
                <ul class="resources-dir__list">
                  ${(cat.links || [])
                    .map(
                      (link) => `
                    <li>
                      <a href="${escapeHtml(link.href)}" target="_blank" rel="noopener noreferrer">
                        <span class="resources-dir__name">${escapeHtml(link.name)}</span>
                        <span class="resources-dir__desc">${escapeHtml(link.desc || "")}</span>
                      </a>
                    </li>`
                    )
                    .join("")}
                </ul>
              </div>
            </div>
          </div>
        </li>`
        )
        .join("");
    }

    const shortTitle = page.querySelector("#shortlinks-heading");
    if (shortTitle) shortTitle.textContent = data.shortLinks?.title || shortTitle.textContent;

    const shortList = page.querySelector(".resources-shortlinks__list");
    if (shortList && Array.isArray(data.shortLinks?.items)) {
      shortList.innerHTML = data.shortLinks.items
        .map(
          (item) => `
        <li>
          <a href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer">
            <span>${escapeHtml(item.label)}</span>
            <span class="resources-shortlinks__host">${escapeHtml(item.hostLabel || "")}</span>
          </a>
        </li>`
        )
        .join("");
    }
  }

  async function loadSiteContent(root) {
    const [site, home, involved, contactPage, resources] = await Promise.all([
      fetchDoc("site"),
      fetchDoc("home"),
      fetchDoc("involved"),
      fetchDoc("contact-page"),
      fetchDoc("resources"),
    ]);

    applySiteChrome(site, root);
    applyHome(home, root);
    applyInvolved(involved, root);
    applyContactPage(contactPage, root);
    applyResources(resources, root);

    if (typeof window.loadQuizConfig === "function") {
      await window.loadQuizConfig();
    }

    window.__siteContent = { site, home, involved, contactPage, resources };
    return window.__siteContent;
  }

  window.fetchContentDoc = fetchDoc;
  window.loadSiteContent = loadSiteContent;
})();
