# Product Requirements Document (PRD)
## Bolt Painting — Garage Door Refresh

**Version:** 1.0  
**Author:** Blake (Bolt Painting) + Claude  
**Last Updated:** May 27, 2026  
**Status:** Draft — Pre-Development

---

## Table of Contents

1. Product Overview
2. Goals & Success Metrics
3. User Personas
4. Feature Requirements
   - 4.1 Landing Page & Funnel
   - 4.2 Door Configurator & Pricing Engine
   - 4.3 AI Visualization
   - 4.4 Sherwin-Williams Color Picker
   - 4.5 Scheduling System
   - 4.6 Checkout & Payment
   - 4.7 Abandonment Recovery
   - 4.8 Painter Operations View
   - 4.9 Post-Job Automation
   - 4.10 CRM & Data Layer
   - 4.11 Paint Order Management
5. Non-Functional Requirements
6. Technical Architecture
7. Third-Party Integrations
8. Data Privacy & Terms
9. Launch Plan
10. Open Questions & Risks

---

## 1. Product Overview

### What

A self-service web application that allows DFW homeowners to configure, visualize, price, and book a garage door repainting service — end to end — without speaking to anyone.

### Why

Metal garage doors in DFW subdivisions fade significantly after 5–7 years. Homeowners want a refresh but don't know where to start, and most painters don't productize this service. By creating a turnkey, product-style experience with transparent pricing, AI-powered color previews, and instant booking, Bolt Painting can capture this underserved niche at 60–70% gross margins with extremely low customer acquisition costs.

### Who

DFW homeowners in subdivisions with aging metal garage doors, acquired via geo-targeted Facebook ads and direct mail postcards.

---

## 2. Goals & Success Metrics

### Business Goals

| Goal | Target | Timeframe |
|------|--------|-----------|
| Average gross margin per job | ≥ 60% | Ongoing |
| Self-service booking rate (no phone call needed) | ≥ 70% | Within 3 months of launch |
| Customer acquisition cost | < $75 per booked job | Within 3 months |
| Jobs per week (single painter) | 4–6 | Steady state |
| Google review rate | ≥ 40% of completed jobs | Ongoing |

### Product Goals

| Goal | Metric |
|------|--------|
| Funnel completion rate (email capture → booking) | ≥ 15% |
| Abandonment email recovery rate | ≥ 5% of abandoned leads convert |
| Average time from page load to booking | < 10 minutes |
| Mobile conversion parity | Mobile booking rate within 10% of desktop |
| AI visualization usage | ≥ 60% of customers who reach Step 3 upload a photo |

---

## 3. User Personas

### Persona 1: The Homeowner (Primary Customer)

- **Name:** Sarah, 38
- **Location:** Wellington subdivision, Haslet, TX
- **Situation:** Noticed her garage doors are visibly faded compared to when they moved in 6 years ago. Wants to improve curb appeal before listing or just because it bothers her.
- **Behavior:** Sees a Facebook ad with a dramatic before/after, clicks through on her phone. Wants to know the price immediately. Will book if it's easy and the price feels fair.
- **Needs:** Transparent pricing, visual proof it'll look good, easy scheduling, minimal friction.
- **Objections:** "Is this legit?" "What if I don't like the color?" "Can I see what it'll look like first?"

### Persona 2: The Painter (Operational User)

- **Name:** Marcus, 32
- **Situation:** Subcontractor paid per door. Needs to know where to go, what paint to pick up, and what the doors look like before arriving.
- **Behavior:** Checks his phone in the morning, picks up paint at Sherwin-Williams, drives to the job site, tapes, primes (if needed), paints, takes photos, marks complete.
- **Needs:** Clear daily schedule, exact paint specs, store address, customer photos of doors, simple time tracking.

### Persona 3: Blake (Business Operator)

- **Situation:** Manages the business, reviews bookings, ensures paint orders are placed, monitors job costing and margins, handles edge cases.
- **Needs:** Dashboard view of all bookings and schedule, paint order pick lists, job costing data, margin reporting, review generation metrics.

---

## 4. Feature Requirements

---

### 4.1 Landing Page & Funnel

**Description:** A single-page React application hosted on Vercel. No traditional navigation — the user progresses through a guided funnel. Mobile-first design using Bolt Painting brand identity (Black #000000, Yellow #FDB617, Blair ITC Medium, Gotham Medium).

#### Page Structure (Top to Bottom)

| Section | Content | Purpose |
|---------|---------|---------|
| Hero | Bold headline + before/after photo + VSL video embed | Hook — stop the scroll |
| Social Proof | Star rating, review count, testimonial quotes | Build trust |
| How It Works | 3-step visual: Choose → Preview → Book | Reduce uncertainty |
| Before/After Gallery | 4–6 sliding before/after comparisons | Visual proof |
| About / Story | Blake's story, Bolt Painting history, years in business | Credibility |
| CTA Gate | "Get Your Custom Quote" — name + email capture | Lead capture (Step 1) |
| Configurator | Door selector + color picker + price calculator | Step 2 |
| AI Preview | Photo upload + visualization | Step 3 |
| Schedule | Calendar date picker | Step 4 |
| Checkout | Order summary + Stripe payment | Step 5 |
| Footer | Phone number, service area, Bolt Painting branding | Trust / contact |

#### User Stories

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| F-1 | As a homeowner, I want to watch a video explaining the service so I understand what I'm buying | VSL auto-plays (muted) on page load, click to unmute. Mobile-responsive. 3–5 min. |
| F-2 | As a homeowner, I want to see before/after examples so I believe the results are real | Before/after slider component, minimum 4 examples, touch-friendly on mobile |
| F-3 | As a homeowner, I want to enter my name and email to get a custom quote | Form gate before configurator. Validates email format. Stores to Airtable immediately. Fires Facebook Pixel lead event. |
| F-4 | As a homeowner, I want to call or text if I prefer | Phone number visible in header and footer, click-to-call on mobile. De-emphasized vs. self-service flow. |
| F-5 | As a homeowner on mobile, I want the full experience to work on my phone | All steps functional and optimized for 375px+ viewports. No horizontal scroll. Touch-friendly inputs. |

#### Technical Notes

- Facebook Pixel installed on page load (PageView event)
- Lead event fires on email capture
- Purchase event fires on completed booking
- All funnel steps are sections/routes within a single React SPA — no full page reloads
- Page speed target: < 2s LCP on mobile (optimize images, lazy-load VSL)

---

### 4.2 Door Configurator & Pricing Engine

**Description:** An interactive configurator that lets the customer define their door setup and see real-time pricing.

#### Configurator Flow

1. **"How many garage doors do you have?"** → Number selector (1–5, 6+ triggers custom quote)
2. **For each door:** "Is this a single-car door or a double-car door?" → Toggle per door
3. **For each door:** "What color is your door currently?" → Light / Dark toggle (drives primer logic)
4. **For each door:** "What color would you like?" → Sherwin-Williams color picker (see 4.4)
5. **Price display:** Live-updating total as selections change, with line items visible

#### Pricing Logic

**Base prices:**
- Single door: $799
- Double door: $899

**Multi-door discounts (applied to total, not per-door):**

| Total Doors | Pricing Rule |
|-------------|-------------|
| 1 | Full price |
| 2 | Use bundle price: 2S = $1,395 / S+D = $1,495 / 2D = $1,595 |
| 3 | Sum of individual prices minus $100/door ($300 total discount) |
| 4 | Sum of individual prices minus $125/door ($500 total discount) |
| 5 | Sum of individual prices minus $150/door ($750 total discount) |
| 6+ | "Contact us for custom pricing" — lead captured, routed to Blake |

**Primer logic:**
- If any door has Current Color = Dark AND Selected Color LRV > 50 → add $99 primer upcharge for that door
- Display: "Primer required for Door #X (going from dark to light) — $99"
- Make the reason clear to the customer so it doesn't feel like a hidden fee

#### User Stories

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| C-1 | As a homeowner, I want to select how many doors I have and their sizes | Selector supports 1–5 doors, each independently toggled single/double |
| C-2 | As a homeowner, I want to see the price update in real time | Price recalculates on every input change with smooth animation, shows line items |
| C-3 | As a homeowner, I want to understand why primer is extra | Primer line item includes explanatory text: "Your door is currently a dark color. Going to a lighter shade requires a coat of primer for proper coverage and durability." |
| C-4 | As a homeowner with 2+ doors, I want to see the discount | Show original price crossed out, discounted price, and savings amount |
| C-5 | As a homeowner with 6+ doors, I want to get a custom quote | Display message: "For 6 or more doors, we'll put together a custom package. Call or text Blake at [number]." Capture lead info. |

---

### 4.3 AI Visualization

**Description:** Customers upload a photo of their garage door and see a realistic preview of how it will look in their selected Sherwin-Williams color.

#### Technical Approach

**Pipeline:**
1. Customer uploads photo via file input or mobile camera
2. Image sent to backend processing service
3. Segmentation model (SAM, U-Net, or equivalent) generates a binary mask of the door surface
4. Mask excludes: hardware, handles, windows, weather stripping, trim, driveway, house facade
5. Selected SW color (hex) is converted to HSL
6. Recoloring preserves the original luminance channel (shadows, texture, panel lines) while replacing hue and adjusting saturation
7. Composite image returned: original background + recolored door + original hardware
8. Displayed as a side-by-side or interactive before/after slider

#### User Stories

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| V-1 | As a homeowner, I want to upload a photo of my garage door | File upload accepts JPG/PNG, max 10MB. Mobile camera capture supported. Upload guidelines shown: "Take a straight-on photo in daylight." |
| V-2 | As a homeowner, I want to see my door in the color I selected | Visualization renders within 5 seconds. Color matches SW hex value. Texture and panel detail are preserved. |
| V-3 | As a homeowner, I want to try different colors on my photo | Changing the color in the picker re-renders the visualization without re-uploading. |
| V-4 | As a homeowner, I want to compare before and after | Interactive slider or side-by-side toggle. Shareable (download or screenshot-friendly). |
| V-5 | As a homeowner, if the visualization fails, I want a fallback | If segmentation fails or photo quality is too low, show a generic before/after of a similar door type with the selected color. Display: "For best results, upload a straight-on photo in good lighting." |

#### Quality Requirements

- Panel texture preservation: short panel, long panel, bead board, raised panel must all remain visible after recolor
- Shadow preservation: natural shadows from panel recesses must be maintained
- Hardware exclusion: door handles, hinges, decorative hardware must retain their original color
- Edge accuracy: color should not bleed onto the house facade, driveway, or trim

#### Hosting

- Processing service runs as a serverless function or lightweight API (AWS Lambda, Google Cloud Run, or Vercel serverless)
- Input image stored temporarily for processing, then deleted
- Output image stored in customer's booking record in Airtable

---

### 4.4 Sherwin-Williams Color Picker

**Description:** A branded color selection tool that maps to exact Sherwin-Williams product codes, enabling accurate paint ordering.

#### Data Model

Each color entry:
```json
{
  "sw_code": "SW 7006",
  "name": "Extra White",
  "hex": "#F1ECE1",
  "rgb": [241, 236, 225],
  "hsl": [40, 40, 91],
  "lrv": 86,
  "family": "White & Pastel",
  "collection": "Top 50 Colors"
}
```

#### Picker UI

- **Default view:** Curated "Most Popular for Garage Doors" collection (15–20 colors: whites, tans, grays, blacks, dark greens, dark blues)
- **Browse by family:** White & Pastel, Neutral, Gray, Blue, Green, Red, Brown, Black
- **Search:** by SW code or color name
- **Color swatch display:** large enough to evaluate on mobile, with SW code and name visible
- **Selected state:** highlighted swatch with checkmark, color name prominently displayed

#### Primer Logic Integration

- Each color has an LRV (Light Reflectance Value) from SW's data
- Current door color captured as Light (LRV ≥ 50) or Dark (LRV < 30) via toggle
- If Current = Dark AND Selected LRV > 50 → primer flag = true → $99 upcharge applied
- Edge case: mid-range LRV (30–50) → default to no primer, but display note: "If your current door color is very faded, primer may be recommended. We'll confirm at the job site."

#### User Stories

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| SW-1 | As a homeowner, I want to browse colors by category | Color families displayed as tabs or dropdown. Each family shows all colors as swatches. |
| SW-2 | As a homeowner, I want to see the most popular garage door colors first | Default view shows curated collection. User can expand to full catalog. |
| SW-3 | As a homeowner, I want to search for a specific color | Search by name ("Extra White") or code ("SW 7006"). Results filter in real time. |
| SW-4 | As a homeowner, I want to select a different color for each door | If multi-door order, color picker appears per door. Each door can have a unique color. |

---

### 4.5 Scheduling System

**Description:** A calendar-based date picker that shows real-time availability based on painter capacity and existing bookings.

#### Availability Logic

- Source of truth: Airtable Bookings table (Scheduled Start Date, Scheduled End Date, Assigned Painter)
- Available dates: any Monday–Saturday that does not already have a booking for the assigned painter
- Multi-day jobs: system checks that N consecutive days are available (where N = number of doors)
- Booking window: configurable, default 7–42 days out (1–6 weeks)
- Blocked dates: Blake can manually block dates in Airtable (holidays, time off)

#### Calendar UI

- Month-view calendar
- Available dates are selectable (highlighted in Bolt Yellow)
- Unavailable dates are grayed out and unclickable
- For multi-day jobs: selecting a start date auto-selects the consecutive days, validates all are available
- Selected date(s) show job summary: "Your 2-door job will be completed on [Date 1] and [Date 2]"
- Weekend display: Saturday is available, Sunday is hidden or clearly blocked

#### User Stories

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| S-1 | As a homeowner, I want to pick a date that works for me | Calendar shows only available dates as selectable |
| S-2 | As a homeowner with a 2-door job, I want consecutive days auto-selected | Selecting Day 1 highlights Day 2 automatically. If Day 2 is unavailable, Day 1 is also unselectable. |
| S-3 | As a homeowner, I want to know when the job will be done | Summary shows start and end dates, e.g., "Thursday May 28 – Friday May 29" |
| S-4 | As Blake, I want to block dates for holidays or time off | Airtable field "Blocked Dates" prevents those from showing as available |
| S-5 | As Blake, I want the calendar to prevent overbooking | No date can have more bookings than available painters × 1 job/day |

---

### 4.6 Checkout & Payment

**Description:** Stripe-powered checkout that collects a 50% deposit and saves the card for the remaining balance.

#### Checkout Flow

1. **Order Summary** — displays: door configuration, colors (SW codes + names), primer line items, selected dates, total price, deposit amount (50%)
2. **Customer Info** — address (job site), phone number
3. **Payment** — Stripe Elements embedded form (card number, exp, CVC)
4. **Terms Agreement** — checkbox: "I agree to the service terms. The remaining 50% balance will be charged to this card upon job completion."
5. **Submit** — charges deposit, saves payment method, creates booking in Airtable
6. **Confirmation** — success screen with booking summary, calendar invite download, "You'll receive a confirmation email shortly"

#### Stripe Implementation

- **Stripe Checkout or Payment Intents API** — for deposit charge
- **Stripe SetupIntent** — saves card as a PaymentMethod for future charges
- **Stripe Customer object** — created per booking, stores payment method
- **Balance charge** — triggered by painter "Mark Complete" action, charges saved PaymentMethod via PaymentIntent

#### User Stories

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| P-1 | As a homeowner, I want to see a clear order summary before paying | All line items visible: doors, colors, primer, discount, dates, total, deposit amount |
| P-2 | As a homeowner, I want to pay the deposit securely | Stripe Elements, PCI compliant, card validation, error handling |
| P-3 | As a homeowner, I want a confirmation email after booking | Email includes: order summary, scheduled dates, what to expect, contact info |
| P-4 | As a homeowner, I want to understand the remaining balance | Terms clearly state: "Remaining $X will be charged upon job completion" |
| P-5 | As Blake, I want the deposit to auto-record in Airtable | Stripe webhook → updates Booking record: deposit paid, Stripe IDs stored |

---

### 4.7 Abandonment Recovery

**Description:** Automated email sequences and retargeting for leads who enter their email but don't complete booking.

#### Trigger

- Lead record created in Airtable (email captured at Step 1) AND booking not completed within 30 minutes

#### Email Sequence

| Email | Timing | Subject Line | Content |
|-------|--------|-------------|---------|
| 1 | Immediate (+30 min) | "Your garage door quote is ready" | Recap their configuration (if captured), link back to funnel with state preserved |
| 2 | +24 hours | "See what your neighbors think" | 2–3 testimonials, before/after photos, CTA to return |
| 3 | +72 hours | "Your garage doors won't paint themselves" | Gallery of completed jobs, urgency ("We book up 2–3 weeks out"), CTA |
| 4 | +7 days | "Last chance: [seasonal/promo angle]" | Final nudge, optional limited-time incentive (e.g., free primer upgrade) |

#### Retargeting

- Facebook Pixel fires ViewContent on funnel steps 2–5
- Retargeting audience: visited site, did not trigger Purchase event
- Ad creative: before/after photos, "Still thinking about it?" messaging

#### User Stories

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| A-1 | As a homeowner who left without booking, I want a reminder | Email 1 arrives within 30 minutes of leaving the page |
| A-2 | As Blake, I want to see how many leads are in the abandonment pipeline | Airtable view: all contacts with Status = Lead, filtered by created date |
| A-3 | As Blake, I want to know which email in the sequence converts | Email platform tracks opens, clicks, and conversions per email |

---

### 4.8 Painter Operations View

**Description:** A mobile-friendly interface for the painter to manage their daily workflow.

#### Daily Job View

| Field | Source |
|-------|--------|
| Job address (with map link) | Booking → Contact → Address |
| Door configuration | Booking → Doors (size, count) |
| Paint colors (SW code + name per door) | Booking → Doors → Color |
| Primer needed (per door) | Booking → Doors → Primer flag |
| Nearest Sherwin-Williams store (map link) | Calculated from job address |
| Customer-uploaded door photos | Booking → Customer Door Photos |
| Special notes | Booking → Notes field |

#### Job Timer

- **Start Job** button: records timestamp in Airtable (Job Start Time)
- **Pause/Resume** (optional V1.1): for lunch breaks or interruptions
- **Complete Job** button: records timestamp (Job End Time), calculates elapsed hours
- Timer is visible on screen while running (hours:minutes)
- Data feeds into job costing reports

#### Photo Upload

- **Before photos:** required before starting (minimum 1 per door)
- **After photos:** required before marking complete (minimum 1 per door)
- Photos stored as attachments in Booking record
- Validation: cannot tap "Complete" without required photo count

#### Mark Complete Flow

1. Painter taps "Mark Complete"
2. System validates: after photos uploaded (≥ 1 per door)
3. Confirmation dialog: "Mark this job as complete? The customer will be charged the remaining balance."
4. On confirm: status → Completed, triggers Stripe balance charge + review request

#### User Stories

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| PO-1 | As a painter, I want to see today's job details on my phone | Mobile-responsive view, all critical info visible without scrolling |
| PO-2 | As a painter, I want to navigate to the job site | Address is a clickable link opening Google Maps / Apple Maps |
| PO-3 | As a painter, I want to navigate to the nearest SW store | SW store address is a clickable maps link |
| PO-4 | As a painter, I want to track my time on each job | Start/Stop timer with visible counter, logged to Airtable |
| PO-5 | As a painter, I want to upload before/after photos easily | Camera button opens phone camera directly, uploads to Booking record |
| PO-6 | As Blake, I want to see how long each job takes | Elapsed hours field in Bookings table, viewable in a job costing report view |

---

### 4.9 Post-Job Automation

**Description:** Automated workflows triggered by job completion.

#### Trigger Chain

| Trigger | Action | Timing |
|---------|--------|--------|
| Painter marks complete | Charge remaining 50% via Stripe | Immediate |
| Payment succeeds | Send receipt email to customer | Immediate |
| Payment succeeds | Send before/after photos to customer | Immediate (same email or separate) |
| Payment succeeds | Send review request | +30 minutes |
| Payment fails | Alert Blake via Slack/SMS | Immediate |
| Review request sent | Track click on Google review link | Ongoing |
| Job complete + 7 days | Send referral prompt | +7 days |
| Job complete + 12 months | Send annual check-in / re-engagement | +12 months |

#### Review Request

- **Channel:** SMS (primary) + email (secondary)
- **SMS content:** "Thanks for choosing Bolt Painting! We'd love your feedback. Leave us a quick review: [short Google link]"
- **Email content:** Same CTA, includes before/after photos of their specific job
- **Google review link:** Direct link to Google Business Profile review form

#### Referral Prompt (+7 days)

- **Email:** "Know a neighbor whose garage doors could use a refresh? Share this link and they'll get $50 off."
- Referral tracking: unique link or code per customer, logged in Airtable

---

### 4.10 CRM & Data Layer (Airtable)

**Description:** Airtable serves as the central database and operational dashboard.

#### Tables

**Contacts**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | Single line text | Yes | |
| Email | Email | Yes | Unique |
| Phone | Phone | No | Captured at checkout |
| Address | Single line text | No | Job site, captured at checkout |
| Source | Single select | Yes | Facebook Ad, Postcard, Referral, Organic, Direct |
| Status | Single select | Yes | Lead, Booked, Completed, Cancelled |
| Created | Created time | Auto | |
| Bookings | Link to Bookings | Auto | |

**Bookings**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Booking ID | Autonumber | Auto | |
| Contact | Link to Contacts | Yes | |
| Door 1 Size | Single select | Yes | Single / Double |
| Door 1 Color SW Code | Single line text | Yes | e.g., "SW 7006" |
| Door 1 Color Name | Single line text | Yes | e.g., "Extra White" |
| Door 1 Primer | Checkbox | Auto | Based on dark→light logic |
| Door 2–5 (same fields) | Repeating pattern | If applicable | |
| Total Doors | Formula | Auto | Count of doors configured |
| Subtotal | Currency | Auto | Before discount |
| Discount | Currency | Auto | Based on tier |
| Primer Charges | Currency | Auto | $99 × primer doors |
| Total Price | Currency | Auto | Subtotal - Discount + Primer |
| Deposit Amount | Formula | Auto | Total × 50% |
| Deposit Paid | Checkbox | Yes | |
| Balance Remaining | Formula | Auto | Total - Deposit |
| Balance Charged | Checkbox | No | |
| Stripe Customer ID | Single line text | Yes | |
| Stripe Deposit PI | Single line text | Yes | Payment Intent ID |
| Stripe Balance PI | Single line text | No | Populated on completion |
| Scheduled Start | Date | Yes | |
| Scheduled End | Date | Yes | |
| Days Required | Formula | Auto | Total Doors (1 door = 1 day) |
| Assigned Painter | Link to Painters | Yes | |
| Status | Single select | Yes | Scheduled, In Progress, Completed, Cancelled |
| Customer Photos | Attachment | No | Uploaded in funnel |
| AI Preview | Attachment | No | Generated visualization |
| Before Photos | Attachment | No | Painter uploads |
| After Photos | Attachment | No | Painter uploads |
| Job Start Time | DateTime | No | Timer start |
| Job End Time | DateTime | No | Timer end |
| Elapsed Hours | Formula | Auto | End - Start |
| Review Requested | Checkbox | Auto | |
| Review Clicked | Checkbox | No | Tracked via link |
| Notes | Long text | No | |

**Painters**
| Field | Type | Notes |
|-------|------|-------|
| Name | Single line text | |
| Phone | Phone | |
| Email | Email | |
| Active | Checkbox | |
| Work Days | Multiple select | Mon, Tue, Wed, Thu, Fri, Sat |
| Bookings | Link to Bookings | |

**Paint Orders**
| Field | Type | Notes |
|-------|------|-------|
| Booking | Link to Bookings | |
| SW Code | Single line text | |
| SW Color Name | Single line text | |
| Paint Gallons | Number | 1 per door |
| Primer Gallons | Number | 1 per primer-flagged door |
| Nearest SW Store | Single line text | Geocoded from job address |
| Job Date | Lookup | From Booking → Scheduled Start |
| Painter | Lookup | From Booking → Assigned Painter |
| Order Status | Single select | Pending, Ordered, Picked Up |

#### Views

| View | Table | Purpose |
|------|-------|---------|
| Master Schedule (Calendar) | Bookings | Calendar view by Scheduled Start, filtered by Status = Scheduled or In Progress |
| This Week's Jobs | Bookings | Gallery view, filtered to current week, sorted by date |
| Lead Pipeline | Contacts | Grid view, filtered by Status = Lead, sorted by Created desc |
| Paint Orders — Next 48 Hours | Paint Orders | Grid, filtered by Job Date within 48 hours AND Order Status = Pending |
| Job Costing Report | Bookings | Grid, showing Elapsed Hours, Total Price, COGS (manual or formula), Margin |
| Revenue Dashboard | Bookings | Grouped by month, summing Total Price, Deposit, Balance |

---

### 4.11 Paint Order Management

**Description:** Automated notification and tracking system for Sherwin-Williams paint orders.

#### V1 Workflow

1. Airtable automation runs daily at 7:00 AM
2. Filters Paint Orders where Job Date = 2 days from now AND Order Status = Pending
3. Sends notification to Blake (Slack or email) with pick list:
   - Job: [Address]
   - Painter: [Name]
   - Paint: [X] gal [SW Code] [Color Name]
   - Primer: [Y] gal (if applicable)
   - Nearest SW Store: [Store name + address]
4. Blake places order via SW PRO+ account
5. Blake updates Order Status → Ordered in Airtable
6. Painter picks up paint, updates → Picked Up

#### Multi-Painter Pick List (V2)

When scaling to 2+ painters:
- Daily pick list aggregates all orders for the next 48 hours
- Groups by painter
- Consolidates duplicate SW colors across jobs (e.g., 3 jobs needing SW 7006 = order 3 gallons together)
- Sorted by SW store for efficient routing

---

## 5. Non-Functional Requirements

| Requirement | Specification |
|-------------|--------------|
| Page load speed | LCP < 2 seconds on mobile (4G connection) |
| Uptime | 99.9% for customer-facing site |
| Mobile responsiveness | Full functionality on 375px+ viewports (iPhone SE and up) |
| Browser support | Chrome, Safari, Edge (latest 2 versions), Samsung Internet |
| AI visualization latency | < 5 seconds from upload to rendered preview |
| Payment security | PCI DSS compliant via Stripe Elements (no card data touches our server) |
| Data backup | Airtable native backups + weekly CSV export automation |
| SEO | Basic on-page SEO for organic discovery (meta tags, schema markup for local business) |
| Accessibility | WCAG 2.1 AA for core funnel flow |

---

## 6. Technical Architecture

```
┌──────────────────────────────────────────────────────┐
│                   FRONTEND                            │
│                                                      │
│  React SPA (Vite or Next.js)                         │
│  Hosted on Vercel                                    │
│  Domain: dfwgaragedoorpainter.com                    │
│                                                      │
│  Components:                                         │
│  ├─ VSL Hero (video embed)                           │
│  ├─ Gallery (before/after slider)                    │
│  ├─ Lead Capture Form                                │
│  ├─ Door Configurator                                │
│  ├─ SW Color Picker                                  │
│  ├─ AI Visualization Viewer                          │
│  ├─ Calendar Date Picker                             │
│  ├─ Stripe Checkout Form                             │
│  └─ Confirmation Screen                              │
└────────────┬────────────────────────┬────────────────┘
             │                        │
             ▼                        ▼
┌────────────────────┐   ┌────────────────────────────┐
│   BACKEND API       │   │  AI VISUALIZATION SERVICE   │
│                     │   │                             │
│  Vercel Serverless  │   │  Cloud Run / Lambda         │
│  Functions (or      │   │                             │
│  Express on Vercel) │   │  ├─ Image upload endpoint   │
│                     │   │  ├─ Segmentation model      │
│  Endpoints:         │   │  ├─ Color overlay engine    │
│  ├─ /api/lead       │   │  └─ Composite renderer      │
│  ├─ /api/booking    │   │                             │
│  ├─ /api/schedule   │   │  Returns: recolored image   │
│  ├─ /api/payment    │   └────────────────────────────┘
│  └─ /api/complete   │
│                     │
│  Integrations:      │
│  ├─ Airtable API    │
│  ├─ Stripe API      │
│  └─ SendGrid API    │
└─────────────────────┘

┌──────────────────────────────────────────────────────┐
│              AUTOMATION LAYER                         │
│                                                      │
│  n8n (self-hosted or cloud) OR Airtable Automations  │
│                                                      │
│  Workflows:                                          │
│  ├─ New booking → confirmation email                 │
│  ├─ Abandonment detection → email sequence           │
│  ├─ 48hr pre-job → paint order notification          │
│  ├─ Job complete → Stripe balance charge             │
│  ├─ Payment success → receipt + review request       │
│  ├─ Payment failure → alert Blake                    │
│  ├─ +7 days → referral email                         │
│  └─ +12 months → re-engagement email                 │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│             PAINTER OPS                               │
│                                                      │
│  Option A: Airtable Interface (no-code)              │
│  Option B: Lightweight React PWA                     │
│                                                      │
│  Features:                                           │
│  ├─ Daily job view                                   │
│  ├─ Job timer (start/stop)                           │
│  ├─ Photo upload (camera)                            │
│  └─ Mark Complete button                             │
└──────────────────────────────────────────────────────┘
```

---

## 7. Third-Party Integrations

| Service | Purpose | Integration Method | Cost Estimate |
|---------|---------|--------------------|---------------|
| Stripe | Payments (deposit + balance) | Stripe API + Elements | 2.9% + $0.30 per charge |
| Airtable | CRM, scheduling, data layer | Airtable REST API | Pro plan ~$20/user/mo |
| Vercel | Frontend hosting | Git deploy | Free tier likely sufficient |
| SendGrid or Loops | Transactional + marketing email | API | Free tier up to 100/day |
| Twilio | SMS (review requests, reminders) | API | ~$0.0079/SMS |
| Facebook | Pixel tracking, ad platform | Pixel JS + Conversions API | Ad spend variable |
| Google | Analytics (GA4), Business Profile | GA4 tag, GMB API | Free |
| Sherwin-Williams | Color data, paint ordering | Color data: static JSON. Ordering: manual V1 | N/A |
| n8n | Workflow automation | Self-hosted or cloud | Free (self-hosted) or ~$20/mo |
| Cloud Run / Lambda | AI visualization processing | API endpoint | ~$0.01–0.05 per image |

---

## 8. Data Privacy & Terms

### Customer-Facing Terms (Required at Checkout)

- Service description and scope
- Deposit is non-refundable if cancelled within 48 hours of scheduled date
- Remaining 50% balance will be charged to the card on file upon job completion
- Photos uploaded may be used in marketing materials (with opt-out checkbox)
- Standard liability limitations

### Data Handling

- Customer photos processed for visualization are stored temporarily during the session and permanently in the booking record
- Payment card data never touches our servers (Stripe handles all PCI scope)
- Customer data stored in Airtable with access limited to Blake and authorized team
- Email addresses used only for service communication and follow-up sequences (CAN-SPAM compliant, unsubscribe link in all marketing emails)

---

## 9. Launch Plan

### Phase 1: MVP (Weeks 1–4)

- Landing page with VSL, gallery, social proof, lead capture
- Door configurator with pricing engine
- Sherwin-Williams color picker (curated collection, no full catalog yet)
- Calendar scheduling connected to Airtable
- Stripe checkout (deposit + card on file)
- Confirmation email
- Airtable CRM setup (all tables and views)
- Paint order notification automation
- Facebook Pixel installed

### Phase 2: Visualization + Ops (Weeks 5–8)

- AI visualization pipeline (segmentation + color overlay)
- Painter operations view (daily job, timer, photo upload, mark complete)
- Auto-charge remaining balance on completion
- Review request automation (SMS + email)
- Abandonment email sequence (4-email drip)
- Full SW color catalog in picker

### Phase 3: Optimization (Weeks 9–12)

- Referral program
- Annual re-engagement automation
- Multi-painter scheduling support
- Job costing dashboard
- A/B testing on funnel (VSL length, CTA copy, price display)
- Retargeting ad campaigns based on Pixel data

---

## 10. Open Questions & Risks

### Open Questions

| Question | Impact | Owner |
|----------|--------|-------|
| Exact domain name — is dfwgaragedoorpainter.com available? | Branding, SEO | Blake |
| Cancellation / reschedule policy — what are the rules? | Terms of service, customer experience | Blake |
| Does the painter have a smartphone for the ops view? | Determines if we build mobile web or need an alternative | Blake |
| What happens if a door needs repair, not just paint? | Pre-qualification logic, refund handling | Blake |
| Will Blake handle all paint ordering personally, or delegate? | Automation notification routing | Blake |
| VSL production timeline — when will video content be ready? | Blocks MVP launch | Blake |

### Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| AI visualization quality inconsistent across photo conditions | Medium | Provide upload guidelines, fallback to generic examples, allow manual review |
| Single painter = single point of failure (illness, burnout) | High | Identify backup painter early, build multi-painter support in Phase 3 |
| SW color data changes or new colors added | Low | Quarterly refresh of color catalog JSON |
| Stripe card-on-file charges declined at completion | Medium | Retry logic, alert Blake for manual follow-up, collect phone number for contact |
| Low demand in initial target area | Medium | Expand geo-targeting quickly, test multiple subdivisions via postcards |
| Competitor copies the model | Low | Speed to market + reviews + brand = defensible. Execution > idea. |
| MDO / complex door types submit bookings expecting service | Medium | Add door type question to configurator: "Is your door metal?" If not, route to custom quote. |
