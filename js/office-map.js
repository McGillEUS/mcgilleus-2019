/* global mapboxgl, L */

async function loadJson(urls) {
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) continue;
      return await response.json();
    } catch (_error) {
      // try next
    }
  }
  return null;
}

function fillOfficeMeta(wrapper, office) {
  const address = wrapper.querySelector("[data-locator-address]");
  const links = wrapper.querySelectorAll("[data-locator-maps-link]");
  if (address) {
    address.textContent = office.shortAddress || office.address || "";
  }
  links.forEach((link) => {
    if (office.mapsUrl) link.href = office.mapsUrl;
  });
}

function makePinIcon() {
  return L.divIcon({
    className: "office-map__leaflet-pin",
    html: '<span class="office-map__pin"></span>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function initOfficeMapbox(wrapper, office, mapboxToken) {
  if (typeof mapboxgl === "undefined" || !mapboxToken) return false;

  mapboxgl.accessToken = mapboxToken;
  const mapEl = wrapper.querySelector("[data-locator-map]");
  if (!mapEl) return false;

  const map = new mapboxgl.Map({
    container: mapEl,
    style: "mapbox://styles/mapbox/light-v11",
    center: [office.lng, office.lat],
    zoom: 16.2,
    attributionControl: false,
    cooperativeGestures: true,
    fadeDuration: 0,
  });

  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

  map.on("load", () => {
    const template = wrapper.querySelector("[data-locator-marker-template]");
    let element;
    if (template) {
      element = template.cloneNode(true);
      element.removeAttribute("data-locator-marker-template");
      element.removeAttribute("aria-hidden");
    } else {
      element = document.createElement("div");
      element.className = "office-map__marker";
      element.innerHTML = '<span class="office-map__pin"></span>';
    }
    element.setAttribute("aria-hidden", "true");

    new mapboxgl.Marker({ element, anchor: "center" })
      .setLngLat([office.lng, office.lat])
      .addTo(map);

    wrapper.classList.add("office-map--mapped");
    wrapper.dataset.locatorInit = "initialized";
  });

  window.addEventListener("resize", () => map.resize(), { passive: true });
  return true;
}

function initOfficeLeaflet(wrapper, office) {
  if (typeof L === "undefined") return false;

  const mapEl = wrapper.querySelector("[data-locator-map]");
  if (!mapEl) return false;

  const map = L.map(mapEl, {
    center: [office.lat, office.lng],
    zoom: 17,
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: true,
    dragging: true,
    doubleClickZoom: true,
    touchZoom: true,
    boxZoom: true,
    keyboard: true,
  });

  L.control.zoom({ position: "topright" }).addTo(map);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    subdomains: "abcd",
    maxZoom: 19,
  }).addTo(map);

  L.marker([office.lat, office.lng], {
    icon: makePinIcon(),
    interactive: false,
    keyboard: false,
  }).addTo(map);

  wrapper.classList.add("office-map--mapped");
  wrapper.dataset.locatorInit = "leaflet";

  window.addEventListener(
    "resize",
    () => {
      map.invalidateSize();
    },
    { passive: true }
  );

  return true;
}

async function initOfficeLocator() {
  const wrapper = document.querySelector("[data-locator-init]");
  if (!wrapper || wrapper.dataset.locatorInit) return;

  const [office, publicConfig] = await Promise.all([
    loadJson(["/api/office", "data/office.json"]),
    loadJson(["/api/public-config"]),
  ]);

  if (!office) return;
  fillOfficeMeta(wrapper, office);

  const token = publicConfig && publicConfig.mapboxToken;
  const started = token
    ? initOfficeMapbox(wrapper, office, token)
    : initOfficeLeaflet(wrapper, office);

  if (!started) initOfficeLeaflet(wrapper, office);
}

window.initOfficeLocator = initOfficeLocator;
document.addEventListener("DOMContentLoaded", () => {
  if (document.body?.hasAttribute("data-barba")) return;
  initOfficeLocator();
});
