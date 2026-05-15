"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle2, Construction } from "lucide-react";
import type { PaymentStatus } from "@/lib/app-data";

function PaymentPageInner() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("t")?.trim();
  const [status, setStatus] = useState<PaymentStatus>("Pending");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!id || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/proposal/${id}/client?t=${encodeURIComponent(token)}`);
        const body = (await res.json()) as { quote?: { depositStatus?: PaymentStatus } };
        if (!res.ok || cancelled) return;
        setStatus(body.quote?.depositStatus ?? "Pending");
      } catch {
        // ignore background refresh failures
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, token]);

  async function updatePayment(nextStatus: PaymentStatus) {
    if (!id || !token) return;
    setIsSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/proposal/${id}/client/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, paymentStatus: nextStatus }),
      });
      const body = (await res.json()) as {
        error?: string;
        projectCreated?: boolean;
      };
      if (!res.ok) {
        setMessage(body.error ?? "Could not update payment status.");
        return;
      }
      setStatus(nextStatus);
      setMessage(
        body.projectCreated
          ? "Deposit confirmed. Project was created automatically."
          : "Payment status updated."
      );
    } catch {
      setMessage("Network error while updating payment.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#f5f8fa] px-6 text-center">
      <div className="rounded-full bg-amber-50 p-6">
        <Construction className="h-12 w-12 text-amber-700" />
      </div>
      <h1 className="text-3xl font-bold text-[#213343]">Payment</h1>
      <p className="max-w-md text-gray-600">Record first deposit status to unlock project creation.</p>
      {!token ? (
        <p className="max-w-md text-sm text-amber-800">
          If you opened this page without the full link from your contractor, some features may be limited until
          checkout is available.
        </p>
      ) : null}
      {token ? (
        <div className="w-full max-w-md rounded-xl border border-[#d9e2ec] bg-white p-5 text-left shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Deposit status</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(["Pending", "Paid", "Failed", "Refunded"] as const).map((value) => (
              <button
                key={value}
                type="button"
                disabled={isSaving}
                onClick={() => void updatePayment(value)}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                  status === value
                    ? "border-[var(--brand-accent)] bg-[var(--brand-accent)] text-white"
                    : "border-[#d9e2ec] text-[#213343] hover:bg-[#f6f8fb]"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          {message ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-[#213343]">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              {message}
            </p>
          ) : null}
        </div>
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
