# Noumatch Premium Features

## Account Tiers

| Tier | Key Perks |
|---|---|
| **Free** | 20 swipes/day, no who-liked-you, basic filters |
| **Premium** | Unlimited swipes, all features below |
| **God Mode** | Internal/admin use, bypasses all limits |

---

## Already Wired (Finish These First)

### 1. See Who Liked You
- Free users see blurred cards in the Likes section
- Premium users see full profiles and can match directly
- Gate: `canSeeWhoLiked()` in `frontend/src/utils/accountAccess.js`
- **Todo:** Add paywall blur UI in `LikesSection.jsx` for free users

### 2. Unlimited Daily Swipes
- Free tier: cap at 20 likes/day
- Premium tier: no cap
- Gate: `DailySwipe` model already counts swipes in `api/interactions/models.py`
- **Todo:** Add limit check in the like/pass view and return a `429` with `upgrade_required: true` when hit

---

## High Impact — Lower Effort

### 3. Rewind / Undo Last Pass
**What:** Take back the most recent accidental pass or like.
**How:**
- Store last swipe in session or a `LastSwipe` model field on the user
- Endpoint: `DELETE /api/interactions/rewind/` — deletes the most recent `Pass` or `Like`
- Free users: 0 rewinds. Premium: unlimited
- Frontend: Rewind button in `CenterBlock.jsx` swipe controls

### 4. Super Like
**What:** When you super like someone, they receive a special notification that distinguishes it from a regular like.
**How:**
- Add `is_super_like` boolean field to the `Like` model
- Notification copy changes: "X super liked you!"
- Free users: 0/day. Premium: 5/day (track via `DailySwipe`-style model)
- Frontend: Star button alongside the existing like button

### 5. Profile Boost
**What:** Your profile is shown to more people for 30 minutes (bumped to front of the feed queue).
**How:**
- Add `boost_active_until` DateTimeField on `User` model
- Profile feed query prioritizes boosted users
- Free users: 0 boosts. Premium: 1 free boost/week, buy more as credits
- Frontend: Boost button in profile/dashboard with countdown timer

### 6. Read Receipts in Chat
**What:** See when the other person read your message.
**How:**
- Add `read_at` DateTimeField to the `Message` model
- Mark as read when the recipient opens the conversation
- Broadcast read status via existing WebSocket channel
- Frontend: Checkmark/eye icon under sent messages in `Conversation.jsx`

---

## Medium Effort — Strong Retention

### 7. Advanced Filters
**What:** Filter the discovery feed by height, career, education, and passions.
**How:**
- These fields already exist on the `User` model
- Add filter params to the profiles feed endpoint
- Free users: age + distance only. Premium: all fields
- Frontend: Filter panel/drawer in `CenterBlock.jsx`

### 8. Profile Visitors
**What:** See which profiles have viewed you recently.
**How:**
- New `ProfileView` model: `viewer`, `viewed`, `viewed_at`
- Log a view whenever someone opens a `ProfileDetail`
- Endpoint: `GET /api/users/visitors/` — returns last 30 visitors
- Premium only. Free users see count only ("12 people viewed you")

### 9. Incognito Mode
**What:** Browse profiles without showing up in anyone's visitor list and without contributing to impression analytics.
**How:**
- Add `incognito_active` boolean on `User` model (or session flag)
- Skip `ProfileView` logging when viewer is incognito
- Skip analytics impression tracking when incognito
- Toggle in profile/settings page

### 10. Message with Like
**What:** Attach a short note (140 chars max) when sending a like, so your match sees it before they even respond.
**How:**
- Add `message` TextField (nullable) to the `Like` model
- Display the note in the likes/match notification
- Premium only — free likes have no note
- Frontend: Optional text input in the like confirmation flow

---

## Consumable Add-Ons (One-Time Purchases)

These layer on top of the subscription and work for both free and premium users.

| Credit | Amount | Notes |
|---|---|---|
| **Boost Credits** | 1 / 3 / 5 pack | Each boost = 30 min of priority in the feed |
| **Super Like Credits** | 5 / 15 / 30 pack | Premium gets 5/month free, buy more anytime |
| **Passport** | Unlock per city or unlimited | Browse profiles from a different location — needs location filter on feed endpoint |

---

## Recommended Build Order

1. **Swipe limit paywall** — add `429` response to like/pass view, show upgrade modal on frontend
2. **See Who Liked You UI** — blur + upgrade CTA in `LikesSection.jsx`
3. **Rewind** — one new endpoint + frontend button
4. **Super Like** — `is_super_like` field on `Like` + notification copy
5. **Advanced Filters** — extend feed endpoint + filter UI
6. **Read Receipts** — `read_at` on `Message` + WebSocket broadcast
7. **Profile Boost** — `boost_active_until` on `User` + feed query priority
8. **Profile Visitors** — new `ProfileView` model + visitors page
9. **Incognito Mode** — flag on `User` + skip logging
10. **Message with Like** — `message` field on `Like` + note input UI

---

## Payment Integration (Future)

- Use **Stripe** for subscription billing (monthly/yearly Premium)
- Use **Stripe** one-time payments for credit packs
- Webhook: on `checkout.session.completed`, update `user.account_type` to `premium` and set `premium_expires_at`
- Add `premium_expires_at` DateTimeField to `User` model for expiry handling
