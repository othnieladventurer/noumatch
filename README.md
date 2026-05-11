# NouMatch

NouMatch is a dating and social discovery platform with a React/Vite frontend, a Django REST backend, realtime notifications, email verification, matching, messaging, moderation, and a dedicated admin dashboard for operations and analytics.

This README is a high-level summary of what has been built so far and how the main pieces fit together.

## Latest Staging Updates

The current staging branch now includes a broader admin and main-app polish pass focused on operational clarity, session stability, and mobile usability:

- Admin dashboard was redesigned into a more concise monitoring view with clearer cards, charts, spacing, and responsive behavior.
- Admin users management now defaults to newest joined users first, uses live no-cache fetches, and includes a stronger review flow for user list and detail views.
- Admin user moderation now supports both profile photo review requests and bio review requests, including trigger counts, stored reasons, and user-facing blocker messaging.
- Admin swipe stats, analytics surfaces, and supporting admin UI were visually standardized to match the newer dashboard system.
- Admin auth/session recovery was hardened so login, refresh, and protected-route recovery are more stable after security changes.
- Admin theme preference is now persisted per admin account, and the top-nav account menu uses a click dropdown instead of a fragile hover interaction.
- Main app dashboard mobile layout was tightened so the center card stays fully visible between the top navbar and bottom nav on small screens.
- Main app profile-completion request cards were simplified for smaller screens, and the messages loading spinner is now centered in the available viewport.

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
- Frontend auth now uses a compatibility-safe hybrid session flow so existing guards, refresh flows, and websocket-dependent paths continue to work after security hardening.
- Access-token refresh is serialized so multiple simultaneous dashboard requests do not rotate/blacklist refresh tokens against each other.
- Protected main app routes refresh expired access tokens before logging users out.
- Admin protected routes redirect to `/admin/login`; main app protected routes redirect to `/login`.
- Refresh/hard refresh invalidates stale admin cache and rebuilds fresh data for the new page session.
- Frontend API clients no longer force a hardcoded `15000ms` timeout by default; timeout behavior is now configurable through `VITE_API_TIMEOUT_MS`.
- Refresh requests now fail fast when no valid refresh token exists instead of spamming unnecessary `401` refresh calls.

### Dashboard and Discovery

- Users can browse profile cards, swipe/like/pass, view photos, open profile details, and navigate between profiles.
- The small-screen empty-feed state uses a full black background so guidance text remains readable when no profile is available.
- The feed filters out the current user and blocked users.
- Passes now exclude profiles for a true 48-hour window, including older pass rows created before the expiry policy was corrected.
- Likes, sent likes, received likes, matches, blocks, and conversations are loaded into the dashboard.
- Like limits are tracked through backend swipe-limit endpoints.
- Profile impressions are logged from the main dashboard so the admin can see who viewed who.
- Impression updates record swipe action, feed position, ranking score, session, and device type where available.
- On small screens, profile-completion blocker cards and empty-feed cards are centered within the space between the top navbar and bottom nav instead of stretching to the full viewport.
- When profile completion is required on mobile, the bottom nav is intentionally restricted to `Discover` and `Profile` while notifications/messages remain reachable from the top navbar.
- The center profile card now measures around the real navbar and bottom-nav heights on small screens so the full card stays visible without sliding under navigation chrome.
- Main discovery/profile-completion cards now crop profile imagery from `center top` for a better mobile focal point.

### Profile Management

- Users can update profile details, interests, work, education, language preference, and main profile photo.
- Existing gallery photos can be safely promoted to the main profile photo through a dedicated authenticated backend endpoint.
- The profile view/update page uses a polished card-based layout with a clear edit mode and stronger mobile presentation.
- Users can clear their bio intentionally instead of being forced to keep stale text.
- Users can delete their own account from the profile page through a dedicated authenticated backend endpoint and confirmation modal.

### Messaging and Notifications

- Users can open conversations from matches and message matched users.
- Realtime notifications are available through WebSocket context.
- Notification bell and notification page support unread states and navigation.
- Email notifications are triggered for important engagement events: likes, matches, and messages.
- Chat and notification realtime dispatch now runs on transaction commit to reduce delayed or stale updates.
- Notification and chat sockets reconnect more aggressively so local/staging disconnects are less likely to leave users waiting for updates.
- The messages page loading spinner is vertically centered within the usable page area for a cleaner loading experience on mobile and desktop.

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
- Admin theme preference is persisted per admin email so the chosen dark/light mode is restored when that admin signs in again.
- The admin account menu in the top nav now uses a click dropdown so logout and related actions remain reliably clickable.

### Dashboard and Metrics

- Admin dashboard summarizes platform activity and operational health.
- The dashboard landing page has been redesigned into a more concise, chart-first monitoring cockpit with clearer visual hierarchy and less numeric clutter.
- Performance analytics track active users, behavior quality, SEO health, and historical trends.
- Swipe stats expose like/pass activity.
- Swipe stats received a UI/UX refresh with cleaner trend presentation, clearer distribution charts, and more compact KPI treatment.
- Profile impression analytics show profile views and fallback interaction data when raw impression rows are not available yet.
- Ranking analytics surface scoring and visibility information for users.
- Analytics pages include loading states and avoid unnecessary reloads during a session.
- Dashboard landing metrics now include a live registered gender balance card sourced directly from the `User` model.
- Registration balance has a dedicated admin endpoint and frontend fallback logic so it can still render even if the main dashboard payload is degraded.

### User Management

- Admin user management supports listing users, filtering by gender/status, and reviewing users with newest joined users shown first by default.
- Admin users pages now fetch live data on refresh instead of relying on frontend caching.
- User detail pages expose safer operational views for user records and now follow a more deliberate operations-focused layout.
- User deletion was hardened with safer cleanup paths for related records and a modal confirmation flow instead of a browser alert.
- "Since joined" display was adjusted to show short-term joined periods by minutes/hours before rolling into longer periods.
- User management and user detail views now render larger, inspectable profile photos instead of tiny avatars only.
- Admin user detail includes a click-to-open photo viewer and profile photo gallery support.
- A frontend moderation action now allows admins to require a new profile photo directly from `/admin/users/detail/:id`.
- Photo-review moderation supports trigger counts, stored custom user-facing messages, and clearing the requirement after a compliant new upload.
- Admin can now require a bio update from `/admin/users/detail/:id`, with backend moderation state, trigger counts, stored reasons, and automatic clearing after a compliant user bio update.
- The main app respects active photo-review and bio-review requirements by blocking swiping until the user updates the requested profile fields.

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
- `dashboard/registration-balance/`
- `users/list/`
- `users/manage/`
- `users/detail/<id>/`
- `user_action/`
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
- Restored a compatibility-safe auth flow after security hardening so both admin and main-app protected sessions stop kicking users out unexpectedly.
- Added token refresh serialization to prevent users from being logged out during simultaneous dashboard requests.
- Changed protected route guard to refresh before logout.
- Removed active admin-page caching so dashboard, users, swipe stats, and email notification screens fetch live server data on refresh.
- Added analytics fallback behavior where impression data is temporarily missing.
- Added spinner/loading treatment to analytics pages.
- Hardened notification email template/log APIs against missing migrations and unavailable tables.
- Added manual email testing support for notification templates.
- Improved admin user management sorting, gender filtering, delete UX, and latest-joined review flow.
- Added `users.0022_user_photo_review_requirement` and aligned admin endpoints so missing schema does not silently crash the whole admin surface.
- Added `users.0023_user_bio_review_requirement` plus model-aware readiness checks so admin users endpoints do not silently degrade when schema or model state drifts.
- Recovered admin users list, launch monitor, and registration-balance flows after schema drift by applying the missing users migration.
- Restored pass exclusion to a real 48-hour product window and refreshed pass windows on every new pass action.
- Removed hardcoded frontend API timeouts as the default behavior and made timeout optional/configurable.
- Tightened mobile dashboard gating so profile-required users only keep access to the blocker view, profile access, and top-nav notifications/messages.
- Persisted admin dark mode per account and replaced the hover-only top-nav profile menu with a click dropdown.

## Notes

- `main` is production and should be treated as high risk.
- `staging` is the first place to validate admin and main-app behavior.
- Any new model added on staging must include migrations before merging to `main`.
- If a production endpoint reports a missing relation/table, run the latest migrations before debugging the frontend.
- Browser extension console messages, such as Bitwarden SignalR or `chrome-extension://` warnings, are not NouMatch application errors.
