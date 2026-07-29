import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = await readFile(path.join(root, "index.html"), "utf8");
const css = await readFile(path.join(root, "styles.css"), "utf8");
const app = await readFile(path.join(root, "app.js"), "utf8");
const galleryData = await readFile(path.join(root, "gallery-data.js"), "utf8");
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
check(css.length > 1000 && app.length > 1000, "Production CSS or JavaScript appears unexpectedly empty.");

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
for (const source of [html, galleryData]) {
  for (const match of source.matchAll(/(?:src|href):?\s*=?(?:\s*)["']([^"']+)["']/g)) {
    const reference = match[1];
    if (/^(?:https?:|mailto:|tel:|#|data:)/.test(reference)) continue;
    const withoutFragment = reference.split("#")[0].split("?")[0];
    if (withoutFragment) localReferences.add(withoutFragment.replace(/^\.\//, ""));
  }
}

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
