"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function UpdatePasswordInner() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
      setChecking(false);
    });
  }, [supabase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== password2) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      router.replace("/projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la contraseña.");
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa] text-sm text-gray-500">
        Cargando…
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa] px-4 text-[#213343]">
        <div className="w-full max-w-md rounded-xl border border-[#d9e2ec] bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-[#b42318]">
            Enlace inválido o caducado. Solicita un correo nuevo desde Iniciar sesión → «Olvidé mi
            contraseña».
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-md bg-[#ff5c35] px-4 py-2 text-sm font-medium text-white hover:bg-[#e94820]"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa] px-4 text-[#213343]">
      <div className="w-full max-w-md rounded-xl border border-[#d9e2ec] bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Nueva contraseña</h1>
        <p className="mt-1 text-sm text-gray-500">Elige una contraseña nueva para tu cuenta.</p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded border border-[#d9e2ec] px-3 py-2 text-sm outline-none focus:border-[#ff5c35]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Confirmar contraseña</span>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded border border-[#d9e2ec] px-3 py-2 text-sm outline-none focus:border-[#ff5c35]"
            />
          </label>
          {error ? (
            <div className="rounded-md border border-[#ffe0d5] bg-[#fff1ea] px-3 py-2 text-sm text-[#b42318]">
              {error}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-[#ff5c35] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#e94820] disabled:opacity-60"
          >
            {busy ? "Guardando…" : "Guardar contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function UpdatePasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa] text-sm text-gray-500">
          Cargando…
        </div>
      }
    >
      <UpdatePasswordInner />
    </Suspense>
  );
}
