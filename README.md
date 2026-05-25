# QR-App

Industry-focused multi-tenant QR menu and table-ordering SaaS for cafes and restaurants.

## Scope

This repository is intentionally built step by step. The current foundation contains:

- ASP.NET Core Web API backend skeleton
- Clean architecture project layout
- Next.js admin/customer frontend skeleton
- SQL Server script folders
- Docker Compose setup for API, frontend, SQL Server, and Redis
- Health endpoint for deployment checks

Business modules are not implemented yet.

## Architecture

Backend follows a modular monolith with clean architecture boundaries:

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
- `database/seeds`
- `database/migrations`

## Local Development

### Backend

```powershell
dotnet build QRApp.sln
dotnet run --project src/backend/QRApp.Api
```

Development SQL Server connection uses LocalDB with Windows Integrated Security:

```text
Server=(localdb)\MSSQLLocalDB;Database=master;Integrated Security=True;
```

Health endpoint:

```text
GET /health
GET /health/live
```

### Frontend

```powershell
cd src/frontend
npm install
npm run dev
```

### Docker

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
