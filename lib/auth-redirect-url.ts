const LOCALHOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

function normalizeOrigin(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    return url.origin;
  } catch {
    return null;
  }
}

export function getPublicAppOrigin(): string {
  const configuredOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (configuredOrigin) return configuredOrigin;

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "http://localhost:3000";
}

export function getAuthCallbackUrl(next: string): string {
  const callback = new URL("/auth/callback", getPublicAppOrigin());
  callback.searchParams.set("next", next.startsWith("/") ? next : "/");
  return callback.toString();
}

export function getServerAppOrigin(requestUrl: string, forwardedHost: string | null, forwardedProto: string | null): string {
  const configuredOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (configuredOrigin) return configuredOrigin;

  if (forwardedHost) {
    return `${forwardedProto ?? "https"}://${forwardedHost}`;
  }

  const origin = new URL(requestUrl).origin;
  if (!LOCALHOST_RE.test(origin)) return origin;

  const vercelUrl = normalizeOrigin(process.env.VERCEL_URL);
  return vercelUrl ?? origin;
}
