// Injects server-rendered markup for the public pages into the built HTML so
// crawlers and AI agents that do not run JavaScript can read the actual content.
// Runs after `vite build` (client) and scripts/generate-spa-route-files.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const distDir = path.resolve('dist');
const ssrEntry = path.resolve('.prerender/entry.mjs');

// ── Minimal browser shims ────────────────────────────────────────────────
// Some page modules touch window/document/localStorage at import time
// (e.g. bootstrap's data API). Effects never run during renderToString.
const noop = () => {};
const createStorage = () => {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
};
const createElement = () => ({
  style: {},
  dataset: {},
  classList: { add: noop, remove: noop, contains: () => false, toggle: () => false },
  setAttribute: noop,
  removeAttribute: noop,
  getAttribute: () => null,
  appendChild: noop,
  removeChild: noop,
  addEventListener: noop,
  removeEventListener: noop,
  querySelector: () => null,
  querySelectorAll: () => [],
  getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }),
});

const documentStub = {
  documentElement: createElement(),
  head: createElement(),
  body: createElement(),
  title: '',
  cookie: '',
  createElement,
  createTextNode: () => ({}),
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: noop,
  removeEventListener: noop,
  visibilityState: 'visible',
};

const windowStub = {
  document: documentStub,
  location: {
    pathname: '/',
    search: '',
    hash: '',
    href: 'https://noumatch.com/',
    origin: 'https://noumatch.com',
  },
  navigator: { userAgent: 'noumatch-prerender' },
  localStorage: createStorage(),
  sessionStorage: createStorage(),
  innerWidth: 1280,
  innerHeight: 900,
  devicePixelRatio: 1,
  scrollY: 0,
  addEventListener: noop,
  removeEventListener: noop,
  matchMedia: () => ({
    matches: false,
    media: '',
    addEventListener: noop,
    removeEventListener: noop,
    addListener: noop,
    removeListener: noop,
  }),
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: noop,
  scrollTo: noop,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
};

class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Node exposes some of these as getter-only globals (e.g. navigator), so
// define them as writable/configurable instead of assigning directly.
const defineGlobal = (name, value) => {
  Object.defineProperty(globalThis, name, {
    value,
    writable: true,
    configurable: true,
    enumerable: true,
  });
};

for (const [name, value] of Object.entries({
  window: windowStub,
  document: documentStub,
  navigator: windowStub.navigator,
  localStorage: windowStub.localStorage,
  sessionStorage: windowStub.sessionStorage,
  location: windowStub.location,
  matchMedia: windowStub.matchMedia,
  getComputedStyle: windowStub.getComputedStyle,
  requestAnimationFrame: windowStub.requestAnimationFrame,
  cancelAnimationFrame: noop,
  IntersectionObserver: ObserverStub,
  ResizeObserver: ObserverStub,
  scrollTo: noop,
})) {
  defineGlobal(name, value);
}

// ── Prerender ────────────────────────────────────────────────────────────
const { PUBLIC_ROUTES, renderRoute } = await import(pathToFileURL(ssrEntry).href);

const routeFile = (routePath) =>
  routePath === '/'
    ? path.join(distDir, 'index.html')
    : path.join(distDir, routePath.replace(/^\/+/, ''), 'index.html');

const assetFiles = fs.existsSync(path.join(distDir, 'assets'))
  ? fs.readdirSync(path.join(distDir, 'assets'))
  : [];

// Asset hashes differ slightly between the client and SSR bundles. Point any
// missing /assets/ reference at the client build's file with the same stem.
const remapAssets = (html) =>
  html.replace(/\/assets\/[A-Za-z0-9._-]+/g, (url) => {
    const fileName = url.split('/').pop();
    if (assetFiles.includes(fileName)) return url;

    const [stem, ...rest] = fileName.split('.');
    const ext = rest[rest.length - 1];
    const match = assetFiles.find((candidate) => {
      const parts = candidate.split('.');
      return parts[0] === stem && parts[parts.length - 1] === ext;
    });

    return match ? `/assets/${match}` : url;
  });

let prerendered = 0;

for (const route of PUBLIC_ROUTES) {
  const filePath = routeFile(route.path);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing built HTML for ${route.path}: ${filePath}`);
  }

  const markup = remapAssets(renderRoute(route.path));
  const html = fs.readFileSync(filePath, 'utf8');

  if (!/<div id="root">\s*<\/div>/.test(html)) {
    throw new Error(`Could not find an empty #root container in ${filePath}`);
  }

  fs.writeFileSync(filePath, html.replace(/<div id="root">\s*<\/div>/, `<div id="root">${markup}</div>`), 'utf8');
  prerendered += 1;
}

const rootHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
const rootText = rootHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
if (rootText.length < 500) {
  throw new Error(`Prerendered homepage looks empty (${rootText.length} chars of text)`);
}

console.log(`Prerendered ${prerendered} public routes into dist/ (homepage text: ${rootText.length} chars)`);
