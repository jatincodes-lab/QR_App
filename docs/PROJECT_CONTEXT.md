# Project Context

## Product

Qrave is a multi-tenant QR menu and table-ordering SaaS for cafes and restaurants.

Core flow:

1. Restaurant owner creates account.
2. Owner creates branch.
3. Owner adds menu.
4. Owner creates tables.
5. System generates QR per table.
6. Customer scans QR and gets a fast mobile menu.
7. Branch settings control browse-only versus direct phone ordering.
8. Orders go to staff/kitchen dashboard when direct ordering is enabled.
9. Customer order history is saved for future visits.

## Current State

Base project structure has been created. The first backend foundation slice now supports tenants, branches, branch order settings, owner registration, login, JWT authentication, tenant context resolution, authenticated admin branch/settings APIs, menu category/item foundations, branch table management, QR token public menu resolution, customer QR order creation and tracking through SQL Server stored procedures and minimal v1 APIs, a mobile-first public QR menu frontend with customer cart/order submission, an admin kitchen order dashboard, SignalR realtime staff updates, and waiter-call workflows.

The CRM slice now includes a WhatsApp campaign queue foundation: admins can preview opted-in customer audience counts, create branch-scoped campaign queues, and view queued campaign history. Actual WhatsApp Business API delivery is still pending provider configuration and template approval.

The admin access slice now supports staff management. Owner users can create staff logins, assign roles (`admin`, `manager`, `kitchen`, `waiter`, `staff`), optionally assign a branch, turn staff access on/off, and staff tokens carry role plus assigned branch context for frontend navigation and branch selection. Admin APIs now include a role/branch guard so non-owner staff cannot call owner-only routes directly, and branch-assigned staff are blocked from branch-scoped actions outside their assigned branch.

The owner onboarding flow now includes `/admin/setup`, a guided first-setup page that creates the first branch, branch order settings, starter menu category, starter menu item, and first table QR in one flow. New owner registration redirects there before the normal dashboard.

The customer order experience now includes a public tracking page at `/qr/{qrToken}/orders/{orderId}` with refreshable order status, item details, table context, and links from order confirmation and previous orders. The kitchen dashboard now uses a live four-column board for placed, accepted, preparing, and ready orders, including a new-order notice and status-focused action buttons.

The Bareilly launch roadmap is documented in `docs/BAREILLY_GO_LIVE_PLAN.md`, with phase-wise priorities for media uploads, branded QR downloads, manual subscription control, deployment, local pilot sales, and post-pilot revenue features.

## What Changed

- Added repository README.
- Added project context and Codex rules documentation.
- Added clean architecture backend project skeleton.
- Added ASP.NET Core API health endpoint.
- Added Next.js TypeScript/Tailwind frontend skeleton with placeholder customer and admin pages.
- Added SQL Server folder structure for tables, procedures, indexes, seeds, and migrations.
- Added Docker setup for API, frontend, SQL Server, and Redis.
- Added solution file linking backend projects.
- Verified backend build and API health endpoint.
- Added SQL Server table scripts for `Tenants`, `Branches`, and `BranchOrderSettings`.
- Added separate stored procedures per operation for tenant, branch, and branch order settings workflows.
- Added indexes for tenant/branch/settings access paths.
- Added Application DTOs, services, validation, repository interfaces, and result model.
- Added Infrastructure ADO.NET repositories that call stored procedures only.
- Added API v1 endpoints for tenant, branch, and branch order settings foundation.
- Added application unit tests for tenant and branch validation behavior.
- Consolidated foundation SQL into one tables file, one procedures file, and one indexes file.
- Configured development SQL Server connection for `(localdb)\MSSQLLocalDB` using Windows Integrated Security and database `master`.
- Added SQL Server error mapping for duplicate records, missing tenant/branch/settings, relationship violations, timeouts, and unavailable database cases.
- Added authentication foundation with `Users` and `TenantUsers`.
- Added owner registration and login stored procedures.
- Added application auth service, PBKDF2 password hashing, and tenant context abstraction.
- Added infrastructure auth repository that calls stored procedures only.
- Added JWT bearer authentication, token creation, and `/api/v1/me` tenant-context proof endpoint.
- Added authenticated admin branch and branch order settings APIs that resolve `TenantId` from `ITenantContext`.
- Added application unit tests for auth validation and login behavior.
- Added menu category and menu item SQL tables, stored procedures, and indexes.
- Added application menu services, validation, and repository interfaces.
- Added infrastructure menu repositories that call stored procedures only.
- Added authenticated admin menu category/item APIs that resolve `TenantId` from `ITenantContext`.
- Added public branch menu read API for QR menu browsing.
- Added application unit tests for menu category and item validation behavior.
- Added branch table SQL table, stored procedures, and indexes.
- Added application branch table service, validation, QR token generation, repository interface, and public QR menu contracts.
- Added infrastructure branch table repository that calls stored procedures only.
- Added authenticated admin table APIs for create/list/update/deactivate and QR token regeneration.
- Added public QR token menu API that resolves branch/table/order settings context before returning menu categories and items.
- Added application unit tests for table validation, name normalization, QR token generation, and public QR menu shaping.
- Added a local Postman smoke-test collection for owner auth, admin branch/menu/table APIs, and public QR menu lookup.
- Added a Postman-importable API cURL catalog and made it a required maintenance artifact for future API changes.
- Added JSON problem responses for missing, invalid, expired, and forbidden admin API tokens.
- Standardized validation, not-found, conflict, malformed-request, service-unavailable, and unexpected-error API responses as `application/problem+json`.
- Added the first frontend admin slice with login, JWT storage, authenticated API client, admin shell, branch listing, branch creation, and branch turn-off flow.
- Upgraded the first frontend admin slice from functional scaffold to polished UI with lucide icons, improved login composition, branch workspace metrics, search, table layout, modal add branch flow, and clearer confirmation/notice states.
- Added the admin branch detail workspace with authenticated menu category/item management, table QR token management, QR link copy/regeneration actions, and branch order settings create/update flow.
- Refined admin metric cards on branch list and branch detail pages to match the compact horizontal bordered card style used in the approved design reference.
- Added the public QR menu UI at `/qr/{qrToken}` with server-rendered public QR lookup, branch/table context, order-setting status, category navigation, menu item pricing, empty-menu handling, inactive QR handling, and temporary API-unavailable handling.
- Added typed frontend public QR menu API contracts and made token clearing safe when API helpers are used during server rendering.
- Upgraded the frontend to Next.js `16.2.6` and PostCSS `8.5.15`; Next.js updated TypeScript config defaults for the current App Router toolchain.
- Added the first public customer order creation backend slice at `POST /api/v1/public/qr/{qrToken}/orders`, gated by `BranchOrderSettings.EnableDirectQrOrdering` and priced from stored active menu item prices only.
- Added customer cart/order submission UI on `/qr/{qrToken}` for branches with direct QR ordering enabled, including add/remove quantity controls, required customer field handling, notes, total preview, success/error states, and typed frontend order API contracts.
- Refined the public QR menu into a cleaner mobile-first restaurant list layout with a compact sticky header, horizontal category chips, image-style item rows, yellow price emphasis, red add/cart controls, and a floating menu/cart action inspired by premium cafe menu apps.
- Updated the public QR cart behavior so item add/remove controls update the cart count inline without opening the order panel; customers open the cart explicitly from the floating action button, and the menu now uses the agreed navy/gold theme tokens instead of temporary red/yellow accents.
- Updated the public QR interaction split so the floating three-bars button opens a category sheet, while the top-right cart icon opens the selected-items cart/order panel and displays the selected item count.
- Replaced the public QR cart popup with a full in-page cart view that shows selected items, subtotal, total amount, customer fields, and the place-order action.
- Added a public QR order confirmation view after successful order submission with short order code, status, ordered items, total amount, and a back-to-menu action.
- Added a public QR previous-orders page backed by browser local storage for orders placed from the same device/browser, opened from the header orders icon and scoped per QR token.
- Added public customer order tracking links from order confirmation and previous orders, backed by the existing public order tracking API.
- Added authenticated admin order APIs for branch order listing and status updates, backed by stored procedures and tenant-scoped repository access.
- Added the admin branch detail kitchen orders panel with incoming order cards, item details, totals, customer/table context, refresh, and status transition buttons.
- Upgraded the admin kitchen dashboard to a four-column live board for placed, accepted, preparing, and ready orders with a visible new-order alert and larger status transition actions.
- Added the Bareilly phase-wise go-live roadmap covering pre-demo product polish, QR print/download, subscription control, deployment, pilot launch, pricing, and post-pilot features.
- Added `database/migrations/002_Public_Order_Runtime_Fix.sql` as an idempotent runtime migration for the public order tables, indexes, and `PublicOrder_CreateFromQrToken` procedure when deployed databases have not yet been brought up to the order slice.
- Mapped missing SQL object/procedure errors to a clear `503` database schema response instead of a generic server error.
- Added public order status tracking at `GET /api/v1/public/qr/{qrToken}/orders/{orderId}`.
- Added SignalR admin order realtime updates so branch staff dashboards refresh on new QR orders and order status changes.
- Added waiter-call workflow when `BranchOrderSettings.WaiterCallEnabled` is enabled, including SQL migration, public create API, admin list/status APIs, realtime staff events, public QR UI action, and admin waiter-call board.
- Added a local database runner at `database/scripts/run-local-db.ps1` that applies foundation tables, procedures, indexes, migrations, and optional demo seed data in order.
- Added demo smoke seed data for `Qrave`, including `owner.demo@example.com`, `Main Branch`, `Table 1`, QR token `demo-table-1`, menu items, direct ordering, and waiter calls enabled.
- Aligned the development API connection string with the local runner database `Qrave` instead of the legacy `master` database.
- Fixed public QR menu token validation so the documented demo token `demo-table-1` is accepted consistently with public order and waiter-call validation.

## Files Changed

- `README.md`
- `docs/PROJECT_CONTEXT.md`
- `docs/CODEX_RULES.md`
- `QRApp.sln`
- `docker-compose.yml`
- `.dockerignore`
- `.gitignore`
- `src/backend/QRApp.Api/QRApp.Api.csproj`
- `src/backend/QRApp.Api/Program.cs`
- `src/backend/QRApp.Api/appsettings.json`
- `src/backend/QRApp.Api/appsettings.Development.json`
- `src/backend/QRApp.Api/Dockerfile`
- `src/backend/QRApp.Api/Auth/JwtOptions.cs`
- `src/backend/QRApp.Api/Auth/TokenClaims.cs`
- `src/backend/QRApp.Api/Auth/IJwtTokenService.cs`
- `src/backend/QRApp.Api/Auth/JwtTokenService.cs`
- `src/backend/QRApp.Api/Auth/HttpTenantContext.cs`
- `src/backend/QRApp.Api/Auth/AuthProblemResponses.cs`
- `src/backend/QRApp.Api/Errors/ApiProblemResponses.cs`
- `src/backend/QRApp.Api/Errors/SqlProblemMapper.cs`
- `src/backend/QRApp.Api/Endpoints/AuthEndpoints.cs`
- `src/backend/QRApp.Api/Endpoints/AdminBranchEndpoints.cs`
- `src/backend/QRApp.Api/Endpoints/AdminMenuEndpoints.cs`
- `src/backend/QRApp.Api/Endpoints/AdminTableEndpoints.cs`
- `src/backend/QRApp.Api/Endpoints/AdminOrderEndpoints.cs`
- `src/backend/QRApp.Api/Endpoints/PublicMenuEndpoints.cs`
- `src/backend/QRApp.Api/Endpoints/PublicQrEndpoints.cs`
- `src/backend/QRApp.Api/Endpoints/PublicOrderEndpoints.cs`
- `src/backend/QRApp.Application/QRApp.Application.csproj`
- `src/backend/QRApp.Application/AssemblyReference.cs`
- `src/backend/QRApp.Domain/QRApp.Domain.csproj`
- `src/backend/QRApp.Domain/AssemblyReference.cs`
- `src/backend/QRApp.Infrastructure/QRApp.Infrastructure.csproj`
- `src/backend/QRApp.Infrastructure/AssemblyReference.cs`
- `src/backend/QRApp.Infrastructure/Data/ISqlConnectionFactory.cs`
- `src/backend/QRApp.Infrastructure/Data/SqlConnectionFactory.cs`
- `src/backend/QRApp.Infrastructure/Data/SqlCommandExtensions.cs`
- `src/backend/QRApp.Infrastructure/Data/StoredProcedures.cs`
- `src/backend/QRApp.Infrastructure/Auth/SqlAuthRepository.cs`
- `src/backend/QRApp.Infrastructure/Menus/SqlMenuCategoryRepository.cs`
- `src/backend/QRApp.Infrastructure/Menus/SqlMenuItemRepository.cs`
- `src/backend/QRApp.Infrastructure/Tables/SqlBranchTableRepository.cs`
- `src/backend/QRApp.Infrastructure/Orders/SqlOrderRepository.cs`
- `src/backend/QRApp.Infrastructure/Orders/SqlAdminOrderRepository.cs`
- `src/backend/QRApp.Infrastructure/Tenants/SqlTenantRepository.cs`
- `src/backend/QRApp.Infrastructure/Branches/SqlBranchRepository.cs`
- `src/backend/QRApp.Infrastructure/BranchOrderSettings/SqlBranchOrderSettingsRepository.cs`
- `src/backend/QRApp.Infrastructure/DependencyInjection.cs`
- `src/backend/QRApp.Shared/QRApp.Shared.csproj`
- `src/backend/QRApp.Shared/AssemblyReference.cs`
- `src/backend/QRApp.Shared/Results/OperationResult.cs`
- `src/backend/QRApp.Api/Endpoints/TenantBranchEndpoints.cs`
- `src/backend/QRApp.Application/Common/TextRules.cs`
- `src/backend/QRApp.Application/DependencyInjection.cs`
- `src/backend/QRApp.Application/Auth/AuthContracts.cs`
- `src/backend/QRApp.Application/Auth/IAuthRepository.cs`
- `src/backend/QRApp.Application/Auth/IAuthService.cs`
- `src/backend/QRApp.Application/Auth/IPasswordHasher.cs`
- `src/backend/QRApp.Application/Auth/Pbkdf2PasswordHasher.cs`
- `src/backend/QRApp.Application/Auth/AuthService.cs`
- `src/backend/QRApp.Application/Auth/ITenantContext.cs`
- `src/backend/QRApp.Application/Menus/MenuCategoryContracts.cs`
- `src/backend/QRApp.Application/Menus/MenuItemContracts.cs`
- `src/backend/QRApp.Application/Menus/IMenuCategoryRepository.cs`
- `src/backend/QRApp.Application/Menus/IMenuItemRepository.cs`
- `src/backend/QRApp.Application/Menus/IMenuCategoryService.cs`
- `src/backend/QRApp.Application/Menus/IMenuItemService.cs`
- `src/backend/QRApp.Application/Menus/MenuCategoryService.cs`
- `src/backend/QRApp.Application/Menus/MenuItemService.cs`
- `src/backend/QRApp.Application/Tables/BranchTableContracts.cs`
- `src/backend/QRApp.Application/Tables/IBranchTableRepository.cs`
- `src/backend/QRApp.Application/Tables/IBranchTableService.cs`
- `src/backend/QRApp.Application/Tables/BranchTableService.cs`
- `src/backend/QRApp.Application/Orders/OrderContracts.cs`
- `src/backend/QRApp.Application/Orders/IOrderRepository.cs`
- `src/backend/QRApp.Application/Orders/IOrderService.cs`
- `src/backend/QRApp.Application/Orders/OrderService.cs`
- `src/backend/QRApp.Application/Orders/AdminOrderContracts.cs`
- `src/backend/QRApp.Application/Orders/IAdminOrderRepository.cs`
- `src/backend/QRApp.Application/Orders/IAdminOrderService.cs`
- `src/backend/QRApp.Application/Orders/AdminOrderService.cs`
- `src/backend/QRApp.Application/Tenants/TenantContracts.cs`
- `src/backend/QRApp.Application/Tenants/ITenantRepository.cs`
- `src/backend/QRApp.Application/Tenants/ITenantService.cs`
- `src/backend/QRApp.Application/Tenants/TenantService.cs`
- `src/backend/QRApp.Application/Branches/BranchContracts.cs`
- `src/backend/QRApp.Application/Branches/IBranchRepository.cs`
- `src/backend/QRApp.Application/Branches/IBranchService.cs`
- `src/backend/QRApp.Application/Branches/BranchService.cs`
- `src/backend/QRApp.Application/BranchOrderSettings/BranchOrderSettingsContracts.cs`
- `src/backend/QRApp.Application/BranchOrderSettings/IBranchOrderSettingsRepository.cs`
- `src/backend/QRApp.Application/BranchOrderSettings/IBranchOrderSettingsService.cs`
- `src/backend/QRApp.Application/BranchOrderSettings/BranchOrderSettingsService.cs`
- `database/tables/001_Foundation_Tables.sql`
- `database/indexes/001_Foundation_Indexes.sql`
- `database/procedures/001_Foundation_Procedures.sql`
- `tests/QRApp.Application.Tests/QRApp.Application.Tests.csproj`
- `tests/QRApp.Application.Tests/GlobalUsings.cs`
- `tests/QRApp.Application.Tests/Auth/AuthServiceTests.cs`
- `tests/QRApp.Application.Tests/Menus/MenuCategoryServiceTests.cs`
- `tests/QRApp.Application.Tests/Menus/MenuItemServiceTests.cs`
- `tests/QRApp.Application.Tests/Tables/BranchTableServiceTests.cs`
- `tests/QRApp.Application.Tests/Orders/OrderServiceTests.cs`
- `tests/QRApp.Application.Tests/Tenants/TenantServiceTests.cs`
- `tests/QRApp.Application.Tests/Branches/BranchServiceTests.cs`
- `src/frontend/package.json`
- `src/frontend/package-lock.json`
- `src/frontend/next.config.mjs`
- `src/frontend/next-env.d.ts`
- `src/frontend/tsconfig.json`
- `src/frontend/tailwind.config.ts`
- `src/frontend/postcss.config.mjs`
- `src/frontend/Dockerfile`
- `src/frontend/app/globals.css`
- `src/frontend/app/layout.tsx`
- `src/frontend/app/page.tsx`
- `src/frontend/app/admin/page.tsx`
- `src/frontend/app/admin/login/page.tsx`
- `src/frontend/app/admin/branches/page.tsx`
- `src/frontend/app/admin/branches/[branchId]/page.tsx`
- `src/frontend/app/qr/[qrToken]/page.tsx`
- `src/frontend/app/qr/[qrToken]/qr-menu-client.tsx`
- `src/frontend/lib/api.ts`
- `src/frontend/lib/auth.ts`
- `database/tables/.gitkeep`
- `database/procedures/.gitkeep`
- `database/indexes/.gitkeep`
- `database/seeds/.gitkeep`
- `database/migrations/.gitkeep`
- `database/migrations/002_Public_Order_Runtime_Fix.sql`
- `database/migrations/003_Admin_Order_Workflow.sql`
- `docs/postman/QR-App.postman_collection.json`
- `docs/postman/API_CURLS.md`

## Database Changes

- Added table scripts:
  - `Tenants`
  - `Users`
  - `TenantUsers`
  - `Branches`
  - `BranchOrderSettings`
  - `MenuCategories`
  - `MenuItems`
  - `BranchTables`
  - `Orders`
  - `OrderItems`
  - `WaiterCalls`
- `Branches` and `BranchOrderSettings` include `TenantId`.
- `TenantUsers` links authenticated users to tenants and stores role codes.
- `MenuCategories` and `MenuItems` are branch-scoped and include `TenantId`.
- `BranchTables` is branch-scoped, includes `TenantId`, and stores the unique QR token for each table.
- `Orders` and `OrderItems` are tenant-owned, branch-scoped, and table-linked. Order item names and unit prices are snapshotted at order creation.
- Tenant-owned stored procedures filter by `TenantId`.
- Added tenant/branch/settings indexes.
- Added user email and tenant-user lookup indexes.
- Added menu category and item indexes for admin branch listing and public QR menu reads.
- Added branch table indexes for admin branch listing and QR token lookup.
- Added order indexes for branch dashboard/status reads and order item lookup by order.
- Foundation SQL is consolidated into one file per folder:
  - `database/tables/001_Foundation_Tables.sql`
  - `database/procedures/001_Foundation_Procedures.sql`
  - `database/indexes/001_Foundation_Indexes.sql`
- Table and index scripts are idempotent for already-created LocalDB objects.
- Stored procedure script uses `CREATE OR ALTER`.
- Development connection string points to SQL Server instance `(localdb)\MSSQLLocalDB` and database `master` with Windows Integrated Security.
- No migration runner has been added yet; scripts must be applied manually or by a future migration/deployment runner.
- Authentication stored procedures:
  - `Auth_RegisterTenantOwner`
  - `Auth_GetUserByEmail`
- Menu stored procedures:
  - `MenuCategory_Create`
  - `MenuCategory_Update`
  - `MenuCategory_GetListByBranch`
  - `MenuCategory_Deactivate`
  - `MenuItem_Create`
  - `MenuItem_Update`
  - `MenuItem_GetListByBranch`
  - `MenuItem_Deactivate`
  - `PublicMenu_GetByBranch`
- Table and QR stored procedures:
  - `BranchTable_Create`
  - `BranchTable_Update`
  - `BranchTable_GetListByBranch`
  - `BranchTable_Deactivate`
  - `BranchTable_RegenerateQrToken`
  - `PublicMenu_GetByQrToken`
- Order stored procedures:
  - `PublicOrder_CreateFromQrToken`
  - `PublicOrder_GetByQrToken`
  - `AdminOrder_GetListByBranch`
  - `AdminOrder_GetItemsByBranch`
  - `AdminOrder_UpdateStatus`
- Waiter-call stored procedures:
  - `WaiterCall_CreateFromQrToken`
  - `WaiterCall_GetListByBranch`
  - `WaiterCall_UpdateStatus`
- `database/scripts/run-local-db.ps1` applies foundation scripts, all `database/migrations/*.sql`, and optional seed data for local development.

## API Changes

- Added `GET /health`.
- Added `GET /health/live`.
- Added `POST /api/v1/auth/register-owner`.
- Added `POST /api/v1/auth/login`.
- Added `GET /api/v1/me`.
- Added `POST /api/v1/admin/branches`.
- Added `GET /api/v1/admin/branches`.
- Added `GET /api/v1/admin/branches/{branchId}`.
- Added `PUT /api/v1/admin/branches/{branchId}`.
- Added `DELETE /api/v1/admin/branches/{branchId}`.
- Added `POST /api/v1/admin/branches/{branchId}/order-settings`.
- Added `GET /api/v1/admin/branches/{branchId}/order-settings`.
- Added `PUT /api/v1/admin/branches/{branchId}/order-settings`.
- Added `POST /api/v1/admin/branches/{branchId}/menu-categories`.
- Added `GET /api/v1/admin/branches/{branchId}/menu-categories`.
- Added `PUT /api/v1/admin/branches/{branchId}/menu-categories/{menuCategoryId}`.
- Added `DELETE /api/v1/admin/branches/{branchId}/menu-categories/{menuCategoryId}`.
- Added `POST /api/v1/admin/branches/{branchId}/menu-items`.
- Added `GET /api/v1/admin/branches/{branchId}/menu-items`.
- Added `PUT /api/v1/admin/branches/{branchId}/menu-items/{menuItemId}`.
- Added `DELETE /api/v1/admin/branches/{branchId}/menu-items/{menuItemId}`.
- Added `POST /api/v1/admin/branches/{branchId}/tables`.
- Added `GET /api/v1/admin/branches/{branchId}/tables`.
- Added `PUT /api/v1/admin/branches/{branchId}/tables/{tableId}`.
- Added `DELETE /api/v1/admin/branches/{branchId}/tables/{tableId}`.
- Added `POST /api/v1/admin/branches/{branchId}/tables/{tableId}/qr-token/regenerate`.
- Added `GET /api/v1/public/branches/{branchId}/menu`.
- Added `GET /api/v1/public/qr/{qrToken}`.
- Added `POST /api/v1/public/qr/{qrToken}/orders`.
- Added `GET /api/v1/public/qr/{qrToken}/orders/{orderId}`.
- Added `GET /api/v1/admin/branches/{branchId}/orders`.
- Added `PUT /api/v1/admin/branches/{branchId}/orders/{orderId}/status`.
- Added `POST /api/v1/public/qr/{qrToken}/waiter-calls`.
- Added `GET /api/v1/admin/branches/{branchId}/waiter-calls`.
- Added `PUT /api/v1/admin/branches/{branchId}/waiter-calls/{waiterCallId}/status`.
- Added SignalR hub `/hubs/admin/orders` for authenticated branch dashboard realtime events.
- Added `POST /api/v1/tenants`.
- Added `GET /api/v1/tenants/{tenantId}`.
- Added `POST /api/v1/tenants/{tenantId}/branches`.
- Added `GET /api/v1/tenants/{tenantId}/branches`.
- Added `GET /api/v1/tenants/{tenantId}/branches/{branchId}`.
- Added `PUT /api/v1/tenants/{tenantId}/branches/{branchId}`.
- Added `DELETE /api/v1/tenants/{tenantId}/branches/{branchId}`.
- Added `POST /api/v1/tenants/{tenantId}/branches/{branchId}/order-settings`.
- Added `GET /api/v1/tenants/{tenantId}/branches/{branchId}/order-settings`.
- Added `PUT /api/v1/tenants/{tenantId}/branches/{branchId}/order-settings`.
- Protected admin APIs now return JSON `application/problem+json` responses for missing tokens, invalid tokens, expired tokens, and forbidden access.
- API validation, not-found, SQL conflict, malformed request body, unknown route, and server error responses now use a consistent `application/problem+json` shape with clear `title` and `detail` fields.
- API now maps known SQL Server errors to stable responses:
  - `409 Conflict` for duplicate tenant/branch/settings records.
  - `409 Conflict` for duplicate user email records.
  - `409 Conflict` for duplicate menu category/item records.
  - `409 Conflict` for duplicate table name or QR token records.
  - `409 Conflict` when direct QR ordering is disabled for the branch.
  - `404 Not Found` for missing tenant/branch/settings records.
  - `404 Not Found` for missing branch/category/item records in menu workflows.
  - `404 Not Found` for missing branch/table records in table workflows.
  - `404 Not Found` for inactive or missing QR table during order creation.
  - `400 Bad Request` for required customer fields or unavailable order items during order creation.
  - `400 Bad Request` for invalid admin order status updates.
  - `404 Not Found` for missing admin branch orders during status updates.
  - `400 Bad Request` for relationship constraint violations.
  - `503 Service Unavailable` for database timeout/unavailable/configuration failures.
  - `503 Service Unavailable` for missing database objects/procedures when the deployed schema is behind the API.

## Verification

- `dotnet build src/backend/QRApp.Api/QRApp.Api.csproj --no-restore` passed with 0 warnings and 0 errors using a temporary output path while the debug API process was running.
- Runtime check for `GET /health` returned `Healthy`.
- `dotnet test QRApp.sln --no-restore` passed: 11 tests.
- `dotnet test QRApp.sln --no-restore` passed: 14 tests after table/QR token foundation.
- `dotnet build QRApp.sln --no-restore` passed with 0 warnings and 0 errors after table/QR token foundation.
- Runtime check for `GET /health` passed after LocalDB/error handling changes.
- Backend source scan found no inline SQL patterns.
- Frontend build now runs after installing `node_modules`.
- Postman collection was added but not executed yet; LocalDB scripts must be applied before running the full workflow.
- API cURL catalog was added for Postman import/reference and was not runtime executed.
- API build to temporary output passed with 0 warnings and 0 errors after auth problem response changes.
- Temporary runtime checks confirmed missing-token and invalid-token admin requests return clear JSON `401` problem responses.
- Temporary runtime checks confirmed malformed JSON returns JSON `400`, missing token returns JSON `401`, unknown route returns JSON `404`, and validation failures return JSON `400` with an `errors` object.
- `npm install` completed for the frontend and generated `package-lock.json`.
- `npm run build` passed for the frontend admin login and branches slice.
- Frontend dev server was started at `http://localhost:3000`; `/admin/login` returned HTTP 200.
- `lucide-react` was added for professional icons in admin navigation, buttons, status cards, and dialogs.
- `npm run build` passed again after the frontend UI polish pass.
- `cmd /c "set NODE_OPTIONS=--max-old-space-size=4096&& npm run build"` passed after adding the admin branch detail workspace. A normal PowerShell `npm run build` is blocked by local script execution policy, and the default Node heap ran out of memory during Next.js production build.
- `cmd /c "set NODE_OPTIONS=--max-old-space-size=4096&& npm run build"` passed after the admin metric card UI refinement.
- `cmd /c "set NODE_OPTIONS=--max-old-space-size=4096&& npm run build"` passed after adding the public QR menu UI and temporary API-unavailable state. Next.js reports `/qr/[qrToken]` as a dynamic server-rendered route.
- Local frontend dev server was started at `http://localhost:3000`; `/qr/test-token` returned HTTP 200 with the backend unavailable fallback state.
- `npm install next@16.2.6` and `npm install --save-dev postcss@8.5.15` completed. `npm audit` still reports two moderate findings through Next's bundled `postcss`; npm's suggested fix is an invalid downgrade to Next `9.3.3`, so it was not applied.
- `cmd /c "set NODE_OPTIONS=--max-old-space-size=4096&& npm run build"` passed after the Next.js and PostCSS upgrades.
- `dotnet test "E:\ETPL-04\Jatin\Transferdata\QR-App\QRApp.sln" --no-restore` passed: 18 tests.
- `dotnet build "E:\ETPL-04\Jatin\Transferdata\QR-App\QRApp.sln" --no-restore` passed with 0 warnings and 0 errors.
- Frontend production server was started at `http://localhost:3000`; `/qr/test-token` returned HTTP 200 with the backend unavailable fallback state. Next.js 16 `dev` mode returned empty HTTP 500 responses on this Windows workspace, so the verified local server is running with `npm run start`.
- `cmd /c "set NODE_OPTIONS=--max-old-space-size=4096&& npm run build"` passed after adding the public customer cart/order submission UI.
- `cmd /c "set NODE_OPTIONS=--max-old-space-size=4096&& npm run build"` passed after the public QR menu visual refresh.
- `cmd /c "set NODE_OPTIONS=--max-old-space-size=4096&& npm run build"` passed after the public QR cart behavior/theme refinement.
- `cmd /c "set NODE_OPTIONS=--max-old-space-size=4096&& npm run build"` passed after splitting category navigation and selected-item cart actions.
- `cmd /c "set NODE_OPTIONS=--max-old-space-size=4096&& npm run build"` passed after replacing the cart popup with a full cart page view.
- `cmd /c "set NODE_OPTIONS=--max-old-space-size=4096&& npm run build"` passed after adding the public QR order confirmation view.
- `cmd /c "set NODE_OPTIONS=--max-old-space-size=4096&& npm run build"` passed after adding the browser-backed public QR previous-orders page.
- `dotnet build src\backend\QRApp.Api\QRApp.Api.csproj --no-restore` passed with a temporary output path after adding the admin order workflow.
- `dotnet test tests\QRApp.Application.Tests\QRApp.Application.Tests.csproj --no-build` passed: 18 tests.
- `cmd /c "set NODE_OPTIONS=--max-old-space-size=4096&& npm run build"` passed after adding the admin kitchen orders panel.
- `npm run lint` is currently blocked by the local Next.js 16 CLI behavior resolving `lint` as an invalid project directory (`Q:\lint`); production build and TypeScript checks pass through `npm run build`.
- Added a targeted public order runtime migration after a production-style order submission returned a generic database 500, consistent with the deployed database missing the latest order tables/procedure.
- After syncing latest GitHub code on June 1, 2026, `dotnet build QRApp.sln --no-restore` passed with 0 warnings and 0 errors.
- After syncing latest GitHub code on June 1, 2026, `dotnet test QRApp.sln --no-build` passed: 26 tests.
- After restoring frontend dependencies with `npm install`, `cmd /c "set NODE_OPTIONS=--max-old-space-size=4096&& npm --prefix E:\ETPL-04\Jatin\Transferdata\QR-App\src\frontend run build"` passed.
- `database/scripts/run-local-db.ps1 -Server "(localdb)\MSSQLLocalDB" -Database "Qrave" -Seed` completed and applied foundation scripts, migrations `002` through `006`, and demo smoke seed data.
- Runtime API smoke test against `http://localhost:59127` passed for health, demo owner login, public QR menu lookup for `demo-table-1`, public order creation, admin order listing, public waiter-call creation, and admin waiter-call listing.
- Frontend production runtime check against `http://localhost:3000/qr/demo-table-1` returned HTTP 200 and included seeded menu content.

## Pending Work

- Add integration tests against SQL Server for stored procedures.
- Add a production/deployment migration runner; the current runner is local-development oriented.
- Existing tenant/branch endpoints still accept `tenantId` in route for foundation testing only.
- Apply `database/migrations/002_Public_Order_Runtime_Fix.sql` to any deployed database that returns a schema-related error from `POST /api/v1/public/qr/{qrToken}/orders`.
- Apply `database/migrations/003_Admin_Order_Workflow.sql` to deployed databases before using the admin kitchen order dashboard.
- Apply `database/migrations/006_Waiter_Call_Workflow.sql` to deployed databases before using public/admin waiter-call flows.
- Public QR menu lookup by `branchId` still exists for foundation testing, but `/api/v1/public/qr/{qrToken}` is now the production-oriented lookup path.
- Investigate the Next.js 16 local `dev` server empty HTTP 500 behavior on this Windows workspace; production build/start works.
- Investigate the Next.js 16 `next lint`/lint script behavior on this Windows workspace; `npm run lint` currently resolves `lint` as an invalid project directory.

## Next Recommended Task

Add SQL Server integration tests for the stored procedures and critical API/database workflows, starting with demo seed setup, public QR menu lookup, public order creation/tracking, admin order status updates, public waiter-call creation, and admin waiter-call status updates.

## Frontend CSS/Tailwind Setup

- The Next.js admin frontend imports `./globals.css` from `src/frontend/app/layout.tsx`.
- Tailwind is configured for Tailwind CSS 3.x using `@tailwind base`, `@tailwind components`, and `@tailwind utilities` in `src/frontend/app/globals.css`.
- PostCSS uses `src/frontend/postcss.config.js` with `tailwindcss` and `autoprefixer`.
- Tailwind scans `app`, `pages`, `components`, `lib`, local `src`, and nearby shared/package folders so admin page utility classes are generated.
- The downloaded Stitch "Premium Hospitality Suite" design system is mapped into `src/frontend/tailwind.config.ts` and `src/frontend/app/globals.css`, including Public Sans, navy/gold brand colors, surface/on-surface token aliases, dashboard spacing/radius tokens, and shared prototype utilities such as `glass-panel` and `soft-saas-shadow`.
- `src/frontend/components/admin-shell.tsx` provides the shared premium admin sidebar/header shell. `/admin/login` and `/admin/branches` have been visually adapted to the mapped design while preserving their existing auth, API, and branch-management logic.
