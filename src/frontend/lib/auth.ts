const TokenStorageKey = "qrapp.admin.accessToken";
const SessionStorageKey = "qrapp.admin.session";

export type StoredAdminSession = {
  tenant: {
    tenantId: string;
    name: string;
    slug: string;
    accessStatus: {
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
  };
};

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(TokenStorageKey);
}

export function setAccessToken(token: string): void {
  window.localStorage.setItem(TokenStorageKey, token);
}

export function setAdminSession(session: StoredAdminSession): void {
  window.localStorage.setItem(SessionStorageKey, JSON.stringify(session));
}

export function getAdminSession(): StoredAdminSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SessionStorageKey);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredAdminSession;
  } catch {
    window.localStorage.removeItem(SessionStorageKey);
    return null;
  }
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TokenStorageKey);
  window.localStorage.removeItem(SessionStorageKey);
}

export function getCurrentRoleCode(): string | null {
  return getTokenPayload()?.role_code ?? null;
}

export function getCurrentBranchId(): string | null {
  return getTokenPayload()?.branch_id ?? null;
}

function getTokenPayload(): { role_code?: string; branch_id?: string } | null {
  const token = getAccessToken();
  if (!token) {
    return null;
  }

  const [, payload] = token.split(".");
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(window.atob(toBase64(payload))) as { role_code?: string; branch_id?: string };
  } catch {
    return null;
  }
}

function toBase64(value: string): string {
  return value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
}
