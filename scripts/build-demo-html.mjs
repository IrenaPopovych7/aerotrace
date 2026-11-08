// Builds a single self-contained HTML file from the Expo web export, for hosts that cannot
// serve extra files or block outside requests. Usage: node scripts/build-demo-html.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = join(import.meta.dirname, '..', 'apps', 'mobile', 'dist');
let html = readFileSync(join(dist, 'index.html'), 'utf8');

html = html.replace(/<link rel="preload"[^>]*>/g, '');
html = html.replace(/<link rel="icon"[^>]*>/g, '');
html = html.replace(/<meta httpEquiv[^>]*>/g, '');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) => {
  const css = readFileSync(join(dist, href), 'utf8');
  return `<style>${css}</style>`;
});
html = html.replace(/<script src="([^"]+)" defer><\/script>/g, (_, src) => {
  const js = readFileSync(join(dist, src), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script>${js}</script>`;
});
// Use a <meta name="theme-color"> and tidy viewport for phones.
html = html.replace(
  '<title>AeroTrace</title>',
  '<title>AeroTrace</title>\n    <meta name="theme-color" content="#0a0f1a" />\n    <meta name="description" content="AeroTrace: UAV mission planner and flight simulator demo (educational)." />',
);

if (/src="\/_expo|href="\/_expo/.test(html)) throw new Error('An asset reference was not inlined');
const out = join(dist, 'aerotrace-demo.html');
writeFileSync(out, html);
console.log(`Wrote ${out} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
