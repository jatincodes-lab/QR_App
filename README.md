# Qrave

Qrave is a multi-tenant QR menu and table-ordering SaaS for cafes and restaurants.

## Current Capabilities

- ASP.NET Core Web API with clean architecture project layout.
- Next.js admin and public QR frontend.
- Owner login with JWT authentication.
- Admin branch, order settings, menu category, menu item, and table management.
- Public QR menu browsing and customer order placement.
- Admin kitchen/order dashboard with order status updates.
- SQL Server schema, procedures, indexes, migrations, and seed scripts.
- Docker Compose setup for API, frontend, SQL Server, and Redis.

## Architecture

Backend projects:

- `src/backend/QRApp.Api`
- `src/backend/QRApp.Application`
- `src/backend/QRApp.Domain`
- `src/backend/QRApp.Infrastructure`
- `src/backend/QRApp.Shared`

Frontend:

- `src/frontend`

Database scripts:

- `database/tables/001_Foundation_Tables.sql`
- `database/procedures/001_Foundation_Procedures.sql`
- `database/indexes/001_Foundation_Indexes.sql`
- `database/migrations`
- `database/seeds`

## Local Development

### Backend

```powershell
dotnet build QRApp.sln
dotnet run --project src/backend/QRApp.Api
```

Development URLs:

```text
https://localhost:59126
http://localhost:59127
```

Health endpoints:

```text
GET http://localhost:59127/health
GET http://localhost:59127/health/live
```

### Frontend

```powershell
cd src/frontend
npm install
npm run dev
```

Frontend URL:

```text
http://localhost:3000
```

The frontend defaults to the local API at `http://localhost:59127`. Override with `NEXT_PUBLIC_API_BASE_URL` when needed.

## Demo Seed Data

Apply the database scripts with the local runner. Windows authentication is the default:

```powershell
powershell -ExecutionPolicy Bypass -File database\scripts\run-local-db.ps1 -Server "localhost" -Database "Qrave"
```

To also load demo data:

```powershell
powershell -ExecutionPolicy Bypass -File database\scripts\run-local-db.ps1 -Server "localhost" -Database "Qrave" -Seed
```

For SQL authentication:

```powershell
powershell -ExecutionPolicy Bypass -File database\scripts\run-local-db.ps1 -Server "localhost,1433" -Database "Qrave" -UseSqlAuth -User "sa" -Password "Your_password" -Seed
```

The runner applies foundation tables, procedures, indexes, migrations, and optionally the demo seed in the correct order.

You can also run the demo seed directly after applying the foundation and migration scripts:

```powershell
sqlcmd -S "(localdb)\MSSQLLocalDB" -d Qrave -E -C -b -i database\seeds\001_Demo_Smoke_Data.sql
```

The seed is idempotent and can be rerun.

Demo admin login:

```text
owner.demo@example.com
TestPass123!
```

Demo public QR URL:

```text
http://localhost:3000/qr/demo-table-1
```

Seeded records:

- Tenant: `demo-cafe`
- Branch: `Main Branch`
- Table: `Table 1`
- QR token: `demo-table-1`
- Menu categories and items
- Direct QR ordering enabled

## Smoke Test

1. Start backend and frontend.
2. Run the demo seed.
3. Login at `http://localhost:3000/admin/login`.
4. Open `Main Branch`.
5. Open `http://localhost:3000/qr/demo-table-1`.
6. Add an item and place an order.
7. Confirm the order appears in the admin kitchen/orders panel.
8. Update the order status.

## Docker

```powershell
docker compose up --build
```

Services:

- API: `http://localhost:5000`
- Frontend: `http://localhost:3000`
- SQL Server: `localhost,1433`
- Redis: `localhost:6379`

## Development Rules

Read these before changing code:

- `docs/PROJECT_CONTEXT.md`
- `docs/CODEX_RULES.md`
