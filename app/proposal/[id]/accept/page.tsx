"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Check, ExternalLink, Shield } from "lucide-react";
import {
  defaultSettings,
  formatMoney,
  getTierDisplayName,
  getTierMaterialSummaries,
  mergeAppSettings,
  type AppSettings,
  type PriceOptionName,
  type Quote,
} from "@/lib/app-data";
import type { ProposalTemplate } from "@/lib/proposal-templates";
import { CLIENT_CONTRACT_CHECKLIST } from "@/lib/proposal-client-portal";
import { ProposalDocument } from "@/components/proposals/proposal-document";
import { PagedProposalPreview } from "@/components/proposals/paged-proposal-preview";
import type { CoverLayout } from "@/lib/pdf-generator";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "missing_token" }
  | {
      kind: "ready";
      quote: Quote;
      settings: AppSettings;
      template: ProposalTemplate;
      coverPhotoUrl: string | null;
      coverLayout: CoverLayout;
      existingPhotos: string[];
      existingPhotoCaptions: string[];
      expired: boolean;
      alreadyAccepted: boolean;
    };

type AcceptanceState = "viewing" | "signing";

function AcceptPageInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("t")?.trim() ?? "";

  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [clientSelectedOption, setClientSelectedOption] = useState<PriceOptionName>("Better");
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [state, setState] = useState<AcceptanceState>("viewing");
  const [signatureName, setSignatureName] = useState("");
  const [signatureError, setSignatureError] = useState("");
  const [submitBusy, setSubmitBusy] = useState(false);

  useEffect(() => {
    if (!id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- validate route params on mount
      setLoad({ kind: "error", message: "Invalid proposal link." });
      return;
    }
    if (!token) {
      setLoad({ kind: "missing_token" });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/proposal/${id}/client?t=${encodeURIComponent(token)}`);
        const body = (await res.json()) as Record<string, unknown>;
        if (!res.ok) {
          if (!cancelled) {
            setLoad({
              kind: "error",
              message: (body.error as string) || "Could not load this proposal.",
            });
          }
          return;
        }

        const quote = body.quote as Quote;
        const settings = body.settings as AppSettings;
        const template = body.template as ProposalTemplate;
        const coverPhotoUrl = (body.coverPhotoUrl as string | null) ?? null;
        const coverLayout = (body.coverLayout as CoverLayout) ?? "full";
        const existingPhotos = (body.existingPhotos as string[]) ?? [];
        const existingPhotoCaptions = (body.existingPhotoCaptions as string[]) ?? [];
        const expired = Boolean(body.expired);
        const alreadyAccepted = Boolean(body.alreadyAccepted);

        if (!cancelled) {
          setClientSelectedOption(quote.selectedOption ?? "Better");
          setLoad({
            kind: "ready",
            quote,
            settings,
            template,
            coverPhotoUrl,
            coverLayout,
            existingPhotos,
            existingPhotoCaptions,
            expired,
            alreadyAccepted,
          });
        }
      } catch {
        if (!cancelled) {
          setLoad({ kind: "error", message: "Network error loading proposal." });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, token]);

  const mergedSettings = useMemo(() => {
    if (load.kind !== "ready") return mergeAppSettings(defaultSettings);
    return mergeAppSettings(load.settings);
  }, [load]);

  if (load.kind === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa]">
        <p className="text-sm text-gray-400">Loading proposal…</p>
      </div>
    );
  }

  if (load.kind === "missing_token") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa] px-6">
        <div className="max-w-md text-center">
          <p className="text-2xl font-bold text-[#213343]">Link incomplete</p>
          <p className="mt-2 text-gray-500">
            Open the full link your contractor sent you (it should include a security token after{" "}
            <code className="rounded bg-gray-100 px-1">?t=</code>).
          </p>
        </div>
      </div>
    );
  }

  if (load.kind === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa] px-6">
        <div className="max-w-md text-center">
          <p className="text-2xl font-bold text-[#213343]">Proposal unavailable</p>
          <p className="mt-2 text-gray-500">{load.message}</p>
        </div>
      </div>
    );
  }

  const { quote, template, coverPhotoUrl, coverLayout, existingPhotos, existingPhotoCaptions, expired, alreadyAccepted } =
    load;

  const showTiers = mergedSettings.proposalSettings.showGoodBetterBest !== false;
  const effectiveOption = showTiers ? clientSelectedOption : quote.selectedOption;
  const selectedResult =
    effectiveOption === "Good" ? quote.good : effectiveOption === "Better" ? quote.better : quote.best;
  const tierMaterialLines = getTierMaterialSummaries(mergedSettings, quote);

  const pagedRenderKey = JSON.stringify({
    quote: { ...quote, selectedOption: effectiveOption },
    settings: mergedSettings,
    template,
    coverPhotoUrl,
    coverLayout,
    existingPhotos,
    existingPhotoCaptions,
  });

  const checklistComplete = CLIENT_CONTRACT_CHECKLIST.every((item) => checklist[item.id]);
  const canOpenSign =
    !expired && !alreadyAccepted && checklistComplete && (showTiers ? Boolean(clientSelectedOption) : true);

  async function handleSign() {
    if (expired || alreadyAccepted) return;

    const name = signatureName.trim();
    if (!name) {
      setSignatureError("Please type your full name to sign.");
      return;
    }
    if (name.length < 3) {
      setSignatureError("Please enter your full legal name.");
      return;
    }

    setSubmitBusy(true);
    setSignatureError("");
    try {
      const res = await fetch(`/api/proposal/${id}/client/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          selectedOption: effectiveOption,
          signedName: name,
          contractChecklist: checklist,
        }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setSignatureError(body.error || "Could not complete signing.");
        setSubmitBusy(false);
        return;
      }
      router.replace(`/proposal/${id}/payment?t=${encodeURIComponent(token)}`);
    } catch {
      setSignatureError("Network error. Try again.");
      setSubmitBusy(false);
    }
  }

  if (alreadyAccepted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#f5f8fa] px-6 text-center">
        <div className="rounded-full bg-green-50 p-6">
          <Check className="h-12 w-12 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-[#213343]">Proposal already accepted</h1>
        <p className="max-w-md text-gray-500">
          This proposal was signed earlier. You can continue to payment when you are ready.
        </p>
        <a
          href={`/proposal/${id}/payment?t=${encodeURIComponent(token)}`}
          className="inline-flex items-center gap-2 rounded-lg bg-[#ff5c35] px-6 py-3 font-semibold text-white shadow transition hover:bg-[#e94820]"
        >
          Go to payment
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f8fa]">
      <div className="sticky top-0 z-30 border-b border-[#d9e2ec] bg-white px-6 py-3 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#213343]">
              {mergedSettings.companyProfile.businessName}
            </p>
            <p className="text-xs text-gray-400">
              Proposal {quote.proposalNumber} · For {quote.customerName}
              {expired ? " · Expired" : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden items-center gap-1.5 text-xs text-gray-400 sm:flex">
              <Shield className="h-3.5 w-3.5" />
              Secure
            </span>
            {state === "viewing" && !expired && (
              <button
                type="button"
                disabled={!canOpenSign}
                onClick={() => canOpenSign && setState("signing")}
                className="rounded-lg bg-[#ff5c35] px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-[#e94820] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sign to accept →
              </button>
            )}
          </div>
        </div>
      </div>

      {expired ? (
        <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-center text-sm font-medium text-red-700">
          This proposal expired on {quote.expiresAt}. Please request an updated proposal before signing.
        </div>
      ) : null}

      <div className="mx-auto max-w-3xl px-6 py-6">
        {showTiers && !expired ? (
          <div className="mb-6 rounded-xl border border-[#d9e2ec] bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-[#213343]">Choose your option</p>
            <p className="mt-1 text-xs text-gray-500">
              Select {getTierDisplayName(mergedSettings, "Good")},{" "}
              {getTierDisplayName(mergedSettings, "Better")}, or {getTierDisplayName(mergedSettings, "Best")}. Your
              choice is part of this agreement.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {(["Good", "Better", "Best"] as const).map((tier) => {
                const tierResult = tier === "Good" ? quote.good : tier === "Better" ? quote.better : quote.best;
                const recommended =
                  tier === "Better" && mergedSettings.proposalSettings.highlightBetterRecommended !== false;
                const active = clientSelectedOption === tier;
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setClientSelectedOption(tier)}
                    className={`rounded-lg border p-4 text-left transition ${
                      active
                        ? "border-[#ff5c35] bg-[#fff8f5] ring-2 ring-[#ff5c35]/30"
                        : "border-[#d9e2ec] hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#213343]">
                        {getTierDisplayName(mergedSettings, tier)}
                      </span>
                      {recommended ? (
                        <span className="rounded bg-[#213343] px-2 py-0.5 text-[10px] font-medium text-white">
                          Recommended
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xl font-bold text-[#213343]">{formatMoney(tierResult.salePrice)}</p>
                    {tierMaterialLines[tier] ? (
                      <p className="mt-1.5 text-xs font-semibold text-[#213343]">{tierMaterialLines[tier]}</p>
                    ) : null}
                    <p className="mt-1 line-clamp-3 text-xs text-gray-500">{tierResult.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {!expired ? (
          <div className="mb-6 rounded-xl border border-[#d9e2ec] bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-[#213343]">Contract acknowledgments</p>
            <p className="mt-1 text-xs text-gray-500">
              Check each box to confirm before you sign. Your signature applies to both the proposal and these terms.
            </p>
            <ul className="mt-4 space-y-3">
              {CLIENT_CONTRACT_CHECKLIST.map((item) => (
                <li key={item.id}>
                  <label className="flex cursor-pointer gap-3 text-sm text-[#213343]">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 rounded border-[#d9e2ec] accent-[#ff5c35]"
                      checked={Boolean(checklist[item.id])}
                      onChange={(e) =>
                        setChecklist((prev) => ({
                          ...prev,
                          [item.id]: e.target.checked,
                        }))
                      }
                    />
                    <span>{item.label}</span>
                  </label>
                </li>
              ))}
            </ul>
            {!checklistComplete ? (
              <p className="mt-3 text-xs text-amber-700">Confirm all items above to enable signing.</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div
        className={
          coverLayout === "elegant"
            ? "mx-auto max-w-260 px-2 py-4"
            : "mx-auto max-w-260 px-6 py-8"
        }
      >
        <div
          className={
            coverLayout === "elegant"
              ? "rounded border border-[#d9e2ec] bg-[#e9eef4] px-1 py-2 shadow-inner print:border-0 print:bg-white print:p-0 print:shadow-none"
              : "rounded border border-[#d9e2ec] bg-[#e9eef4] px-6 py-8 shadow-inner print:border-0 print:bg-white print:p-0 print:shadow-none"
          }
        >
          <PagedProposalPreview renderKey={pagedRenderKey}>
            <ProposalDocument
              template={template}
              quote={{ ...quote, selectedOption: effectiveOption }}
              settings={mergedSettings}
              coverPhotoUrl={coverPhotoUrl}
              coverLayout={coverLayout}
              photos={existingPhotos}
              photoCaptions={existingPhotoCaptions}
              proposalNumber={quote.proposalNumber}
              sectionOverrides={quote.sectionOverrides}
              sectionLayouts={quote.sectionLayouts}
              sectionOrder={quote.sectionOrder}
              customSections={quote.customSections}
            />
          </PagedProposalPreview>
        </div>
      </div>

      {state === "signing" && !expired && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-6 sm:items-center">
          <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-[#213343]">Sign to accept proposal & contract</h2>
            <p className="mt-2 text-sm text-gray-500">
              By typing your name you accept the option below, the proposal, and the contract terms you confirmed.
            </p>

            <div className="mt-6 rounded-lg border border-[#d9e2ec] bg-[#f5f8fa] p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium text-[#213343]">{effectiveOption} option</p>
                <p className="text-2xl font-bold text-[#213343]">{formatMoney(selectedResult.salePrice)}</p>
              </div>
              <p className="mt-1 text-xs text-gray-400">{selectedResult.description}</p>
              {tierMaterialLines[effectiveOption] ? (
                <p className="mt-2 text-xs font-semibold text-[#213343]">{tierMaterialLines[effectiveOption]}</p>
              ) : null}
            </div>

            <div className="mt-6">
              <label className="mb-1.5 block text-sm font-medium text-[#213343]">Type your full name to sign</label>
              <input
                value={signatureName}
                onChange={(e) => {
                  setSignatureName(e.target.value);
                  setSignatureError("");
                }}
                placeholder={quote.customerName}
                className="w-full rounded-lg border border-[#d9e2ec] px-4 py-3 text-lg font-medium italic outline-none focus:border-[#ff5c35] focus:ring-2 focus:ring-[#ff5c35]/20"
              />
              {signatureError ? <p className="mt-1.5 text-xs text-red-500">{signatureError}</p> : null}
              <p className="mt-2 text-xs text-gray-400">
                Typed signatures carry legal effect in many jurisdictions. Date:{" "}
                {new Date().toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={submitBusy}
                onClick={() => {
                  setState("viewing");
                  setSignatureError("");
                }}
                className="flex-1 rounded-lg border border-[#d9e2ec] py-3 text-sm text-gray-500 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                disabled={submitBusy}
                onClick={handleSign}
                className="flex-1 rounded-lg bg-[#ff5c35] py-3 text-sm font-semibold text-white shadow transition hover:bg-[#e94820] disabled:opacity-50"
              >
                {submitBusy ? "Saving…" : "Accept & sign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientAcceptancePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa]">
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      }
    >
      <AcceptPageInner />
    </Suspense>
  );
}
