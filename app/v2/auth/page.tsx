"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resolvePostAuthPath } from "@/lib/post-auth-redirect";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { V2BodyTag } from "../_shared/body-tag";

type AuthMode = "signin" | "signup";

type AuthData = {
  fullName: string;
  companyName: string;
  email: string;
  password: string;
  agreeTos: boolean;
  remember: boolean;
};

const INITIAL_DATA: AuthData = { fullName: "", companyName: "", email: "", password: "", agreeTos: false, remember: true };

function formatAuthError(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    const o = e as { message: string; status?: number; code?: string };
    const base = String(o.message);
    if (/provider is not enabled|Unsupported provider|validation_failed/i.test(base)) {
      return "Google sign-in is not enabled. In Supabase: Authentication -> Providers -> Google.";
    }
    if (/invalid.*credentials|invalid login/i.test(base)) return "Incorrect email or password.";
    if (o.code === "user_already_exists" || /already registered|already been registered/i.test(base)) {
      return "That email already has an account. Sign in instead.";
    }
    if (o.code === "weak_password" || /password.*at least|Password should be/i.test(base)) {
      return "Password is too weak. Try at least 6 characters.";
    }
    if (o.status) return `${base} (HTTP ${o.status})`;
    return base;
  }
  return e instanceof Error ? e.message : "Authentication error";
}

export function AuthV2Experience({ initialMode = "signup" }: { initialMode?: AuthMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [data, setData] = useState<AuthData>(INITIAL_DATA);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busyKind, setBusyKind] = useState<"signin" | "signup" | "google" | "magic" | "reset" | null>(null);
  const set = (p: Partial<AuthData>) => setData((d) => ({ ...d, ...p }));

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: sessionData }) => {
      if (sessionData.session) router.replace(await resolvePostAuthPath(supabase, next));
    });
  }, [next, router, supabase]);

  async function signInWithGoogle() {
    setError(null);
    setInfo(null);
    setBusyKind("google");
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { data: oauthData, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (oauthError) throw oauthError;
      if (oauthData.url) {
        window.location.assign(oauthData.url);
        return;
      }
      throw new Error("No redirect URL from Google. Check Supabase provider config.");
    } catch (e) {
      setError(formatAuthError(e));
      setBusyKind(null);
    }
  }

  async function signIn() {
    setError(null);
    setInfo(null);
    setBusyKind("signin");
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: data.email.trim(),
        password: data.password,
      });
      if (authError) throw authError;
      router.replace(await resolvePostAuthPath(supabase, next));
    } catch (e) {
      setError(formatAuthError(e));
      setBusyKind(null);
    }
  }

  async function signUp() {
    setError(null);
    setInfo(null);
    setBusyKind("signup");
    try {
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: data.email.trim(),
        password: data.password,
        options: {
          data: {
            full_name: data.fullName.trim(),
            company_name: data.companyName.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (signupError) throw signupError;
      if (signupData.session) {
        router.replace(await resolvePostAuthPath(supabase, next));
        return;
      }
      setInfo("Account created. Check your inbox to confirm your email, then sign in.");
      setMode("signin");
    } catch (e) {
      setError(formatAuthError(e));
    } finally {
      setBusyKind(null);
    }
  }

  async function sendMagicLink() {
    setError(null);
    setInfo(null);
    setBusyKind("magic");
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: data.email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (otpError) throw otpError;
      setInfo(`We sent a sign-in link to ${data.email}.`);
    } catch (e) {
      setError(formatAuthError(e));
    } finally {
      setBusyKind(null);
    }
  }

  async function resetPassword(email: string) {
    setError(null);
    setInfo(null);
    setBusyKind("reset");
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (resetError) throw resetError;
      setInfo(`Password reset link sent to ${email}.`);
    } catch (e) {
      setError(formatAuthError(e));
    } finally {
      setBusyKind(null);
    }
  }

  return (
    <div className="v2-wiz">
      <V2BodyTag />
      <div className="app">
        <div className="wiz-topbar">
          <div className="logo">Bid<span className="wise">wise</span></div>
          <div className="topbar-meta">
            {mode === "signup" ? (
              <>Already have an account? <a onClick={() => setMode("signin")}>Sign in</a></>
            ) : (
              <>New here? <a onClick={() => setMode("signup")}>Create account</a></>
            )}
          </div>
        </div>

        <div className="stage">
          <div className="stage-left" key={`mg-${mode}`}>
            {mode === "signup" ? <VaultMotion name={data.fullName} /> : <RecognitionMotion email={data.email} />}
          </div>
          <div className="stage-right">
            <div style={{ maxWidth: 420, width: "100%", margin: "0 auto" }}>
              <ModeTabs mode={mode} onChange={setMode} />
              {mode === "signup" ? (
                <SignUpForm
                  data={data}
                  set={set}
                  error={error}
                  info={info}
                  busy={busyKind}
                  onGoogle={signInWithGoogle}
                  onSubmit={signUp}
                  onSwitch={() => {
                    setMode("signin");
                    setError(null);
                  }}
                />
              ) : (
                <SignInForm
                  data={data}
                  set={set}
                  error={error}
                  info={info}
                  busy={busyKind}
                  onGoogle={signInWithGoogle}
                  onSubmit={signIn}
                  onMagicLink={sendMagicLink}
                  onResetPassword={resetPassword}
                  onSwitch={() => {
                    setMode("signup");
                    setError(null);
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <div className="trust-strip">
          <span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
            </svg>
            Bank-level encryption
          </span>
          <span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" />
            </svg>
            SOC 2 Type II
          </span>
          <span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 9l9-6 9 6v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
            3,200+ contractors trust Bidwise
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AuthV2() {
  return (
    <Suspense
      fallback={
        <div className="v2-wiz">
          <V2BodyTag />
          <div className="app" style={{ alignItems: "center", justifyContent: "center", fontSize: 14, color: "var(--ink-3)" }}>
            Loading...
          </div>
        </div>
      }
    >
      <AuthV2Experience initialMode="signup" />
    </Suspense>
  );
}

function ModeTabs({ mode, onChange }: { mode: AuthMode; onChange: (m: AuthMode) => void }) {
  const indicatorRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!wrapRef.current) return;
    const active = wrapRef.current.querySelector<HTMLButtonElement>(".auth-tab.active");
    if (!active || !indicatorRef.current) return;
    const wrapRect = wrapRef.current.getBoundingClientRect();
    const r = active.getBoundingClientRect();
    indicatorRef.current.style.left = `${r.left - wrapRect.left}px`;
    indicatorRef.current.style.width = `${r.width}px`;
  }, [mode]);

  return (
    <div className="auth-tabs" ref={wrapRef}>
      <div className="indicator" ref={indicatorRef}></div>
      <button className={`auth-tab ${mode === "signin" ? "active" : ""}`} onClick={() => onChange("signin")}>Sign in</button>
      <button className={`auth-tab ${mode === "signup" ? "active" : ""}`} onClick={() => onChange("signup")}>Create account</button>
    </div>
  );
}

function SocialButtons({ onGoogle, busy }: { onGoogle: () => void; busy: boolean }) {
  return (
    <div className="social-row">
      <button type="button" className="social-btn" onClick={onGoogle} disabled={busy}>
        <svg viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16.1 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.7 29.3 5 24 5 16.3 5 9.7 9.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3c-2 1.5-4.5 2.5-7.3 2.5-5.2 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.6 16.3 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.3 5.3C41.4 35.4 44 30 44 24c0-1.3-.1-2.6-.4-3.9z" />
        </svg>
        {busy ? "Opening..." : "Google"}
      </button>
      <button type="button" className="social-btn" disabled title="Coming soon">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
        Apple
      </button>
    </div>
  );
}

function pwStrength(pw: string) {
  if (!pw) return { score: 0, label: "Empty" };
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const labels = ["Weak", "Okay", "Good", "Strong"];
  return { score: s, label: labels[Math.max(0, s - 1)] ?? "Weak" };
}

function SignUpForm({
  data,
  set,
  error,
  info,
  busy,
  onGoogle,
  onSubmit,
  onSwitch,
}: {
  data: AuthData;
  set: (p: Partial<AuthData>) => void;
  error: string | null;
  info: string | null;
  busy: string | null;
  onGoogle: () => void;
  onSubmit: () => void;
  onSwitch: () => void;
}) {
  const [showPw, setShowPw] = useState(false);
  const strength = pwStrength(data.password);
  const canSubmit = data.fullName.trim().length > 1 && data.companyName.trim().length > 1 && /.+@.+\..+/.test(data.email) && data.password.length >= 6 && data.agreeTos;

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSubmit) return;
    onSubmit();
  };

  return (
    <form className="auth-card fade-in" onSubmit={submit}>
      <div className="auth-eyebrow">CREATE ACCOUNT</div>
      <h1 className="auth-title">Start pricing jobs that pay.</h1>
      <p className="auth-sub">Free 14-day trial. No credit card needed. Setup takes about 2 minutes.</p>

      <SocialButtons onGoogle={onGoogle} busy={busy === "google"} />
      <div className="divider">OR WITH EMAIL</div>

      <div className="field">
        <label>Full name</label>
        <input className="input" placeholder="Alex Johnson" value={data.fullName} onChange={(e) => set({ fullName: e.target.value })} />
      </div>
      <div className="field">
        <label>Company name</label>
        <input className="input" placeholder="Acme Contracting LLC" value={data.companyName} onChange={(e) => set({ companyName: e.target.value })} />
      </div>
      <div className="field">
        <label>Work email</label>
        <input className="input" type="email" placeholder="alex@yourbusiness.com" value={data.email} onChange={(e) => set({ email: e.target.value })} />
      </div>
      <div className="field">
        <label>Password</label>
        <div className="input-with-icon">
          <input className="input" type={showPw ? "text" : "password"} placeholder="At least 8 characters"
            value={data.password} onChange={(e) => set({ password: e.target.value })} />
          <button type="button" className="reveal" onClick={() => setShowPw((s) => !s)}>
            {showPw ? "HIDE" : "SHOW"}
          </button>
        </div>
        <div className={`pw-meter s${strength.score}`}>
          <div className="seg"></div><div className="seg"></div><div className="seg"></div><div className="seg"></div>
        </div>
        {data.password && (
          <div className={`pw-hint s${strength.score}`}>
            <span>Strength · <b>{strength.label}</b></span>
            <span>{strength.score < 3 ? "add numbers + symbols" : "looks good"}</span>
          </div>
        )}
      </div>

      <label className="check-row">
        <input type="checkbox" checked={data.agreeTos} onChange={(e) => set({ agreeTos: e.target.checked })} />
        <span>I agree to the <a>Terms of Service</a> and <a>Privacy Policy</a>. I understand my data won&apos;t be shared.</span>
      </label>

      {error && <div className="auth-alert error">{error}</div>}
      {info && <div className="auth-alert success">{info}</div>}

      <button className="submit-btn" type="submit" disabled={!canSubmit || busy === "signup"}>
        {busy === "signup" ? "Creating account..." : <>Create account <span className="arr">→</span></>}
      </button>

      <div className="auth-switch">
        Already have an account? <button type="button" onClick={onSwitch}>Sign in</button>
      </div>
    </form>
  );
}

function SignInForm({
  data,
  set,
  error,
  info,
  busy,
  onGoogle,
  onSubmit,
  onMagicLink,
  onResetPassword,
  onSwitch,
}: {
  data: AuthData;
  set: (p: Partial<AuthData>) => void;
  error: string | null;
  info: string | null;
  busy: string | null;
  onGoogle: () => void;
  onSubmit: () => void;
  onMagicLink: () => void;
  onResetPassword: (email: string) => void;
  onSwitch: () => void;
}) {
  const [showPw, setShowPw] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState(data.email);
  const canSubmit = /.+@.+\..+/.test(data.email) && data.password.length >= 4;

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSubmit) return;
    onSubmit();
  };

  return (
    <form className="auth-card fade-in" onSubmit={submit}>
      <div className="auth-eyebrow">SIGN IN</div>
      <h1 className="auth-title">Welcome back.</h1>
      <p className="auth-sub">Pick up where you left off. Your proposals and clients are right where you parked them.</p>

      {info && (
        <div className="success-card">
          <div className="ico">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16v16H4z" /><path d="M22 6l-10 7L2 6" />
            </svg>
          </div>
          <div>
            <h4>Check your inbox</h4>
            <p>{info}</p>
          </div>
        </div>
      )}

      {!info && (
        <>
          <SocialButtons onGoogle={onGoogle} busy={busy === "google"} />
          <div className="divider">OR WITH EMAIL</div>
        </>
      )}

      <div className="field">
        <label>Email</label>
        <input className="input" type="email" placeholder="alex@yourbusiness.com" value={data.email} onChange={(e) => set({ email: e.target.value })} />
      </div>

      <div className="field">
        <label>
          Password
          <a onClick={(e) => { e.preventDefault(); setForgotOpen(true); }} style={{ cursor: "pointer", color: "var(--gold-deep)", fontWeight: 600 }}>Forgot?</a>
        </label>
        <div className="input-with-icon">
          <input className="input" type={showPw ? "text" : "password"} placeholder="••••••••"
            value={data.password} onChange={(e) => set({ password: e.target.value })} />
          <button type="button" className="reveal" onClick={() => setShowPw((s) => !s)}>
            {showPw ? "HIDE" : "SHOW"}
          </button>
        </div>
      </div>

      <label className="check-row" style={{ marginTop: 0 }}>
        <input type="checkbox" checked={data.remember} onChange={(e) => set({ remember: e.target.checked })} />
        <span>Keep me signed in on this device</span>
      </label>

      {error && <div className="auth-alert error">{error}</div>}

      <button className="submit-btn" type="submit" disabled={!canSubmit || busy === "signin"}>
        {busy === "signin" ? "Signing you in..." : <>Sign in <span className="arr">→</span></>}
      </button>

      <button type="button" className="magic-link-btn" onClick={onMagicLink} disabled={!/.+@.+\..+/.test(data.email) || busy === "magic"}>
        {busy === "magic" ? "Sending..." : "Email me a sign-in link instead"}
      </button>

      <div className="auth-switch">
        New to Bidwise? <button type="button" onClick={onSwitch}>Create account</button>
      </div>

      {forgotOpen && (
        <div className="modal-bg" onClick={() => setForgotOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Reset your password</h3>
            <p>Enter your email and we&apos;ll send a reset link within a minute.</p>
            <input className="input" type="email" placeholder="alex@yourbusiness.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button type="button" className="submit-btn" style={{ flex: 1 }} onClick={() => { onResetPassword(resetEmail); setForgotOpen(false); }}>
                {busy === "reset" ? "Sending..." : "Send reset link"}
              </button>
              <button type="button" className="magic-link-btn" style={{ flex: 0, padding: "14px 18px", marginTop: 0 }} onClick={() => setForgotOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

function VaultMotion({ name }: { name: string }) {
  const display = (name?.trim() || "Your Business").slice(0, 18);
  return (
    <div className="mg-frame fade-in">
      <div className="mg-grid"></div>
      <div className="mg-stage">
        <div className="vault">
          <div className="vault-ring"></div>
          <div className="vault-ring tick"></div>
          <div className="vault-ring inner"></div>
          <div className="vault-center">
            <div className="vault-key">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="15.5" cy="8.5" r="3.5" />
                <path d="M13 11l-8 8v2h2v-2h2v-2h2l3-3" />
              </svg>
            </div>
            <div className="vault-label">Account · New</div>
            <div className="vault-name">{display}</div>
          </div>
          <div className="vault-chip a">PROPOSAL</div>
          <div className="vault-chip b">ESTIMATE</div>
          <div className="vault-chip c">MARGIN</div>
          <div className="vault-chip d">CLIENT</div>
        </div>
      </div>
    </div>
  );
}

function RecognitionMotion({ email }: { email: string }) {
  const initials = useMemo(() => {
    if (!email) return "B";
    const local = email.split("@")[0] || "";
    return (local.slice(0, 2)).toUpperCase() || "B";
  }, [email]);
  return (
    <div className="mg-frame fade-in">
      <div className="mg-grid"></div>
      <div className="mg-stage">
        <div className="recog">
          <div className="recog-pulse" style={{ animationDelay: "0s" }}></div>
          <div className="recog-pulse" style={{ animationDelay: ".85s" }}></div>
          <div className="recog-pulse" style={{ animationDelay: "1.7s" }}></div>
          <div className="recog-pulse" style={{ animationDelay: "2.55s" }}></div>
          <div className="recog-corner tl"></div>
          <div className="recog-corner tr"></div>
          <div className="recog-corner bl"></div>
          <div className="recog-corner br"></div>
          <div className="recog-center">
            <div className="recog-avatar">{initials}</div>
            <div className="recog-label">Welcome back</div>
            <div className="recog-name">{email || "Sign in to continue"}</div>
            <div className="recog-meta">LAST SEEN · 2 DAYS AGO</div>
          </div>
        </div>
      </div>
    </div>
  );
}
