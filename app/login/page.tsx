"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resolvePostAuthPath } from "@/lib/post-auth-redirect";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Mode = "password" | "magic";

function formatAuthError(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    const o = e as { message: string; status?: number; code?: string };
    const base = String(o.message);
    const code = o.code ?? "";
    if (code === "user_already_exists" || /already registered|already been registered/i.test(base)) {
      return "That email already has an account. Use Sign in, or reset your password from Supabase if you enabled it.";
    }
    if (code === "weak_password" || /password.*at least|Password should be/i.test(base)) {
      return "Password is too weak. Try at least 6 characters (Supabase may require more depending on your project settings).";
    }
    if (o.code === "signup_disabled" || /signups not allowed/i.test(base)) {
      return "Email sign-ups are disabled for this project. Enable them in Supabase → Authentication → Providers → Email.";
    }
    if (/provider is not enabled|Unsupported provider|validation_failed/i.test(base)) {
      return "Google sign-in is not enabled or is misconfigured. In Supabase: Authentication → Providers → Google (Client ID, Secret, save).";
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
  const [mode, setMode] = useState<Mode>("password");
  const [error, setError] = useState<string | null>(null);
  const [hashAuthError, setHashAuthError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Which action is running — drives button labels so feedback is obvious */
  const [busyKind, setBusyKind] = useState<"signin" | "signup" | "google" | "reset" | null>(null);

  const queryOAuthError = useMemo(() => {
    const qErr = searchParams.get("error");
    const qDesc = searchParams.get("error_description");
    if (!qDesc && !qErr) return null;
    const raw = (qDesc ?? qErr ?? "").replace(/\+/g, " ");
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
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
    try {
      msg = decodeURIComponent(raw);
    } catch {
      msg = hErr;
    }
    queueMicrotask(() => {
      setHashAuthError(msg);
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    });
  }, []);

  const displayError = error ?? queryOAuthError ?? hashAuthError;

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) router.replace(await resolvePostAuthPath(supabase, next));
    });
  }, [router, next, supabase]);

  async function signIn() {
    setError(null);
    setInfoMessage(null);
    setBusy(true);
    setBusyKind("signin");
    try {
      if (!email.trim()) throw new Error("Email is required");
      if (mode === "password") {
        if (!password) throw new Error("Password is required");
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.replace(await resolvePostAuthPath(supabase, next));
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
      setInfoMessage("Check your email for the sign-in link.");
    } catch (e) {
      setError(formatAuthError(e));
    } finally {
      setBusy(false);
      setBusyKind(null);
    }
  }

  async function signUp() {
    setError(null);
    setInfoMessage(null);
    setHashAuthError(null);
    setBusy(true);
    setBusyKind("signup");
    try {
      if (mode !== "password") {
        throw new Error('To sign up, use the Password tab, enter email and password, then click Create account.');
      }
      if (!email.trim()) throw new Error("Email is required");
      if (!password) throw new Error("Password is required");
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
      if (data.session) {
        router.replace(await resolvePostAuthPath(supabase, next));
        return;
      }
      setInfoMessage(
        "Account created. If email confirmation is required, check your inbox (and spam). Without SMTP configured in Supabase, mail may not arrive: turn off “Confirm email” on the Email provider or configure SMTP."
      );
    } catch (e) {
      setError(formatAuthError(e));
    } finally {
      setBusy(false);
      setBusyKind(null);
    }
  }

  async function sendPasswordReset() {
    setError(null);
    setInfoMessage(null);
    setHashAuthError(null);
    if (!email.trim()) {
      setError("Enter your email so we can send a reset link.");
      return;
    }
    setBusy(true);
    setBusyKind("reset");
    try {
      const nextDest = encodeURIComponent("/auth/update-password");
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=${nextDest}`,
      });
      if (error) throw error;
      setInfoMessage(
        "If that email has an account, you will receive a link to choose a new password. Check spam as well."
      );
    } catch (e) {
      setError(formatAuthError(e));
    } finally {
      setBusy(false);
      setBusyKind(null);
    }
  }

  async function signInWithGoogle() {
    setError(null);
    setInfoMessage(null);
    setBusy(true);
    setBusyKind("google");
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      throw new Error("No Google URL returned. Check the Google provider configuration in Supabase.");
    } catch (e) {
      setError(formatAuthError(e));
      setBusy(false);
      setBusyKind(null);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa] px-4 text-[#213343]">
      <div className="w-full max-w-md rounded-xl border border-[#d9e2ec] bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-gray-500">Access your workspace.</p>

        <div className="mt-5 space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="w-full rounded border border-[#d9e2ec] px-3 py-2 text-sm outline-none focus:border-[#ff5c35]"
            />
          </label>

          {mode === "password" ? (
            <div className="space-y-1">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Password</span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="current-password"
                  className="w-full rounded border border-[#d9e2ec] px-3 py-2 text-sm outline-none focus:border-[#ff5c35]"
                />
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => void sendPasswordReset()}
                className="text-xs font-medium text-[#ff5c35] hover:underline disabled:opacity-50"
              >
                {busy && busyKind === "reset" ? "Sending…" : "Forgot password?"}
              </button>
            </div>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("password");
                setError(null);
                setInfoMessage(null);
              }}
              className={`flex-1 rounded border px-3 py-2 text-sm ${
                mode === "password"
                  ? "border-[#111111] bg-[#111111] text-white"
                  : "border-[#d9e2ec] bg-white text-gray-600"
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("magic");
                setError(null);
                setInfoMessage(null);
              }}
              className={`flex-1 rounded border px-3 py-2 text-sm ${
                mode === "magic"
                  ? "border-[#111111] bg-[#111111] text-white"
                  : "border-[#d9e2ec] bg-white text-gray-600"
              }`}
            >
              Magic link
            </button>
          </div>
          {mode === "magic" ? (
            <p className="text-xs text-gray-500">
              Sign up (<strong>Create account</strong>) is only available on the <strong>Password</strong> tab.
            </p>
          ) : null}

          {displayError ? (
            <div className="rounded-md border border-[#ffe0d5] bg-[#fff1ea] px-3 py-2 text-sm text-[#b42318]">
              {displayError}
            </div>
          ) : null}
          {!displayError && infoMessage ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
              {infoMessage}
            </div>
          ) : null}

          <button
            type="button"
            disabled={busy}
            onClick={signIn}
            className="w-full rounded-md bg-[#ff5c35] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#e94820] disabled:opacity-60"
          >
            {busy && busyKind === "signin"
              ? mode === "magic"
                ? "Sending…"
                : "Signing in…"
              : mode === "magic"
                ? "Send link"
                : "Sign in"}
          </button>

          {mode === "password" ? (
            <button
              type="button"
              disabled={busy}
              onClick={signUp}
              className="w-full rounded-md border border-[#d9e2ec] px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-[#f6f8fb] disabled:opacity-60"
            >
              {busy && busyKind === "signup" ? "Creating account…" : "Create account"}
            </button>
          ) : null}

          <div className="pt-3">
            <button
              type="button"
              disabled={busy}
              onClick={signInWithGoogle}
              className="w-full rounded-md border border-[#d9e2ec] px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-[#f6f8fb] disabled:opacity-60"
            >
              {busy && busyKind === "google" ? "Opening Google…" : "Continue with Google"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa] text-sm text-gray-500">
          Loading…
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
