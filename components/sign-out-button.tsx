"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type SignOutLayout = "sidebar" | "toolbar";

export function SignOutButton({
  layout = "sidebar",
  collapsed = false,
}: {
  layout?: SignOutLayout;
  /** When true (desktop sidebar collapsed), only the icon is shown. */
  collapsed?: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (layout === "toolbar") {
    return (
      <button
        type="button"
        onClick={() => void signOut()}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-md border border-[#d9e2ec] px-4 py-3 text-sm font-medium text-[#516f90] transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
      >
        <LogOut className="h-4 w-4" />
        {busy ? "Cerrando…" : "Cerrar sesión"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={busy}
      title={collapsed ? "Cerrar sesión" : undefined}
      className={`flex w-full items-center rounded-md text-sm text-[#516f90] transition hover:bg-[#f6f8fb] hover:text-[#213343] disabled:opacity-60 ${
        collapsed ? "justify-center px-0 py-3" : "gap-3 px-4 py-3"
      }`}
    >
      <LogOut className="h-4 w-4 flex-none" />
      {!collapsed && <span>{busy ? "Cerrando…" : "Cerrar sesión"}</span>}
    </button>
  );
}
