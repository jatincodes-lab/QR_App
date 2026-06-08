# Customer CRM and WhatsApp Campaign Roadmap

## Product Direction

Qrave should be positioned as a simple QR-based customer capture and repeat-customer marketing tool for restaurants and cafes.

The flow should stay simple:

1. Customer scans QR.
2. Customer views menu or offers.
3. Customer shares name and WhatsApp while ordering or interacting.
4. System remembers the customer.
5. Restaurant sees customer history.
6. Restaurant sends targeted WhatsApp campaigns later.

## Tracking Status

Use these labels:

- `[ ]` Not started
- `[~]` In progress
- `[x]` Done

Update this file whenever a feature is completed.

## Phase 1: Customer Capture Foundation

- [x] Create a proper `Customers` backend model/table.
  - Store tenant, branch, name, WhatsApp number, consent status, first visit, last visit, visit count.
  - Suggested paths:
    - `database/migrations/012_Customers_CRM.sql`
    - `src/backend/QRApp.Application/Customers`
    - `src/backend/QRApp.Infrastructure/Customers`

- [x] Link every QR order to a customer.
  - Match by tenant + normalized WhatsApp number.
  - Create customer if not found.
  - Update name, last visit, visit count, and totals.
  - Suggested paths:
    - `database/migrations/012_Customers_CRM.sql`
    - `src/backend/QRApp.Infrastructure/Orders`
    - `src/backend/QRApp.Application/Orders`

- [x] Add WhatsApp consent capture.
  - Customer must clearly opt in before marketing messages.
  - Store consent timestamp and source.
  - Suggested paths:
    - `src/frontend/app/qr/[qrToken]/qr-menu-client.tsx`
    - `src/backend/QRApp.Application/Orders`

## Phase 2: Repeat Customer Experience

- [x] Recognize repeat customer by WhatsApp.
  - When WhatsApp is entered, find previous customer profile.
  - Auto-fill known customer name if available.
  - Suggested paths:
    - `src/backend/QRApp.Api/Endpoints/PublicQrEndpoints.cs`
    - `src/frontend/app/qr/[qrToken]/qr-menu-client.tsx`

- [x] Show simple repeat-customer message.
  - Example: `Welcome back, Priya`.
  - Keep it subtle and not complicated for customers.
  - Suggested path:
    - `src/frontend/app/qr/[qrToken]/qr-menu-client.tsx`

- [x] Add reorder from previous order.
  - Customer can quickly add previous items to cart.
  - Suggested paths:
    - `src/frontend/app/qr/[qrToken]/qr-menu-client.tsx`
    - `src/backend/QRApp.Api/Endpoints/PublicOrderEndpoints.cs`

## Phase 3: Admin Customer CRM

- [x] Replace basic customer report with a CRM-style customer list.
  - Show name, WhatsApp, visits, last visit, total order value, favorite item.
  - Paths:
    - `src/frontend/app/admin/customers/page.tsx`
    - `src/frontend/app/admin/reports/page.tsx`

- [ ] Add customer detail view.
  - Show profile, order timeline, items ordered, branches visited, campaign history.
  - Suggested paths:
    - `src/frontend/app/admin/customers/page.tsx`
    - `src/frontend/app/admin/customers/[customerId]/page.tsx`
    - `src/backend/QRApp.Api/Endpoints/AdminCustomerEndpoints.cs`

- [ ] Add customer search.
  - Search by name, WhatsApp, item ordered, branch.
  - Suggested paths:
    - `src/frontend/app/admin/customers/page.tsx`
    - `database/migrations/012_Customers_CRM.sql`

## Phase 4: Customer Segments

- [ ] Add simple predefined segments.
  - New customers.
  - Repeat customers.
  - Inactive customers.
  - High-value customers.
  - Customers who ordered a specific item.
  - Suggested paths:
    - `src/backend/QRApp.Application/CustomerSegments`
    - `src/backend/QRApp.Infrastructure/CustomerSegments`
    - `src/frontend/app/admin/customers/page.tsx`

- [ ] Add segment preview count.
  - Before campaign send, restaurant should know how many customers match.
  - Suggested paths:
    - `src/backend/QRApp.Api/Endpoints/AdminCampaignEndpoints.cs`
    - `src/frontend/app/admin/campaigns/page.tsx`

## Phase 5: WhatsApp Campaigns

- [x] Add basic one-customer WhatsApp send action.
  - Admin can choose a message template from the customer CRM list.
  - Opted-in customers with saved WhatsApp numbers can be opened in WhatsApp with a prefilled message.
  - Suggested path:
    - `src/frontend/app/admin/customers/page.tsx`

- [x] Create campaign draft flow.
  - Campaign name, target segment, message text, optional offer.
  - Suggested paths:
    - `database/migrations/013_WhatsApp_Campaigns.sql`
    - `src/frontend/app/admin/campaigns/page.tsx`
    - `src/backend/QRApp.Application/Campaigns`

- [ ] Add WhatsApp Business API integration.
  - Keep provider integration isolated behind an interface.
  - Suggested paths:
    - `src/backend/QRApp.Application/Messaging`
    - `src/backend/QRApp.Infrastructure/Messaging`

- [~] Add campaign send status.
  - Draft, queued, sending, sent, failed.
  - Suggested paths:
    - `src/backend/QRApp.Application/Campaigns`
    - `src/frontend/app/admin/campaigns/page.tsx`

- [ ] Add opt-out handling.
  - Customer can stop receiving campaigns.
  - Restaurant cannot send campaigns to opted-out customers.
  - Suggested paths:
    - `database/migrations/013_WhatsApp_Campaigns.sql`
    - `src/backend/QRApp.Application/Customers`

## Phase 6: ROI Dashboard

- [ ] Add customer growth metrics.
  - Captured customers, repeat customers, inactive customers.
  - Suggested path:
    - `src/frontend/app/admin/analytics/page.tsx`

- [ ] Add campaign results.
  - Sent count, failed count, replies/clicks if available, returning customers after campaign.
  - Suggested paths:
    - `src/frontend/app/admin/campaigns/page.tsx`
    - `src/frontend/app/admin/analytics/page.tsx`

- [ ] Add export.
  - Export customers and campaign reports to CSV.
  - Suggested paths:
    - `src/backend/QRApp.Api/Endpoints/AdminCustomerEndpoints.cs`
    - `src/backend/QRApp.Api/Endpoints/AdminCampaignEndpoints.cs`

## Keep The UX Simple

Do not make the customer flow complex.

Customer side should only ask:

1. Name.
2. WhatsApp number.
3. Consent checkbox.
4. Order/request action.

Admin side should use simple labels:

- Customers
- Segments
- Campaigns
- Offers
- Reports

Avoid advanced marketing words unless the user needs them.

## Next Recommended Build Order

1. Customer table and order-to-customer linking.
2. Customer list in admin.
3. Customer detail page.
4. Consent checkbox in QR checkout.
5. Basic segments.
6. Campaign draft screen.
7. WhatsApp provider integration.
8. Campaign results dashboard.
