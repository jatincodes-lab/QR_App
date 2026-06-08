const TokenStorageKey = "qrapp.admin.accessToken";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(TokenStorageKey);
}

export function setAccessToken(token: string): void {
  window.localStorage.setItem(TokenStorageKey, token);
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TokenStorageKey);
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
