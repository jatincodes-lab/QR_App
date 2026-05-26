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
  window.localStorage.removeItem(TokenStorageKey);
}
