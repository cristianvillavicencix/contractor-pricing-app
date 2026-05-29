"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { getAuthCallbackUrl } from "@/lib/auth-redirect-url";
import { resolvePostAuthPath } from "@/lib/post-auth-redirect";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { BrandLogo } from "@/components/brand-logo";

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" />
    </svg>
  );
}

function isWrongCredentialsError(e: unknown): boolean {
  if (e && typeof e === "object" && "message" in e) {
    const base = String((e as { message: string }).message);
    return /invalid.*credentials|invalid login/i.test(base);
  }
  return false;
}

function formatAuthError(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    const o = e as { message: string; status?: number; code?: string };
    const base = String(o.message);
    if (/provider is not enabled|Unsupported provider|validation_failed/i.test(base)) {
      return "Google sign-in is not enabled. In Supabase: Authentication → Providers → Google.";
    }
    if (/invalid.*credentials|invalid login/i.test(base)) {
      return "Incorrect email or password.";
    }
    if (o.status) return `${base} (HTTP ${o.status})`;
    return base;
  }
  return e instanceof Error ? e.message : "Authentication error";
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/projects";

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyKind, setBusyKind] = useState<"signin" | "google" | null>(null);

  const queryOAuthError = useMemo(() => {
    const qErr = searchParams.get("error");
    const qDesc = searchParams.get("error_description");
    if (!qDesc && !qErr) return null;
    const raw = (qDesc ?? qErr ?? "").replace(/\+/g, " ");
    try { return decodeURIComponent(raw); } catch { return raw; }
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash?.replace(/^#/, "");
    if (!hash) return;
    const hp = new URLSearchParams(hash);
    const hErr = hp.get("error_description") ?? hp.get("error");
    if (!hErr) return;
    const raw = hErr.replace(/\+/g, " ");
    let msg: string;
    try { msg = decodeURIComponent(raw); } catch { msg = hErr; }
    queueMicrotask(() => {
      setError(msg);
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    });
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) router.replace(await resolvePostAuthPath(supabase, next));
    });
  }, [router, next, supabase]);

  const displayError = error ?? queryOAuthError;

  async function signInWithGoogle() {
    setError(null);
    setBusy(true);
    setBusyKind("google");
    try {
      const redirectTo = getAuthCallbackUrl(next);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (data.url) { window.location.assign(data.url); return; }
      throw new Error("No redirect URL from Google. Check Supabase provider config.");
    } catch (e) {
      setError(formatAuthError(e));
      setBusy(false);
      setBusyKind(null);
    }
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setShowForgot(false);
    if (!email.trim()) { setError("Email is required."); return; }
    if (!password) { setError("Password is required."); return; }
    setBusy(true);
    setBusyKind("signin");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.replace(await resolvePostAuthPath(supabase, next));
    } catch (e) {
      setError(formatAuthError(e));
      if (isWrongCredentialsError(e)) setShowForgot(true);
    } finally {
      setBusy(false);
      setBusyKind(null);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#F0F4F1] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <BrandLogo className="mx-auto h-auto w-[320px] max-w-full object-contain" />
        </div>

        <div className="rounded-xl border border-[#d9e2ec] bg-white p-8 shadow-sm">
          <h1 className="text-lg font-semibold text-[#111827]">Sign in</h1>
          <p className="mt-1 text-sm text-gray-500">Access your workspace.</p>

          <button
            type="button"
            disabled={busy}
            onClick={signInWithGoogle}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-lg border border-[#d9e2ec] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] shadow-sm transition hover:bg-[#F0F4F1] disabled:opacity-60"
          >
            <GoogleLogo />
            {busy && busyKind === "google" ? "Opening Google…" : "Continue with Google"}
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#e8edf2]" />
            <span className="text-xs text-gray-400">or</span>
            <div className="h-px flex-1 bg-[#e8edf2]" />
          </div>

          <form onSubmit={signIn} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[#111827]">Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@company.com"
                className="w-full rounded-lg border border-[#d9e2ec] px-3 py-2 text-sm outline-none transition focus:border-[#4C9A59] focus:ring-2 focus:ring-[#4C9A59]/20"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[#111827]">Password</span>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-[#d9e2ec] py-2 pl-3 pr-10 text-sm outline-none transition focus:border-[#4C9A59] focus:ring-2 focus:ring-[#4C9A59]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#111827]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {displayError && (
              <div className="rounded-lg border border-[#ffe0d5] bg-[#fff1ea] px-3 py-2 text-sm text-[#b42318]">
                {displayError}
                {showForgot && (
                  <Link
                    href={`/forgot-password?email=${encodeURIComponent(email)}`}
                    className="mt-1.5 block font-medium underline hover:no-underline"
                  >
                    Forgot your password?
                  </Link>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-[#4C9A59] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#3C7F4A] disabled:opacity-60"
            >
              {busy && busyKind === "signin" ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link
            href={`/signup?next=${encodeURIComponent(next)}`}
            className="font-medium text-[#2D6B3A] hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#F0F4F1] text-sm text-gray-500">
          Loading…
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
