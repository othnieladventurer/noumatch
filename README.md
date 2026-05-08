# NouMatch

NouMatch is a dating and social discovery platform with a React/Vite frontend, a Django REST backend, realtime notifications, email verification, matching, messaging, moderation, and a dedicated admin dashboard for operations and analytics.

This README is a high-level summary of what has been built so far and how the main pieces fit together.

## Current Product Scope

NouMatch currently includes two major surfaces:

- Main app: public pages, registration, OTP verification, login, profile management, discovery feed, likes, passes, matches, chat, notifications, reporting, blocking, and account session handling.
- Admin dashboard: admin login, platform metrics, user management, waitlist tools, reports/cases, swipe stats, conversations, flagged messages, profile impression analytics, ranking analytics, performance analytics, and notification email monitoring.

## Tech Stack

- Frontend: React 18, Vite, React Router, Bootstrap, Chart.js, Axios.
- Backend: Django 6, Django REST Framework, SimpleJWT, Channels, Daphne, Redis support, PostgreSQL-ready database config.
- Realtime: WebSocket notification/chat support through Django Channels.
- Email: Brevo API support for OTP, password reset, and event-driven notification emails.
- Storage/media: Django media/static handling with S3-ready dependencies.
- Auth: JWT access and refresh tokens, HttpOnly auth cookies, separated main-user and admin sessions.

## Main App Features

### Registration and Verification

- Registration is open beyond the original waitlist-only flow.
- Email uniqueness is checked before registration so the same email cannot register twice.
- Gender-ratio registration control protects the product balance target: women can register freely, while men can be paused when the ratio would exceed the desired balance.
- The male pause message is intentionally subtle and product-safe, focused on quality of experience rather than explicitly exposing the ratio rule.
- Registration is not considered complete until the backend allows registration and the user completes OTP email verification.
- OTP verification supports resend flows and safer latest-code handling.

### Authentication and Sessions

- Main app login stores the real JWT access token and refresh token.
- Admin tokens and user tokens are separated so stale admin sessions cannot hijack main-app requests.
- Access-token refresh is serialized so multiple simultaneous dashboard requests do not rotate/blacklist refresh tokens against each other.
- Protected main app routes refresh expired access tokens before logging users out.
- Admin protected routes redirect to `/admin/login`; main app protected routes redirect to `/login`.
- Refresh/hard refresh invalidates stale admin cache and rebuilds fresh data for the new page session.

### Dashboard and Discovery

- Users can browse profile cards, swipe/like/pass, view photos, open profile details, and navigate between profiles.
- The small-screen empty-feed state uses a full black background so guidance text remains readable when no profile is available.
- The feed filters out the current user and blocked users.
- Likes, sent likes, received likes, matches, blocks, and conversations are loaded into the dashboard.
- Like limits are tracked through backend swipe-limit endpoints.
- Profile impressions are logged from the main dashboard so the admin can see who viewed who.
- Impression updates record swipe action, feed position, ranking score, session, and device type where available.

### Profile Management

- Users can update profile details, interests, work, education, language preference, and main profile photo.
- Existing gallery photos can be safely promoted to the main profile photo through a dedicated authenticated backend endpoint.
- The profile view/update page uses a polished card-based layout with a clear edit mode and stronger mobile presentation.

### Messaging and Notifications

- Users can open conversations from matches and message matched users.
- Realtime notifications are available through WebSocket context.
- Notification bell and notification page support unread states and navigation.
- Email notifications are triggered for important engagement events: likes, matches, and messages.

### Safety and Moderation

- Users can block other users.
- Users can report profiles.
- Blocking removes affected profiles from dashboard interaction lists.
- Reports feed into admin moderation and case-management tools.

## Admin Dashboard Features

### Admin Authentication

- Admin has a dedicated login route and isolated auth tokens.
- Admin refresh tokens are handled separately from main app refresh tokens.
- Admin logout returns admins to `/admin/login`.

### Dashboard and Metrics

- Admin dashboard summarizes platform activity and operational health.
- Performance analytics track active users, behavior quality, SEO health, and historical trends.
- Swipe stats expose like/pass activity.
- Profile impression analytics show profile views and fallback interaction data when raw impression rows are not available yet.
- Ranking analytics surface scoring and visibility information for users.
- Analytics pages include loading states and avoid unnecessary reloads during a session.

### User Management

- Admin user management supports listing users, sorting users from A to Z, and filtering by gender.
- User detail pages expose safer operational views for user records.
- User deletion was hardened with safer cleanup paths for related records and a modal confirmation flow instead of a browser alert.
- "Since joined" display was adjusted to show short-term joined periods by minutes/hours before rolling into longer periods.

### Waitlist and Registration Operations

- Admin waitlist tools support monitoring and managing launch access.
- Waitlist invitation email support exists for controlled launch communication.
- Registration rules were moved away from waitlist-only access toward ratio-controlled access.

### Email Notification Management

- Admin has an Email Notifications section in the side navigation.
- Admin can view notification email logs for likes, matches, and messages.
- Admin can edit email templates for event-driven emails.
- Admin can manually trigger test emails to an address of choice for like, match, and message templates.
- Backend includes notification email tables, template bootstrap, table-readiness checks, fallback responses, and provider error logging.

### Moderation, Reports, and Messages

- Admin can review reports.
- Admin can create/manage report cases, assignments, status, priority, and case notes.
- Admin can view support conversations and user conversations.
- Admin can inspect flagged messages and take moderation actions.

## Backend Apps

Important backend apps include:

- `users`: custom user model, registration, login, OTP, password reset, auth cookies, scoring, visibility, and profile APIs.
- `interactions`: likes, passes, swipe limits, swipe stats, and interaction analytics.
- `matches`: match creation and match notification hooks.
- `chat`: conversations, messages, support conversations, and realtime chat support.
- `notifications`: in-app notifications and WebSocket notification delivery.
- `admin_dashboard`: admin auth, analytics, user operations, email notification templates/logs, reports, cases, and dashboard endpoints.
- `report`: user reporting models and APIs.
- `block`: user blocking APIs.
- `waitlist`: waitlist and launch-access tracking.

## Key Admin/API Routes

Frontend admin routes:

- `/admin/login`
- `/admin/dashboard`
- `/admin/users`
- `/admin/users/detail/:id`
- `/admin/waitlist`
- `/admin/reports`
- `/admin/reports/cases`
- `/admin/swipe-stats`
- `/admin/messages`
- `/admin/flagged-messages`
- `/admin/notifications/email`
- `/admin/analytics/impressions`
- `/admin/analytics/ranking`
- `/admin/analytics/performance`

Backend admin API routes live under:

- `/api/noumatch-admin/`

Key admin API groups include:

- `dashboard/`
- `users/list/`
- `users/manage/`
- `users/detail/<id>/`
- `swipe-stats/`
- `notifications/email/templates/`
- `notifications/email/logs/`
- `notifications/email/test-send/`
- `analytics/impression/`
- `analytics/impression/update/`
- `analytics/impressions/`
- `analytics/ranking/`
- `metrics/active-users/`

## Local Development

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Useful frontend scripts:

```bash
npm run dev
npm run dev:staging
npm run build
npm run build:staging
npm run preview
npm run preview:staging
npm run lint
```

### Backend

```bash
cd api
..\venv\Scripts\python.exe manage.py check
..\venv\Scripts\python.exe manage.py migrate
..\venv\Scripts\python.exe manage.py runserver
```

For WebSocket/local Channels testing, run the ASGI server with Daphne when needed.

## Production Safety Workflow

The intended workflow for sensitive production changes is:

1. Work on `staging` first.
2. Run backend checks and migrations in staging.
3. Run frontend staging build.
4. Test registration, login, dashboard, admin dashboard, analytics, and notification email flows.
5. Merge staging into `main` only after staging is confirmed.
6. Run production build/checks.
7. Push `main`.
8. Redeploy production.
9. Apply any new migrations in production before using endpoints backed by new tables.

For production-critical areas, avoid changing unrelated code in the same commit.

## Verification Checklist Before Deploy

- `python manage.py check`
- `python manage.py makemigrations --check --dry-run` when possible
- `python manage.py migrate --plan`
- `python manage.py migrate`
- `npm run build`
- Login main app and confirm dashboard does not kick users out.
- Register a test user and complete OTP verification.
- Confirm duplicate email registration is blocked.
- Confirm ratio-controlled registration messaging behaves as expected.
- Confirm `/dashboard` profile cards render and swiping works.
- Confirm profile impressions are recorded.
- Confirm admin login works.
- Confirm `/admin/dashboard`, `/admin/users`, `/admin/swipe-stats`, `/admin/analytics/impressions`, `/admin/analytics/ranking`, and `/admin/analytics/performance` return data.
- Confirm notification email templates load in admin.
- Send a manual test email for like/match/message templates.

## Recent Hardening Summary

- Fixed main login so it stores the real JWT instead of a placeholder value.
- Prevented stale admin tokens from forcing main-app API calls into admin mode.
- Added token refresh serialization to prevent users from being logged out during simultaneous dashboard requests.
- Changed protected route guard to refresh before logout.
- Reworked admin cache freshness so hard refresh replaces stale cache.
- Added analytics fallback behavior where impression data is temporarily missing.
- Added spinner/loading treatment to analytics pages.
- Hardened notification email template/log APIs against missing migrations and unavailable tables.
- Added manual email testing support for notification templates.
- Improved admin user management sorting, gender filtering, and delete UX.

## Notes

- `main` is production and should be treated as high risk.
- `staging` is the first place to validate admin and main-app behavior.
- Any new model added on staging must include migrations before merging to `main`.
- If a production endpoint reports a missing relation/table, run the latest migrations before debugging the frontend.
- Browser extension console messages, such as Bitwarden SignalR or `chrome-extension://` warnings, are not NouMatch application errors.
