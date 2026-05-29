// Redirects /quotes/editor?id=X → /proposals/preview?id=X
// TipTap editor removed. See git history to restore.
"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function EditorRedirect() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id");

  useEffect(() => {
    router.replace(id ? `/proposals/preview?id=${id}` : "/proposals");
  }, [id, router]);

  return (
    <div className="flex h-dvh items-center justify-center text-sm text-gray-400">
      Redirecting…
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense>
      <EditorRedirect />
    </Suspense>
  );
}
