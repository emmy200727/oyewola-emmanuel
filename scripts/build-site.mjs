import { copyFile, cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "./verify-site.mjs";
import { portfolio } from "../gallery-data.js";
import { site, websiteProjects } from "./site-data.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "public");
const publicFiles = [
  ".nojekyll",
  "404.html",
  "about.html",
  "app.js",
  "contact.html",
  "favicon.svg",
  "favicon-32x32.png",
  "googlef6ec1ac80bd5ba22.html",
  "gallery-data.js",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
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

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const absoluteUrl = (value) => new URL(value.replace(/^\//, ""), `${site.baseUrl}/`).href;
const collectImages = (node) => [
  ...node.images,
  ...node.children.flatMap(collectImages)
];

const designProjects = portfolio.clients.map((client) => ({
  slug: client.id,
  title: client.title,
  type: client.type,
  description: client.description,
  services: [client.type, "Graphic design", "Visual systems"],
  image: client.preview,
  images: collectImages(client).slice(0, 8),
  imageCount: client.imageCount
}));

const projects = [
  ...websiteProjects.map((project) => ({ ...project, images: [project.image], imageCount: 1, kind: "website" })),
  ...designProjects.map((project) => ({ ...project, kind: "design" }))
];

const projectHead = (project) => {
  const canonical = `${site.baseUrl}/work/${project.slug}`;
  const title = `${project.title} ${project.kind === "website" ? "Website Design" : "Design Project"} | Emmanuel Oyewola`;
  const description = project.description;
  const image = absoluteUrl(project.image.src);
  const imageAlt = `${project.title}, ${project.type} by Emmanuel Oyewola`;
  return `
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="author" content="${site.author}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta name="theme-color" content="#f4f3ef">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="en_NG">
  <meta property="og:site_name" content="${site.name}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:width" content="${project.image.width}">
  <meta property="og:image:height" content="${project.image.height}">
  <meta property="og:image:alt" content="${escapeHtml(imageAlt)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${image}">
  <meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="stylesheet" href="/styles.css">
  <!-- Search Console: replace and uncomment GOOGLE_SEARCH_CONSOLE_TOKEN or BING_WEBMASTER_TOOLS_TOKEN. -->`;
};

const projectSchema = (project) => {
  const canonical = `${site.baseUrl}/work/${project.slug}`;
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CreativeWork",
        "@id": `${canonical}#project`,
        name: project.title,
        description: project.description,
        url: canonical,
        image: absoluteUrl(project.image.src),
        creator: { "@id": `${site.baseUrl}/#person` },
        author: { "@id": `${site.baseUrl}/#person` },
        genre: project.type,
        keywords: project.services.join(", "),
        inLanguage: "en",
        ...(project.liveUrl ? { sameAs: project.liveUrl } : {})
      },
      {
        "@type": "WebPage",
        "@id": `${canonical}#page`,
        url: canonical,
        name: `${project.title}: ${project.type}`,
        inLanguage: "en",
        mainEntity: { "@id": `${canonical}#project` },
        breadcrumb: { "@id": `${canonical}#breadcrumb` }
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonical}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${site.baseUrl}/` },
          { "@type": "ListItem", position: 2, name: "Projects", item: `${site.baseUrl}/projects` },
          { "@type": "ListItem", position: 3, name: project.title, item: canonical }
        ]
      }
    ]
  }).replaceAll("<", "\\u003c");
};

const renderProject = (project, index) => {
  const previous = projects[(index - 1 + projects.length) % projects.length];
  const next = projects[(index + 1) % projects.length];
  const images = project.images.map((image, imageIndex) => `
        <figure class="project-detail-image">
          <img src="/${escapeHtml(image.src)}"${image.thumbnail ? ` srcset="/${escapeHtml(image.thumbnail)} ${image.thumbnailWidth || Math.min(720, image.width)}w, /${escapeHtml(image.src)} ${image.width}w" sizes="(max-width: 760px) calc(100vw - 2.5rem), 1240px"` : ""} width="${image.width}" height="${image.height}" alt="${escapeHtml(image.alt || `${project.title} ${project.type} design ${imageIndex + 1}`)}" ${imageIndex === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
          <figcaption>${escapeHtml(image.alt || `${project.title} design ${imageIndex + 1}`)}</figcaption>
        </figure>`).join("");
  const liveLink = project.liveUrl
    ? `<a class="button" href="${project.liveUrl}" target="_blank" rel="noopener noreferrer">Visit live website <span aria-hidden="true">↗</span></a>`
    : `<a class="button" href="/#design-work">Browse the complete interactive collection <span aria-hidden="true">→</span></a>`;
  return `<!doctype html>
<html lang="en">
<head>${projectHead(project)}
  <script type="application/ld+json">${projectSchema(project)}</script>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to content</a>
  <header class="site-header subpage-header"><div class="container header-inner"><a class="brand-mark" href="/" aria-label="Emmanuel Oyewola, home"><span class="brand-monogram" aria-hidden="true">EO</span><span class="brand-name">Emmanuel Oyewola<small>Designer &amp; Developer</small></span></a><nav class="desktop-nav subpage-nav" aria-label="Primary navigation"><a href="/projects" aria-current="page">Work</a><a href="/services">Services</a><a href="/about">About</a><a href="/contact">Contact</a></nav></div></header>
  <main id="main-content" class="subpage-main">
    <nav class="container breadcrumb" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li><a href="/projects">Projects</a></li><li aria-current="page">${escapeHtml(project.title)}</li></ol></nav>
    <article>
      <header class="project-detail-hero"><div class="container"><p class="kicker">${escapeHtml(project.type)}</p><h1>${escapeHtml(project.title)}</h1><p class="page-lead">${escapeHtml(project.description)}</p><ul class="tag-list" aria-label="Project capabilities">${project.services.map((service) => `<li>${escapeHtml(service)}</li>`).join("")}</ul>${liveLink}</div></header>
      <section class="project-detail-gallery" aria-label="Selected work from ${escapeHtml(project.title)}"><div class="container">${images}</div></section>
      <section class="project-detail-summary"><div class="container page-copy-grid"><h2>Built for clarity and consistency.</h2><div><p>This ${escapeHtml(project.type.toLowerCase())} project is part of Emmanuel Oyewola’s multidisciplinary portfolio. The work combines strategic thinking with practical visual execution so the experience stays recognizable and useful across its intended touchpoints.</p>${project.imageCount > 1 ? `<p>This page presents ${project.images.length} selected pieces from a ${project.imageCount}-image collection. The complete archive remains available in the interactive portfolio.</p>` : ""}</div></div></section>
    </article>
    <nav class="project-pagination container" aria-label="More projects"><a href="/work/${previous.slug}"><span>Previous project</span><strong>${escapeHtml(previous.title)}</strong></a><a href="/work/${next.slug}"><span>Next project</span><strong>${escapeHtml(next.title)}</strong></a></nav>
  </main>
  <footer class="site-footer"><div class="container footer-inner"><p>Brand identity, graphic design and UI/UX design for ambitious businesses.</p><nav aria-label="Footer navigation"><a href="/">Home</a><a href="/projects">All work</a><a href="/services">Services</a><a href="/contact">Contact</a></nav><div class="footer-bottom"><span>© 2026 Emmanuel Oyewola</span><span>Abuja, Nigeria · Available worldwide</span></div></div></footer>
</body>
</html>`;
};

const workOutput = path.join(output, "work");
await mkdir(workOutput, { recursive: true });
await Promise.all(projects.map((project, index) => writeFile(path.join(workOutput, `${project.slug}.html`), renderProject(project, index), "utf8")));

const staticUrls = [
  ["/", "1.0", "monthly"],
  ["/about", "0.7", "yearly"],
  ["/services", "0.8", "monthly"],
  ["/projects", "0.9", "monthly"],
  ["/contact", "0.6", "yearly"]
];
const sitemapUrls = [
  ...staticUrls,
  ...projects.map((project) => [`/work/${project.slug}`, project.kind === "website" ? "0.8" : "0.7", "yearly"])
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map(([route, priority, frequency]) => `  <url><loc>${site.baseUrl}${route}</loc><lastmod>${site.lastModified}</lastmod><changefreq>${frequency}</changefreq><priority>${priority}</priority></url>`).join("\n")}\n</urlset>\n`;
await writeFile(path.join(output, "sitemap.xml"), sitemap, "utf8");

console.log(`Static site built in ${path.relative(root, output)}/ (${publicFiles.length} shared files, ${projects.length} project pages, plus optimized assets).`);
await import("./verify-output.mjs");
