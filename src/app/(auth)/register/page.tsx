"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

type RegisterMode = "email" | "invite";

interface RegistrationResult {
  user: { id: string; name: string; email?: string };
  pin?: string;
  organization?: { id: string; name: string };
}

export default function RegisterPage() {
  const [mode, setMode] = useState<RegisterMode>("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RegistrationResult | null>(null);

  async function handleEmailRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "email",
          name,
          email,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Registration failed");
      }
      // Redirect to dashboard on email registration
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleInviteRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "invite",
          name,
          inviteCode,
          email: email || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Registration failed");
      }
      // Show PIN result instead of redirecting
      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  // Show PIN result screen after invite registration
  if (result?.pin) {
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
            Registration Complete!
          </h1>
          {result.organization && (
            <p className="mt-1 text-sm text-gray-500">
              You have joined {result.organization.name}
            </p>
          )}
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

        {/* Warning */}
        <div className="rounded-lg bg-red-50 px-4 py-3">
          <div className="flex">
            <svg
              className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-red-600"
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
              <p className="text-sm font-semibold text-red-800">
                Save your PIN now!
              </p>
              <p className="mt-1 text-sm text-red-700">
                Write it down or take a screenshot. This PIN will not be shown
                again. You will use it to sign in.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => (window.location.href = "/dashboard")}
          className="w-full rounded-lg bg-brand-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-brand-600"
        >
          Continue to Dashboard
        </button>

        <div className="text-center text-sm text-gray-500">
          <Link
            href="/login"
            className="font-medium text-brand-500 hover:text-brand-600"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Logo */}
      <div className="text-center">
        <Image src="/logo.png" alt="MEDICHIPS" width={56} height={56} className="mx-auto h-14 w-14" />
        <h1 className="mt-4 text-2xl font-bold text-gray-900">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Join MEDICHIPS-LINK to start learning
        </p>
      </div>

      {/* Mode tabs */}
      <div className="flex rounded-lg bg-gray-100 p-1">
        {(["email", "invite"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setError("");
            }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              mode === m
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {m === "email" ? "Email" : "Invite Code"}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Email Registration */}
      {mode === "email" && (
        <form onSubmit={handleEmailRegister} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              placeholder="Your full name"
            />
          </div>
          <div>
            <label
              htmlFor="register-email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label
              htmlFor="register-password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label
              htmlFor="confirm-password"
              className="block text-sm font-medium text-gray-700"
            >
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              placeholder="Re-enter your password"
            />
          </div>
          <button
            type="submit"
            disabled={!name || !email || !password || !confirmPassword || loading}
            className="w-full rounded-lg bg-brand-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>
      )}

      {/* Invite Code Registration */}
      {mode === "invite" && (
        <form onSubmit={handleInviteRegister} className="space-y-4">
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
            />
          </div>
          <div>
            <label
              htmlFor="invite-code"
              className="block text-sm font-medium text-gray-700"
            >
              Invite Code
            </label>
            <input
              id="invite-code"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 font-mono tracking-wider focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              placeholder="Enter invite code"
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
          <button
            type="submit"
            disabled={!name || !inviteCode || loading}
            className="w-full rounded-lg bg-brand-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
          >
            {loading ? "Joining..." : "Join with Invite Code"}
          </button>
        </form>
      )}

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
