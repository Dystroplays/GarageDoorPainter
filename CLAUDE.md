# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

---

## Commands

All commands run from `c:\Projects\garagedoorpainter\web\` (the Next.js root).

```bash
npm run dev        # start dev server on localhost:3000
npm run build      # production build (Turbopack) — run this to verify before shipping
npx tsc --noEmit   # type-check without emitting files
npm run lint       # ESLint
```

No test suite exists. Verify correctness by running the dev server and exercising the flows manually.

---

## Stack Versions — Breaking Changes to Know

| Package | Version | Key difference |
|---------|---------|----------------|
| Next.js | 16.2.6 | App Router only; all API routes need `export const dynamic = 'force-dynamic'` |
| Tailwind CSS | v4 | No `tailwind.config.ts`; theme tokens live in `@theme {}` in `globals.css`; import is `@import "tailwindcss"` |
| Zod | v4.4.3 | Use `.issues` not `.errors` on `ZodError` |
| square | v44.1.0 | Never instantiate `SquareClient` at module level — use the `getSquare()` factory. Monetary amounts must be `BigInt` cents. `BigInt` is not JSON-serializable; convert with `Number()` before returning from API routes. |
| react-day-picker | v10.0.1 | `fromDate` prop removed; use `disabled` prop for date constraints |

---

## Architecture

### Two-URL structure
- **`/`** — Landing page: server-rendered sections (Hero, SocialProof, HowItWorks, Gallery, About, Footer) + `LandingLeadCapture` (inline lead form that redirects to `/quote`)
- **`/quote`** — Full conversion funnel: VSL → visualizer → configurator → scheduler → checkout → confirmation (all steps on one page, no URL changes)

### Funnel state machine (`components/funnel/QuoteFunnelWrapper.tsx`)
```
"lead" → "configure" → "schedule" → "checkout" → "confirmed"
```
State held in `QuoteFunnelWrapper`: `lead`, `doors[]`, `schedule`, `booking`, `quoteBookingId`. Key transition: a Quote booking is created in Airtable at the end of the configure step (non-blocking); that booking is converted to Scheduled when the date is picked.

### Operational portals
- **`/painter`** — Mobile-first painter app. Auth via `?token=TOKEN` query param (token stored in Painters table). Shows job list → job detail → photo upload → start/complete timer.
- **`/admin`** — Admin dashboard. Auth via `ADMIN_PASSWORD` env var + `httpOnly` session cookie (`bolt_admin_session`). Shows active jobs; set SW order number, reschedule, cancel.

### API routes (`app/api/`) — call order during a customer session
1. `POST /api/lead` — upsert Airtable Contact (Status=Lead)
2. `GET /api/schedule?days=N` — available start dates (skips Sundays, blocked dates, already-booked ranges)
3. `POST /api/quote` — create Quote booking (Status="Quote", no dates); returns `bookingId`
4. `PATCH /api/booking` — convert Quote → Scheduled; creates Paint Orders; assigns painter
5. `POST /api/booking` — fallback: create Scheduled booking directly if quote step was skipped
6. `POST /api/payment/create-payment` — client sends Square nonce → server creates Square Customer, vaults card, charges 50% deposit, stores IDs in Airtable
7. `POST /api/payment/webhook` — Square event handler; verifies `x-square-hmacsha256-signature`

Painter job-day routes:
- `GET /api/painter/jobs?token=X` — validate token; return assigned jobs with all door/color fields
- `POST /api/painter/upload` — multipart image → Vercel Blob → returns public URL
- `POST /api/painter/start` — set Job Start Time, Status=In Progress, save before photo URLs
- `POST /api/painter/complete` — charge Square balance, send customer email+SMS, Status=Completed, save after photo URLs

Admin action routes (all require `bolt_admin_session` cookie):
- `GET /api/admin/jobs` — active bookings (Scheduled + In Progress)
- `POST /api/admin/login` / `DELETE /api/admin/login` — set/clear session cookie
- `POST /api/admin/set-order-number` — update SW Order Number field; SMS painter
- `POST /api/admin/reschedule` — update dates; SMS painter + customer
- `POST /api/admin/cancel` — Status=Cancelled; refund deposit if paid; SMS both

Legacy: `POST /api/complete` — simple V1 painter endpoint (shared `PAINTER_SECRET_TOKEN`); charges balance card.

### Data layer (`lib/`)
- **`airtable.ts`** — plain `fetch` against Airtable REST API (no npm package). Lazy; nothing runs at module load. Base ID from `AIRTABLE_BASE_ID` env var.
- **`square.ts`** — factory `getSquare()` + `createSquareCustomerAndChargeDeposit()`, `chargeSquareBalanceOnFile()`, `refundSquareDeposit()`. Never module-level.
- **`pricing.ts`** — pure functions, no side effects. All monetary values are whole dollars. Primer triggers when `currentTone === "dark" && selectedColor.lrv > 50` (+$99/door).
- **`colors.ts`** — helpers over `data/sw-colors.json` (211 SW colors). Exports `getPopularColors()`, `getAllColors()`, `getColorsByFamily()`, `searchColors()`.
- **`email.ts`** — transactional emails via Resend: `sendBookingConfirmation()`, `sendJobCompletion()`. Fire-and-forget; errors logged, never thrown.
- **`twilio.ts`** — `sendSMS(to, body)` via Twilio REST API (no npm package). Fire-and-forget; silently skips if env vars not set.
- **`adminAuth.ts`** — `requireAdminAuth()`: reads `bolt_admin_session` cookie, returns 401 Response or null.
- **`pixel.ts`** — Facebook Pixel event wrappers; `"use client"` only.

### Airtable base (`appHkLpQLdwjLfAdo`)
Four tables: **Contacts**, **Bookings**, **Painters**, **Paint Orders**.

Key Bookings fields the app reads/writes by exact string name:
- Created at booking: `Name`, `Contact`, `Contact Email`, `Door N Size/Color SW Code/Color Name/Primer` (N=1–5), `Subtotal`, `Discount`, `Primer Charges`, `Deposit Paid`, `Balance Charged`, `Scheduled Start`, `Scheduled End`, `Assigned Painter`, `Status`, `Notes`
- Written by create-payment: `Square Customer ID`, `Square Deposit Payment ID`, `Square Card ID`, `Deposit Paid`
- Written by painter start/complete: `Job Start Time`, `Before Photos`, `After Photos`, `Painter Notes`, `Status`
- Written by admin: `SW Order Number`, `Scheduled Start`, `Scheduled End`, `Status`
- Written by webhook/complete: `Balance Charged`, `Square Balance Payment ID`, `Status`
- Formula fields (read-only): `Total`, `Deposit Amount`, `Balance Remaining`, `Elapsed Hours`
- Scheduling reads: `Scheduled Start`, `Scheduled End`, `Blocked`

Status lifecycle: `Quote` → `Scheduled` → `In Progress` → `Completed` (or `Cancelled` from any state)

Painters table fields used: `Name`, `Phone`, `Painter Token`

### Pricing matrix
- Single door: $799 | Double door: $899
- 2-door bundles: $1,395–$1,595 (exact combos, not additive)
- 3–5 doors: volume per-door discounts ($100–$150/door off)
- 6+ doors: `customQuote = true` flag; no auto pricing
- Primer: +$99/door when going dark→light (LRV > 50)
- Deposit: 50% | Balance: 50% due on completion

### Color data
- `data/sw-colors.json` — 211 SW exterior colors; schema: `{ sw_code, name, hex, lrv, family, popular? }`
- `data/sw-colors-curated.json` — 22-color curated subset (legacy; mostly superseded by `popular` flag)
- LRV (0–100): light reflectance value used by primer logic and AI visualization prompt

### AI visualization (`app/api/visualize/route.ts`)
Uses Replicate (`timothybrooks/instruct-pix2pix` model). Prompt uses RGB values + saturation/lightness descriptors — **not** color names or hex strings — to avoid the SD model mapping muted SW colors to vivid training-data equivalents.

### Brand tokens
Defined in `globals.css` `@theme {}` block:
- `bg-bolt-black` / `text-bolt-black` → `#000000`
- `bg-bolt-yellow` / `text-bolt-yellow` → `#fdb617`
- `bg-bolt-yellow-dark` → darker yellow for hover states
- Display font: Barlow Condensed (600/700/800), loaded as `--font-display`
- Body font: Inter, loaded as `--font-body`

---

## Environment Variables

```bash
# Airtable
AIRTABLE_API_KEY=
AIRTABLE_BASE_ID=appHkLpQLdwjLfAdo

# Square
SQUARE_ACCESS_TOKEN=
NEXT_PUBLIC_SQUARE_APP_ID=
NEXT_PUBLIC_SQUARE_LOCATION_ID=
SQUARE_WEBHOOK_SIGNATURE_KEY=
SQUARE_ENVIRONMENT=sandbox           # or production

# Email (Resend — domain must be verified)
RESEND_API_KEY=
EMAIL_FROM=                          # e.g. "Bolt Painting <booking@dfwgaragedoorpainter.com>"

# SMS (optional — silently skipped if unset)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=                  # E.164 format e.g. +18175551234

# Photo storage
BLOB_READ_WRITE_TOKEN=               # Vercel Blob

# Auth
ADMIN_PASSWORD=                      # /admin portal
PAINTER_SECRET_TOKEN=                # legacy /api/complete shared secret

# AI visualization (optional)
REPLICATE_API_TOKEN=
REPLICATE_MODEL=                     # owner/model:version_hash

# Analytics (optional — omit to disable)
NEXT_PUBLIC_FB_PIXEL_ID=
NEXT_PUBLIC_GA_MEASUREMENT_ID=       # G-XXXXXXXXXX

# App config
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_CONTACT_PHONE=
NEXT_PUBLIC_GOOGLE_REVIEW_URL=
NEXT_PUBLIC_NEW_DOOR_URL=            # garage door replacement quiz (opens new tab on VSL step)
```
