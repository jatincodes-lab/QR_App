import { clearAccessToken, getAccessToken } from "./auth";

const ApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:58927";

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

export async function login(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
    requireAuth: false
  });
}

export async function getBranches(): Promise<BranchListItem[]> {
  return request<BranchListItem[]>("/api/v1/admin/branches?includeInactive=false", {
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
