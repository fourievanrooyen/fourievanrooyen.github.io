import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const root = resolve('dist');
const required = [
  'index.html',
  'missions/orca/index.html',
  'missions/propeller-research/index.html',
  'missions/genesis-simulation/index.html',
  'docs/fourie-van-rooyen-resume.pdf',
  'docs/fourie-van-rooyen-cover-letter.pdf',
  'docs/orca-project-documentation.pdf',
  'docs/letter-of-recommendation.pdf',
  'docs/recommendation-letter-jinwei-shen.pdf',
  'docs/urca-poster-2025.pdf',
  'media/flight-mechanics-mission.mp4',
  'media/flight-mechanics-mission.webm',
  'media/flight-mechanics-mission-poster.jpg',
  'og.png',
  'favicon.png',
  'robots.txt',
  'sitemap-index.xml',
  '.nojekyll',
];

const failures = required.filter((file) => !existsSync(join(root, file))).map((file) => `Missing required output: ${file}`);
const htmlFiles = [];
const walk = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (extname(entry.name) === '.html') htmlFiles.push(path);
  }
};
walk(root);

const localReference = /(?:href|src)=["'](\/(?!\/|#)[^"'?]+)["']/g;
const srcsetReference = /srcset=["']([^"']+)["']/g;
const validateReference = (htmlFile, reference) => {
  if (!reference.startsWith('/') || reference.startsWith('//')) return;
  const clean = decodeURIComponent(reference.split(/[?#]/)[0]);
  const candidate = join(root, clean.replace(/^\//, ''));
  const directoryIndex = join(candidate, 'index.html');
  if (!existsSync(candidate) && !existsSync(directoryIndex)) failures.push(`Broken local reference in ${htmlFile}: ${reference}`);
};
for (const htmlFile of htmlFiles) {
  const html = readFileSync(htmlFile, 'utf8');
  for (const match of html.matchAll(localReference)) {
    validateReference(htmlFile, match[1]);
  }
  for (const match of html.matchAll(srcsetReference)) {
    for (const candidate of match[1].split(',')) validateReference(htmlFile, candidate.trim().split(/\s+/)[0]);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Validated ${htmlFiles.length} HTML pages and ${required.length} required deployment files.`);
