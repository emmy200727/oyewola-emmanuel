import { access, readFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { site, websiteProjects } from "./site-data.mjs";
import { portfolio } from "../gallery-data.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "public");
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};
const read = (file) => readFile(path.join(output, file), "utf8");
const getAttribute = (html, tagPattern, attribute = "content") => {
  const tag = html.match(tagPattern)?.[0];
  return tag?.match(new RegExp(`${attribute}=["']([^"']+)["']`, "i"))?.[1];
};
const metaName = (html, name) => getAttribute(html, new RegExp(`<meta\\s+[^>]*name=["']${name.replace(".", "\\.")}["'][^>]*>`, "i"));
const metaProperty = (html, property) => getAttribute(html, new RegExp(`<meta\\s+[^>]*property=["']${property.replace(".", "\\.")}["'][^>]*>`, "i"));
const canonicalOf = (html) => getAttribute(html, /<link\s+[^>]*rel=["']canonical["'][^>]*>/i, "href");
const projectSlugs = [...websiteProjects.map(({ slug }) => slug), ...portfolio.clients.map(({ id }) => id)];
const pages = [
  { file: "index.html", route: "/" },
  { file: "about.html", route: "/about" },
  { file: "services.html", route: "/services" },
  { file: "projects.html", route: "/projects" },
  { file: "contact.html", route: "/contact" },
  ...projectSlugs.map((slug) => ({ file: `work/${slug}.html`, route: `/work/${slug}`, project: true }))
];

const titles = new Map();
const descriptions = new Map();
const canonicals = new Map();

for (const page of pages) {
  const html = await read(page.file);
  const expectedCanonical = `${site.baseUrl}${page.route}`;
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.replace(/&amp;/g, "&").trim();
  const description = metaName(html, "description");
  const canonical = canonicalOf(html);
  const h1Count = [...html.matchAll(/<h1\b/gi)].length;
  const canonicalCount = [...html.matchAll(/<link\s+[^>]*rel=["']canonical["'][^>]*>/gi)].length;

  check(/<html\s+lang=["']en["']/i.test(html), `${page.file}: missing lang=en.`);
  check(/<meta\s+charset=["']utf-8["']/i.test(html), `${page.file}: missing UTF-8 charset.`);
  check(Boolean(metaName(html, "viewport")), `${page.file}: missing viewport metadata.`);
  check(Boolean(metaName(html, "author")), `${page.file}: missing author metadata.`);
  check(Boolean(metaName(html, "theme-color")), `${page.file}: missing theme color.`);
  check(/index/i.test(metaName(html, "robots") || "") && /follow/i.test(metaName(html, "robots") || ""), `${page.file}: page is not explicitly indexable.`);
  check(Boolean(title) && title.length <= 65, `${page.file}: title missing or longer than 65 characters (${title?.length || 0}).`);
  check(Boolean(description) && description.length >= 70 && description.length <= 170, `${page.file}: description should be 70-170 characters (${description?.length || 0}).`);
  check(canonicalCount === 1, `${page.file}: expected one canonical, found ${canonicalCount}.`);
  check(canonical === expectedCanonical, `${page.file}: canonical is ${canonical}, expected ${expectedCanonical}.`);
  check(metaProperty(html, "og:url") === canonical, `${page.file}: og:url does not match its canonical.`);
  for (const property of ["og:type", "og:title", "og:description", "og:image", "og:image:alt"]) {
    check(Boolean(metaProperty(html, property)), `${page.file}: missing ${property}.`);
  }
  for (const name of ["twitter:card", "twitter:title", "twitter:description", "twitter:image", "twitter:image:alt"]) {
    check(Boolean(metaName(html, name)), `${page.file}: missing ${name}.`);
  }
  check(/<link\s+[^>]*rel=["'](?:shortcut )?icon["']/i.test(html), `${page.file}: favicon link missing.`);
  check(/<link\s+[^>]*rel=["']apple-touch-icon["']/i.test(html), `${page.file}: Apple touch icon missing.`);
  check(/<link\s+[^>]*rel=["']manifest["']/i.test(html), `${page.file}: web manifest missing.`);
  check(!/http-equiv=["']refresh["']/i.test(html), `${page.file}: meta refresh should not be used.`);
  check(!html.includes("emmy200727.github.io"), `${page.file}: legacy GitHub Pages domain remains.`);
  check(!/\b(?:src|href)=["']http:\/\//i.test(html), `${page.file}: mixed-content URL found.`);
  check(h1Count === 1, `${page.file}: expected one H1, found ${h1Count}.`);

  const headingLevels = [...html.matchAll(/<h([1-6])\b/gi)].map((match) => Number(match[1]));
  for (let index = 1; index < headingLevels.length; index += 1) {
    check(headingLevels[index] <= headingLevels[index - 1] + 1, `${page.file}: heading hierarchy skips from H${headingLevels[index - 1]} to H${headingLevels[index]}.`);
  }
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    check(/\salt=["'][^"']*["']/i.test(match[0]), `${page.file}: image missing alt text.`);
    check(/\swidth=["']\d+["']/i.test(match[0]) && /\sheight=["']\d+["']/i.test(match[0]), `${page.file}: image missing intrinsic dimensions.`);
  }
  for (const match of html.matchAll(/<a\b[^>]*target=["']_blank["'][^>]*>/gi)) {
    check(/rel=["'][^"']*noopener[^"']*["']/i.test(match[0]), `${page.file}: new-tab link missing noopener.`);
  }

  const scripts = [...html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)];
  check(scripts.length > 0, `${page.file}: JSON-LD is missing.`);
  for (const [, json] of scripts) {
    try {
      const data = JSON.parse(json);
      check(data["@context"] === "https://schema.org", `${page.file}: JSON-LD context is invalid.`);
      if (page.project) {
        const types = (data["@graph"] || []).flatMap((node) => Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]]);
        check(types.includes("CreativeWork"), `${page.file}: CreativeWork schema missing.`);
        check(types.includes("BreadcrumbList"), `${page.file}: BreadcrumbList schema missing.`);
      }
    } catch (error) {
      failures.push(`${page.file}: invalid JSON-LD (${error.message}).`);
    }
  }

  if (titles.has(title)) failures.push(`${page.file}: duplicate title also used by ${titles.get(title)}.`);
  else titles.set(title, page.file);
  if (descriptions.has(description)) failures.push(`${page.file}: duplicate description also used by ${descriptions.get(description)}.`);
  else descriptions.set(description, page.file);
  if (canonicals.has(canonical)) failures.push(`${page.file}: duplicate canonical also used by ${canonicals.get(canonical)}.`);
  else canonicals.set(canonical, page.file);

  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)) {
    const reference = match[1];
    if (/^(?:https?:|mailto:|tel:|#)/i.test(reference)) continue;
    const pathname = reference.split("#")[0].split("?")[0];
    if (!pathname || pathname === "/") continue;
    const relative = pathname.replace(/^\//, "");
    const candidate = path.extname(relative) ? relative : `${relative}.html`;
    try {
      await access(path.join(output, candidate), constants.R_OK);
    } catch {
      failures.push(`${page.file}: broken internal link ${reference}.`);
    }
  }
}

const sitemap = await read("sitemap.xml");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const expectedUrls = pages.map(({ route }) => `${site.baseUrl}${route}`);
check(sitemapUrls.length === expectedUrls.length, `Sitemap has ${sitemapUrls.length} URLs; expected ${expectedUrls.length}.`);
check(new Set(sitemapUrls).size === sitemapUrls.length, "Sitemap contains duplicate URLs.");
for (const url of expectedUrls) check(sitemapUrls.includes(url), `Sitemap is missing ${url}.`);
check(sitemapUrls.every((url) => url.startsWith(site.baseUrl) && !url.includes("#")), "Sitemap contains a non-canonical domain or fragment URL.");

const robots = await read("robots.txt");
check(robots.includes(`Sitemap: ${site.baseUrl}/sitemap.xml`), "robots.txt does not reference the canonical sitemap.");
check(!/Disallow:\s*\//i.test(robots), "robots.txt blocks crawling.");

const manifest = JSON.parse(await read("site.webmanifest"));
check(manifest.start_url === "/" && manifest.scope === "/", "Manifest scope or start URL is incorrect.");
check(Array.isArray(manifest.icons) && manifest.icons.length >= 4, "Manifest icon set is incomplete.");
for (const icon of manifest.icons || []) {
  try {
    await access(path.join(output, icon.src.replace(/^\//, "")), constants.R_OK);
  } catch {
    failures.push(`Manifest icon does not exist: ${icon.src}.`);
  }
}

const config = JSON.parse(await readFile(path.join(root, "vercel.json"), "utf8"));
check(config.cleanUrls === false && config.trailingSlash === false, "Vercel URL policy must preserve the Google verification filename.");
const rewriteSources = new Set((config.rewrites || []).map(({ source }) => source));
for (const route of ["/about", "/services", "/projects", "/contact", "/work/:slug"]) {
  check(rewriteSources.has(route), `Vercel rewrite is missing for ${route}.`);
}

const outputRootFiles = await readdir(output);
check(outputRootFiles.includes("robots.txt") && outputRootFiles.includes("sitemap.xml"), "Crawl-control files are missing from build output.");
const notFound = await read("404.html");
check(/<meta\s+[^>]*name=["']robots["'][^>]*content=["']noindex, follow["']/i.test(notFound), "Custom 404 page must be noindex, follow.");
check(!/<link\s+[^>]*rel=["']canonical["']/i.test(notFound), "404 page should not claim a canonical URL.");

if (failures.length) {
  console.error("Production SEO verification failed:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Production SEO verification passed (${pages.length} indexable pages, ${sitemapUrls.length} sitemap URLs, unique canonicals/titles/descriptions).`);
}
