/**
 * Shared GCP authentication — used by Veo, TTS, and other GCP services.
 */

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  // 1) Try Google Application Default Credentials metadata server (Cloud Run)
  try {
    const res = await fetch(
      "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
      { headers: { "Metadata-Flavor": "Google" } }
    );
    if (res.ok) {
      const data = await res.json();
      cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
      };
      return data.access_token;
    }
  } catch {
    // Not on GCE/Cloud Run, fall through
  }

  // 2) Use service account key file if available
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath) {
    const { GoogleAuth } = await import("google-auth-library");
    const auth = new GoogleAuth({
      keyFile: keyPath,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();
    const tokenRes = await client.getAccessToken();
    if (tokenRes.token) {
      cachedToken = {
        token: tokenRes.token,
        expiresAt: Date.now() + 3500 * 1000, // ~1 hour minus buffer
      };
      return tokenRes.token;
    }
  }

  throw new Error(
    "Cannot obtain GCP access token. Set GOOGLE_APPLICATION_CREDENTIALS or run on GCP."
  );
}
