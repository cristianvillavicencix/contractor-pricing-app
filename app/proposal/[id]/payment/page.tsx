"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Construction } from "lucide-react";

function PaymentPageInner() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("t")?.trim();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#f5f8fa] px-6 text-center">
      <div className="rounded-full bg-amber-50 p-6">
        <Construction className="h-12 w-12 text-amber-700" />
      </div>
      <h1 className="text-3xl font-bold text-[#213343]">Payment</h1>
      <p className="max-w-md text-gray-600">
        The payment experience for this proposal is under construction. Your acceptance has been recorded
        {id ? ` for proposal ${id.slice(0, 8)}…` : ""}.
      </p>
      {!token ? (
        <p className="max-w-md text-sm text-amber-800">
          If you opened this page without the full link from your contractor, some features may be limited until
          checkout is available.
        </p>
      ) : null}
    </div>
  );
}

export default function ProposalPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa]">
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      }
    >
      <PaymentPageInner />
    </Suspense>
  );
}
