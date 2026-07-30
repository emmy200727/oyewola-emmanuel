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
const portfolioBrowser = document.querySelector("[data-portfolio-browser]");
const browserGallery = document.querySelector("[data-browser-gallery]");
const browserTitle = document.querySelector("[data-browser-title]");
const browserPath = document.querySelector("[data-browser-path]");
const browserDescription = document.querySelector("[data-browser-description]");
const browserCount = document.querySelector("[data-browser-count]");
const browserBack = document.querySelector("[data-browser-back]");
const browserClose = document.querySelector("[data-browser-close]");
const lightbox = document.querySelector("[data-lightbox]");
const lightboxImage = document.querySelector("[data-lightbox-image]");
const lightboxCaption = document.querySelector("[data-lightbox-caption]");
const lightboxCounter = document.querySelector("[data-lightbox-counter]");
const lightboxClose = document.querySelector("[data-lightbox-close]");

let projectData = [];
let activeClientId = "lapeq";
let browserStack = [];
let activeImages = [];
let activeImageIndex = 0;
let browserTrigger;
let lightboxTrigger;
let galleryPromise;
let touchStart;

const folderIcon = () => {
  const icon = document.createElement("span");
  icon.className = "folder-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = '<svg viewBox="0 0 32 32" fill="none"><path d="M3.5 8.5A2.5 2.5 0 0 1 6 6h6l3 3h11a2.5 2.5 0 0 1 2.5 2.5v12A2.5 2.5 0 0 1 26 26H6a2.5 2.5 0 0 1-2.5-2.5v-15Z"/><path d="M3.5 12h25"/></svg>';
  return icon;
};

const findClient = (clientId) => projectData.find((client) => client.id === clientId);

const findNodePath = (node, targetId, path = []) => {
  const nextPath = [...path, node];
  if (node.id === targetId) return nextPath;
  for (const child of node.children) {
    const result = findNodePath(child, targetId, nextPath);
    if (result) return result;
  }
  return undefined;
};

const createPreviewImage = (imageData) => {
  const image = document.createElement("img");
  image.src = imageData.thumbnail;
  image.alt = "";
  image.width = imageData.width;
  image.height = imageData.height;
  image.loading = "lazy";
  image.decoding = "async";
  return image;
};

const createFolderCard = (node, onOpen, label = node.title) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "folder-card";
  button.setAttribute("aria-label", `Open ${label}, ${node.imageCount} images`);

  const preview = document.createElement("span");
  preview.className = "folder-preview";
  if (node.preview) preview.append(createPreviewImage(node.preview));

  const overlay = document.createElement("span");
  overlay.className = "folder-overlay";
  overlay.append(folderIcon());

  const meta = document.createElement("span");
  meta.className = "folder-meta";
  const copy = document.createElement("span");
  const title = document.createElement("strong");
  title.textContent = label;
  const count = document.createElement("small");
  count.textContent = `${node.imageCount} ${node.imageCount === 1 ? "image" : "images"}`;
  const arrow = document.createElement("span");
  arrow.className = "folder-arrow";
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "↗";
  copy.append(title, count);
  meta.append(copy, arrow);
  button.append(preview, overlay, meta);
  button.addEventListener("click", onOpen);
  return button;
};

const createImageCard = (imageData, index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "gallery-item";
  button.setAttribute("aria-label", `Open ${imageData.alt} in image viewer`);
  button.style.setProperty("--image-ratio", `${imageData.width} / ${imageData.height}`);

  const image = createPreviewImage(imageData);
  image.alt = imageData.alt;
  const label = document.createElement("span");
  label.className = "gallery-item-label";
  label.textContent = `View ${index + 1}`;
  button.append(image, label);
  button.addEventListener("click", () => openLightbox(activeImages, index, button));
  return button;
};

const setDialogState = () => {
  document.body.classList.toggle("dialog-open", Boolean(portfolioBrowser?.open || lightbox?.open));
};

const showDialog = (dialog) => {
  if (!dialog || dialog.open) return;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
  setDialogState();
};

const renderBrowserNode = () => {
  const node = browserStack.at(-1);
  const client = browserStack[0];
  if (!node || !browserGallery) return;

  if (browserTitle) browserTitle.textContent = node.title;
  if (browserPath) browserPath.textContent = browserStack.map((item) => item.title).join(" / ");
  if (browserDescription) {
    browserDescription.textContent = node === client
      ? client.description
      : `Explore the complete ${node.title} collection for ${client.title}.`;
  }
  if (browserCount) {
    const categoryText = node.children.length
      ? ` across ${node.children.length} ${node.children.length === 1 ? "category" : "categories"}`
      : "";
    browserCount.textContent = `${node.imageCount} ${node.imageCount === 1 ? "image" : "images"}${categoryText}`;
  }
  if (browserBack) {
    browserBack.setAttribute("aria-label", browserStack.length > 1 ? "Go back one portfolio level" : "Return to portfolio section");
  }

  const fragment = document.createDocumentFragment();
  for (const child of node.children) {
    fragment.append(createFolderCard(child, () => {
      browserStack.push(child);
      renderBrowserNode();
      document.querySelector(".portfolio-browser-shell")?.scrollTo({ top: 0, behavior: "smooth" });
      browserBack?.focus({ preventScroll: true });
    }));
  }

  activeImages = node.images;
  node.images.forEach((imageData, index) => fragment.append(createImageCard(imageData, index)));
  if (!node.children.length && !node.images.length) {
    const empty = document.createElement("p");
    empty.className = "gallery-loading";
    empty.textContent = "This collection does not contain any displayable images yet.";
    fragment.append(empty);
  }
  browserGallery.replaceChildren(fragment);
};

const openBrowser = (client, node, trigger) => {
  if (!portfolioBrowser) return;
  browserTrigger = trigger;
  browserStack = findNodePath(client, node.id) || [client];
  renderBrowserNode();
  showDialog(portfolioBrowser);
  browserBack?.focus({ preventScroll: true });
};

const closeBrowser = () => {
  if (!portfolioBrowser?.open) return;
  portfolioBrowser.close();
  browserGallery?.replaceChildren();
  browserStack = [];
  activeImages = [];
  setDialogState();
  browserTrigger?.focus({ preventScroll: true });
};

const preloadNeighbors = () => {
  if (activeImages.length < 2) return;
  const indexes = [
    (activeImageIndex - 1 + activeImages.length) % activeImages.length,
    (activeImageIndex + 1) % activeImages.length
  ];
  indexes.forEach((index) => {
    const image = new Image();
    image.src = activeImages[index].src;
  });
};

const updateLightbox = () => {
  const image = activeImages[activeImageIndex];
  if (!image || !lightboxImage || !lightboxCaption) return;
  lightboxImage.classList.remove("is-loaded");
  lightboxImage.src = image.src;
  lightboxImage.srcset = `${image.thumbnail} 720w, ${image.src} ${image.width}w`;
  lightboxImage.sizes = "(max-width: 760px) 100vw, 88vw";
  lightboxImage.alt = image.alt;
  lightboxImage.width = image.width;
  lightboxImage.height = image.height;
  lightboxCaption.textContent = image.alt;
  if (lightboxCounter) lightboxCounter.textContent = `${activeImageIndex + 1} of ${activeImages.length}`;
  preloadNeighbors();
};

const openLightbox = (images, index, trigger) => {
  if (!lightbox || !images.length) return;
  activeImages = images;
  activeImageIndex = index;
  lightboxTrigger = trigger;
  updateLightbox();
  showDialog(lightbox);
  lightboxClose?.focus({ preventScroll: true });
};

const closeLightbox = () => {
  if (!lightbox?.open) return;
  lightbox.close();
  if (lightboxImage) {
    lightboxImage.src = "";
    lightboxImage.removeAttribute("srcset");
  }
  setDialogState();
  lightboxTrigger?.focus({ preventScroll: true });
};

const stepLightbox = (direction) => {
  if (!activeImages.length) return;
  activeImageIndex = (activeImageIndex + direction + activeImages.length) % activeImages.length;
  updateLightbox();
};

browserBack?.addEventListener("click", () => {
  if (browserStack.length > 1) {
    browserStack.pop();
    renderBrowserNode();
    document.querySelector(".portfolio-browser-shell")?.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    closeBrowser();
  }
});
browserClose?.addEventListener("click", closeBrowser);
portfolioBrowser?.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeBrowser();
});
portfolioBrowser?.addEventListener("click", (event) => {
  if (event.target === portfolioBrowser) closeBrowser();
});

lightboxImage?.addEventListener("load", () => lightboxImage.classList.add("is-loaded"));
lightboxClose?.addEventListener("click", closeLightbox);
document.querySelector("[data-lightbox-prev]")?.addEventListener("click", () => stepLightbox(-1));
document.querySelector("[data-lightbox-next]")?.addEventListener("click", () => stepLightbox(1));
lightbox?.addEventListener("click", (event) => {
  if (event.target === lightbox) closeLightbox();
});
lightbox?.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeLightbox();
});
lightbox?.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") stepLightbox(-1);
  if (event.key === "ArrowRight") stepLightbox(1);
});
lightbox?.addEventListener("touchstart", (event) => {
  const touch = event.changedTouches[0];
  touchStart = { x: touch.clientX, y: touch.clientY };
}, { passive: true });
lightbox?.addEventListener("touchend", (event) => {
  if (!touchStart) return;
  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - touchStart.x;
  const deltaY = touch.clientY - touchStart.y;
  touchStart = undefined;
  if (Math.abs(deltaX) < 45 || Math.abs(deltaX) < Math.abs(deltaY)) return;
  stepLightbox(deltaX > 0 ? -1 : 1);
}, { passive: true });

const renderGallery = (clientId) => {
  const client = findClient(clientId);
  if (!client || !gallery) return;

  activeClientId = clientId;
  if (galleryTitle) galleryTitle.textContent = client.title;
  if (galleryType) galleryType.textContent = client.type;
  if (galleryDescription) galleryDescription.textContent = client.description;
  gallery.setAttribute("aria-label", `${client.title} portfolio categories`);

  const fragment = document.createDocumentFragment();
  const folders = client.children.length ? client.children : [client];
  folders.forEach((folder) => {
    const label = folder === client ? `Explore ${client.title}` : folder.title;
    let card;
    card = createFolderCard(folder, () => openBrowser(client, folder, card), label);
    fragment.append(card);
  });
  gallery.replaceChildren(fragment);
};

const renderTabs = () => {
  if (!tabList) return;
  const fragment = document.createDocumentFragment();
  projectData.forEach((client, index) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.setAttribute("role", "tab");
    tab.dataset.client = client.id;
    tab.setAttribute("aria-selected", String(index === 0));
    tab.tabIndex = index === 0 ? 0 : -1;
    tab.textContent = client.title;
    fragment.append(tab);
  });
  tabList.replaceChildren(fragment);
  tabList.setAttribute("aria-busy", "false");
};

const loadGallery = () => {
  if (galleryPromise) return galleryPromise;
  galleryPromise = import("./gallery-data.js")
    .then(({ portfolio }) => {
      projectData = portfolio.clients;
      activeClientId = projectData[0]?.id;
      renderTabs();
      renderGallery(activeClientId);
      return portfolio;
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
  tabList.querySelectorAll("[role='tab']").forEach((item) => {
    const isActive = item === tab;
    item.setAttribute("aria-selected", String(isActive));
    item.tabIndex = isActive ? 0 : -1;
  });
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
