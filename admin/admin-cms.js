(function () {
  const siteForm = document.getElementById("site-form");
  const homeForm = document.getElementById("home-form");
  const contactPageForm = document.getElementById("contact-page-form");
  const officeForm = document.getElementById("office-form");
  const involvedForm = document.getElementById("involved-form");
  const resourcesForm = document.getElementById("resources-form");
  const quizForm = document.getElementById("quiz-form");
  const resourcesJson = document.getElementById("resources-json");
  const quizJson = document.getElementById("quiz-json");

  if (!siteForm || typeof window.api !== "function") return;

  function showCmsStatus(key, message, isError = false) {
    const el = document.querySelector(`[data-cms-status="${key}"]`);
    if (!el) return;
    el.hidden = false;
    el.textContent = message;
    el.style.color = isError ? "#8a1f0f" : "#1f6b3a";
  }

  async function uploadImage(file) {
    const body = new FormData();
    body.append("image", file);
    const data = await window.api("/api/admin/upload", { method: "POST", body });
    return data.path;
  }

  function bindUploadInputs(root) {
    root.querySelectorAll("[data-upload-into]").forEach((input) => {
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (!file) return;
        const fieldName = input.getAttribute("data-upload-into");
        const form = input.closest("form");
        const target = form?.elements?.[fieldName];
        try {
          const path = await uploadImage(file);
          if (target) target.value = path;
          showCmsStatus(form?.id?.replace("-form", "") || "site", `Uploaded ${path}`);
        } catch (error) {
          showCmsStatus(form?.id?.replace("-form", "") || "site", error.message, true);
        }
        input.value = "";
      });
    });
  }

  function linkRow(item = {}, { showExternal = false, showClass = false } = {}) {
    const row = document.createElement("div");
    row.className = "repeat-row";
    row.innerHTML = `
      <label>Label <input name="label" value="${window.escapeHtml(item.label || "")}" required></label>
      <label>Href <input name="href" value="${window.escapeHtml(item.href || "")}" required></label>
      ${
        showExternal
          ? `<label class="inline"><input type="checkbox" name="external" ${
              item.external ? "checked" : ""
            }> External</label>`
          : ""
      }
      ${
        showClass
          ? `<label>CSS class <input name="className" value="${window.escapeHtml(
              item.className || ""
            )}"></label>`
          : ""
      }
      <button type="button" class="danger" data-remove>Remove</button>
    `;
    row.querySelector("[data-remove]").addEventListener("click", () => row.remove());
    return row;
  }

  function ctaRow(item = {}) {
    const row = document.createElement("div");
    row.className = "repeat-row";
    row.innerHTML = `
      <label>Label <input name="label" value="${window.escapeHtml(item.label || "")}" required></label>
      <label>Href <input name="href" value="${window.escapeHtml(item.href || "")}" required></label>
      <label>Style
        <select name="style">
          <option value="primary" ${item.style === "primary" ? "selected" : ""}>Primary</option>
          <option value="ghost" ${item.style !== "primary" ? "selected" : ""}>Ghost</option>
        </select>
      </label>
      <label class="inline"><input type="checkbox" name="external" ${
        item.external ? "checked" : ""
      }> External</label>
      <button type="button" class="danger" data-remove>Remove</button>
    `;
    row.querySelector("[data-remove]").addEventListener("click", () => row.remove());
    return row;
  }

  function collectLinkRows(container, { withExternal = false, withClass = false } = {}) {
    return Array.from(container.querySelectorAll(".repeat-row")).map((row) => {
      const item = {
        label: row.querySelector('[name="label"]').value.trim(),
        href: row.querySelector('[name="href"]').value.trim(),
      };
      if (withExternal) item.external = row.querySelector('[name="external"]')?.checked || false;
      if (withClass) item.className = row.querySelector('[name="className"]')?.value.trim() || "";
      return item;
    });
  }

  async function loadSite() {
    const data = await window.api("/api/admin/site");
    siteForm.brandName.value = data.brand?.name || "";
    siteForm.brandLogo.value = data.brand?.logo || "";
    siteForm.homeHref.value = data.brand?.homeHref || "index.html";
    siteForm.visitLines.value = (data.footer?.visit?.lines || []).join("\n");
    siteForm.phone.value = data.footer?.visit?.phone || "";
    siteForm.phoneHref.value = data.footer?.visit?.phoneHref || "";

    const nav = document.getElementById("site-nav-rows");
    const pages = document.getElementById("site-footer-pages");
    const socials = document.getElementById("site-footer-socials");
    nav.innerHTML = "";
    pages.innerHTML = "";
    socials.innerHTML = "";
    (data.nav || []).forEach((item) =>
      nav.appendChild(linkRow(item, { showExternal: true, showClass: true }))
    );
    (data.footer?.pageLinks || []).forEach((item) => pages.appendChild(linkRow(item)));
    (data.footer?.socials || []).forEach((item) => socials.appendChild(linkRow(item)));
  }

  async function loadHome() {
    const data = await window.api("/api/admin/home");
    homeForm.heroImage.value = data.hero?.image || "";
    homeForm.eyebrow.value = data.hero?.eyebrow || "";
    homeForm.title.value = data.hero?.title || "";
    homeForm.lead.value = data.hero?.lead || "";
    homeForm.loaderShots.value = (data.loader?.shots || []).join("\n");
    homeForm.finalImage.value = data.loader?.finalImage || "";
    homeForm.brandLeft.value = data.loader?.brandLeft || "McGill";
    homeForm.brandRight.value = data.loader?.brandRight || "EUS";
    const ctas = document.getElementById("home-cta-rows");
    ctas.innerHTML = "";
    (data.hero?.ctas || []).forEach((item) => ctas.appendChild(ctaRow(item)));
  }

  async function loadContactPage() {
    const data = await window.api("/api/admin/contact-page");
    contactPageForm.heroTitle.value = data.heroTitle || "";
    contactPageForm.executiveHeading.value = data.executiveHeading || "";
    contactPageForm.representationHeading.value = data.representationHeading || "";
    contactPageForm.mapLabel.value = data.mapLabel || "";
    contactPageForm.pastHeading.value = data.pastHeading || "";
    contactPageForm.directoryTitle.value = data.directory?.title || "";
    contactPageForm.directoryBody.value = data.directory?.body || "";
    contactPageForm.directoryLinkLabel.value = data.directory?.linkLabel || "";
    contactPageForm.directoryHref.value = data.directory?.href || "";
  }

  async function loadOffice() {
    const data = await window.api("/api/admin/office");
    officeForm.name.value = data.name || "";
    officeForm.eyebrow.value = data.eyebrow || "";
    officeForm.shortAddress.value = data.shortAddress || "";
    officeForm.address.value = data.address || "";
    officeForm.lat.value = data.lat ?? "";
    officeForm.lng.value = data.lng ?? "";
    officeForm.phone.value = data.phone || "";
    officeForm.phoneHref.value = data.phoneHref || "";
    officeForm.mapsUrl.value = data.mapsUrl || "";
  }

  async function loadInvolved() {
    const data = await window.api("/api/admin/involved");
    involvedForm.title.value = data.hero?.title || "";
    involvedForm.lead.value = data.hero?.lead || "";
    involvedForm.ctaLabel.value = data.hero?.ctaLabel || "";
    involvedForm.mainTitle.value = data.mainTitle || "";
    involvedForm.resultsTitle.value = data.quizUi?.resultsTitle || "";
    involvedForm.emptyMessage.value = data.quizUi?.emptyMessage || "";
    involvedForm.retakeLabel.value = data.quizUi?.retakeLabel || "";
    involvedForm.browseLabel.value = data.quizUi?.browseLabel || "";
    involvedForm.closeLabel.value = data.quizUi?.closeLabel || "";
    involvedForm.progressTemplate.value = data.quizUi?.progressTemplate || "";
  }

  async function loadResources() {
    const data = await window.api("/api/admin/resources");
    resourcesJson.value = JSON.stringify(data, null, 2);
  }

  async function loadQuiz() {
    const data = await window.api("/api/admin/quiz");
    quizJson.value = JSON.stringify(data, null, 2);
  }

  async function loadAllCms() {
    await Promise.all([
      loadSite(),
      loadHome(),
      loadContactPage(),
      loadOffice(),
      loadInvolved(),
      loadResources(),
      loadQuiz(),
    ]);
  }

  document.querySelectorAll("[data-admin-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const id = tab.getAttribute("data-admin-tab");
      document.querySelectorAll("[data-admin-tab]").forEach((el) => {
        el.classList.toggle("is-active", el === tab);
      });
      document.querySelectorAll("[data-admin-panel]").forEach((panel) => {
        panel.classList.toggle("is-active", panel.getAttribute("data-admin-panel") === id);
      });
    });
  });

  siteForm.querySelector("[data-add-nav]")?.addEventListener("click", () => {
    document.getElementById("site-nav-rows").appendChild(
      linkRow({}, { showExternal: true, showClass: true })
    );
  });
  siteForm.querySelector("[data-add-footer-page]")?.addEventListener("click", () => {
    document.getElementById("site-footer-pages").appendChild(linkRow({}));
  });
  siteForm.querySelector("[data-add-footer-social]")?.addEventListener("click", () => {
    document.getElementById("site-footer-socials").appendChild(linkRow({}));
  });
  homeForm.querySelector("[data-add-cta]")?.addEventListener("click", () => {
    document.getElementById("home-cta-rows").appendChild(ctaRow({ style: "ghost" }));
  });

  bindUploadInputs(siteForm);
  bindUploadInputs(homeForm);

  const resourcesUpload = document.getElementById("resources-upload");
  const resourcesUploadPath = document.getElementById("resources-upload-path");
  resourcesUpload?.addEventListener("change", async () => {
    const file = resourcesUpload.files?.[0];
    if (!file) return;
    try {
      const path = await uploadImage(file);
      resourcesUploadPath.hidden = false;
      resourcesUploadPath.textContent = `Uploaded path: ${path}`;
      showCmsStatus("resources", `Uploaded ${path}`);
    } catch (error) {
      showCmsStatus("resources", error.message, true);
    }
    resourcesUpload.value = "";
  });

  siteForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await window.api("/api/admin/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: {
            name: siteForm.brandName.value.trim(),
            logo: siteForm.brandLogo.value.trim(),
            homeHref: siteForm.homeHref.value.trim(),
          },
          nav: collectLinkRows(document.getElementById("site-nav-rows"), {
            withExternal: true,
            withClass: true,
          }),
          footer: {
            pageLinks: collectLinkRows(document.getElementById("site-footer-pages")),
            socials: collectLinkRows(document.getElementById("site-footer-socials")),
            visit: {
              lines: siteForm.visitLines.value
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean),
              phone: siteForm.phone.value.trim(),
              phoneHref: siteForm.phoneHref.value.trim(),
            },
          },
        }),
      });
      showCmsStatus("site", "Site chrome saved");
      await loadSite();
    } catch (error) {
      showCmsStatus("site", error.message, true);
    }
  });

  homeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const ctas = Array.from(document.querySelectorAll("#home-cta-rows .repeat-row")).map(
        (row) => ({
          label: row.querySelector('[name="label"]').value.trim(),
          href: row.querySelector('[name="href"]').value.trim(),
          style: row.querySelector('[name="style"]').value,
          external: row.querySelector('[name="external"]').checked,
        })
      );
      await window.api("/api/admin/home", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hero: {
            image: homeForm.heroImage.value.trim(),
            eyebrow: homeForm.eyebrow.value.trim(),
            title: homeForm.title.value.trim(),
            lead: homeForm.lead.value.trim(),
            ctas,
          },
          loader: {
            shots: homeForm.loaderShots.value
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean),
            finalImage: homeForm.finalImage.value.trim(),
            brandLeft: homeForm.brandLeft.value.trim(),
            brandRight: homeForm.brandRight.value.trim(),
          },
        }),
      });
      showCmsStatus("home", "Home page saved");
      await loadHome();
    } catch (error) {
      showCmsStatus("home", error.message, true);
    }
  });

  contactPageForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await window.api("/api/admin/contact-page", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heroTitle: contactPageForm.heroTitle.value.trim(),
          executiveHeading: contactPageForm.executiveHeading.value.trim(),
          representationHeading: contactPageForm.representationHeading.value.trim(),
          mapLabel: contactPageForm.mapLabel.value.trim(),
          pastHeading: contactPageForm.pastHeading.value.trim(),
          directory: {
            title: contactPageForm.directoryTitle.value.trim(),
            body: contactPageForm.directoryBody.value.trim(),
            linkLabel: contactPageForm.directoryLinkLabel.value.trim(),
            href: contactPageForm.directoryHref.value.trim(),
          },
        }),
      });
      showCmsStatus("contact-page", "Contact page saved");
      await loadContactPage();
    } catch (error) {
      showCmsStatus("contact-page", error.message, true);
    }
  });

  officeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await window.api("/api/admin/office", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "eus-office",
          name: officeForm.name.value.trim(),
          eyebrow: officeForm.eyebrow.value.trim(),
          shortAddress: officeForm.shortAddress.value.trim(),
          address: officeForm.address.value.trim(),
          lat: Number(officeForm.lat.value),
          lng: Number(officeForm.lng.value),
          phone: officeForm.phone.value.trim(),
          phoneHref: officeForm.phoneHref.value.trim(),
          mapsUrl: officeForm.mapsUrl.value.trim(),
        }),
      });
      showCmsStatus("office", "Office map saved");
      await loadOffice();
    } catch (error) {
      showCmsStatus("office", error.message, true);
    }
  });

  involvedForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await window.api("/api/admin/involved", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hero: {
            title: involvedForm.title.value.trim(),
            lead: involvedForm.lead.value.trim(),
            ctaLabel: involvedForm.ctaLabel.value.trim(),
          },
          mainTitle: involvedForm.mainTitle.value.trim(),
          quizUi: {
            resultsTitle: involvedForm.resultsTitle.value.trim(),
            emptyMessage: involvedForm.emptyMessage.value.trim(),
            retakeLabel: involvedForm.retakeLabel.value.trim(),
            browseLabel: involvedForm.browseLabel.value.trim(),
            closeLabel: involvedForm.closeLabel.value.trim(),
            progressTemplate: involvedForm.progressTemplate.value.trim(),
          },
        }),
      });
      showCmsStatus("involved", "Get Involved page saved");
      await loadInvolved();
    } catch (error) {
      showCmsStatus("involved", error.message, true);
    }
  });

  resourcesForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const data = JSON.parse(resourcesJson.value);
      const saved = await window.api("/api/admin/resources", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      resourcesJson.value = JSON.stringify(saved, null, 2);
      showCmsStatus("resources", "Resources saved");
    } catch (error) {
      showCmsStatus("resources", error.message, true);
    }
  });

  quizForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const data = JSON.parse(quizJson.value);
      const saved = await window.api("/api/admin/quiz", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      quizJson.value = JSON.stringify(saved, null, 2);
      showCmsStatus("quiz", "Quiz saved");
    } catch (error) {
      showCmsStatus("quiz", error.message, true);
    }
  });

  window.loadAllCms = loadAllCms;
})();
