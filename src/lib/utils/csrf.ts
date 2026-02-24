/**
 * Read the CSRF token from the csrf_token cookie.
 */
export function getCsrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("csrf_token="))
    ?.split("=")[1];
}

/**
 * Build headers object that includes the CSRF token for mutating requests.
 */
export function csrfHeaders(
  extra?: Record<string, string>
): Record<string, string> {
  const token = getCsrfToken();
  return {
    ...(token ? { "x-csrf-token": token } : {}),
    ...extra,
  };
}
