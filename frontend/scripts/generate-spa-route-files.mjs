import fs from 'node:fs';
import path from 'node:path';
import { getSeoConfig } from '../src/lib/seo.js';

const distDir = path.resolve('dist');
const indexPath = path.join(distDir, 'index.html');

const staticRoutes = [
  '/',
  '/rencontre-haiti',
  '/landing/noumatch-haiti',
  '/login',
  '/register',
  '/waitlist',
  '/waitlist/women',
  '/waitlist/men',
  '/waitlist/stats',
  '/privacy',
  '/terms',
  '/verify-email',
  '/email-verified',
  '/forgot-password',
  '/reset-password-done',
  '/verify-otp',
  '/dashboard',
  '/profile',
  '/messages',
  '/notifications',
  '/admin/login',
  '/admin/dashboard',
  '/admin/users',
  '/admin/users/detail',
  '/admin/reports',
  '/admin/reports/cases',
  '/admin/swipe-stats',
  '/admin/messages',
  '/admin/messages/support',
  '/admin/messages/user',
  '/admin/flagged-messages',
  '/admin/waitlist',
  '/admin/notifications/email',
  '/admin/analytics/impressions',
  '/admin/analytics/ranking',
  '/admin/analytics/performance',
];

const htmlEscape = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const upsertTag = (html, matcher, nextTag) =>
  matcher.test(html) ? html.replace(matcher, nextTag) : html.replace('</head>', `  ${nextTag}\n  </head>`);

const withSeo = (html, route) => {
  const { title, description, canonical, ogImage, robots, jsonLd, hreflangs } = getSeoConfig(route);
  const safeTitle = htmlEscape(title);
  const safeDescription = htmlEscape(description);
  const safeCanonical = htmlEscape(canonical);
  const safeOgImage = htmlEscape(ogImage);
  const safeRobots = htmlEscape(robots);
  const schemaItems = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];
  const safeSchema = schemaItems
    .map((schema) => `<script type="application/ld+json" data-nm-seo="json-ld">${JSON.stringify(schema)}</script>`)
    .join('\n  ');

  let nextHtml = html.replace(/<html lang="[^"]*">/, '<html lang="fr">');
  nextHtml = nextHtml.replace(/<title>[\s\S]*?<\/title>/, `<title>${safeTitle}</title>`);
  nextHtml = upsertTag(
    nextHtml,
    /<meta\s+name="description"[\s\S]*?\/>/,
    `<meta name="description" content="${safeDescription}" />`
  );
  nextHtml = upsertTag(
    nextHtml,
    /<meta name="robots" content="[^"]*"\s*\/?>/,
    `<meta name="robots" content="${safeRobots}" />`
  );
  nextHtml = upsertTag(
    nextHtml,
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${safeCanonical}" />`
  );
  nextHtml = nextHtml.replace(/\s*<link rel="alternate" hreflang="[^"]*" href="[^"]*"\s*\/?>/g, '');
  if (hreflangs.length > 0) {
    const hreflangMarkup = hreflangs
      .map((item) => `  <link rel="alternate" hreflang="${htmlEscape(item.hrefLang)}" href="${htmlEscape(item.href)}" />`)
      .join('\n');
    nextHtml = nextHtml.replace('</head>', `${hreflangMarkup}\n</head>`);
  }
  nextHtml = upsertTag(
    nextHtml,
    /<meta property="og:title" content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${safeTitle}" />`
  );
  nextHtml = upsertTag(
    nextHtml,
    /<meta\s+property="og:description"[\s\S]*?\/>/,
    `<meta property="og:description" content="${safeDescription}" />`
  );
  nextHtml = upsertTag(
    nextHtml,
    /<meta property="og:url" content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${safeCanonical}" />`
  );
  nextHtml = upsertTag(
    nextHtml,
    /<meta property="og:image" content="[^"]*"\s*\/?>/,
    `<meta property="og:image" content="${safeOgImage}" />`
  );
  nextHtml = upsertTag(
    nextHtml,
    /<meta name="twitter:title" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${safeTitle}" />`
  );
  nextHtml = upsertTag(
    nextHtml,
    /<meta\s+name="twitter:description"[\s\S]*?\/>/,
    `<meta name="twitter:description" content="${safeDescription}" />`
  );
  nextHtml = upsertTag(
    nextHtml,
    /<meta name="twitter:image" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:image" content="${safeOgImage}" />`
  );

  nextHtml = nextHtml.replace(/\s*<script type="application\/ld\+json" data-nm-seo="json-ld">[\s\S]*?<\/script>/, '');
  if (safeSchema) {
    nextHtml = nextHtml.replace('</head>', `  ${safeSchema}\n  </head>`);
  }

  return nextHtml;
};

if (!fs.existsSync(indexPath)) {
  throw new Error(`Expected build output at ${indexPath}`);
}

const indexHtml = fs.readFileSync(indexPath, 'utf8');
const rootHtml = withSeo(indexHtml, '/');
fs.writeFileSync(indexPath, rootHtml, 'utf8');
const fallbackFiles = ['200.html', '404.html'];

for (const route of staticRoutes) {
  if (route === '/') {
    continue;
  }

  const routeDir = path.join(distDir, route.replace(/^\/+/, ''));
  const routeIndexPath = path.join(routeDir, 'index.html');
  fs.mkdirSync(routeDir, { recursive: true });
  fs.writeFileSync(routeIndexPath, withSeo(indexHtml, route), 'utf8');
}

for (const fallbackFile of fallbackFiles) {
  fs.writeFileSync(path.join(distDir, fallbackFile), rootHtml, 'utf8');
}
