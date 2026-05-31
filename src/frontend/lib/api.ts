import { clearAccessToken, getAccessToken } from "./auth";

export const ApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:59127";

type ProblemDetails = {
  title?: string;
  detail?: string;
  status?: number;
  errors?: Record<string, string[]>;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors?: Record<string, string[]>
  ) {
    super(message);
  }
}

export type LoginResponse = {
  accessToken: string;
  expiresAtUtc: string;
  user: {
    userId: string;
    email: string;
    displayName: string;
    tenantId: string;
    roleCode: string;
  };
  tenant: {
    tenantId: string;
    name: string;
    slug: string;
  };
};

export type BranchListItem = {
  branchId: string;
  tenantId: string;
  name: string;
  phoneNumber: string | null;
  city: string | null;
  countryCode: string;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
};

export type MenuCategory = {
  menuCategoryId: string;
  tenantId: string;
  branchId: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
};

export type MenuItem = {
  menuItemId: string;
  tenantId: string;
  branchId: string;
  menuCategoryId: string;
  categoryName: string;
  name: string;
  description: string | null;
  price: number;
  isAvailable: boolean;
  isActive: boolean;
  displayOrder: number;
  createdAtUtc: string;
  updatedAtUtc: string | null;
};

export type BranchTable = {
  tableId: string;
  tenantId: string;
  branchId: string;
  name: string;
  displayOrder: number;
  qrToken: string;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
};

export type BranchOrderSettings = {
  branchOrderSettingsId: string;
  tenantId: string;
  branchId: string;
  enableDirectQrOrdering: boolean;
  requireCustomerName: boolean;
  requireCustomerWhatsApp: boolean;
  waiterCallEnabled: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
};

export type PublicQrOrderSettings = {
  enableDirectQrOrdering: boolean;
  requireCustomerName: boolean;
  requireCustomerWhatsApp: boolean;
  waiterCallEnabled: boolean;
};

export type PublicQrMenuItem = {
  menuItemId: string;
  name: string;
  description: string | null;
  price: number;
  displayOrder: number;
};

export type PublicQrMenuCategory = {
  menuCategoryId: string;
  name: string;
  displayOrder: number;
  items: PublicQrMenuItem[];
};

export type PublicQrMenu = {
  branchId: string;
  branchName: string;
  tableId: string;
  tableName: string;
  qrToken: string;
  orderSettings: PublicQrOrderSettings;
  categories: PublicQrMenuCategory[];
};

export type CreatePublicQrOrderItemInput = {
  menuItemId: string;
  quantity: number;
};

export type CreatePublicQrOrderInput = {
  customerName: string | null;
  customerWhatsApp: string | null;
  notes: string | null;
  items: CreatePublicQrOrderItemInput[];
};

export type PublicQrOrderItem = {
  orderItemId: string;
  orderId: string;
  menuItemId: string;
  menuItemName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type PublicQrOrder = {
  orderId: string;
  tenantId: string;
  branchId: string;
  tableId: string;
  orderStatusCode: string;
  customerName: string | null;
  customerWhatsApp: string | null;
  notes: string | null;
  subtotalAmount: number;
  totalAmount: number;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  items: PublicQrOrderItem[];
};

export type AdminOrderItem = {
  orderItemId: string;
  orderId: string;
  menuItemId: string;
  menuItemName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type AdminOrder = {
  orderId: string;
  tenantId: string;
  branchId: string;
  tableId: string;
  tableName: string;
  orderStatusCode: string;
  customerName: string | null;
  customerWhatsApp: string | null;
  notes: string | null;
  subtotalAmount: number;
  totalAmount: number;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  items: AdminOrderItem[];
};

export type OrderStatusCode = "Placed" | "Accepted" | "Preparing" | "Ready" | "Completed" | "Cancelled";

export type WaiterCallStatusCode = "Open" | "Acknowledged" | "Resolved" | "Cancelled";

export type WaiterCall = {
  waiterCallId: string;
  tenantId: string;
  branchId: string;
  tableId: string;
  tableName: string;
  statusCode: WaiterCallStatusCode;
  customerName: string | null;
  note: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
};

export type CreateWaiterCallInput = {
  customerName: string | null;
  note: string | null;
};

export type CreateBranchInput = {
  name: string;
  phoneNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  countryCode: string;
};

export type CreateMenuCategoryInput = {
  name: string;
  displayOrder: number;
};

export type CreateMenuItemInput = {
  menuCategoryId: string;
  name: string;
  description: string | null;
  price: number;
  isAvailable: boolean;
  displayOrder: number;
};

export type CreateBranchTableInput = {
  name: string;
  displayOrder: number;
};

export type SaveBranchOrderSettingsInput = {
  enableDirectQrOrdering: boolean;
  requireCustomerName: boolean;
  requireCustomerWhatsApp: boolean;
  waiterCallEnabled: boolean;
};

export async function login(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
    requireAuth: false
  });
}

export async function getPublicQrMenu(qrToken: string): Promise<PublicQrMenu> {
  return request<PublicQrMenu>(`/api/v1/public/qr/${encodeURIComponent(qrToken)}`, {
    method: "GET",
    requireAuth: false
  });
}

export async function createPublicQrOrder(qrToken: string, input: CreatePublicQrOrderInput): Promise<PublicQrOrder> {
  return request<PublicQrOrder>(`/api/v1/public/qr/${encodeURIComponent(qrToken)}/orders`, {
    method: "POST",
    body: input,
    requireAuth: false
  });
}

export async function getPublicQrOrder(qrToken: string, orderId: string): Promise<PublicQrOrder> {
  return request<PublicQrOrder>(`/api/v1/public/qr/${encodeURIComponent(qrToken)}/orders/${encodeURIComponent(orderId)}`, {
    method: "GET",
    requireAuth: false
  });
}

export async function createWaiterCall(qrToken: string, input: CreateWaiterCallInput): Promise<WaiterCall> {
  return request<WaiterCall>(`/api/v1/public/qr/${encodeURIComponent(qrToken)}/waiter-calls`, {
    method: "POST",
    body: input,
    requireAuth: false
  });
}

export async function getBranches(): Promise<BranchListItem[]> {
  return request<BranchListItem[]>("/api/v1/admin/branches?includeInactive=false", {
    method: "GET",
    requireAuth: true
  });
}

export async function getBranch(branchId: string): Promise<BranchListItem> {
  return request<BranchListItem>(`/api/v1/admin/branches/${branchId}`, {
    method: "GET",
    requireAuth: true
  });
}

export async function createBranch(input: CreateBranchInput): Promise<BranchListItem> {
  return request<BranchListItem>("/api/v1/admin/branches", {
    method: "POST",
    body: input,
    requireAuth: true
  });
}

export async function turnOffBranch(branchId: string): Promise<void> {
  await request<void>(`/api/v1/admin/branches/${branchId}`, {
    method: "DELETE",
    requireAuth: true
  });
}

export async function getMenuCategories(branchId: string): Promise<MenuCategory[]> {
  return request<MenuCategory[]>(`/api/v1/admin/branches/${branchId}/menu-categories?includeInactive=false`, {
    method: "GET",
    requireAuth: true
  });
}

export async function createMenuCategory(branchId: string, input: CreateMenuCategoryInput): Promise<MenuCategory> {
  return request<MenuCategory>(`/api/v1/admin/branches/${branchId}/menu-categories`, {
    method: "POST",
    body: input,
    requireAuth: true
  });
}

export async function deactivateMenuCategory(branchId: string, menuCategoryId: string): Promise<void> {
  await request<void>(`/api/v1/admin/branches/${branchId}/menu-categories/${menuCategoryId}`, {
    method: "DELETE",
    requireAuth: true
  });
}

export async function getMenuItems(branchId: string): Promise<MenuItem[]> {
  return request<MenuItem[]>(`/api/v1/admin/branches/${branchId}/menu-items?includeInactive=false`, {
    method: "GET",
    requireAuth: true
  });
}

export async function createMenuItem(branchId: string, input: CreateMenuItemInput): Promise<MenuItem> {
  return request<MenuItem>(`/api/v1/admin/branches/${branchId}/menu-items`, {
    method: "POST",
    body: input,
    requireAuth: true
  });
}

export async function deactivateMenuItem(branchId: string, menuItemId: string): Promise<void> {
  await request<void>(`/api/v1/admin/branches/${branchId}/menu-items/${menuItemId}`, {
    method: "DELETE",
    requireAuth: true
  });
}

export async function getBranchTables(branchId: string): Promise<BranchTable[]> {
  return request<BranchTable[]>(`/api/v1/admin/branches/${branchId}/tables?includeInactive=false`, {
    method: "GET",
    requireAuth: true
  });
}

export async function createBranchTable(branchId: string, input: CreateBranchTableInput): Promise<BranchTable> {
  return request<BranchTable>(`/api/v1/admin/branches/${branchId}/tables`, {
    method: "POST",
    body: input,
    requireAuth: true
  });
}

export async function deactivateBranchTable(branchId: string, tableId: string): Promise<void> {
  await request<void>(`/api/v1/admin/branches/${branchId}/tables/${tableId}`, {
    method: "DELETE",
    requireAuth: true
  });
}

export async function regenerateBranchTableQrToken(branchId: string, tableId: string): Promise<BranchTable> {
  return request<BranchTable>(`/api/v1/admin/branches/${branchId}/tables/${tableId}/qr-token/regenerate`, {
    method: "POST",
    requireAuth: true
  });
}

export async function getAdminOrders(branchId: string, includeCompleted = false): Promise<AdminOrder[]> {
  return request<AdminOrder[]>(`/api/v1/admin/branches/${branchId}/orders?includeCompleted=${includeCompleted}`, {
    method: "GET",
    requireAuth: true
  });
}

export async function updateAdminOrderStatus(
  branchId: string,
  orderId: string,
  orderStatusCode: OrderStatusCode
): Promise<AdminOrder> {
  return request<AdminOrder>(`/api/v1/admin/branches/${branchId}/orders/${orderId}/status`, {
    method: "PUT",
    body: { orderStatusCode },
    requireAuth: true
  });
}

export async function getWaiterCalls(branchId: string, includeResolved = false): Promise<WaiterCall[]> {
  return request<WaiterCall[]>(`/api/v1/admin/branches/${branchId}/waiter-calls?includeResolved=${includeResolved}`, {
    method: "GET",
    requireAuth: true
  });
}

export async function updateWaiterCallStatus(
  branchId: string,
  waiterCallId: string,
  statusCode: WaiterCallStatusCode
): Promise<WaiterCall> {
  return request<WaiterCall>(`/api/v1/admin/branches/${branchId}/waiter-calls/${waiterCallId}/status`, {
    method: "PUT",
    body: { statusCode },
    requireAuth: true
  });
}

export async function getBranchOrderSettings(branchId: string): Promise<BranchOrderSettings | null> {
  try {
    return await request<BranchOrderSettings>(`/api/v1/admin/branches/${branchId}/order-settings`, {
      method: "GET",
      requireAuth: true
    });
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 404) {
      return null;
    }

    throw caught;
  }
}

export async function createBranchOrderSettings(
  branchId: string,
  input: SaveBranchOrderSettingsInput
): Promise<BranchOrderSettings> {
  return request<BranchOrderSettings>(`/api/v1/admin/branches/${branchId}/order-settings`, {
    method: "POST",
    body: input,
    requireAuth: true
  });
}

export async function updateBranchOrderSettings(
  branchId: string,
  input: SaveBranchOrderSettingsInput
): Promise<BranchOrderSettings> {
  return request<BranchOrderSettings>(`/api/v1/admin/branches/${branchId}/order-settings`, {
    method: "PUT",
    body: input,
    requireAuth: true
  });
}

async function request<T>(
  path: string,
  options: {
    method: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
    requireAuth: boolean;
  }
): Promise<T> {
  const headers = new Headers();
  headers.set("Accept", "application/json");

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.requireAuth) {
    const token = getAccessToken();
    if (!token) {
      throw new ApiError("Please login to continue.", 401);
    }

    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${ApiBaseUrl}${path}`, {
      method: options.method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
  } catch {
    throw new ApiError("Cannot connect to the API. Check that the backend is running.", 0);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const responseText = await response.text();
  const data = parseJson(responseText);

  if (!response.ok) {
    if (response.status === 401) {
      clearAccessToken();
    }

    throw toApiError(data, response.status);
  }

  return data as T;
}

function parseJson(value: string): unknown {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function toApiError(data: unknown, status: number): ApiError {
  if (isProblemDetails(data)) {
    const fieldMessage = firstFieldMessage(data.errors);
    const message = fieldMessage ?? data.detail ?? data.title ?? "Request failed.";
    return new ApiError(message, status, data.errors);
  }

  return new ApiError("Request failed. Please try again.", status);
}

function isProblemDetails(value: unknown): value is ProblemDetails {
  return typeof value === "object" && value !== null;
}

function firstFieldMessage(errors: Record<string, string[]> | undefined): string | null {
  if (!errors) {
    return null;
  }

  for (const messages of Object.values(errors)) {
    if (messages.length > 0) {
      return messages[0];
    }
  }

  return null;
}
