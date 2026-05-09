"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resolvePostAuthPath } from "@/lib/post-auth-redirect";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function AuthCompleteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const dest = await resolvePostAuthPath(supabase, next);
        if (!cancelled) router.replace(dest);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not continue");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, next, supabase]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg)] px-4 text-sm text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg)] text-sm text-gray-500">
      Signing you in…
    </div>
  );
}

export default function AuthCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg)] text-sm text-gray-500">
          Loading…
        </div>
      }
    >
      <AuthCompleteInner />
    </Suspense>
  );
}
