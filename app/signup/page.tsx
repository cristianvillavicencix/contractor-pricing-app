"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { getAuthCallbackUrl } from "@/lib/auth-redirect-url";
import { resolvePostAuthPath } from "@/lib/post-auth-redirect";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

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

// Auto-formats digits into (xxx) xxx-xxxx as the user types
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\(\d{3}\) \d{3}-\d{4}$/;

type PasswordStrength = { score: 0 | 1 | 2 | 3; label: string; color: string };

function getPasswordStrength(pw: string): PasswordStrength {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score: 1, label: "Weak", color: "bg-red-500" };
  if (score === 2) return { score: 2, label: "Fair", color: "bg-yellow-400" };
  return { score: 3, label: "Strong", color: "bg-emerald-500" };
}

function FieldError({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-[#b42318]">{msg}</p>;
}

function formatSignupError(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    const o = e as { message: string; status?: number; code?: string };
    const base = String(o.message);
    const code = o.code ?? "";
    if (code === "user_already_exists" || /already registered|already been registered/i.test(base)) {
      return "That email already has an account. Sign in instead.";
    }
    if (code === "weak_password" || /password.*at least|Password should be/i.test(base)) {
      return "Password is too weak — try at least 6 characters.";
    }
    if (code === "signup_disabled" || /signups not allowed/i.test(base)) {
      return "New sign-ups are currently disabled. Contact support.";
    }
    if (/provider is not enabled|Unsupported provider|validation_failed/i.test(base)) {
      return "Google sign-in is not enabled. In Supabase: Authentication → Providers → Google.";
    }
    if (o.status) return `${base} (HTTP ${o.status})`;
    return base;
  }
  return e instanceof Error ? e.message : "Something went wrong";
}

function inputClass(hasError: boolean) {
  return `w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 ${
    hasError
      ? "border-[#b42318] focus:border-[#b42318] focus:ring-[#b42318]/20"
      : "border-[#d9e2ec] focus:border-[#ff5c35] focus:ring-[#ff5c35]/20"
  }`;
}

function SignupPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/projects";

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Per-field errors (shown after blur or submit attempt)
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyKind, setBusyKind] = useState<"signup" | "google" | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) router.replace(await resolvePostAuthPath(supabase, next));
    });
  }, [router, next, supabase]);

  function touch(field: string) {
    setTouched((t) => ({ ...t, [field]: true }));
  }

  const errors = {
    fullName: !fullName.trim() ? "Full name is required." : null,
    companyName: !companyName.trim() ? "Company name is required." : null,
    phone: phone && !PHONE_RE.test(phone) ? "Use format (xxx) xxx-xxxx." : null,
    email: !email.trim()
      ? "Email is required."
      : !EMAIL_RE.test(email)
      ? "Enter a valid email address."
      : null,
    password: !password ? "Password is required." : password.length < 6 ? "At least 6 characters." : null,
  };

  const hasErrors = Object.values(errors).some(Boolean);

  async function signInWithGoogle() {
    setSubmitError(null);
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
      setSubmitError(formatSignupError(e));
      setBusy(false);
      setBusyKind(null);
    }
  }

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setInfoMessage(null);

    // Mark all fields as touched to show errors
    setTouched({ fullName: true, companyName: true, phone: true, email: true, password: true });
    if (hasErrors) return;

    setBusy(true);
    setBusyKind("signup");
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            company_name: companyName.trim(),
            phone: phone.trim(),
          },
          emailRedirectTo: getAuthCallbackUrl(next),
        },
      });
      if (error) throw error;
      if (data.session) {
        router.replace(await resolvePostAuthPath(supabase, next));
        return;
      }
      setInfoMessage("Account created! Check your inbox to confirm your email, then sign in.");
    } catch (e) {
      setSubmitError(formatSignupError(e));
    } finally {
      setBusy(false);
      setBusyKind(null);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold tracking-tight text-[#213343]">
            Bid<span className="text-[#ff5c35]">wise</span>
          </span>
        </div>

        <div className="rounded-xl border border-[#d9e2ec] bg-white p-8 shadow-sm">
          <h1 className="text-lg font-semibold text-[#213343]">Create your account</h1>
          <p className="mt-1 text-sm text-gray-500">Get started — it only takes a minute.</p>

          <button
            type="button"
            disabled={busy}
            onClick={signInWithGoogle}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-lg border border-[#d9e2ec] bg-white px-4 py-2.5 text-sm font-medium text-[#213343] shadow-sm transition hover:bg-[#f6f8fb] disabled:opacity-60"
          >
            <GoogleLogo />
            {busy && busyKind === "google" ? "Opening Google…" : "Continue with Google"}
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#e8edf2]" />
            <span className="text-xs text-gray-400">or</span>
            <div className="h-px flex-1 bg-[#e8edf2]" />
          </div>

          <form onSubmit={createAccount} className="space-y-4" noValidate>
            {/* Full name */}
            <div>
              <label className="mb-1 block text-sm font-medium text-[#213343]">Full name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onBlur={() => touch("fullName")}
                type="text"
                autoComplete="name"
                autoFocus
                placeholder="John Smith"
                className={inputClass(!!touched.fullName && !!errors.fullName)}
              />
              {touched.fullName && <FieldError msg={errors.fullName} />}
            </div>

            {/* Company name */}
            <div>
              <label className="mb-1 block text-sm font-medium text-[#213343]">Company name</label>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                onBlur={() => touch("companyName")}
                type="text"
                autoComplete="organization"
                placeholder="Acme Contracting LLC"
                className={inputClass(!!touched.companyName && !!errors.companyName)}
              />
              {touched.companyName && <FieldError msg={errors.companyName} />}
            </div>

            {/* Phone */}
            <div>
              <label className="mb-1 block text-sm font-medium text-[#213343]">
                Phone{" "}
                <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                onBlur={() => touch("phone")}
                type="tel"
                autoComplete="tel"
                placeholder="(555) 000-0000"
                className={inputClass(!!touched.phone && !!errors.phone)}
              />
              {touched.phone && <FieldError msg={errors.phone} />}
            </div>

            {/* Email */}
            <div>
              <label className="mb-1 block text-sm font-medium text-[#213343]">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => touch("email")}
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                className={inputClass(!!touched.email && !!errors.email)}
              />
              {touched.email && <FieldError msg={errors.email} />}
            </div>

            {/* Password */}
            <div>
              <label className="mb-1 block text-sm font-medium text-[#213343]">Password</label>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => touch("password")}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={`${inputClass(!!touched.password && !!errors.password)} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#213343]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {touched.password && <FieldError msg={errors.password} />}
              {password && (() => {
                const s = getPasswordStrength(password);
                return (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {([1, 2, 3] as const).map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                            s.score >= i ? s.color : "bg-[#e8edf2]"
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`mt-1 text-xs font-medium ${
                      s.score === 1 ? "text-red-500" : s.score === 2 ? "text-yellow-500" : "text-emerald-600"
                    }`}>
                      {s.label}
                    </p>
                  </div>
                );
              })()}
            </div>

            {submitError && (
              <div className="rounded-lg border border-[#ffe0d5] bg-[#fff1ea] px-3 py-2 text-sm text-[#b42318]">
                {submitError}
              </div>
            )}
            {!submitError && infoMessage && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                {infoMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-[#ff5c35] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#e94820] disabled:opacity-60"
            >
              {busy && busyKind === "signup" ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="font-medium text-[#ff5c35] hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa] text-sm text-gray-500">
          Loading…
        </div>
      }
    >
      <SignupPageInner />
    </Suspense>
  );
}
