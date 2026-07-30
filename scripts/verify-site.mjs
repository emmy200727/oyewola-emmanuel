import { access, readFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = await readFile(path.join(root, "index.html"), "utf8");
const css = await readFile(path.join(root, "styles.css"), "utf8");
const app = await readFile(path.join(root, "app.js"), "utf8");
const galleryData = await readFile(path.join(root, "gallery-data.js"), "utf8");
const { portfolio } = await import(`${pathToFileURL(path.join(root, "gallery-data.js")).href}?verify=${Date.now()}`);
const failures = [];

const check = (condition, message) => {
  if (!condition) failures.push(message);
};

check(html.includes('<html lang="en">'), "Document language is missing.");
check(html.includes('<meta name="description"'), "Meta description is missing.");
check(html.includes('type="application/ld+json"'), "Structured data is missing.");
check(html.includes('property="og:title"'), "Open Graph metadata is missing.");
check(html.includes('name="twitter:card"'), "Twitter card metadata is missing.");
check(html.includes('class="skip-link"'), "Skip link is missing.");
check(html.includes('<main id="main-content">'), "Semantic main landmark is missing.");
check(html.includes('data-portfolio-browser'), "Full-screen portfolio browser is missing.");
check(html.includes('data-browser-back'), "Portfolio Back navigation is missing.");
check(html.includes('data-lightbox-counter'), "Image viewer counter is missing.");
check(css.length > 1000 && app.length > 1000, "Production CSS or JavaScript appears unexpectedly empty.");
check(app.includes('event.key === "ArrowLeft"') && app.includes('event.key === "ArrowRight"'), "Image viewer keyboard navigation is missing.");
check(app.includes('touchstart') && app.includes('touchend'), "Image viewer touch navigation is missing.");
check(app.includes('image.loading = "lazy"'), "Gallery images are not configured for lazy loading.");

const publicTextFiles = [
  "index.html",
  "about.html",
  "contact.html",
  "projects.html",
  "services.html",
  "app.js",
  "gallery-data.js",
  "styles.css",
  "site.webmanifest"
];
for (const file of publicTextFiles) {
  const content = await readFile(path.join(root, file), "utf8");
  check(!content.includes("—"), `Em dash remains in ${file}.`);
}

check(Array.isArray(portfolio.clients) && portfolio.clients.length === 10, "Portfolio client collections are incomplete.");
const nodeIds = new Set();
const manifestNodes = new Map();
const manifestImages = [];
const walkNode = (node) => {
  check(!nodeIds.has(node.id), `Duplicate portfolio folder ID: ${node.id}`);
  nodeIds.add(node.id);
  manifestNodes.set(node.id, node);
  check(typeof node.title === "string" && node.title.length > 0, `Portfolio folder ${node.id} has no title.`);
  check(Array.isArray(node.images) && Array.isArray(node.children), `Portfolio folder ${node.id} is malformed.`);
  node.images.forEach((image) => {
    check(Boolean(image.src && image.thumbnail && image.alt), `Image metadata is incomplete in ${node.id}.`);
    check(image.width > 0 && image.height > 0, `Image dimensions are invalid in ${node.id}.`);
    manifestImages.push(image);
  });
  node.children.forEach(walkNode);
};
portfolio.clients.forEach(walkNode);
check(manifestImages.length === portfolio.totalImages, `Portfolio image total mismatch: found ${manifestImages.length}, expected ${portfolio.totalImages}.`);
check(portfolio.totalImages === 152, `Expected 152 portfolio images, found ${portfolio.totalImages}.`);
const lapeq = portfolio.clients.find((client) => client.id === "lapeq");
check(
  ["Branding", "Mockups", "Quotes", "Socials"].every((title) => lapeq?.children.some((folder) => folder.title === title)),
  "Lapeq category hierarchy is incomplete."
);

const sourceRoot = path.join(root, "assets", "img");
try {
  await access(sourceRoot, constants.R_OK);
  const sourceCounts = new Map();
  const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
  const scanSourceFolder = async (directory, parts) => {
    const entries = await readdir(directory, { withFileTypes: true });
    const images = entries.filter((entry) => entry.isFile() && /\.(?:png|jpe?g)$/i.test(entry.name));
    sourceCounts.set(parts.join("/"), images.length);
    for (const entry of entries.filter((item) => item.isDirectory())) {
      await scanSourceFolder(path.join(directory, entry.name), [...parts, slugify(entry.name)]);
    }
  };
  const rootEntries = await readdir(sourceRoot, { withFileTypes: true });
  for (const entry of rootEntries.filter((item) => item.isDirectory())) {
    await scanSourceFolder(path.join(sourceRoot, entry.name), [slugify(entry.name)]);
  }
  for (const [id, directImageCount] of sourceCounts) {
    const node = manifestNodes.get(id);
    check(Boolean(node), `Source folder is missing from the portfolio manifest: ${id}`);
    check(node?.directImageCount === directImageCount, `Source image count mismatch in ${id}: found ${node?.directImageCount ?? 0}, expected ${directImageCount}.`);
  }
  const sourceClientImages = [...sourceCounts.values()].reduce((total, count) => total + count, 0);
  check(sourceClientImages + 2 === portfolio.totalImages, `Source archive total mismatch: found ${sourceClientImages + 2}, expected ${portfolio.totalImages}.`);
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
check(duplicateIds.length === 0, `Duplicate IDs: ${[...new Set(duplicateIds)].join(", ")}`);

for (const match of html.matchAll(/<img\b[^>]*>/g)) {
  const tag = match[0];
  check(/\salt="[^"]*"/.test(tag), `Image missing alt text: ${tag.slice(0, 100)}`);
  check(/\swidth="\d+"/.test(tag) && /\sheight="\d+"/.test(tag), `Image missing intrinsic dimensions: ${tag.slice(0, 100)}`);
}

for (const match of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
  check(/rel="[^"]*noopener[^"]*"/.test(match[0]), `New-tab link missing rel=noopener: ${match[0].slice(0, 120)}`);
}

const expectedLiveSites = [
  "https://trinity-abode.vercel.app",
  "https://waski-gadgets.vercel.app",
  "https://lapeq.net",
  "https://blake-resort.vercel.app"
];
for (const url of expectedLiveSites) {
  check(html.includes(`href="${url}"`), `Featured website link is missing: ${url}`);
}

const localReferences = new Set();
for (const source of [html]) {
  for (const match of source.matchAll(/(?:src|href):?\s*=?(?:\s*)["']([^"']+)["']/g)) {
    const reference = match[1];
    if (/^(?:https?:|mailto:|tel:|#|data:)/.test(reference)) continue;
    const withoutFragment = reference.split("#")[0].split("?")[0];
    if (withoutFragment) localReferences.add(withoutFragment.replace(/^\.\//, ""));
  }
}

manifestImages.forEach((image) => {
  localReferences.add(image.src);
  localReferences.add(image.thumbnail);
});

for (const match of html.matchAll(/srcset="([^"]+)"/g)) {
  for (const candidate of match[1].split(",")) {
    const reference = candidate.trim().split(/\s+/)[0];
    if (reference && !reference.startsWith("http")) localReferences.add(reference.replace(/^\.\//, ""));
  }
}

const requiredFiles = [
  "index.html",
  "styles.css",
  "app.js",
  "gallery-data.js",
  "favicon.svg",
  "site.webmanifest",
  "robots.txt",
  "sitemap.xml",
  ...localReferences
];

for (const relativeFile of new Set(requiredFiles)) {
  try {
    await access(path.join(root, relativeFile), constants.R_OK);
  } catch {
    failures.push(`Referenced file does not exist: ${relativeFile}`);
  }
}

if (failures.length) {
  console.error("Portfolio verification failed:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Portfolio verification passed (${ids.length} IDs, ${localReferences.size} local references, 4 live projects).`);
