# Facebook Ads Funnel for NouMatch

## 1. Landing page route

- Primary route: `/rencontre-haiti`
- Alias route: `/landing/noumatch-haiti`
- CTA destination: `/register`

## 2. Pixel setup

The Meta Pixel is initialized once in the React app and page views are tracked on route changes.

- Pixel helper: `frontend/src/lib/metaPixel.js`
- Attribution helper: `frontend/src/lib/attribution.js`
- Global app route tracking: `frontend/src/App.jsx`
- One-time initialization: `frontend/src/main.jsx`

The implementation is safe by default:

- No hardcoded Pixel ID
- No crash if the Pixel ID is missing
- No duplicate initialization
- No event fire if `fbq` is unavailable

## 3. Required env vars

Recommended Vite-native variable:

```env
VITE_META_PIXEL_ID=123456789012345
```

Compatibility variable also supported by this repo:

```env
REACT_APP_META_PIXEL_ID=123456789012345
```

Where to add them:

- Local development: `frontend/.env`
- Staging: `frontend/.env.staging`
- Production: `frontend/.env.production`

Recommended setup:

- Put `VITE_META_PIXEL_ID` in all frontend env files.
- If your deployment tooling already uses `REACT_APP_META_PIXEL_ID`, this repo now supports that too.
- Do not commit real production Pixel IDs if your deployment platform injects them at build time.

Suggested values:

```env
# frontend/.env
VITE_META_PIXEL_ID=your_local_test_pixel_id

# frontend/.env.staging
VITE_META_PIXEL_ID=your_staging_pixel_id

# frontend/.env.production
VITE_META_PIXEL_ID=your_production_pixel_id
```

## 4. All tracked events

- `PageView`
- `LandingCTA`
- `RegistrationStarted`
- `CompleteRegistration`
- `OTPVerified`
- `ProfileCompleted`
- `FirstLike`
- `FirstMatch`

## 5. Where each event fires

- `PageView`
  - Fires on React route changes in `frontend/src/App.jsx`

- `LandingCTA`
  - Fires when the landing-page CTA is clicked in `frontend/src/pages/LandingNoumatchHaiti.jsx`

- `RegistrationStarted`
  - Fires on the first real registration progression attempt in `frontend/src/pages/Register.jsx`

- `CompleteRegistration`
  - Fires only after `POST /api/users/register/` returns success in `frontend/src/pages/Register.jsx`

- `OTPVerified`
  - Fires only after `POST /api/users/verify-otp/` succeeds in `frontend/src/pages/VerifyOtp.jsx`

- `ProfileCompleted`
  - Fires when the user is discovery-ready:
    - verified signup funnel state exists
    - profile photo exists
    - bio exists
    - no active bio/photo review block
  - Checked in `frontend/src/pages/Dashboard.jsx`
  - Also checked after profile save in `frontend/src/pages/Profile.jsx`

- `FirstLike`
  - Fires on the first successful like in:
    - `frontend/src/pages/Dashboard.jsx`
    - `frontend/src/pages/ProfileDetail.jsx`

- `FirstMatch`
  - Fires when the backend confirms a mutual match in:
    - `frontend/src/pages/Dashboard.jsx`
    - `frontend/src/pages/ProfileDetail.jsx`

## 6. Attribution tracking

Captured and preserved fields:

- `signup_source`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`
- `landing_page`

Behavior:

- Query params are captured from landing visits and route transitions
- Attribution is stored in both `localStorage` and `sessionStorage`
- Attribution is attached to the registration request
- Backend persistence is optional-safe and does not break existing registration

Backend fields were added to:

- `users.User`
- `users.PendingRegistration`

## 7. How to test Meta Pixel

1. Add a real test Pixel ID in `frontend/.env` or `frontend/.env.staging`.
2. Start the frontend in the matching mode.
3. Open `/rencontre-haiti?utm_source=facebook&utm_medium=paid_social&utm_campaign=test-campaign`.
4. Open Meta Pixel Helper in Chrome.
5. Confirm `PageView` fires on the landing page.
6. Click `Créer mon profil gratuitement`.
7. Confirm `LandingCTA` fires.
8. Complete registration step progression and submit.
9. Confirm `RegistrationStarted` and `CompleteRegistration` fire.
10. Verify OTP successfully.
11. Confirm `OTPVerified` fires.
12. Complete profile readiness and enter discovery.
13. Confirm `ProfileCompleted` fires once.
14. Send the first successful like.
15. Confirm `FirstLike` fires once.
16. Trigger the first confirmed mutual match.
17. Confirm `FirstMatch` fires once.

## 8. How to use Meta Pixel Helper

- Install the [Meta Pixel Helper](https://chromewebstore.google.com/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc) extension in Chrome.
- Visit the landing page and registration flow.
- Click the extension icon on each step.
- Verify event names match the expected list above.
- Inspect warnings for duplicate PageViews or missing Pixel initialization.

## 9. Facebook Ads Manager setup

Recommended campaign structure:

- Objective: `Sales`
- Conversion location: `Website`
- Initial optimization event: `CompleteRegistration`
- Later optimization event: `ProfileCompleted`
- Do not use message campaigns
- Do not use traffic-only campaigns

Recommended ad/account structure:

- Campaign 1: Broad acquisition Haiti
- Campaign 2: Creative testing Haiti
- Ad set split ideas:
  - Women 18-34
  - Men 18-34
  - Retarget landing visitors
- Always send ads to `/rencontre-haiti`

Recommended URL pattern:

```text
https://noumatch.com/rencontre-haiti?utm_source=facebook&utm_medium=paid_social&utm_campaign=haiti-launch&utm_content=video-1
```

## 10. Testing checklist

- Landing page `PageView` fires
- Landing CTA fires `LandingCTA`
- Registration flow fires `RegistrationStarted`
- Successful pending registration fires `CompleteRegistration`
- Successful OTP fires `OTPVerified`
- Discovery-ready user fires `ProfileCompleted`
- First successful like fires `FirstLike`
- First confirmed match fires `FirstMatch`
- React route changes fire `PageView` without obvious duplicates
- Missing Pixel ID causes no crash and no console errors
- UTM params persist through registration
- Registration request includes attribution fields
- Landing page is mobile responsive
- No console errors across landing, register, OTP, dashboard, and profile pages

## 11. Security and privacy guardrails

Never send to Meta:

- Passwords
- OTP codes
- Messages
- Phone numbers
- Exact birthdates
- Private profile details

This implementation only sends safe funnel metadata such as:

- Event name
- Route context
- UTM attribution
- Registration step

## 12. Manual setup still required in Meta Business Suite

You still need to do these steps manually:

1. Create the Pixel in Meta Events Manager.
2. Copy the Pixel ID into the frontend environment for each environment.
3. Confirm the correct domain is added and verified.
4. Configure Aggregated Event Measurement if required for your domain.
5. Set `CompleteRegistration` as the first optimization event.
6. Later switch optimization to `ProfileCompleted` once volume is healthy.
7. Publish ads with real UTM-tagged landing URLs.
