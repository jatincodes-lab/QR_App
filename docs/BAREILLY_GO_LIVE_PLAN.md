# Bareilly Go-Live Plan

This plan is for turning Qrave from a working MVP into a demo-ready product for Bareilly cafes and restaurants.

## Goal

Launch with enough quality that a cafe owner can understand the value in one demo:

1. Customer scans table QR.
2. Customer places order from phone.
3. Kitchen receives order instantly.
4. Staff updates order status.
5. Customer tracks the order.
6. Owner can manage menu, tables, staff, and daily operations without developer help.

## Phase 1: Demo-Ready Product Polish

Target: Before visiting real cafe owners.

### Build

- Menu item image upload from admin instead of URL-only input.
- Branch logo upload.
- Branch cover/banner image upload.
- Show branch logo and cover on public QR menu.
- Show branch logo in admin branch workspace.
- Keep one primary image per menu item for now.
- Compress/resize images before or during upload.
- Store uploaded media in cloud storage, not SQL Server.

### Recommended Storage

- Use Cloudinary for the first launch.
- Store image URL and provider public ID in SQL Server.
- Keep the existing image URL fields as display fields.
- Add provider metadata later if needed for delete/replace workflows.

### Acceptance Criteria

- Owner can upload a food photo from laptop/mobile.
- Owner can upload cafe logo.
- Public QR menu looks branded.
- Existing URL-based menu items still work.
- Frontend build passes.

## Phase 2: Branded QR Print/Download

Target: Make table deployment simple for local cafes.

### Build

- Table-wise QR download from admin.
- Print-ready QR layout with:
  - Branch logo
  - Branch name
  - Table name
  - QR code
  - Short instruction text
- Bulk download option later; single table download is enough first.
- Add a clean scanner/table-stand design that can be sent to a printer.

### Acceptance Criteria

- Owner can download QR for each table.
- QR opens the correct public menu.
- Printed QR includes restaurant branding.
- The design is readable on phone camera from table distance.

## Phase 3: Trial And Subscription Control

Target: Allow manual selling before payment gateway automation.

### Build

- Tenant subscription fields:
  - Plan code
  - Trial start date
  - Trial end date
  - Subscription status
  - Account active/inactive
- Admin-side guard for expired trial/inactive account.
- Owner-facing trial banner.
- Manual internal update path for marking account paid/active.

### MVP Rule

Do not build payment gateway first. For Bareilly launch, collect manually by UPI/cash/bank and mark account active from database/admin tool.

### Acceptance Criteria

- Trial accounts can expire.
- Expired owners see a clear renewal message.
- Active paid accounts continue normally.
- Staff/customer QR flow is blocked only when the tenant is inactive, not because of small UI issues.

## Phase 4: Demo Deployment

Target: Public live demo link.

### Build/Configure

- Deploy frontend.
- Deploy backend API.
- Deploy SQL Server database.
- Configure environment variables.
- Apply all database scripts and migrations.
- Seed demo tenant:
  - Demo owner login
  - Demo branch
  - Demo menu
  - Demo table QR
  - Demo kitchen/staff login

### Suggested Hosting

- Frontend: Vercel or similar.
- Backend: Render, Railway, Azure App Service, or VPS.
- Database: Azure SQL or SQL Server on a VPS.

### Acceptance Criteria

- Public demo QR works on mobile.
- Admin login works.
- Kitchen login works.
- Order placed from QR appears on kitchen board.
- Customer tracking page updates.
- Build and smoke test pass before sharing.

## Phase 5: Bareilly Pilot Launch

Target: First 3-5 real cafe trials.

### Sales Offer

Bareilly launch offer:

- Smart Restaurant Plan at Rs. 999/month for first 3 months.
- Free setup.
- Free 10 QR stickers.
- Cancel anytime.
- After 3 months: Rs. 1,499/month.

### Execution

- Visit 100 local outlets manually.
- Focus first on cafes, fast-food restaurants, family restaurants, and new outlets.
- Demo the live flow in person.
- Start with a 7-day assisted trial.
- Upload their real menu during trial.
- Visit again after 2 days for staff feedback.

### Acceptance Criteria

- At least 5 real trials started.
- At least 2 paid cafes converted.
- At least 1 testimonial video collected.
- At least 1 real case study written.

## Post-Deploy Phase 2: Feedback And Reports Polish

Target: Improve owner follow-up after the live demo is deployed and real feedback starts coming in.

### Build

- Feedback metrics in admin reports:
  - Average rating
  - Total feedback count
  - Low ratings count
  - Recent low-rating comments
- Low-rating follow-up workflow:
  - Filter ratings 1-2
  - Show customer, table, and order context
  - Quick WhatsApp follow-up when consent and number are available

### Rule

Do this after the demo is deployed and the basic feedback flow has real data. Do not block deployment on feedback reporting polish.

## Phase 6: Revenue Features After Pilot

Target: Improve conversion and retention after real feedback.

### Build

- Better daily sales report.
- Top-selling items report.
- Customer list and repeat customer report.
- WhatsApp Business API delivery integration.
- Campaign delivery status.
- KOT/receipt print.
- Basic feedback/rating after order.
- Razorpay/UPI payment collection later.

### Rule

Do not build these before validating Phase 5 unless a pilot customer explicitly needs one to convert.

## Pricing For Bareilly

### Chhota Cafe

Rs. 699/month per outlet.

- 1 outlet
- Up to 10 tables
- 2 staff users
- QR menu
- Customer ordering
- Kitchen screen
- Order tracking

### Smart Restaurant

Rs. 1,499/month per outlet.

- Up to 40 tables
- 8 staff users
- Waiter call
- Customer previous orders
- Offers
- Daily sales report
- WhatsApp campaign queue

### Premium Restaurant

Rs. 2,499/month per outlet.

- Unlimited tables
- 20 staff users
- Advanced reports
- Customer analytics
- Priority support
- Custom QR design

### Multi-Outlet

Rs. 3,999/month for 2 outlets.

- Extra outlet: Rs. 999/month.
- Multi-branch dashboard.
- Branch-wise reports.

## Current Next Step

Start Phase 1:

1. Add menu item image upload.
2. Add branch logo upload.
3. Add branch cover upload.
4. Show branding on public QR menu.
