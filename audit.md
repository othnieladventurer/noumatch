# NouMatch — SEO & GEO Audit
**Date:** 2026-05-13  
**Scope:** noumatch.com (production) + codebase  
**Stack:** Vite + React 18 SPA, Django API, Netlify/static hosting

---

## Executive Summary

NouMatch has solid fundamentals — robots.txt, sitemap, OG tags, GA4/Pixel tracking — but is being held back by **five critical bugs** that actively hurt crawlability and rankings. The most damaging: every page on the site has an identical title, description, and canonical URL pointing to the homepage, which tells Google all pages are duplicate content. The Haiti landing page returns a 404 on the live site. And `<html lang="en">` is set despite the entire site being in French. Fixing these five issues alone will have the highest SEO impact before anything else.

---

## Scorecard

| Category | Score | Status |
|---|---|---|
| Technical crawlability | 3/10 | Critical bugs active |
| On-page meta / titles | 2/10 | Same meta on all pages |
| Structured data (JSON-LD) | 0/10 | None implemented |
| Geographic signals | 2/10 | Haiti page 404s, no hreflang |
| Content quality | 6/10 | Good copy, weak keyword targeting |
| Link & sitemap | 5/10 | Sitemap exists, missing routes |
| GEO (AI search) | 1/10 | No entity definition, no FAQ schema |
| Analytics | 8/10 | GA4 + Pixel properly wired |

---

## CRITICAL — Fix These First (P0)

### C1. `<html lang="en">` but site is entirely in French
**File:** [frontend/index.html](frontend/index.html#L2)  
**Impact:** Google uses the `lang` attribute as a primary language signal. Telling crawlers the site is English while all content is French is a direct ranking penalty for French-language searches.  
**Fix:**
```html
<!-- Change this: -->
<html lang="en">
<!-- To this: -->
<html lang="fr">
```

---

### C2. Canonical tag hardcoded to homepage on EVERY page
**File:** [frontend/index.html](frontend/index.html#L26)  
```html
<link rel="canonical" href="https://noumatch.com/" />
```
**Impact:** This tells Google that `/waitlist`, `/register`, `/rencontre-haiti`, and every other route are all duplicates of the homepage. Google will consolidate all ranking signals into the homepage and effectively de-index the other pages. This is one of the most damaging SEO configurations possible.  
**Fix:** Remove the static canonical from `index.html`. Implement it dynamically per-route using `react-helmet-async` (see P1 fix below). Each page must declare its own canonical.

---

### C3. Every page shares the same title and meta description
**File:** [frontend/index.html](frontend/index.html#L20-L24)  
All routes — homepage, waitlist, register, Haiti landing — serve:
- **Title:** `Site de rencontres authentiques et sincères`
- **Description:** `NouMatch est un espace de rencontres...`

This is confirmed live: fetching `/waitlist` and `/register` both returned the exact same title as the homepage. Google sees duplicate content across all pages.  
**Fix:** Install `react-helmet-async` and add a unique `<title>` and `<meta name="description">` to every public page component. Example for `/waitlist`:
```jsx
<Helmet>
  <title>Liste d'attente – NouMatch</title>
  <meta name="description" content="Inscris-toi sur liste d'attente NouMatch et sois parmi les premiers à accéder à l'application de rencontres authentiques." />
  <link rel="canonical" href="https://noumatch.com/waitlist" />
</Helmet>
```

---

### C4. Brand name missing from the page title
**File:** [frontend/index.html](frontend/index.html#L20)  
```html
<title>Site de rencontres authentiques et sincères</title>
```
The OG title includes "NouMatch" but the actual `<title>` tag — what appears in Google search results — does not. This hurts brand recognition in SERPs and breaks the pattern Google uses for brand queries.  
**Fix:**
```html
<title>NouMatch – Site de rencontres authentiques et sincères</title>
```
Pattern for all pages: `[Page Keyword] – NouMatch`

---

### C5. `/rencontre-haiti` returns HTTP 404 on the live site
**Verified:** Live fetch of `https://noumatch.com/rencontre-haiti` → 404.  
The route exists in the React app ([frontend/src/App.jsx](frontend/src/App.jsx#L36)) but is not being served by the static host. The pre-built route generator script may not include it, or the path is different from what's deployed.  
**Impact:** Your geo-targeted Haiti landing page — which has the best local SEO content on the site — is completely invisible to Google.  
**Fix:**
1. Check [frontend/scripts/generate-spa-route-files.mjs](frontend/scripts/generate-spa-route-files.mjs) — add `/rencontre-haiti` to the routes list.
2. Rebuild and redeploy.
3. Add to sitemap after confirming it's live.

---

## HIGH PRIORITY (P1)

### H1. No JSON-LD structured data anywhere
**Impact:** Google uses structured data to power rich results (FAQ accordions, sitelinks, knowledge panels). AI search engines (Perplexity, ChatGPT Search, Google AI Overview) rely on JSON-LD entity definitions to cite and surface your site. You have zero structured data.

**Add to `index.html` or inject per-page via Helmet:**

**Organization schema (homepage):**
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "NouMatch",
  "url": "https://noumatch.com",
  "logo": "https://noumatch.com/noumatch-logo.png",
  "description": "NouMatch est une application de rencontres moderne pour des connexions authentiques.",
  "sameAs": []
}
```

**WebSite schema with SearchAction (homepage):**
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "NouMatch",
  "url": "https://noumatch.com"
}
```

**FAQPage schema (inject on Home page component):**
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Comment fonctionne NouMatch ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "NouMatch vous permet d'accéder facilement à un tableau de profils..."
      }
    }
  ]
}
```
This is the highest-value schema fix — FAQ rich results appear directly in SERPs and AI overviews.

---

### H2. Haiti landing page has no meta description or OG update
**File:** [frontend/src/pages/LandingNoumatchHaiti.jsx](frontend/src/pages/LandingNoumatchHaiti.jsx#L140-L142)  
The page only does:
```js
document.title = "Site de rencontres en Haïti | NouMatch";
```
No `meta[name="description"]` update, no canonical update, no OG tag update, and this runs via `useEffect` — meaning Google may not see it at all since it runs after JS hydration.  
**Fix:** Use `react-helmet-async`:
```jsx
<Helmet>
  <title>Site de rencontres en Haïti | NouMatch</title>
  <meta name="description" content="NouMatch – L'application de rencontres pensée pour Haïti. Profils vérifiés, messagerie après match, communauté active. Crée ton profil gratuitement." />
  <link rel="canonical" href="https://noumatch.com/rencontre-haiti" />
  <meta property="og:title" content="Site de rencontres en Haïti | NouMatch" />
  <meta property="og:description" content="NouMatch – L'application de rencontres pensée pour Haïti." />
</Helmet>
```

---

### H3. Sitemap missing the Haiti landing page + no `<lastmod>` dates
**File:** [frontend/public/sitemap.xml](frontend/public/sitemap.xml)  
- `/rencontre-haiti` is not listed — Google won't discover this page organically.
- No `<lastmod>` dates on any URL — Google uses these to prioritize re-crawling.

**Add this entry (after fixing C5):**
```xml
<url>
  <loc>https://noumatch.com/rencontre-haiti</loc>
  <lastmod>2026-05-13</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
</url>
```
Also add `<lastmod>` to all existing entries.

---

### H4. No hreflang for geographic/language targeting
You serve French content (`lang="en"` is a bug per C1, but content is French) and have a page targeting Haiti specifically. Without hreflang, Google cannot distinguish your France vs. Haiti vs. general French-speaking audience targeting.  
**Add to `<head>` on the Haiti landing page:**
```html
<link rel="alternate" hreflang="fr-HT" href="https://noumatch.com/rencontre-haiti" />
<link rel="alternate" hreflang="fr" href="https://noumatch.com/" />
<link rel="alternate" hreflang="x-default" href="https://noumatch.com/" />
```

---

### H5. CSP `script-src 'self'` may be blocking Google Analytics and Meta Pixel
**File:** [frontend/index.html](frontend/index.html#L16)  
```
script-src 'self'
```
Google Analytics loads from `https://www.googletagmanager.com` and Meta Pixel from `https://connect.facebook.net`. Both are external origins blocked by `script-src 'self'`. If your analytics scripts are loaded dynamically by inline JS they would also be blocked.  
**Impact:** Silent analytics loss + potential CSP violations visible in browser console.  
**Fix:** Expand `script-src` to allow analytics:
```
script-src 'self' https://www.googletagmanager.com https://connect.facebook.net https://www.google-analytics.com
```
Verify in browser DevTools → Console → look for `Refused to load script` errors.

---

## MEDIUM PRIORITY (P2)

### M1. H2 heading "FAQ" is a keyword dead zone
**File:** [frontend/src/components/Faq.jsx](frontend/src/components/Faq.jsx#L51)  
```jsx
<h2>FAQ</h2>
```
Heading tags are significant on-page SEO signals. "FAQ" has no search value. Use a keyword-rich heading:
```jsx
<h2>Questions fréquentes sur NouMatch</h2>
```

---

### M2. H1 on homepage lacks brand keyword in the tag
**File:** [frontend/src/pages/Home.jsx](frontend/src/pages/Home.jsx#L59-L63)  
```jsx
<h1>Des rencontres<br /><span>vraies.</span> Pour<br />des gens vrais.</h1>
```
The H1 is poetic but contains zero keywords that people search for. Consider a variant that works both emotionally AND for crawlers:
```jsx
<h1>NouMatch — Des rencontres authentiques<br />pour des gens vrais.</h1>
```

---

### M3. External Pexels images in the Haiti page are not crawl-optimized
**File:** [frontend/src/pages/LandingNoumatchHaiti.jsx](frontend/src/pages/LandingNoumatchHaiti.jsx#L13-L36)  
Images served from `images.pexels.com` cannot be included in your XML image sitemap. More importantly, Google's image search can't associate them with your domain. Consider downloading and hosting key images locally in `/public/` or a CDN under `noumatch.com`.

---

### M4. OG image URL needs to be verified and sized
**File:** [frontend/index.html](frontend/index.html#L36)  
```html
<meta property="og:image" content="https://noumatch.com/main_img.png" />
```
Verify `main_img.png` exists and is 1200×630px. Use the [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) to confirm it renders correctly. An improperly sized or missing OG image kills click-through rates from social shares.

---

### M5. Waitlist pages missing meta descriptions
`/waitlist/women` and `/waitlist/men` are in the sitemap with priority 0.8 but share the homepage meta. These pages need unique meta if they're indexed.

---

### M6. No breadcrumb schema on inner pages
Add `BreadcrumbList` JSON-LD to pages like `/waitlist`, `/register`, `/rencontre-haiti`:
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://noumatch.com/" },
    { "@type": "ListItem", "position": 2, "name": "Liste d'attente", "item": "https://noumatch.com/waitlist" }
  ]
}
```

---

## LOW PRIORITY (P3)

### L1. Minor copy error in CTA
**File:** [frontend/src/pages/Home.jsx](frontend/src/pages/Home.jsx#L161)  
```jsx
<Link>Engage la conversation</Link>
```
Should be `"Engage**r** la conversation"` (infinitive form in French).

### L2. No `<meta name="twitter:site">` tag
Add `<meta name="twitter:site" content="@noumatch">` if you have a Twitter/X handle.

### L3. No PWA manifest
A `manifest.json` improves mobile browser behavior and signals to Google that you have a progressive web app — relevant for a dating app. Consider adding one.

### L4. Font CSS is render-blocking
```html
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans..." rel="stylesheet" />
```
Use `rel="preload"` + `onload` pattern to make font loading non-blocking:
```html
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" as="style" onload="this.onload=null;this.rel='stylesheet'" />
```

---

## GEO — Generative Engine Optimization (AI Search)

AI search engines (Google AI Overview, Perplexity, ChatGPT Search, Claude) use structured data, entity clarity, and E-E-A-T signals to decide whether to cite your site. Currently NouMatch has none of these signals.

### GEO-1. No entity definition — AI doesn't know what NouMatch is
AI engines need a clear entity definition to surface your brand confidently. The Organization JSON-LD from H1 above establishes this. Without it, you're invisible in AI-generated answers about dating apps.

### GEO-2. FAQ schema is the single highest-ROI GEO fix
The FAQ section you already have ([Faq.jsx](frontend/src/components/Faq.jsx)) is exactly what Google AI Overview and Perplexity pull for direct answers. Adding `FAQPage` JSON-LD makes your answers quotable. This is the difference between being cited vs. a competitor being cited when someone asks "comment fonctionne un site de rencontres en Haïti."

### GEO-3. No About/Team page — zero E-E-A-T
AI engines weight Experience, Expertise, Authoritativeness, and Trust heavily for YMYL (Your Money or Your Life) topics, which includes dating/relationships. An About page with:
- Founding story
- Team bios or mission statement
- Contact information
- Physical or virtual location

...dramatically improves your GEO standing.

### GEO-4. Haiti content is GEO gold — but it's 404
The `/rencontre-haiti` page is your strongest GEO asset. It has contextual local copy, Haitian-specific alt texts, geo-targeted headlines, and a local audience focus. When someone asks an AI "meilleure app de rencontres en Haïti", you WANT this page to be indexable and citable. Fixing C5 unlocks this potential.

### GEO-5. No location or region meta tags
Add geographic meta tags for the Haiti page:
```html
<meta name="geo.region" content="HT" />
<meta name="geo.placename" content="Haïti" />
<meta name="ICBM" content="18.9712, -72.2852" />
```

### GEO-6. Social proof is thin for AI citation
AI engines prefer sites that have reviews, testimonials with names, or social proof they can quote. The testimonials carousel ([TestimonialsCarousel component](frontend/src/components/TestimonialsCarousel.jsx)) should be backed by `Review` JSON-LD. Even 2-3 structured testimonials make you citable.

---

## Strong Spots — What's Working

| Signal | Why It's Good |
|---|---|
| `robots.txt` | Well-configured, blocks all private routes, references sitemap |
| Sitemap exists | 7 URLs, proper priorities, linked from robots.txt |
| OG + Twitter Cards | Configured with image, title, description |
| GA4 + Meta Pixel | Properly initialized, event tracking through full funnel |
| Attribution / UTM | Best-in-class for a dating app — captures source, medium, campaign, maps to signup |
| Image alt texts | Descriptive, in French, contextual (`"Personnes en conversation dans un café"`) |
| Heading hierarchy | H1 → H2 → H3 properly nested |
| HTTPS + CSP | Security headers in place |
| Haiti landing content | Strong geo-targeted copy, local alt texts, Haitian-specific imagery |
| Font preconnect | `rel="preconnect"` for Google Fonts reduces DNS latency |
| Lazy loading | Haiti images use `loading="lazy"` and `fetchPriority="high"` on hero |
| FAQ section | Exists and has good content — just needs JSON-LD to be SEO-activated |
| Multi-CTA funnel | Multiple conversion points throughout the page |
| Email verification | Trust signal that improves user quality and can be highlighted in content |

---

## Priority Fix Checklist

### Week 1 — Critical (stop the bleeding)
- [ ] `<html lang="fr">` in [index.html:2](frontend/index.html#L2)
- [ ] Remove static `<link rel="canonical">` from index.html
- [ ] Add `react-helmet-async` to frontend dependencies
- [ ] Fix `<title>` to include brand: `NouMatch – Site de rencontres authentiques et sincères`
- [ ] Fix `/rencontre-haiti` 404 — add to route pre-builder and redeploy
- [ ] Verify CSP isn't blocking GA/Pixel scripts (check browser console)

### Week 2 — High Impact
- [ ] Add `react-helmet-async` `<Helmet>` with unique title, description, canonical to: Home, Waitlist, Register, LandingNoumatchHaiti, Privacy, Terms
- [ ] Add `FAQPage` JSON-LD to Home page
- [ ] Add `Organization` + `WebSite` JSON-LD to Home page
- [ ] Add `/rencontre-haiti` to sitemap with lastmod
- [ ] Add `<lastmod>` to all sitemap entries
- [ ] Add hreflang tags to Haiti landing page

### Week 3 — GEO & Polish
- [ ] Fix H2 "FAQ" → "Questions fréquentes sur NouMatch"
- [ ] Add `BreadcrumbList` JSON-LD to Waitlist and Register pages
- [ ] Add `geo.region` meta tags to Haiti page
- [ ] Add Organization JSON-LD with `sameAs` social profiles
- [ ] Consider an About page for E-E-A-T signals
- [ ] Verify OG image dimensions (1200×630px)
- [ ] Fix CTA copy: "Engage**r** la conversation"
- [ ] Add `meta name="twitter:site"` tag

---

## Implementation Notes

### Installing react-helmet-async
```bash
npm install react-helmet-async
```

Wrap your app in `frontend/src/main.jsx`:
```jsx
import { HelmetProvider } from 'react-helmet-async';

<HelmetProvider>
  <App />
</HelmetProvider>
```

Then in each page component:
```jsx
import { Helmet } from 'react-helmet-async';

// Inside the component:
<Helmet>
  <title>Page Title – NouMatch</title>
  <meta name="description" content="..." />
  <link rel="canonical" href="https://noumatch.com/page-path" />
</Helmet>
```

### Per-page meta targets

| Route | Title | Description |
|---|---|---|
| `/` | NouMatch – Site de rencontres authentiques et sincères | NouMatch est une application de rencontres moderne pour des connexions sincères et équilibrées. |
| `/waitlist` | Rejoindre la liste d'attente – NouMatch | Sois parmi les premiers à accéder à NouMatch. Inscris-toi gratuitement sur liste d'attente. |
| `/waitlist/women` | Liste d'attente femmes – NouMatch | Crée ton profil NouMatch et retrouve des personnes sérieuses dans une communauté équilibrée. |
| `/waitlist/men` | Liste d'attente hommes – NouMatch | Rejoins NouMatch et rencontre des personnes authentiques près de chez toi. |
| `/register` | Créer mon compte – NouMatch | Inscris-toi sur NouMatch et commence à rencontrer des personnes vraies dès aujourd'hui. |
| `/rencontre-haiti` | Site de rencontres en Haïti | NouMatch Haïti — Rencontres authentiques avec profils vérifiés, messagerie après match. Rejoins gratuitement. |
| `/privacy` | Politique de confidentialité – NouMatch | Comment NouMatch protège vos données personnelles et respecte votre vie privée. |
| `/terms` | Conditions d'utilisation – NouMatch | Consultez les conditions générales d'utilisation de la plateforme NouMatch. |
