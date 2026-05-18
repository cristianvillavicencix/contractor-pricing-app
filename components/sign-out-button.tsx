"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { clearCompanyIdCache } from "@/lib/supabase/data";

type SignOutLayout = "sidebar" | "toolbar" | "menu";

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
      clearCompanyIdCache();
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
        className="inline-flex items-center gap-2 rounded-md border border-white/12 bg-white/8 px-4 py-3 text-sm font-medium text-white/75 transition hover:border-red-200/40 hover:bg-red-500/15 hover:text-white disabled:opacity-60"
      >
        <LogOut className="h-4 w-4" />
        {busy ? "Cerrando…" : "Cerrar sesión"}
      </button>
    );
  }

  if (layout === "menu") {
    return (
      <button
        type="button"
        onClick={() => void signOut()}
        disabled={busy}
        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
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
      className={`flex w-full items-center rounded-md text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-60 ${
        collapsed ? "justify-center px-0 py-3" : "gap-3 px-4 py-3"
      }`}
    >
      <LogOut className="h-4 w-4 flex-none" />
      {!collapsed && <span>{busy ? "Cerrando…" : "Cerrar sesión"}</span>}
    </button>
  );
}
