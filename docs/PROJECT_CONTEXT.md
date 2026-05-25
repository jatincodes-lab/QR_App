# Project Context

## Product

Multi-tenant QR menu and table-ordering SaaS for cafes and restaurants.

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

Base project structure has been created. The first backend foundation slice now supports tenants, branches, branch order settings, owner registration, login, JWT authentication, tenant context resolution, authenticated admin branch/settings APIs, menu category/item foundations, branch table management, and QR token public menu resolution through SQL Server stored procedures and minimal v1 APIs.

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
- `src/backend/QRApp.Api/Errors/SqlProblemMapper.cs`
- `src/backend/QRApp.Api/Endpoints/AuthEndpoints.cs`
- `src/backend/QRApp.Api/Endpoints/AdminBranchEndpoints.cs`
- `src/backend/QRApp.Api/Endpoints/AdminMenuEndpoints.cs`
- `src/backend/QRApp.Api/Endpoints/AdminTableEndpoints.cs`
- `src/backend/QRApp.Api/Endpoints/PublicMenuEndpoints.cs`
- `src/backend/QRApp.Api/Endpoints/PublicQrEndpoints.cs`
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
- `tests/QRApp.Application.Tests/Tenants/TenantServiceTests.cs`
- `tests/QRApp.Application.Tests/Branches/BranchServiceTests.cs`
- `src/frontend/package.json`
- `src/frontend/next.config.mjs`
- `src/frontend/tsconfig.json`
- `src/frontend/tailwind.config.ts`
- `src/frontend/postcss.config.mjs`
- `src/frontend/Dockerfile`
- `src/frontend/app/globals.css`
- `src/frontend/app/layout.tsx`
- `src/frontend/app/page.tsx`
- `src/frontend/app/admin/page.tsx`
- `database/tables/.gitkeep`
- `database/procedures/.gitkeep`
- `database/indexes/.gitkeep`
- `database/seeds/.gitkeep`
- `database/migrations/.gitkeep`

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
- `Branches` and `BranchOrderSettings` include `TenantId`.
- `TenantUsers` links authenticated users to tenants and stores role codes.
- `MenuCategories` and `MenuItems` are branch-scoped and include `TenantId`.
- `BranchTables` is branch-scoped, includes `TenantId`, and stores the unique QR token for each table.
- Tenant-owned stored procedures filter by `TenantId`.
- Added tenant/branch/settings indexes.
- Added user email and tenant-user lookup indexes.
- Added menu category and item indexes for admin branch listing and public QR menu reads.
- Added branch table indexes for admin branch listing and QR token lookup.
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
- API now maps known SQL Server errors to stable responses:
  - `409 Conflict` for duplicate tenant/branch/settings records.
  - `409 Conflict` for duplicate user email records.
  - `409 Conflict` for duplicate menu category/item records.
  - `409 Conflict` for duplicate table name or QR token records.
  - `404 Not Found` for missing tenant/branch/settings records.
  - `404 Not Found` for missing branch/category/item records in menu workflows.
  - `404 Not Found` for missing branch/table records in table workflows.
  - `400 Bad Request` for relationship constraint violations.
  - `503 Service Unavailable` for database timeout/unavailable/configuration failures.

## Verification

- `dotnet build src/backend/QRApp.Api/QRApp.Api.csproj --no-restore` passed with 0 warnings and 0 errors using a temporary output path while the debug API process was running.
- Runtime check for `GET /health` returned `Healthy`.
- `dotnet test QRApp.sln --no-restore` passed: 11 tests.
- `dotnet test QRApp.sln --no-restore` passed: 14 tests after table/QR token foundation.
- `dotnet build QRApp.sln --no-restore` passed with 0 warnings and 0 errors after table/QR token foundation.
- Runtime check for `GET /health` passed after LocalDB/error handling changes.
- Backend source scan found no inline SQL patterns.
- Frontend build was skipped because `node_modules` is not installed yet.

## Pending Work

- Add a migration/deployment runner or documented SQL script execution order.
- Add integration tests against SQL Server for stored procedures.
- LocalDB is currently configured to use the `master` database because that is where the existing local objects were created.
- Apply the new auth SQL scripts to LocalDB before runtime auth testing.
- Existing tenant/branch endpoints still accept `tenantId` in route for foundation testing only.
- Apply the new menu SQL scripts to LocalDB before runtime menu testing.
- Apply the new table/QR SQL scripts to LocalDB before runtime table and QR token testing.
- Public QR menu lookup by `branchId` still exists for foundation testing, but `/api/v1/public/qr/{qrToken}` is now the production-oriented lookup path.
- Add frontend admin and QR menu flows after backend contracts are defined.
- Add frontend package lock and run frontend build after `npm install`.

## Next Recommended Task

Apply the foundation SQL scripts to LocalDB, smoke-test owner login plus admin branch/menu/table APIs, then start frontend admin screens against the authenticated admin APIs.
