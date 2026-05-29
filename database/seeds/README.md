# Database Seeds

## Demo Smoke Data

Run `001_Demo_Smoke_Data.sql` after the foundation table/procedure scripts have been applied.

```powershell
sqlcmd -S "(localdb)\MSSQLLocalDB" -d master -E -C -b -i database\seeds\001_Demo_Smoke_Data.sql
```

The script is idempotent and can be rerun. It creates or updates:

- tenant: `demo-cafe`
- owner login: `owner.demo@example.com` / `TestPass123!`
- branch: `Main Branch`
- direct QR ordering settings
- menu categories and items
- table QR token: `demo-table-1`

Local public QR URL:

```text
http://localhost:3000/qr/demo-table-1
```
