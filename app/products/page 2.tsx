"use client";

import { useMemo } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { TierProductsManager } from "@/components/products/tier-products-manager";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function ProductsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  return (
    <div className="min-h-screen bg-[var(--page-bg)] lg:flex">
      <AppSidebar />

      <main className="min-w-0 flex-1 overflow-auto p-5 pb-24 sm:p-8 sm:pb-24 lg:p-10">
        <div className="w-full">
          <TierProductsManager supabase={supabase} />
        </div>
      </main>
    </div>
  );
}
