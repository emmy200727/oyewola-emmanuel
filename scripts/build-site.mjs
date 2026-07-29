import { copyFile, cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "./verify-site.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "public");
const publicFiles = [
  ".nojekyll",
  "about.html",
  "app.js",
  "contact.html",
  "favicon.svg",
  "gallery-data.js",
  "index.html",
  "projects.html",
  "robots.txt",
  "services.html",
  "site.webmanifest",
  "sitemap.xml",
  "styles.css"
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

await Promise.all(
  publicFiles.map((file) => copyFile(path.join(root, file), path.join(output, file)))
);
await cp(path.join(root, "assets", "optimized"), path.join(output, "assets", "optimized"), {
  recursive: true
});

console.log(`Static site built in ${path.relative(root, output)}/ (${publicFiles.length} files plus optimized assets).`);
