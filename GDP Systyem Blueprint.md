# Bolt Painting — Garage Door Refresh: System Blueprint

---

## Executive Summary

A productized, self-service garage door repainting business targeting DFW homeowners with faded metal garage doors. Customers discover the service via Facebook ads or direct mail postcards, land on a conversion-optimized single-page funnel at an exact-match domain (e.g., `dfwgaragedoorpainter.com`), configure their order, preview their door in a new color via AI visualization, pay a 50% deposit, and book a date — all without speaking to anyone. The remaining 50% is charged automatically upon job completion, followed by an automated review request.

---

## 1. Customer Journey Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ACQUISITION LAYER                                │
│                                                                         │
│   Facebook Ad ──┐                                                       │
│   (before/after) │──▶  dfwgaragedoorpainter.com                         │
│   Postcard ─────┘     (exact-match domain, Bolt Painting branded)       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     FUNNEL — SINGLE PAGE APP                            │
│                                                                         │
│  Step 1: HOOK                                                           │
│  ├─ 3–5 min VSL (trust-builder video)                                   │
│  ├─ Before/after gallery                                                │
│  ├─ Social proof / testimonials                                         │
│  └─ CTA: "Get Your Custom Quote" → captures name + email               │
│                                                                         │
│  Step 2: CONFIGURE                                                      │
│  ├─ Door selector (how many doors, single vs. double per door)          │
│  ├─ Color picker (Sherwin-Williams catalog, grouped by family)          │
│  ├─ Current color indicator (light/dark toggle per door)                │
│  ├─ Primer logic auto-fires if dark → light ($99/door upcharge)         │
│  └─ Live price calculator updates as selections change                  │
│                                                                         │
│  Step 3: VISUALIZE                                                      │
│  ├─ Photo upload (customer's actual garage door)                        │
│  ├─ AI segmentation masks the door area                                 │
│  ├─ Selected SW color applied as tinted overlay                         │
│  ├─ Preserves texture, shadows, panel detail                            │
│  └─ Side-by-side or slider before/after preview                         │
│                                                                         │
│  Step 4: SCHEDULE                                                       │
│  ├─ Calendar showing available dates (pulled from Airtable)             │
│  ├─ Capacity: 1 door = 1 day, 2 doors = 2 consecutive days             │
│  ├─ Monday–Saturday availability                                        │
│  ├─ Blocks dates that are already at capacity                           │
│  └─ Shows estimated job duration                                        │
│                                                                         │
│  Step 5: CHECKOUT                                                       │
│  ├─ Order summary (doors, colors, primer, schedule, total)              │
│  ├─ 50% deposit charged via Stripe                                      │
│  ├─ Card saved on file for remaining balance                            │
│  ├─ Booking terms: "Remaining balance charged upon completion"          │
│  └─ Confirmation page + email with all details                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     OPERATIONS LAYER                                    │
│                                                                         │
│  Airtable CRM (central data hub)                                        │
│  ├─ Contacts table: name, email, phone, address                         │
│  ├─ Bookings table: doors, sizes, colors (SW codes), primer Y/N,        │
│  │   deposit paid, balance owed, scheduled dates, status,               │
│  │   customer photos, job photos (before/after)                         │
│  ├─ Schedule view: calendar view filtered by painter/date               │
│  ├─ Paint Orders table: SW color code, quantity, primer Y/N,            │
│  │   nearest SW store, job date, order status                           │
│  └─ Payments table: Stripe payment IDs, deposit/final amounts           │
│                                                                         │
│  Painter Daily View (mobile-friendly page)                              │
│  ├─ Today's job: address, door sizes, SW color codes                    │
│  ├─ Customer's uploaded door photos                                     │
│  ├─ Nearest Sherwin-Williams store address                              │
│  ├─ Primer notes                                                        │
│  ├─ Start/Stop timer for job costing                                    │
│  ├─ Photo upload: before + after per door (required)                    │
│  └─ "Mark Complete" button triggers payment + review flow               │
│                                                                         │
│  Automated Triggers                                                     │
│  ├─ 48hr before job: paint order notification                           │
│  │   → "Order 1 gal SW 7006, 1 gal primer → SW Store #1234"            │
│  ├─ Job complete → charge remaining 50% via Stripe                      │
│  ├─ 30 min after payment → review request (SMS + email)                 │
│  │   → direct link to Google Business reviews                           │
│  └─ Customer receives before/after photos of their completed job        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     ABANDONMENT / FOLLOW-UP LAYER                       │
│                                                                         │
│  If lead enters email but doesn't complete booking:                     │
│  ├─ Immediate: "Your custom garage door quote is waiting"               │
│  ├─ +24 hours: "Here's what your neighbors are saying" + testimonials   │
│  ├─ +72 hours: Before/after gallery + urgency CTA                       │
│  ├─ +7 days: Final nudge with seasonal/limited-time angle               │
│  └─ Facebook retargeting pixel fires on page load for ad retargeting    │
│                                                                         │
│  Post-job follow-up:                                                    │
│  ├─ Review request (Google Business)                                    │
│  ├─ Referral prompt: "Know a neighbor whose doors need a refresh?"      │
│  └─ Annual check-in: "It's been 12 months — time for a touch-up?"      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Pricing Engine

### Base Prices

| SKU | Description | Retail Price | Labor Cost | Paint Cost | Total COGS | Gross Profit | Margin % |
|-----|-------------|-------------|------------|------------|------------|-------------|----------|
| S1 | 1 Single Door (≤10ft wide) | $799 | $200 | $50 | $250 | $549 | 68.7% |
| D1 | 1 Double Door (>10ft wide) | $899 | $275 | $50 | $325 | $574 | 63.8% |
| S2 | 2 Single Doors | $1,395 | $400 | $100 | $500 | $895 | 64.2% |
| SD | 1 Single + 1 Double | $1,495 | $475 | $100 | $575 | $920 | 61.5% |
| D2 | 2 Double Doors | $1,595 | $550 | $100 | $650 | $945 | 59.2% |

### Volume Discount Tiers (3+ Doors)

Instead of percentage-based discounts (which erode double-heavy orders), use a fixed per-door discount:

| Door Count | Discount Per Door | Example: 3 Singles | Example: 3 Doubles |
|------------|-------------------|-------------------|-------------------|
| 3 doors | $100/door off | $2,097 (62.0% margin) | $2,397 (59.2% margin) |
| 4 doors | $125/door off | $2,696 (62.6% margin) | $3,096 (58.2% margin) |
| 5 doors | $150/door off | $3,245 (63.0% margin) | $3,745 (57.4% margin) |
| 6+ doors | Custom quote | — | — |

### Add-Ons

| Add-On | Price | COGS | Notes |
|--------|-------|------|-------|
| Primer (dark → light, per door) | $99 | ~$30 | Auto-triggered when current color = dark AND selected color = light |

### Payment Structure

- 50% deposit at booking (charged immediately via Stripe)
- 50% balance charged upon job completion (card on file)
- Deposit covers materials + labor prepayment + calendar hold

---

## 3. Scheduling & Labor Model

### Capacity Rules

| Configuration | Days Required | Labor Units |
|---------------|--------------|-------------|
| 1 door (any size) | 1 day | 1 |
| 2 doors (any combo) | 2 consecutive days | 2 |
| 3 doors | 3 consecutive days | 3 |
| Pattern | 1 day per door | N doors = N days |

### Constraints

- **Crew:** 1 painter (expandable)
- **Work days:** Monday–Saturday
- **Max capacity:** 6 labor-days per week per painter
- **Booking window:** e.g., 2–6 weeks out (configurable)
- **Multi-day jobs:** must be consecutive days (no gaps)

### Scaling for Multiple Painters

When demand justifies a second painter:
- Each painter gets their own calendar lane in Airtable
- Jobs are assigned to a specific painter
- Paint order automation aggregates across all painters
- Pick list groups orders by painter + date for single SW store runs

---

## 4. Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Landing page / funnel | React (Next.js or Vite) on Vercel | Customer-facing single-page app |
| Hosting / domain | Vercel + exact-match domain | Fast, mobile-first |
| Payments | Stripe (Checkout + saved payment methods) | Deposit + completion charge |
| CRM / scheduling | Airtable | Contacts, bookings, schedule, paint orders |
| AI visualization | Segmentation model + color overlay | Door repainting preview |
| Color picker | Sherwin-Williams catalog (hex + SW codes) | Exact color selection |
| Email sequences | SendGrid, Mailgun, or Loops | Abandonment + post-job flows |
| SMS | Twilio or RingCentral | Review requests, reminders |
| Automation | n8n or Airtable Automations | Paint order alerts, payment triggers, review flow |
| Retargeting | Facebook Pixel | Ad retargeting for non-converters |
| Analytics | Google Analytics 4 + Meta Pixel | Funnel tracking, ad attribution |
| Painter ops | Mobile-friendly web view (Airtable Interface or custom) | Daily job view, timer, photo upload |
| Reviews | Google Business Profile | Review generation via direct link |

---

## 5. Data Model (Airtable)

### Contacts Table

| Field | Type | Notes |
|-------|------|-------|
| Name | Text | First + Last |
| Email | Email | Captured at Step 1 |
| Phone | Phone | Optional at booking |
| Address | Text | Job site address |
| Source | Single Select | Facebook Ad, Postcard, Referral, Organic |
| Created Date | Date | Auto |
| Status | Single Select | Lead, Booked, Completed, Cancelled |

### Bookings Table

| Field | Type | Notes |
|-------|------|-------|
| Contact | Link to Contacts | |
| Doors | JSON / Long Text | Array: [{size: "single", color_sw: "SW 7006", color_name: "Extra White", primer: true}] |
| Total Price | Currency | Calculated |
| Deposit Amount | Currency | 50% of total |
| Deposit Paid | Checkbox | |
| Balance Remaining | Currency | |
| Balance Charged | Checkbox | |
| Stripe Customer ID | Text | For charging balance |
| Stripe Payment Intent (Deposit) | Text | |
| Stripe Payment Intent (Balance) | Text | |
| Scheduled Start Date | Date | First day of job |
| Scheduled End Date | Date | Last day (start + days - 1) |
| Days Required | Number | Calculated from door count |
| Assigned Painter | Link to Painters | |
| Status | Single Select | Scheduled, In Progress, Completed, Cancelled |
| Customer Door Photos | Attachment | Uploaded during funnel |
| AI Preview Image | Attachment | Generated visualization |
| Job Before Photos | Attachment | Painter uploads |
| Job After Photos | Attachment | Painter uploads |
| Job Start Time | DateTime | Painter taps "Start" |
| Job End Time | DateTime | Painter taps "Complete" |
| Elapsed Hours | Formula | Job costing |
| Review Requested | Checkbox | |
| Review Link Clicked | Checkbox | |

### Paint Orders Table

| Field | Type | Notes |
|-------|------|-------|
| Booking | Link to Bookings | |
| SW Color Code | Text | e.g., "SW 7006" |
| SW Color Name | Text | e.g., "Extra White" |
| Gallons Needed | Number | 1 per door |
| Primer Needed | Checkbox | |
| Primer Gallons | Number | 1 per primer door |
| Nearest SW Store | Text | Based on job site address |
| Job Date | Date | Pulled from booking |
| Order Status | Single Select | Pending, Ordered, Picked Up |
| Painter | Link to Painters | |

### Painters Table

| Field | Type | Notes |
|-------|------|-------|
| Name | Text | |
| Phone | Phone | |
| Active | Checkbox | |
| Work Days | Multiple Select | Mon–Sat |

### Schedule View (Airtable Calendar)

- Calendar view on Bookings table, grouped by Assigned Painter
- Filtered to show only Scheduled + In Progress
- Color-coded by status
- Blake views this as the master operations dashboard

---

## 6. AI Visualization Pipeline

### Approach: Segmentation + Color Overlay (Non-Generative)

```
Customer uploads photo
        │
        ▼
Image segmentation model identifies garage door region
(SAM / U-Net / similar — detects door panels, handles, hardware)
        │
        ▼
Generate binary mask of door surface area
(exclude handles, windows, trim, hardware, weather stripping)
        │
        ▼
Apply selected Sherwin-Williams color as tinted overlay
├─ Map SW hex value to HSL
├─ Preserve luminance channel from original (keeps shadows + texture)
├─ Replace hue + adjust saturation to match SW color
├─ Blend at ~85% opacity to retain panel texture (short panel, long panel, bead board)
        │
        ▼
Composite: original background + recolored door + original hardware
        │
        ▼
Render side-by-side or interactive slider for customer
```

### Why This Approach

- **Deterministic:** same color in → same result out (unlike generative AI)
- **Texture-preserving:** panels, bead board, and raised details stay visible
- **Color-accurate:** uses exact SW hex values, not AI interpretation
- **Low cost:** segmentation model runs once per image, no expensive generation
- **Fast:** sub-5-second processing

### Edge Cases

- Doors with windows: mask should exclude glass panes
- Two-tone doors (e.g., MDO with trim): V2 feature — out of scope for launch
- Severely damaged doors: photo serves as pre-qualification (flag for review)
- Poor photo quality / bad lighting: provide upload guidelines ("straight-on, daytime, no shadows")

---

## 7. Sherwin-Williams Integration

### Color Catalog Data

- Full SW color library (~1,700 colors) stored as JSON
- Each entry: SW code, color name, hex value, color family, LRV (Light Reflectance Value)
- LRV is used for primer logic: LRV < 30 = "dark," LRV > 50 = "light"
- Primer triggers when current door LRV < 30 AND selected color LRV > 50

### Paint Order Automation

**V1 (Launch):**
- Airtable automation fires 48 hours before job date
- Sends notification (Slack, email, or SMS to Blake) with:
  - SW color code + name
  - Gallons needed (paint + primer)
  - Job site address
  - Nearest SW store (geocoded from job address)
- Blake or painter places order manually via SW PRO+ account

**V2 (Future — if SW opens API or rep relationship):**
- Direct API order placement
- Automated confirmation back to Airtable

### Pick List Aggregation (Multi-Painter)

When scaling to 2+ painters:
- Daily pick list view in Airtable groups all paint orders for the next 48 hours
- Sorted by painter, then by SW store proximity
- Consolidates duplicate colors across jobs (e.g., 3 jobs all need SW 7006 → order 3 gallons in one trip)

---

## 8. Post-Job Flow

```
Painter taps "Mark Complete"
        │
        ├──▶ Job timer stops → elapsed time logged for job costing
        │
        ├──▶ Before/after photos required (validation gate)
        │
        ├──▶ Booking status → "Completed"
        │
        ▼
Stripe charges remaining 50% balance on saved card
        │
        ├──▶ Payment success → receipt emailed to customer
        │         │
        │         ▼
        │    +30 min: Review request fires
        │    ├─ SMS: "Thanks for choosing Bolt Painting! 
        │    │   Leave us a review: [Google link]"
        │    └─ Email: Same CTA + before/after photos attached
        │
        ├──▶ Payment failure → alert Blake for manual follow-up
        │
        └──▶ Before/after photos sent to customer via email
             └─ "Here's your freshly painted garage — share it with your neighbors!"
```

---

## 9. Abandonment Recovery Flow

### Trigger: Lead enters email at Step 1 but does not complete booking

| Timing | Channel | Message Theme |
|--------|---------|--------------|
| Immediate | Email | "Your custom garage door quote is ready" — link back to saved config |
| +24 hours | Email | Social proof — "Here's what your neighbors are saying" + testimonials |
| +72 hours | Email | Before/after gallery + "spots are filling up" urgency |
| +7 days | Email | Final nudge — seasonal angle or limited-time offer |
| Ongoing | Facebook | Retargeting ad to website visitors who didn't convert |

### Data Captured Before Booking

Even if the customer drops off after Step 1, we have:
- Name + email (Step 1 gate)
- Door configuration + color selections (if they reached Step 2)
- AI preview image (if they reached Step 3)

This allows personalized follow-up: "You were looking at Extra White for your double garage door — here's what it could look like."

---

## 10. Domain & Branding

### Domain Strategy

- **Primary domain:** `dfwgaragedoorpainter.com` (or similar exact-match)
- **Branded as:** Bolt Painting (logo, colors, typography per brand guide)
- **Rationale:** exact-match domain captures high-intent local search; Bolt Painting branding builds trust and connects to the established painting business

### Brand Assets

- **Logo:** Bolt Painting — lightning bolt icon in circle
- **Colors:** Black `#000000` / Yellow `#FDB617`
- **Display font:** Blair ITC Medium
- **Body font:** Gotham Medium
- **Icon:** Lightning bolt in brushstroke circle (available in black + yellow variants)

### Page Branding

- Dark background sections (black) with yellow accents for CTAs and highlights
- White/light sections for content readability
- Bolt Painting logo in header
- "A Bolt Painting Service" tagline connecting to parent brand
- Phone number visible but de-emphasized (self-service is the goal)

---

## 11. Service Area & Targeting

### Launch Market

- **Starting neighborhood:** Wellington in Haslet, TX
- **Initial radius:** Haslet and surrounding subdivisions
- **Target criteria:** neighborhoods with metal garage doors 5+ years old showing visible fading

### Expansion Plan

- Expand to broader DFW as demand and crew capacity grow
- Postcard targeting: drive specific subdivisions to confirm fading is present before mailing
- Facebook targeting: geo-fence specific zip codes with matching home age demographics

### Exclusions (V1)

- MDO (faux wood) doors — potential for two-tone complexity, revisit in V2
- Doors needing structural repair — photo upload serves as pre-qualification; if flagged, route to manual review instead of self-service booking

---

## 12. Future Roadmap

| Phase | Feature | Priority |
|-------|---------|----------|
| V1.1 | Referral program (discount code for neighbor referrals) | High |
| V1.1 | Annual re-engagement automation (12-month check-in) | Medium |
| V2 | MDO / two-tone door support | Medium |
| V2 | Multi-painter scheduling with load balancing | High (demand-dependent) |
| V2 | Direct SW ordering integration (if API available) | Medium |
| V2 | Customer portal (view booking, reschedule, see photos) | Low |
| V3 | Expand beyond garage doors (front door, shutters, trim) | Low |
| V3 | Franchise / territory licensing model | Aspirational |
