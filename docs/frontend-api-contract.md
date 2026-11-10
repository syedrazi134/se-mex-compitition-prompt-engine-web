# Web frontend API contract

The web app is being developed independently of the in-progress backend. This is the frontend-facing contract it expects; backend routes and response shapes should be aligned to this document or adjusted here before integration.

## Connection and authentication

- Browser API base URL: `NEXT_PUBLIC_API_BASE_URL`, default `http://localhost:3000/api/v1`.
- Server-side auth proxy target: `API_BASE_URL`, defaulting to the browser API base URL.
- Add the web origin (local default `http://localhost:3001`) to the backend CORS allow-list.
- Public listing requests are anonymous. Protected requests use `Authorization: Bearer <accessToken>`.
- The Next.js same-origin `POST /api/auth/session` proxy forwards login, registration, refresh and logout to the API. It stores the rotating refresh token in an HTTP-only, same-site cookie and returns only the access token and user to browser code.
- Authentication endpoints return `{ tokenType, accessToken, expiresIn, refreshToken, refreshTokenExpiresAt, user }`. The proxy removes `refreshToken` from its browser response.
- Error responses use `{ error: { code, message, details? } }`; non-2xx statuses are surfaced in the UI.

## Endpoints used by the first web slice

### Public marketplace

`GET /listings?limit=24&cursor=<cursor>&q=<query>&category=<image|video|text>&sort=<trending|newest|top-rated|price-low-to-high>`

```json
{
  "items": [
    {
      "id": "listing-id",
      "title": "Golden Hour Street Portrait — 12 variations",
      "category": "image",
      "coverImage": "https://cdn.example.com/sample.jpg",
      "priceMinor": 699,
      "currency": "USD",
      "rating": 4.9,
      "reviewCount": 312,
      "creator": {
        "id": "creator-id",
        "handle": "lensbyayesha",
        "displayName": "Ayesha Siddiqui",
        "avatarUrl": "https://cdn.example.com/avatar.jpg",
        "verified": true,
        "followers": 128000
      },
      "tools": ["Midjourney", "Flux", "Runway"],
      "badge": "Bestseller",
      "sampleCount": 12
    }
  ],
  "nextCursor": null,
  "total": 1284
}
```

List and search results must never include prompt bodies or private generation fields.

`GET /creators/featured` returns `{ "items": [CreatorSummary] }`.

`GET /creators/:handle` returns `CreatorStorefrontData`: `{ creator, coverImage, bio, socialLinks, listings, bundle, subscriptionPriceMinor }`. `socialLinks` is an array of `{ platform, url }`; `bundle` contains `title`, `promptCount`, `priceMinor`, and `savingsPercent`. `subscriptionPriceMinor` is either a price in minor currency units or `null`. Listings use the public `ListingCard` shape and must not contain prompt bodies.

`GET /listings/:listingId` returns a `ListingCard` plus `description`, `gallery` (`imageUrl`, `tool`, `kind`), `licenses` (`type`, `priceMinor`, `currency`), a body-free `lockedPreview` (`label`, `placeholder`), `included`, and public `reviews`. Do not include prompt text in this response.

### Account and buyer library

- `POST /auth/register` accepts `{ email, password, name }`.
- `POST /auth/login` accepts `{ email, password }`.
- `POST /auth/refresh` accepts `{ refreshToken }`; it rotates and returns a fresh auth token response.
- `POST /auth/logout` accepts `{ refreshToken }` and revokes its token family.
- `GET /entitlements` requires a bearer token and returns `{ "items": [LibraryItem] }`. Each `LibraryItem` includes `id`, `listingId`, `promptId`, `title`, `category`, `coverImage`, `creator`, `purchasedAt`, `license`, `version`, `promptFields` (`label`, `value`), `variables`, and `tools`. Prompt fields are returned only to an authenticated owner with an active entitlement.
- `POST /checkout` requires authentication and an `Idempotency-Key` header. It accepts `{ items: [{ listingId, license }], paymentMethod, promoCode? }`, validates any promotion and prices from server-side listing data, and returns `{ checkoutUrl }` for a hosted payment flow. The browser's displayed total is an estimate, never authoritative.
- `POST /generations` requires authentication and an active entitlement. It accepts `{ promptId, tool, variables, settings }` and returns `{ id, status }` once the generation job has been queued.

### Creator dashboard and listing draft

- `GET /creator/stats` requires creator access and returns `CreatorDashboardData`: views, conversionRate, sales, earningsMinor, currency, followers, earningsSeries, topListings, and traffic.
- `POST /creator/profile` requires authentication. It accepts `{ handle, displayName, bio, agreementAccepted: true }` and returns `{ handle, status }`. Enforce handle uniqueness, creator eligibility, and moderation rules server-side.
- `POST /creator/listings` requires creator access. It accepts `{ title, category, description, priceMinor, currency, tools, tags }` and returns a listing draft. Server-side validation and moderation status remain authoritative.
- Media uploads, bundle checkout, follow/subscription actions, payout methods, payout requests, and listing submission for review are intentionally not called until their backend contracts exist.

The Next.js Image component allows the Unsplash demo host by default. Add any HTTPS media/CDN hosts returned by the backend to `MEDIA_IMAGE_HOSTS` (comma-separated, hostnames only) in the web app environment.

## Preview mode

`NEXT_PUBLIC_DEMO_MODE=true` selects local, clearly labelled sample data for marketplace, library, creator analytics, and the sample creator storefront. Creator onboarding remains a non-submitting preview in this mode. It does not claim that a payment, generation, account, or listing was created. Set it to `false` to use the API exclusively; API failures are shown as errors rather than replaced with fixture data.
