document.documentElement.classList.add("js");

const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileNav = document.querySelector("[data-mobile-nav]");

const setHeaderState = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 8);
};

window.addEventListener("scroll", setHeaderState, { passive: true });

const closeMenu = () => {
  if (!menuToggle || !mobileNav) return;
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open navigation");
  mobileNav.hidden = true;
  document.body.classList.remove("menu-open");
};

menuToggle?.addEventListener("click", () => {
  const willOpen = menuToggle.getAttribute("aria-expanded") !== "true";
  menuToggle.setAttribute("aria-expanded", String(willOpen));
  menuToggle.setAttribute("aria-label", willOpen ? "Close navigation" : "Open navigation");
  mobileNav.hidden = !willOpen;
  document.body.classList.toggle("menu-open", willOpen);
});

mobileNav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
window.addEventListener("resize", () => {
  if (window.innerWidth > 1024) closeMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuToggle?.getAttribute("aria-expanded") === "true") {
    closeMenu();
    menuToggle.focus();
  }
});

const year = document.querySelector("[data-year]");
if (year) year.textContent = String(new Date().getFullYear());

const revealItems = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  }, { rootMargin: "0px 0px -8%", threshold: 0.08 });

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const gallerySection = document.querySelector("[data-gallery-section]");
const gallery = document.querySelector("[data-project-gallery]");
const tabList = document.querySelector("[data-client-tabs]");
const galleryTitle = document.querySelector("[data-gallery-title]");
const galleryType = document.querySelector("[data-gallery-type]");
const galleryDescription = document.querySelector("[data-gallery-description]");
const lightbox = document.querySelector("[data-lightbox]");
const lightboxImage = document.querySelector("[data-lightbox-image]");
const lightboxCaption = document.querySelector("[data-lightbox-caption]");

let projectData;
let activeClientId = "lapeq";
let activeImageIndex = 0;
let previousFocus;
let galleryPromise;

const updateLightbox = () => {
  const activeClient = projectData?.[activeClientId];
  const image = activeClient?.images[activeImageIndex];
  if (!image || !lightboxImage || !lightboxCaption) return;
  lightboxImage.src = image.src;
  lightboxImage.alt = image.alt;
  lightboxImage.width = image.width;
  lightboxImage.height = image.height;
  lightboxCaption.textContent = `${activeClient.title} — ${activeImageIndex + 1} of ${activeClient.images.length}`;
};

const openLightbox = (index, trigger) => {
  if (!lightbox || !projectData) return;
  activeImageIndex = index;
  previousFocus = trigger;
  updateLightbox();
  if (typeof lightbox.showModal === "function") lightbox.showModal();
  else lightbox.setAttribute("open", "");
  document.querySelector("[data-lightbox-close]")?.focus();
};

const closeLightbox = () => {
  if (!lightbox?.open) return;
  lightbox.close();
  if (lightboxImage) lightboxImage.src = "";
  previousFocus?.focus();
};

const stepLightbox = (direction) => {
  const images = projectData?.[activeClientId]?.images;
  if (!images?.length) return;
  activeImageIndex = (activeImageIndex + direction + images.length) % images.length;
  updateLightbox();
};

document.querySelector("[data-lightbox-close]")?.addEventListener("click", closeLightbox);
document.querySelector("[data-lightbox-prev]")?.addEventListener("click", () => stepLightbox(-1));
document.querySelector("[data-lightbox-next]")?.addEventListener("click", () => stepLightbox(1));
lightbox?.addEventListener("click", (event) => {
  if (event.target === lightbox) closeLightbox();
});
lightbox?.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") stepLightbox(-1);
  if (event.key === "ArrowRight") stepLightbox(1);
});

const renderGallery = (clientId) => {
  const client = projectData?.[clientId];
  if (!client || !gallery) return;

  activeClientId = clientId;
  if (galleryTitle) galleryTitle.textContent = client.title;
  if (galleryType) galleryType.textContent = client.type;
  if (galleryDescription) galleryDescription.textContent = client.description;
  gallery.setAttribute("aria-label", `${client.title} design gallery`);

  const fragment = document.createDocumentFragment();
  client.images.forEach((imageData, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "gallery-item";
    button.setAttribute("aria-label", `Open ${imageData.alt} in image viewer`);

    const image = document.createElement("img");
    image.src = imageData.src;
    image.alt = imageData.alt;
    image.width = imageData.width;
    image.height = imageData.height;
    image.loading = index < 3 ? "eager" : "lazy";
    image.decoding = "async";

    button.append(image);
    button.addEventListener("click", () => openLightbox(index, button));
    fragment.append(button);
  });
  gallery.replaceChildren(fragment);
};

const loadGallery = () => {
  if (galleryPromise) return galleryPromise;
  galleryPromise = import("./gallery-data.js")
    .then(({ clients }) => {
      projectData = clients;
      renderGallery(activeClientId);
      return clients;
    })
    .catch(() => {
      if (gallery) gallery.innerHTML = '<p class="gallery-loading">The gallery could not be loaded. Please refresh the page.</p>';
    });
  return galleryPromise;
};

tabList?.addEventListener("click", async (event) => {
  const tab = event.target.closest("[data-client]");
  if (!tab) return;
  activeClientId = tab.dataset.client;
  tabList.querySelectorAll("[role='tab']").forEach((item) => item.setAttribute("aria-selected", String(item === tab)));
  await loadGallery();
  renderGallery(activeClientId);
});

tabList?.addEventListener("keydown", (event) => {
  const tabs = [...tabList.querySelectorAll("[role='tab']")];
  const currentIndex = tabs.indexOf(document.activeElement);
  if (currentIndex < 0) return;

  let nextIndex;
  if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
  if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = tabs.length - 1;
  if (nextIndex === undefined) return;

  event.preventDefault();
  tabs[nextIndex].focus();
  tabs[nextIndex].click();
});

if (gallerySection && "IntersectionObserver" in window) {
  const galleryObserver = new IntersectionObserver((entries, observer) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    loadGallery();
    observer.disconnect();
  }, { rootMargin: "500px 0px" });
  galleryObserver.observe(gallerySection);
} else {
  loadGallery();
}
