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
    branchId: string | null;
  };
  tenant: {
    tenantId: string;
    name: string;
    slug: string;
    accessStatus: TenantAccessStatus;
  };
};

export type TenantAccessStatus = {
  tenantId: string;
  planCode: string;
  trialStartAtUtc: string | null;
  trialEndAtUtc: string | null;
  subscriptionStatusCode: string;
  accountStatusCode: string;
  isTenantActive: boolean;
  isAccountActive: boolean;
  isTrialExpired: boolean;
  isAccessAllowed: boolean;
  trialDaysRemaining: number | null;
  message: string;
};

export type TenantSubscription = {
  tenantId: string;
  name: string;
  slug: string;
  ownerEmail: string;
  planCode: string;
  trialStartAtUtc: string | null;
  trialEndAtUtc: string | null;
  subscriptionStatusCode: SubscriptionStatusCode;
  accountStatusCode: AccountStatusCode;
  isTenantActive: boolean;
  subscriptionUpdatedAtUtc: string | null;
  subscriptionNotes: string | null;
  accessStatus: TenantAccessStatus;
};

export type SubscriptionStatusCode = "Trialing" | "Active" | "ManualActive" | "PastDue" | "Suspended" | "Cancelled" | "Expired";

export type AccountStatusCode = "Active" | "Inactive";

export type UpdateTenantSubscriptionInput = {
  planCode: string;
  subscriptionStatusCode: SubscriptionStatusCode;
  accountStatusCode: AccountStatusCode;
  trialEndAtUtc: string | null;
  subscriptionNotes: string | null;
};

export type ExtendTenantTrialInput = {
  days: number;
  subscriptionNotes: string | null;
};

export type TenantSubscriptionActionInput = {
  subscriptionNotes: string | null;
};

export type BranchListItem = {
  branchId: string;
  tenantId: string;
  name: string;
  phoneNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  countryCode: string;
  logoUrl: string | null;
  logoPublicId: string | null;
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
  imageUrl: string | null;
  imageAltText: string | null;
  variants: MenuItemVariant[];
};

export type MenuItemVariant = {
  menuItemVariantId: string;
  menuItemId: string;
  name: string;
  price: number;
  isAvailable: boolean;
  isActive: boolean;
  displayOrder: number;
};

export type BranchOffer = {
  branchOfferId: string;
  tenantId: string;
  branchId: string;
  title: string;
  subtitle: string | null;
  discountText: string | null;
  imageUrl: string | null;
  imageAltText: string | null;
  displayOrder: number;
  isActive: boolean;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  discountTypeCode: OfferDiscountTypeCode;
  discountValue: number;
  minimumOrderAmount: number;
  maxDiscountAmount: number | null;
  autoApply: boolean;
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

export type TaxMode = "Exclusive" | "Inclusive";

export type RoundingMode = "None" | "NearestRupee";

export type PaymentStatusCode = "Unpaid" | "Paid" | "PartiallyPaid" | "Voided";

export type RefundStatusCode = "NotRefunded" | "PartiallyRefunded" | "Refunded";

export type BranchBillingSettings = {
  branchBillingSettingsId: string;
  tenantId: string;
  branchId: string;
  taxEnabled: boolean;
  taxName: string;
  taxRate: number;
  taxMode: TaxMode;
  serviceChargeEnabled: boolean;
  serviceChargeName: string;
  serviceChargeRate: number;
  discountEnabled: boolean;
  staffCanApplyDiscount: boolean;
  roundingMode: RoundingMode;
  createdAtUtc: string;
  updatedAtUtc: string | null;
};

export type PublicQrOrderSettings = {
  enableDirectQrOrdering: boolean;
  requireCustomerName: boolean;
  requireCustomerWhatsApp: boolean;
  waiterCallEnabled: boolean;
};

export type PublicQrBillingSettings = {
  taxEnabled: boolean;
  taxName: string;
  taxRate: number;
  taxMode: TaxMode;
  serviceChargeEnabled: boolean;
  serviceChargeName: string;
  serviceChargeRate: number;
  roundingMode: RoundingMode;
};

export type PublicQrMenuItem = {
  menuItemId: string;
  name: string;
  description: string | null;
  price: number;
  displayOrder: number;
  imageUrl: string | null;
  imageAltText: string | null;
  variants: PublicQrMenuItemVariant[];
};

export type PublicQrMenuItemVariant = {
  menuItemVariantId: string;
  name: string;
  price: number;
  displayOrder: number;
};

export type PublicQrMenuOffer = {
  branchOfferId: string;
  title: string;
  subtitle: string | null;
  discountText: string | null;
  imageUrl: string | null;
  imageAltText: string | null;
  displayOrder: number;
  discountTypeCode: OfferDiscountTypeCode;
  discountValue: number;
  minimumOrderAmount: number;
  maxDiscountAmount: number | null;
  autoApply: boolean;
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
  branchLogoUrl: string | null;
  tableId: string;
  tableName: string;
  qrToken: string;
  orderSettings: PublicQrOrderSettings;
  billingSettings: PublicQrBillingSettings;
  categories: PublicQrMenuCategory[];
  offers: PublicQrMenuOffer[];
};

export type CreatePublicQrOrderItemInput = {
  menuItemId: string;
  menuItemVariantId: string | null;
  itemNote: string | null;
  quantity: number;
};

export type CreatePublicQrOrderInput = {
  customerName: string | null;
  customerWhatsApp: string | null;
  notes: string | null;
  items: CreatePublicQrOrderItemInput[];
  marketingConsent: boolean;
};

export type PublicQrOrderItem = {
  orderItemId: string;
  orderId: string;
  menuItemId: string;
  menuItemVariantId: string | null;
  menuItemName: string;
  variantName: string | null;
  itemNote: string | null;
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
  appliedBranchOfferId: string | null;
  appliedOfferTitle: string | null;
  appliedOfferDiscountAmount: number;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  items: PublicQrOrderItem[];
};

export type OrderFeedback = {
  orderFeedbackId: string;
  tenantId: string;
  branchId: string;
  orderId: string;
  customerId: string | null;
  rating: number;
  comment: string | null;
  createdAtUtc: string;
};

export type CreateOrderFeedbackInput = {
  rating: number;
  comment: string | null;
};

export type AdminFeedback = {
  orderFeedbackId: string;
  tenantId: string;
  branchId: string;
  branchName: string;
  orderId: string;
  tableName: string;
  customerId: string | null;
  customerName: string | null;
  customerWhatsApp: string | null;
  rating: number;
  comment: string | null;
  orderCreatedAtUtc: string;
  createdAtUtc: string;
};

export type PublicCustomerRecentOrderItem = {
  orderId: string;
  menuItemId: string;
  menuItemVariantId: string | null;
  menuItemName: string;
  variantName: string | null;
  itemNote: string | null;
  quantity: number;
};

export type PublicCustomerRecentOrder = {
  orderId: string;
  createdAtUtc: string;
  totalAmount: number;
  items: PublicCustomerRecentOrderItem[];
};

export type PublicCustomerLookup = {
  customerId: string;
  name: string | null;
  whatsAppNumber: string;
  marketingConsent: boolean;
  visitCount: number;
  totalOrderCount: number;
  totalOrderValue: number;
  lastVisitAtUtc: string;
  recentOrders: PublicCustomerRecentOrder[];
};

export type AdminOrderItem = {
  orderItemId: string;
  orderId: string;
  menuItemId: string;
  menuItemVariantId: string | null;
  menuItemName: string;
  variantName: string | null;
  itemNote: string | null;
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
  appliedBranchOfferId: string | null;
  appliedOfferTitle: string | null;
  appliedOfferDiscountAmount: number;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  items: AdminOrderItem[];
};

export type OrderBill = {
  orderBillId: string;
  tenantId: string;
  branchId: string;
  orderId: string;
  billNumber: string;
  paymentStatusCode: PaymentStatusCode;
  paymentMethod: string | null;
  subtotalAmount: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  roundingAmount: number;
  totalAmount: number;
  taxEnabled: boolean;
  taxName: string;
  taxRate: number;
  taxMode: TaxMode;
  serviceChargeEnabled: boolean;
  serviceChargeName: string;
  serviceChargeRate: number;
  discountEnabled: boolean;
  appliedBranchOfferId: string | null;
  appliedOfferTitle: string | null;
  refundStatusCode: RefundStatusCode;
  refundAmount: number;
  refundReason: string | null;
  refundedAtUtc: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
};

export type OrderStatusCode = "Placed" | "Accepted" | "Preparing" | "Ready" | "Served" | "Completed" | "Cancelled";

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

export type CampaignTargetSegment = "AllOptedIn" | "RepeatCustomers" | "InactiveCustomers" | "HighValueCustomers";

export type OfferDiscountTypeCode = "DisplayOnly" | "Percentage" | "FixedAmount";

export type StaffRoleCode = "admin" | "manager" | "kitchen" | "waiter" | "staff";

export type StaffUser = {
  userId: string;
  tenantUserId: string;
  tenantId: string;
  branchId: string | null;
  branchName: string | null;
  email: string;
  displayName: string;
  roleCode: StaffRoleCode | "owner";
  isActive: boolean;
  tenantUserIsActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
};

export type CreateStaffUserInput = {
  branchId: string | null;
  email: string;
  displayName: string;
  password: string;
  roleCode: StaffRoleCode;
};

export type UpdateStaffUserInput = {
  branchId: string | null;
  displayName: string;
  roleCode: StaffRoleCode;
  isActive: boolean;
};

export type Campaign = {
  campaignId: string;
  tenantId: string;
  branchId: string | null;
  branchName: string | null;
  name: string;
  targetSegment: CampaignTargetSegment;
  messageText: string;
  statusCode: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdAtUtc: string;
  queuedAtUtc: string | null;
  startedAtUtc: string | null;
  completedAtUtc: string | null;
  updatedAtUtc: string | null;
};

export type CampaignPreview = {
  recipientCount: number;
};

export type AdminNotification = {
  adminNotificationId: string;
  tenantId: string;
  branchId: string;
  typeCode: string;
  title: string;
  message: string;
  targetUrl: string;
  isRead: boolean;
  createdAtUtc: string;
  readAtUtc: string | null;
};

export type AdminSearchResult = {
  typeCode: "branch" | "menu-item" | "order" | "offer" | string;
  entityId: string;
  branchId: string | null;
  title: string;
  subtitle: string;
  targetUrl: string;
  createdAtUtc: string | null;
};

export type CreateCampaignInput = {
  branchId: string | null;
  name: string;
  targetSegment: CampaignTargetSegment;
  messageText: string;
};

export type RegisterOwnerInput = {
  tenantName: string;
  tenantSlug: string;
  ownerEmail: string;
  ownerDisplayName: string;
  password: string;
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
  logoUrl: string | null;
  logoPublicId: string | null;
};

export type UpdateBranchInput = CreateBranchInput & {
  isActive: boolean;
};

export type MediaUploadResponse = {
  url: string;
  publicId: string;
};

export type CreateMenuCategoryInput = {
  name: string;
  displayOrder: number;
};

export type UpdateMenuCategoryInput = {
  name: string;
  displayOrder: number;
  isActive: boolean;
};

export type CreateMenuItemInput = {
  menuCategoryId: string;
  name: string;
  description: string | null;
  price: number;
  isAvailable: boolean;
  displayOrder: number;
  imageUrl: string | null;
  imageAltText: string | null;
  variants: MenuItemVariantInput[];
};

export type MenuItemVariantInput = {
  menuItemVariantId: string | null;
  name: string;
  price: number;
  isAvailable: boolean;
  displayOrder: number;
};

export type UpdateMenuItemInput = CreateMenuItemInput & {
  isActive: boolean;
};

export type CreateBranchOfferInput = {
  title: string;
  subtitle: string | null;
  discountText: string | null;
  imageUrl: string | null;
  imageAltText: string | null;
  displayOrder: number;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  discountTypeCode: OfferDiscountTypeCode;
  discountValue: number;
  minimumOrderAmount: number;
  maxDiscountAmount: number | null;
  autoApply: boolean;
};

export type UpdateBranchOfferInput = CreateBranchOfferInput & {
  isActive: boolean;
};

export type ReportFilterInput = {
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  search?: string;
};

export type OrderReportSummary = {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalOrderValue: number;
  averageOrderValue: number;
  averageReadyMinutes: number;
};

export type OrderReportListItem = {
  orderId: string;
  branchId: string;
  branchName: string;
  tableId: string;
  tableName: string;
  orderStatusCode: OrderStatusCode;
  customerName: string | null;
  customerWhatsApp: string | null;
  notes: string | null;
  totalAmount: number;
  itemCount: number;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  acceptedAtUtc: string | null;
  preparingAtUtc: string | null;
  readyAtUtc: string | null;
  servedAtUtc: string | null;
  completedAtUtc: string | null;
  cancelledAtUtc: string | null;
  latestReason: string | null;
};

export type ItemReport = {
  itemName: string;
  variantName: string | null;
  quantity: number;
  orderCount: number;
  totalValue: number;
};

export type CustomerReport = {
  customerId: string | null;
  customerKey: string;
  customerName: string | null;
  customerWhatsApp: string | null;
  marketingConsent: boolean;
  visitCount: number;
  orderCount: number;
  totalValue: number;
  firstVisitAtUtc: string | null;
  lastVisitAtUtc: string | null;
  lastOrderAtUtc: string | null;
  branchesVisited: number;
  firstBranchName: string | null;
  lastBranchName: string | null;
  favoriteItemName: string | null;
  favoriteVariantName: string | null;
  favoriteItemQuantity: number;
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

export type SaveBranchBillingSettingsInput = {
  taxEnabled: boolean;
  taxName: string;
  taxRate: number;
  taxMode: TaxMode;
  serviceChargeEnabled: boolean;
  serviceChargeName: string;
  serviceChargeRate: number;
  discountEnabled: boolean;
  staffCanApplyDiscount: boolean;
  roundingMode: RoundingMode;
};

export type GenerateOrderBillInput = {
  discountAmount: number;
  serviceChargeAmount: number;
  overrideReason: string | null;
};

export type UpdateOrderBillPaymentStatusInput = {
  paymentStatusCode: PaymentStatusCode;
  paymentMethod: string | null;
  reason: string | null;
};

export type UpdateOrderBillRefundStatusInput = {
  refundStatusCode: RefundStatusCode;
  refundAmount: number;
  reason: string | null;
};

export async function login(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
    requireAuth: false
  });
}

export async function registerOwner(input: RegisterOwnerInput): Promise<LoginResponse> {
  return request<LoginResponse>("/api/v1/auth/register-owner", {
    method: "POST",
    body: input,
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

export async function getPublicOrderFeedback(qrToken: string, orderId: string): Promise<OrderFeedback | null> {
  return request<OrderFeedback | null>(`/api/v1/public/qr/${encodeURIComponent(qrToken)}/orders/${encodeURIComponent(orderId)}/feedback`, {
    method: "GET",
    requireAuth: false
  });
}

export async function createPublicOrderFeedback(qrToken: string, orderId: string, input: CreateOrderFeedbackInput): Promise<OrderFeedback> {
  return request<OrderFeedback>(`/api/v1/public/qr/${encodeURIComponent(qrToken)}/orders/${encodeURIComponent(orderId)}/feedback`, {
    method: "POST",
    body: input,
    requireAuth: false
  });
}

export async function lookupPublicCustomer(qrToken: string, whatsapp: string): Promise<PublicCustomerLookup | null> {
  const customer = await request<PublicCustomerLookup | undefined>(`/api/v1/public/qr/${encodeURIComponent(qrToken)}/customers/lookup?whatsapp=${encodeURIComponent(whatsapp)}`, {
    method: "GET",
    requireAuth: false
  });

  return customer ?? null;
}

export async function createWaiterCall(qrToken: string, input: CreateWaiterCallInput): Promise<WaiterCall> {
  return request<WaiterCall>(`/api/v1/public/qr/${encodeURIComponent(qrToken)}/waiter-calls`, {
    method: "POST",
    body: input,
    requireAuth: false
  });
}

export async function uploadMedia(file: File, purpose: "menu-item" | "branch-logo" | "offer"): Promise<MediaUploadResponse> {
  const token = getAccessToken();
  if (!token) {
    throw new ApiError("Please login to continue.", 401);
  }

  const formData = new FormData();
  formData.set("file", file);
  formData.set("purpose", purpose);

  let response: Response;
  try {
    response = await fetch(`${ApiBaseUrl}/api/v1/admin/media/uploads`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`
      },
      body: formData
    });
  } catch {
    throw new ApiError("Cannot connect to the API. Check that the backend is running.", 0);
  }

  const responseText = await response.text();
  const data = parseJson(responseText);

  if (!response.ok) {
    if (response.status === 401) {
      clearAccessToken();
    }

    throw toApiError(data, response.status);
  }

  return data as MediaUploadResponse;
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

export async function updateBranch(branchId: string, input: UpdateBranchInput): Promise<BranchListItem> {
  return request<BranchListItem>(`/api/v1/admin/branches/${branchId}`, {
    method: "PUT",
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

export async function updateMenuCategory(branchId: string, menuCategoryId: string, input: UpdateMenuCategoryInput): Promise<MenuCategory> {
  return request<MenuCategory>(`/api/v1/admin/branches/${branchId}/menu-categories/${menuCategoryId}`, {
    method: "PUT",
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

export async function updateMenuItem(branchId: string, menuItemId: string, input: UpdateMenuItemInput): Promise<MenuItem> {
  return request<MenuItem>(`/api/v1/admin/branches/${branchId}/menu-items/${menuItemId}`, {
    method: "PUT",
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

export async function getBranchOffers(branchId: string): Promise<BranchOffer[]> {
  return request<BranchOffer[]>(`/api/v1/admin/branches/${branchId}/offers?includeInactive=false`, {
    method: "GET",
    requireAuth: true
  });
}

export async function createBranchOffer(branchId: string, input: CreateBranchOfferInput): Promise<BranchOffer> {
  return request<BranchOffer>(`/api/v1/admin/branches/${branchId}/offers`, {
    method: "POST",
    body: input,
    requireAuth: true
  });
}

export async function updateBranchOffer(branchId: string, branchOfferId: string, input: UpdateBranchOfferInput): Promise<BranchOffer> {
  return request<BranchOffer>(`/api/v1/admin/branches/${branchId}/offers/${branchOfferId}`, {
    method: "PUT",
    body: input,
    requireAuth: true
  });
}

export async function deactivateBranchOffer(branchId: string, branchOfferId: string): Promise<void> {
  await request<void>(`/api/v1/admin/branches/${branchId}/offers/${branchOfferId}`, {
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
  orderStatusCode: OrderStatusCode,
  reason: string | null = null
): Promise<AdminOrder> {
  return request<AdminOrder>(`/api/v1/admin/branches/${branchId}/orders/${orderId}/status`, {
    method: "PUT",
    body: { orderStatusCode, reason },
    requireAuth: true
  });
}

export async function getBranchBillingSettings(branchId: string): Promise<BranchBillingSettings | null> {
  try {
    return await request<BranchBillingSettings>(`/api/v1/admin/branches/${branchId}/billing-settings`, {
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

export async function saveBranchBillingSettings(branchId: string, input: SaveBranchBillingSettingsInput): Promise<BranchBillingSettings> {
  return request<BranchBillingSettings>(`/api/v1/admin/branches/${branchId}/billing-settings`, {
    method: "PUT",
    body: input,
    requireAuth: true
  });
}

export async function getOrderBill(branchId: string, orderId: string): Promise<OrderBill | null> {
  try {
    return await request<OrderBill>(`/api/v1/admin/branches/${branchId}/orders/${orderId}/bill`, {
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

export async function generateOrderBill(branchId: string, orderId: string, input: GenerateOrderBillInput): Promise<OrderBill> {
  return request<OrderBill>(`/api/v1/admin/branches/${branchId}/orders/${orderId}/bill`, {
    method: "POST",
    body: input,
    requireAuth: true
  });
}

export async function updateOrderBillPaymentStatus(branchId: string, orderId: string, input: UpdateOrderBillPaymentStatusInput): Promise<OrderBill> {
  return request<OrderBill>(`/api/v1/admin/branches/${branchId}/orders/${orderId}/bill/payment-status`, {
    method: "PUT",
    body: input,
    requireAuth: true
  });
}

export async function updateOrderBillRefundStatus(branchId: string, orderId: string, input: UpdateOrderBillRefundStatusInput): Promise<OrderBill> {
  return request<OrderBill>(`/api/v1/admin/branches/${branchId}/orders/${orderId}/bill/refund-status`, {
    method: "PUT",
    body: input,
    requireAuth: true
  });
}

export async function getOrderReportSummary(filter: ReportFilterInput): Promise<OrderReportSummary> {
  return request<OrderReportSummary>(`/api/v1/admin/reports/orders/summary${toReportQuery(filter)}`, {
    method: "GET",
    requireAuth: true
  });
}

export async function getOrderReportOrders(filter: ReportFilterInput): Promise<OrderReportListItem[]> {
  return request<OrderReportListItem[]>(`/api/v1/admin/reports/orders${toReportQuery(filter)}`, {
    method: "GET",
    requireAuth: true
  });
}

export async function getItemReport(filter: ReportFilterInput): Promise<ItemReport[]> {
  return request<ItemReport[]>(`/api/v1/admin/reports/items${toReportQuery(filter)}`, {
    method: "GET",
    requireAuth: true
  });
}

export async function getCustomerReport(filter: ReportFilterInput): Promise<CustomerReport[]> {
  return request<CustomerReport[]>(`/api/v1/admin/reports/customers${toReportQuery(filter)}`, {
    method: "GET",
    requireAuth: true
  });
}

export async function getAdminFeedback(branchId?: string): Promise<AdminFeedback[]> {
  const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
  return request<AdminFeedback[]>(`/api/v1/admin/feedback${query}`, {
    method: "GET",
    requireAuth: true
  });
}

export async function getCampaigns(branchId?: string): Promise<Campaign[]> {
  const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
  return request<Campaign[]>(`/api/v1/admin/campaigns${query}`, {
    method: "GET",
    requireAuth: true
  });
}

export async function previewCampaignRecipients(branchId: string | null, targetSegment: CampaignTargetSegment): Promise<CampaignPreview> {
  const params = new URLSearchParams();
  if (branchId) params.set("branchId", branchId);
  params.set("targetSegment", targetSegment);

  return request<CampaignPreview>(`/api/v1/admin/campaigns/preview?${params.toString()}`, {
    method: "GET",
    requireAuth: true
  });
}

export async function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
  return request<Campaign>("/api/v1/admin/campaigns", {
    method: "POST",
    body: input,
    requireAuth: true
  });
}

export async function getStaffUsers(includeInactive = true): Promise<StaffUser[]> {
  return request<StaffUser[]>(`/api/v1/admin/staff?includeInactive=${includeInactive}`, {
    method: "GET",
    requireAuth: true
  });
}

export async function createStaffUser(input: CreateStaffUserInput): Promise<StaffUser> {
  return request<StaffUser>("/api/v1/admin/staff", {
    method: "POST",
    body: input,
    requireAuth: true
  });
}

export async function updateStaffUser(userId: string, input: UpdateStaffUserInput): Promise<StaffUser> {
  return request<StaffUser>(`/api/v1/admin/staff/${userId}`, {
    method: "PUT",
    body: input,
    requireAuth: true
  });
}

export async function getTenantSubscription(): Promise<TenantSubscription> {
  return request<TenantSubscription>("/api/v1/admin/billing/subscription", {
    method: "GET",
    requireAuth: true
  });
}

export async function updateTenantSubscription(input: UpdateTenantSubscriptionInput): Promise<TenantSubscription> {
  return request<TenantSubscription>("/api/v1/admin/billing/subscription", {
    method: "PUT",
    body: input,
    requireAuth: true
  });
}

export async function extendTenantTrial(input: ExtendTenantTrialInput): Promise<TenantSubscription> {
  return request<TenantSubscription>("/api/v1/admin/billing/subscription/extend-trial", {
    method: "POST",
    body: input,
    requireAuth: true
  });
}

export async function reactivateTenantSubscription(input: TenantSubscriptionActionInput): Promise<TenantSubscription> {
  return request<TenantSubscription>("/api/v1/admin/billing/subscription/reactivate", {
    method: "POST",
    body: input,
    requireAuth: true
  });
}

export async function suspendTenantSubscription(input: TenantSubscriptionActionInput): Promise<TenantSubscription> {
  return request<TenantSubscription>("/api/v1/admin/billing/subscription/suspend", {
    method: "POST",
    body: input,
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

export async function getAdminNotifications(branchId?: string): Promise<AdminNotification[]> {
  const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
  return request<AdminNotification[]>(`/api/v1/admin/notifications${query}`, {
    method: "GET",
    requireAuth: true
  });
}

export async function markAdminNotificationRead(notificationId: string): Promise<void> {
  await request<void>(`/api/v1/admin/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: "POST",
    requireAuth: true
  });
}

export async function markAllAdminNotificationsRead(branchId?: string): Promise<void> {
  const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
  await request<void>(`/api/v1/admin/notifications/read-all${query}`, {
    method: "POST",
    requireAuth: true
  });
}

export async function searchAdmin(query: string, branchId?: string): Promise<AdminSearchResult[]> {
  const params = new URLSearchParams();
  params.set("q", query);
  if (branchId) {
    params.set("branchId", branchId);
  }

  return request<AdminSearchResult[]>(`/api/v1/admin/search?${params.toString()}`, {
    method: "GET",
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

function toReportQuery(filter: ReportFilterInput): string {
  const params = new URLSearchParams();
  if (filter.branchId) params.set("branchId", filter.branchId);
  if (filter.dateFrom) params.set("dateFrom", filter.dateFrom);
  if (filter.dateTo) params.set("dateTo", filter.dateTo);
  if (filter.status) params.set("status", filter.status);
  if (filter.search) params.set("search", filter.search);

  const query = params.toString();
  return query ? `?${query}` : "";
}
