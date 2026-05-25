# CODEX Rules

These rules must be followed for every task in this repository.

## Product Discipline

- Build step by step. Do not implement the full SaaS in one task.
- Do not add unnecessary features.
- Keep admin and staff panels simple, clean, and usable during restaurant rush hours.
- Keep the customer QR menu fast on mobile.

## Required Workflow

1. Read `docs/PROJECT_CONTEXT.md` before changing code.
2. Explain what will change.
3. Modify only the required files.
4. Create or update SQL files first when database changes are needed.
5. Run build/test checks when possible.
6. Update `docs/PROJECT_CONTEXT.md` after every change.
7. Report changed files and the next recommended task.

## Architecture

- Use a modular monolith, not microservices.
- Use clean architecture boundaries:
  - Api
  - Application
  - Domain
  - Infrastructure
  - Shared
- Use ASP.NET Core 8 Web API for backend code.
- Use Next.js, TypeScript, and Tailwind for frontend code.
- Use SQL Server. Do not use PostgreSQL.
- Use SignalR for realtime workflows when implemented.
- Use Redis only where needed.
- Use Hangfire only where needed.

## Tenant Safety

- Every tenant-owned table must have `TenantId`.
- Every tenant-owned query and stored procedure must filter by `TenantId`.
- Never leak data between restaurants or tenants.
- Backend authorization and data access must enforce tenant boundaries.

## Database Discipline

- Never use inline SQL inside application code.
- Application code must call stored procedures for database operations.
- Table creation scripts must be kept in a single consolidated SQL file under `database/tables/` unless a future migration requires a clearly versioned split.
- Stored procedures must be kept in a single consolidated SQL file under `database/procedures/` unless a future migration requires a clearly versioned split.
- Every seed script must be in `database/seeds/`.
- Index scripts must be kept in a single consolidated SQL file under `database/indexes/` unless a future migration requires a clearly versioned split.
- Migration or deployment scripts must be placed in `database/migrations/`.
- Add indexes on `TenantId`, `BranchId`, QR token fields, `OrderId`, `CreatedAt`, and status fields where relevant.

## Ordering Rules

- Never trust frontend prices.
- Always calculate order totals on the backend from stored menu prices.
- `BranchOrderSettings.EnableDirectQrOrdering` controls direct QR ordering.
- If direct QR ordering is disabled, customers can browse and call waiter only.
- Backend must block order creation when direct ordering is disabled.

## Quality

- Add validation, error handling, logs, and tests for each implemented module.
- Keep API contracts version-safe and production-oriented.
- Keep DTOs explicit and stable.
- Avoid heavy joins in customer-facing APIs.
- Use optimized API responses for QR menu pages.
