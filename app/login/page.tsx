"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resolvePostAuthPath } from "@/lib/post-auth-redirect";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Mode = "password" | "magic";

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/projects";

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode>("password");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) router.replace(await resolvePostAuthPath(supabase, next));
    });
  }, [router, next, supabase]);

  async function signIn() {
    setError(null);
    setBusy(true);
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
      setError("Check your email for the sign-in link.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function signUp() {
    setError(null);
    setBusy(true);
    try {
      if (!email.trim()) throw new Error("Email is required");
      if (!password) throw new Error("Password is required");
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
      setError("Account created. Check your email to confirm (if required).");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setError(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google login failed");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa] px-4 text-[#213343]">
      <div className="w-full max-w-md rounded-xl border border-[#d9e2ec] bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-gray-500">Access your company workspace.</p>

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
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Password</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="w-full rounded border border-[#d9e2ec] px-3 py-2 text-sm outline-none focus:border-[#ff5c35]"
              />
            </label>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("password")}
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
              onClick={() => setMode("magic")}
              className={`flex-1 rounded border px-3 py-2 text-sm ${
                mode === "magic"
                  ? "border-[#111111] bg-[#111111] text-white"
                  : "border-[#d9e2ec] bg-white text-gray-600"
              }`}
            >
              Magic link
            </button>
          </div>

          {error ? (
            <div className="rounded-md border border-[#ffe0d5] bg-[#fff1ea] px-3 py-2 text-sm text-[#b42318]">
              {error}
            </div>
          ) : null}

          <button
            type="button"
            disabled={busy}
            onClick={signIn}
            className="w-full rounded-md bg-[#ff5c35] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#e94820] disabled:opacity-60"
          >
            {busy ? "Working…" : mode === "magic" ? "Send magic link" : "Sign in"}
          </button>

          {mode === "password" ? (
            <button
              type="button"
              disabled={busy}
              onClick={signUp}
              className="w-full rounded-md border border-[#d9e2ec] px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-[#f6f8fb] disabled:opacity-60"
            >
              Create account
            </button>
          ) : null}

          <div className="pt-3">
            <button
              type="button"
              disabled={busy}
              onClick={signInWithGoogle}
              className="w-full rounded-md border border-[#d9e2ec] px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-[#f6f8fb] disabled:opacity-60"
            >
              Continue with Google
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
