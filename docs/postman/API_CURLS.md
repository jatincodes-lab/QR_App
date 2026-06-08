# QR-App API cURL Catalog

Use this file as the source of Postman-importable cURL examples.

Maintenance rule: whenever an API route, request body, auth requirement, or response-driving path variable is added or changed, update this file in the same change.

## Variables

These examples use Postman collection variables:

- `baseUrl`: `http://localhost:59127`
- `accessToken`: JWT returned by login/register
- `tenantId`: foundation tenant ID
- `branchId`: admin/foundation branch ID
- `menuCategoryId`: menu category ID
- `menuItemId`: menu item ID
- `tableId`: branch table ID
- `qrToken`: table QR token
- `orderId`: customer order ID

## Health

### GET /health

```bash
curl --request GET "{{baseUrl}}/health"
```

### GET /health/live

```bash
curl --request GET "{{baseUrl}}/health/live"
```

## Auth

API failures return `application/problem+json` with a consistent shape.

Missing token:

```json
{
  "type": "https://httpstatuses.com/401",
  "title": "Authentication required",
  "status": 401,
  "detail": "Access token is required. Send an Authorization header using the Bearer token format."
}
```

Invalid token:

```json
{
  "type": "https://httpstatuses.com/401",
  "title": "Authentication required",
  "status": 401,
  "detail": "Access token could not be authenticated. Login again and send a valid Bearer token."
}
```

Valid token without required access:

```json
{
  "type": "https://httpstatuses.com/403",
  "title": "Access denied",
  "status": 403,
  "detail": "Your token is valid, but it does not have permission to access this resource."
}
```

Validation failure:

```json
{
  "type": "https://httpstatuses.com/400",
  "title": "Request validation failed",
  "status": 400,
  "detail": "One or more fields need attention.",
  "errors": {
    "Name": [
      "Name is required."
    ]
  }
}
```

Bad request or malformed JSON:

```json
{
  "type": "https://httpstatuses.com/400",
  "title": "Bad request",
  "status": 400,
  "detail": "The request body, route value, or query value is invalid."
}
```

Not found:

```json
{
  "type": "https://httpstatuses.com/404",
  "title": "Not found",
  "status": 404,
  "detail": "The requested API endpoint was not found."
}
```

Conflict:

```json
{
  "type": "https://httpstatuses.com/409",
  "title": "Conflict",
  "status": 409,
  "detail": "A record with the same unique value already exists."
}
```

### POST /api/v1/auth/register-owner

```bash
curl --request POST "{{baseUrl}}/api/v1/auth/register-owner" \
  --header "Content-Type: application/json" \
  --data '{
    "tenantName": "Demo Cafe",
    "tenantSlug": "demo-cafe",
    "ownerEmail": "owner.demo@example.com",
    "ownerDisplayName": "Demo Owner",
    "password": "TestPass123!"
  }'
```

### POST /api/v1/auth/login

```bash
curl --request POST "{{baseUrl}}/api/v1/auth/login" \
  --header "Content-Type: application/json" \
  --data '{
    "email": "owner.demo@example.com",
    "password": "TestPass123!"
  }'
```

### GET /api/v1/me

```bash
curl --request GET "{{baseUrl}}/api/v1/me" \
  --header "Authorization: Bearer {{accessToken}}"
```

## Admin Branches

### POST /api/v1/admin/branches

```bash
curl --request POST "{{baseUrl}}/api/v1/admin/branches" \
  --header "Authorization: Bearer {{accessToken}}" \
  --header "Content-Type: application/json" \
  --data '{
    "name": "Main Branch",
    "phoneNumber": "+91 9876543210",
    "addressLine1": "MG Road",
    "addressLine2": null,
    "city": "Ahmedabad",
    "state": "Gujarat",
    "postalCode": "380001",
    "countryCode": "IN"
  }'
```

### GET /api/v1/admin/branches

```bash
curl --request GET "{{baseUrl}}/api/v1/admin/branches?includeInactive=false" \
  --header "Authorization: Bearer {{accessToken}}"
```

### GET /api/v1/admin/branches/{branchId}

```bash
curl --request GET "{{baseUrl}}/api/v1/admin/branches/{{branchId}}" \
  --header "Authorization: Bearer {{accessToken}}"
```

### PUT /api/v1/admin/branches/{branchId}

```bash
curl --request PUT "{{baseUrl}}/api/v1/admin/branches/{{branchId}}" \
  --header "Authorization: Bearer {{accessToken}}" \
  --header "Content-Type: application/json" \
  --data '{
    "name": "Main Branch",
    "phoneNumber": "+91 9876543210",
    "addressLine1": "MG Road",
    "addressLine2": null,
    "city": "Ahmedabad",
    "state": "Gujarat",
    "postalCode": "380001",
    "countryCode": "IN",
    "isActive": true
  }'
```

### DELETE /api/v1/admin/branches/{branchId}

```bash
curl --request DELETE "{{baseUrl}}/api/v1/admin/branches/{{branchId}}" \
  --header "Authorization: Bearer {{accessToken}}"
```

## Admin Branch Order Settings

### POST /api/v1/admin/branches/{branchId}/order-settings

```bash
curl --request POST "{{baseUrl}}/api/v1/admin/branches/{{branchId}}/order-settings" \
  --header "Authorization: Bearer {{accessToken}}" \
  --header "Content-Type: application/json" \
  --data '{
    "enableDirectQrOrdering": true,
    "requireCustomerName": true,
    "requireCustomerWhatsApp": false,
    "waiterCallEnabled": true
  }'
```

### GET /api/v1/admin/branches/{branchId}/order-settings

```bash
curl --request GET "{{baseUrl}}/api/v1/admin/branches/{{branchId}}/order-settings" \
  --header "Authorization: Bearer {{accessToken}}"
```

### PUT /api/v1/admin/branches/{branchId}/order-settings

```bash
curl --request PUT "{{baseUrl}}/api/v1/admin/branches/{{branchId}}/order-settings" \
  --header "Authorization: Bearer {{accessToken}}" \
  --header "Content-Type: application/json" \
  --data '{
    "enableDirectQrOrdering": true,
    "requireCustomerName": true,
    "requireCustomerWhatsApp": false,
    "waiterCallEnabled": true
  }'
```

## Admin Menu Categories

### POST /api/v1/admin/branches/{branchId}/menu-categories

```bash
curl --request POST "{{baseUrl}}/api/v1/admin/branches/{{branchId}}/menu-categories" \
  --header "Authorization: Bearer {{accessToken}}" \
  --header "Content-Type: application/json" \
  --data '{
    "name": "Beverages",
    "displayOrder": 1
  }'
```

### GET /api/v1/admin/branches/{branchId}/menu-categories

```bash
curl --request GET "{{baseUrl}}/api/v1/admin/branches/{{branchId}}/menu-categories?includeInactive=false" \
  --header "Authorization: Bearer {{accessToken}}"
```

### PUT /api/v1/admin/branches/{branchId}/menu-categories/{menuCategoryId}

```bash
curl --request PUT "{{baseUrl}}/api/v1/admin/branches/{{branchId}}/menu-categories/{{menuCategoryId}}" \
  --header "Authorization: Bearer {{accessToken}}" \
  --header "Content-Type: application/json" \
  --data '{
    "name": "Beverages",
    "displayOrder": 1,
    "isActive": true
  }'
```

### DELETE /api/v1/admin/branches/{branchId}/menu-categories/{menuCategoryId}

```bash
curl --request DELETE "{{baseUrl}}/api/v1/admin/branches/{{branchId}}/menu-categories/{{menuCategoryId}}" \
  --header "Authorization: Bearer {{accessToken}}"
```

## Admin Menu Items

### POST /api/v1/admin/branches/{branchId}/menu-items

```bash
curl --request POST "{{baseUrl}}/api/v1/admin/branches/{{branchId}}/menu-items" \
  --header "Authorization: Bearer {{accessToken}}" \
  --header "Content-Type: application/json" \
  --data '{
    "menuCategoryId": "{{menuCategoryId}}",
    "name": "Masala Tea",
    "description": "Fresh milk tea with spices",
    "price": 25.00,
    "isAvailable": true,
    "displayOrder": 1
  }'
```

### GET /api/v1/admin/branches/{branchId}/menu-items

```bash
curl --request GET "{{baseUrl}}/api/v1/admin/branches/{{branchId}}/menu-items?includeInactive=false" \
  --header "Authorization: Bearer {{accessToken}}"
```

### PUT /api/v1/admin/branches/{branchId}/menu-items/{menuItemId}

```bash
curl --request PUT "{{baseUrl}}/api/v1/admin/branches/{{branchId}}/menu-items/{{menuItemId}}" \
  --header "Authorization: Bearer {{accessToken}}" \
  --header "Content-Type: application/json" \
  --data '{
    "menuCategoryId": "{{menuCategoryId}}",
    "name": "Masala Tea",
    "description": "Fresh milk tea with spices",
    "price": 25.00,
    "isAvailable": true,
    "isActive": true,
    "displayOrder": 1
  }'
```

### DELETE /api/v1/admin/branches/{branchId}/menu-items/{menuItemId}

```bash
curl --request DELETE "{{baseUrl}}/api/v1/admin/branches/{{branchId}}/menu-items/{{menuItemId}}" \
  --header "Authorization: Bearer {{accessToken}}"
```

## Admin Tables

### POST /api/v1/admin/branches/{branchId}/tables

```bash
curl --request POST "{{baseUrl}}/api/v1/admin/branches/{{branchId}}/tables" \
  --header "Authorization: Bearer {{accessToken}}" \
  --header "Content-Type: application/json" \
  --data '{
    "name": "Table 1",
    "displayOrder": 1
  }'
```

### GET /api/v1/admin/branches/{branchId}/tables

```bash
curl --request GET "{{baseUrl}}/api/v1/admin/branches/{{branchId}}/tables?includeInactive=false" \
  --header "Authorization: Bearer {{accessToken}}"
```

### PUT /api/v1/admin/branches/{branchId}/tables/{tableId}

```bash
curl --request PUT "{{baseUrl}}/api/v1/admin/branches/{{branchId}}/tables/{{tableId}}" \
  --header "Authorization: Bearer {{accessToken}}" \
  --header "Content-Type: application/json" \
  --data '{
    "name": "Table 1",
    "displayOrder": 1,
    "isActive": true
  }'
```

### DELETE /api/v1/admin/branches/{branchId}/tables/{tableId}

```bash
curl --request DELETE "{{baseUrl}}/api/v1/admin/branches/{{branchId}}/tables/{{tableId}}" \
  --header "Authorization: Bearer {{accessToken}}"
```

### POST /api/v1/admin/branches/{branchId}/tables/{tableId}/qr-token/regenerate

```bash
curl --request POST "{{baseUrl}}/api/v1/admin/branches/{{branchId}}/tables/{{tableId}}/qr-token/regenerate" \
  --header "Authorization: Bearer {{accessToken}}"
```

## Admin Orders

### GET /api/v1/admin/branches/{branchId}/orders

```bash
curl --request GET "{{baseUrl}}/api/v1/admin/branches/{{branchId}}/orders?includeCompleted=false" \
  --header "Authorization: Bearer {{accessToken}}"
```

### PUT /api/v1/admin/branches/{branchId}/orders/{orderId}/status

```bash
curl --request PUT "{{baseUrl}}/api/v1/admin/branches/{{branchId}}/orders/{{orderId}}/status" \
  --header "Authorization: Bearer {{accessToken}}" \
  --header "Content-Type: application/json" \
  --data '{
    "orderStatusCode": "Preparing"
  }'
```

## Admin Waiter Calls

### GET /api/v1/admin/branches/{branchId}/waiter-calls

```bash
curl --request GET "{{baseUrl}}/api/v1/admin/branches/{{branchId}}/waiter-calls?includeResolved=false" \
  --header "Authorization: Bearer {{accessToken}}"
```

### PUT /api/v1/admin/branches/{branchId}/waiter-calls/{waiterCallId}/status

```bash
curl --request PUT "{{baseUrl}}/api/v1/admin/branches/{{branchId}}/waiter-calls/{{waiterCallId}}/status" \
  --header "Authorization: Bearer {{accessToken}}" \
  --header "Content-Type: application/json" \
  --data '{
    "statusCode": "Acknowledged"
  }'
```

## Public Menu

### GET /api/v1/public/branches/{branchId}/menu

```bash
curl --request GET "{{baseUrl}}/api/v1/public/branches/{{branchId}}/menu"
```

### GET /api/v1/public/qr/{qrToken}

```bash
curl --request GET "{{baseUrl}}/api/v1/public/qr/{{qrToken}}"
```

### POST /api/v1/public/qr/{qrToken}/orders

Creates a customer order from a table QR token. The backend calculates prices from active menu items and blocks creation when direct QR ordering is disabled for the branch.

```bash
curl --request POST "{{baseUrl}}/api/v1/public/qr/{{qrToken}}/orders" \
  --header "Content-Type: application/json" \
  --data '{
    "customerName": "Priya Shah",
    "customerWhatsApp": "+91 9876543210",
    "notes": "Less spicy",
    "items": [
      {
        "menuItemId": "{{menuItemId}}",
        "quantity": 2
      }
    ]
  }'
```

### GET /api/v1/public/qr/{qrToken}/orders/{orderId}

Reads a previously placed public QR order scoped to the same table QR token. Use this for customer-facing order status refresh.

```bash
curl --request GET "{{baseUrl}}/api/v1/public/qr/{{qrToken}}/orders/{{orderId}}"
```

### POST /api/v1/public/qr/{qrToken}/waiter-calls

Creates a waiter-call request from a table QR token when waiter calls are enabled for the branch.

```bash
curl --request POST "{{baseUrl}}/api/v1/public/qr/{{qrToken}}/waiter-calls" \
  --header "Content-Type: application/json" \
  --data '{
    "customerName": "Priya Shah",
    "note": "Need water"
  }'
```

## Admin Campaign Routes

These routes require `Authorization: Bearer {{accessToken}}`.

### GET /api/v1/admin/campaigns

Lists the latest WhatsApp campaign queues for the tenant, optionally scoped to a branch.

```bash
curl --request GET "{{baseUrl}}/api/v1/admin/campaigns?branchId={{branchId}}" \
  --header "Authorization: Bearer {{accessToken}}"
```

### GET /api/v1/admin/campaigns/preview

Returns the number of opted-in customers that match a target segment.

```bash
curl --request GET "{{baseUrl}}/api/v1/admin/campaigns/preview?branchId={{branchId}}&targetSegment=AllOptedIn" \
  --header "Authorization: Bearer {{accessToken}}"
```

Allowed `targetSegment` values:

- `AllOptedIn`
- `RepeatCustomers`
- `InactiveCustomers`
- `HighValueCustomers`

### POST /api/v1/admin/campaigns

Creates a queued WhatsApp campaign and recipient rows for opted-in customers. Provider delivery is handled by the later WhatsApp Business API integration.

```bash
curl --request POST "{{baseUrl}}/api/v1/admin/campaigns" \
  --header "Authorization: Bearer {{accessToken}}" \
  --header "Content-Type: application/json" \
  --data '{
    "branchId": "{{branchId}}",
    "name": "Weekend offer",
    "targetSegment": "AllOptedIn",
    "messageText": "Hi {{name}}, we have a fresh offer this weekend. Visit us today."
  }'
```

## Admin Staff Routes

These routes require `Authorization: Bearer {{accessToken}}` from an owner account.

### GET /api/v1/admin/staff

Lists tenant users and staff accounts.

```bash
curl --request GET "{{baseUrl}}/api/v1/admin/staff?includeInactive=true" \
  --header "Authorization: Bearer {{accessToken}}"
```

### POST /api/v1/admin/staff

Creates a staff login for the tenant.

```bash
curl --request POST "{{baseUrl}}/api/v1/admin/staff" \
  --header "Authorization: Bearer {{accessToken}}" \
  --header "Content-Type: application/json" \
  --data '{
    "branchId": "{{branchId}}",
    "email": "kitchen@example.com",
    "displayName": "Kitchen Staff",
    "password": "TestPass123!",
    "roleCode": "kitchen"
  }'
```

Allowed `roleCode` values:

- `admin`
- `manager`
- `kitchen`
- `waiter`
- `staff`

### PUT /api/v1/admin/staff/{userId}

Updates a staff user's display name, role, branch assignment, and active status. Owner accounts cannot be edited from this route.

```bash
curl --request PUT "{{baseUrl}}/api/v1/admin/staff/{{userId}}" \
  --header "Authorization: Bearer {{accessToken}}" \
  --header "Content-Type: application/json" \
  --data '{
    "branchId": "{{branchId}}",
    "displayName": "Kitchen Staff",
    "roleCode": "kitchen",
    "isActive": true
  }'
```

## Foundation Tenant Routes

These unauthenticated tenant routes exist for foundation testing. Prefer the authenticated admin routes for production-oriented flows.

### POST /api/v1/tenants

```bash
curl --request POST "{{baseUrl}}/api/v1/tenants" \
  --header "Content-Type: application/json" \
  --data '{
    "name": "Foundation Cafe",
    "slug": "foundation-cafe",
    "ownerEmail": "foundation.owner@example.com"
  }'
```

### GET /api/v1/tenants/{tenantId}

```bash
curl --request GET "{{baseUrl}}/api/v1/tenants/{{tenantId}}"
```

### POST /api/v1/tenants/{tenantId}/branches

```bash
curl --request POST "{{baseUrl}}/api/v1/tenants/{{tenantId}}/branches" \
  --header "Content-Type: application/json" \
  --data '{
    "name": "Foundation Branch",
    "phoneNumber": "+91 9876543210",
    "addressLine1": "MG Road",
    "addressLine2": null,
    "city": "Ahmedabad",
    "state": "Gujarat",
    "postalCode": "380001",
    "countryCode": "IN"
  }'
```

### GET /api/v1/tenants/{tenantId}/branches

```bash
curl --request GET "{{baseUrl}}/api/v1/tenants/{{tenantId}}/branches?includeInactive=false"
```

### GET /api/v1/tenants/{tenantId}/branches/{branchId}

```bash
curl --request GET "{{baseUrl}}/api/v1/tenants/{{tenantId}}/branches/{{branchId}}"
```

### PUT /api/v1/tenants/{tenantId}/branches/{branchId}

```bash
curl --request PUT "{{baseUrl}}/api/v1/tenants/{{tenantId}}/branches/{{branchId}}" \
  --header "Content-Type: application/json" \
  --data '{
    "name": "Foundation Branch",
    "phoneNumber": "+91 9876543210",
    "addressLine1": "MG Road",
    "addressLine2": null,
    "city": "Ahmedabad",
    "state": "Gujarat",
    "postalCode": "380001",
    "countryCode": "IN",
    "isActive": true
  }'
```

### DELETE /api/v1/tenants/{tenantId}/branches/{branchId}

```bash
curl --request DELETE "{{baseUrl}}/api/v1/tenants/{{tenantId}}/branches/{{branchId}}"
```

### POST /api/v1/tenants/{tenantId}/branches/{branchId}/order-settings

```bash
curl --request POST "{{baseUrl}}/api/v1/tenants/{{tenantId}}/branches/{{branchId}}/order-settings" \
  --header "Content-Type: application/json" \
  --data '{
    "enableDirectQrOrdering": true,
    "requireCustomerName": true,
    "requireCustomerWhatsApp": false,
    "waiterCallEnabled": true
  }'
```

### GET /api/v1/tenants/{tenantId}/branches/{branchId}/order-settings

```bash
curl --request GET "{{baseUrl}}/api/v1/tenants/{{tenantId}}/branches/{{branchId}}/order-settings"
```

### PUT /api/v1/tenants/{tenantId}/branches/{branchId}/order-settings

```bash
curl --request PUT "{{baseUrl}}/api/v1/tenants/{{tenantId}}/branches/{{branchId}}/order-settings" \
  --header "Content-Type: application/json" \
  --data '{
    "enableDirectQrOrdering": true,
    "requireCustomerName": true,
    "requireCustomerWhatsApp": false,
    "waiterCallEnabled": true
  }'
```
