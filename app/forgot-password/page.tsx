"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function ForgotPasswordInner() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) { setError("Enter your email address."); return; }
    setBusy(true);
    try {
      const nextDest = encodeURIComponent("/auth/update-password");
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=${nextDest}`,
      });
      if (error) throw error;
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold tracking-tight text-[#213343]">
            Bid<span className="text-[#ff5c35]">wise</span>
          </span>
        </div>

        <div className="rounded-xl border border-[#d9e2ec] bg-white p-8 shadow-sm">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-lg font-semibold text-[#213343]">Check your inbox</h1>
              <p className="mt-2 text-sm text-gray-500">
                If <strong>{email}</strong> has an account, we sent a link to reset your password. Check spam too.
              </p>
              <Link
                href="/login"
                className="mt-6 block text-sm font-medium text-[#ff5c35] hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-[#213343]">Reset your password</h1>
              <p className="mt-1 text-sm text-gray-500">
                Enter your email and we&apos;ll send you a reset link.
              </p>

              <form onSubmit={sendReset} className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-[#213343]">Email</span>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="you@company.com"
                    className="w-full rounded-lg border border-[#d9e2ec] px-3 py-2 text-sm outline-none transition focus:border-[#ff5c35] focus:ring-2 focus:ring-[#ff5c35]/20"
                  />
                </label>

                {error && (
                  <div className="rounded-lg border border-[#ffe0d5] bg-[#fff1ea] px-3 py-2 text-sm text-[#b42318]">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-lg bg-[#ff5c35] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#e94820] disabled:opacity-60"
                >
                  {busy ? "Sending…" : "Send reset link"}
                </button>
              </form>
            </>
          )}
        </div>

        {!sent && (
          <p className="mt-5 text-center text-sm text-gray-500">
            Remember it?{" "}
            <Link href="/login" className="font-medium text-[#ff5c35] hover:underline">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa] text-sm text-gray-500">
          Loading…
        </div>
      }
    >
      <ForgotPasswordInner />
    </Suspense>
  );
}
