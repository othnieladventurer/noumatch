import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');
const indexPath = path.join(distDir, 'index.html');

const staticRoutes = [
  '/',
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
  '/admin/reports',
  '/admin/swipe-stats',
  '/admin/messages',
  '/admin/flagged-messages',
  '/admin/waitlist',
  '/admin/analytics/impressions',
  '/admin/analytics/ranking',
  '/admin/analytics/performance',
];

if (!fs.existsSync(indexPath)) {
  throw new Error(`Expected build output at ${indexPath}`);
}

const indexHtml = fs.readFileSync(indexPath, 'utf8');

for (const route of staticRoutes) {
  if (route === '/') {
    continue;
  }

  const routeDir = path.join(distDir, route.replace(/^\/+/, ''));
  const routeIndexPath = path.join(routeDir, 'index.html');
  fs.mkdirSync(routeDir, { recursive: true });
  fs.writeFileSync(routeIndexPath, indexHtml, 'utf8');
}

