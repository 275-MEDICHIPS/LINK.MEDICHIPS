"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  description?: string;
}

interface InviteData {
  valid: boolean;
  role: string;
  organization: OrgInfo;
}

interface RegistrationResult {
  user: { id: string; name: string; email?: string };
  pin: string;
  organization: { id: string; name: string };
}

type PageState = "loading" | "ready" | "submitting" | "success" | "error";

export default function InviteCodePage() {
  const params = useParams();
  const code = params.code as string;

  const [state, setState] = useState<PageState>("loading");
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<RegistrationResult | null>(null);

  // Auto-validate invite code on load
  useEffect(() => {
    async function validateCode() {
      try {
        const res = await fetch(
          `/api/v1/auth/invite?code=${encodeURIComponent(code)}`
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error?.message || "Invalid invite code");
        }
        setInviteData(data.data);
        setState("ready");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to validate invite code"
        );
        setState("error");
      }
    }
    validateCode();
  }, [code]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setState("submitting");

    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "invite",
          name,
          inviteCode: code,
          email: email || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Registration failed");
      }
      setResult(data.data);
      setState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setState("ready");
    }
  }

  // Loading state
  if (state === "loading") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500">
            <span className="text-xl font-bold text-white">M</span>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Validating Invite...
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Please wait while we check your invite code
          </p>
        </div>
        <div className="flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  // Error state
  if (state === "error") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-500">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Invalid Invite
          </h1>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
        </div>
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
        <div className="space-y-3">
          <Link
            href="/login"
            className="block w-full rounded-lg bg-brand-500 px-4 py-3 text-center font-semibold text-white transition-colors hover:bg-brand-600"
          >
            Go to Login
          </Link>
          <Link
            href="/register"
            className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-center font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Register with Email
          </Link>
        </div>
      </div>
    );
  }

  // Success state — show PIN
  if (state === "success" && result) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-green-500">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Welcome to {result.organization.name}!
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Your account has been created successfully
          </p>
        </div>

        {/* PIN Display */}
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-6">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-800">
              Your Login PIN
            </p>
            <p className="mt-3 font-mono text-3xl font-bold tracking-[0.3em] text-gray-900">
              {result.pin}
            </p>
          </div>
        </div>

        {/* Prominent warning */}
        <div className="rounded-xl border-2 border-red-300 bg-red-50 p-5">
          <div className="flex">
            <svg
              className="mr-3 mt-0.5 h-6 w-6 flex-shrink-0 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <div>
              <p className="text-base font-bold text-red-800">
                SAVE YOUR PIN NOW!
              </p>
              <p className="mt-1 text-sm text-red-700">
                Write it down on paper or take a screenshot. This PIN will{" "}
                <strong>never be shown again</strong>. You need it every time you
                sign in.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => (window.location.href = "/dashboard")}
          className="w-full rounded-lg bg-brand-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-brand-600"
        >
          I saved my PIN — Continue to Dashboard
        </button>
      </div>
    );
  }

  // Ready state — show registration form
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500">
          <span className="text-xl font-bold text-white">M</span>
        </div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">
          You&apos;re Invited!
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Join MEDICHIPS-LINK to start learning
        </p>
      </div>

      {/* Organization info card */}
      {inviteData?.organization && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            {inviteData.organization.logoUrl ? (
              <img
                src={inviteData.organization.logoUrl}
                alt={inviteData.organization.name}
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900">
                {inviteData.organization.name}
              </p>
              {inviteData.organization.description && (
                <p className="text-sm text-gray-500">
                  {inviteData.organization.description}
                </p>
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
              Role: {inviteData.role}
            </span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Registration form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="invite-name"
            className="block text-sm font-medium text-gray-700"
          >
            Full Name
          </label>
          <input
            id="invite-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            placeholder="Your full name"
            autoFocus
          />
        </div>
        <div>
          <label
            htmlFor="invite-email"
            className="block text-sm font-medium text-gray-700"
          >
            Email{" "}
            <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            placeholder="you@example.com"
          />
        </div>

        <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <p>
            After registration, you will receive a <strong>PIN code</strong>{" "}
            that you will use to sign in. Make sure to save it!
          </p>
        </div>

        <button
          type="submit"
          disabled={!name || state === "submitting"}
          className="w-full rounded-lg bg-brand-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
        >
          {state === "submitting" ? "Creating account..." : "Join Organization"}
        </button>
      </form>

      {/* Footer links */}
      <div className="text-center text-sm text-gray-500">
        <p>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-brand-500 hover:text-brand-600"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
