"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ExternalLink, Shield, X } from "lucide-react";
import {
  defaultSettings,
  formatMoney,
  getTierDisplayName,
  getTierMaterialSummaries,
  getTierMaterialsTableForProposal,
  mergeAppSettings,
  type AppSettings,
  type PriceOptionName,
  type Quote,
} from "@/lib/app-data";
import type { MaterialItem, ProposalTemplate } from "@/lib/proposal-templates";
import { CLIENT_CONTRACT_CHECKLIST } from "@/lib/proposal-client-portal";
import { ProposalDocument } from "@/components/proposals/proposal-document";
import { PagedProposalPreview } from "@/components/proposals/paged-proposal-preview";
import type { CoverLayout } from "@/lib/pdf-generator";
import {
  buildBlocksPrintHtml,
  normalizeProposalBlocks,
} from "@/lib/proposal-blocks";
import type { ProposalBlock } from "@/types/proposal-blocks";

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

const STEPS = [
  { n: 1, label: "Choose option" },
  { n: 2, label: "Review proposal" },
  { n: 3, label: "Sign & accept" },
] as const;

function StepBar({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map(({ n, label }, i) => {
        const done = step > n;
        const active = step === n;
        return (
          <div key={n} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                  done
                    ? "bg-[#213343] text-white"
                    : active
                    ? "bg-[#ff5c35] text-white"
                    : "bg-[#e5e7eb] text-gray-400"
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : n}
              </div>
              <span
                className={`hidden text-xs font-semibold sm:block ${
                  active ? "text-[#213343]" : done ? "text-gray-500" : "text-gray-300"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`mx-3 h-px w-8 sm:w-12 ${step > n ? "bg-[#213343]" : "bg-[#e5e7eb]"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function AcceptPageInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("t")?.trim() ?? "";

  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [clientSelectedOption, setClientSelectedOption] = useState<PriceOptionName>("Better");
  const [expandedTier, setExpandedTier] = useState<PriceOptionName | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [contractRead, setContractRead] = useState(false);
  const [agreedToContract, setAgreedToContract] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
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
          if (!cancelled)
            setLoad({ kind: "error", message: (body.error as string) || "Could not load this proposal." });
          return;
        }
        if (!cancelled) {
          const quote = body.quote as Quote;
          setClientSelectedOption(quote.selectedOption ?? "Better");
          setLoad({
            kind: "ready",
            quote,
            settings: body.settings as AppSettings,
            template: body.template as ProposalTemplate,
            coverPhotoUrl: (body.coverPhotoUrl as string | null) ?? null,
            coverLayout: (body.coverLayout as CoverLayout) ?? "full",
            existingPhotos: (body.existingPhotos as string[]) ?? [],
            existingPhotoCaptions: (body.existingPhotoCaptions as string[]) ?? [],
            expired: Boolean(body.expired),
            alreadyAccepted: Boolean(body.alreadyAccepted),
          });
        }
      } catch {
        if (!cancelled) setLoad({ kind: "error", message: "Network error loading proposal." });
      }
    })();
    return () => { cancelled = true; };
  }, [id, token]);

  const mergedSettings = useMemo(() => {
    if (load.kind !== "ready") return mergeAppSettings(defaultSettings);
    return mergeAppSettings(load.settings);
  }, [load]);

  // Pre-render block HTML read-only for builderVersion === "blocks" proposals.
  // Called before early returns because hooks must not be conditional.
  const blocksHtml = useMemo(() => {
    if (load.kind !== "ready") return "";
    const { quote } = load;
    if (quote.builderVersion !== "blocks") return "";
    const blocks = normalizeProposalBlocks(
      (quote.proposalBlocks ?? []) as ProposalBlock[]
    );
    return buildBlocksPrintHtml(blocks, quote, mergedSettings);
  }, [load, mergedSettings]);

  // ── Loading / error screens ──────────────────────────────────────────────
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

  const { quote, template, coverPhotoUrl, coverLayout, existingPhotos, existingPhotoCaptions, expired, alreadyAccepted } = load;
  const isBlocks = quote.builderVersion === "blocks";

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
          Go to payment <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    );
  }

  const showTiers = mergedSettings.proposalSettings.showGoodBetterBest !== false;
  const effectiveOption = showTiers ? clientSelectedOption : quote.selectedOption;
  const selectedResult = effectiveOption === "Good" ? quote.good : effectiveOption === "Better" ? quote.better : quote.best;
  const tierMaterialLines = getTierMaterialSummaries(mergedSettings, quote);
  const checklistComplete = agreedToContract;

  const pagedRenderKey = JSON.stringify({
    quote: { ...quote, selectedOption: effectiveOption },
    settings: mergedSettings,
    template,
    coverPhotoUrl,
    coverLayout,
    existingPhotos,
    existingPhotoCaptions,
  });

  async function handleSign() {
    if (expired || alreadyAccepted) return;
    const name = signatureName.trim();
    if (!name) { setSignatureError("Please type your full name to sign."); return; }
    if (name.length < 3) { setSignatureError("Please enter your full legal name."); return; }
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
          contractChecklist: agreedToContract
            ? Object.fromEntries(CLIENT_CONTRACT_CHECKLIST.map((i) => [i.id, true]))
            : checklist,
        }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) { setSignatureError(body.error || "Could not complete signing."); setSubmitBusy(false); return; }
      router.replace(`/proposal/${id}/payment?t=${encodeURIComponent(token)}`);
    } catch {
      setSignatureError("Network error. Try again.");
      setSubmitBusy(false);
    }
  }

  // ── Shared header ────────────────────────────────────────────────────────
  const header = (
    <div className="sticky top-0 z-30 border-b border-[#d9e2ec] bg-white px-5 py-3 shadow-sm">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#213343]">
            {mergedSettings.companyProfile.businessName}
          </p>
          <p className="truncate text-xs text-gray-400">
            {quote.proposalNumber} · {quote.customerName}
          </p>
        </div>
        <StepBar step={step} />
        <span className="hidden items-center gap-1.5 text-xs text-gray-400 sm:flex">
          <Shield className="h-3.5 w-3.5" /> Secure
        </span>
      </div>
    </div>
  );

  // ── STEP 1: Choose option ────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="min-h-screen bg-[#f5f8fa]">
        {header}
        {expired && (
          <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-center text-sm font-medium text-red-700">
            This proposal expired on {quote.expiresAt}. Please request an updated proposal.
          </div>
        )}
        <div className="mx-auto max-w-4xl px-5 py-10">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-[#213343]">Choose your option</h1>
            <p className="mt-2 text-sm text-gray-500">
              Review the packages below and select the one that fits you best. Your choice will be reflected in the proposal.
            </p>
          </div>

          {showTiers ? (
            <div className="grid gap-5 sm:grid-cols-3">
              {(["Good", "Better", "Best"] as const).map((tier) => {
                const tierResult = tier === "Good" ? quote.good : tier === "Better" ? quote.better : quote.best;
                const tierMaterials = getTierMaterialsTableForProposal(mergedSettings, tier, template, quote);
                const recommended = tier === "Better" && mergedSettings.proposalSettings.highlightBetterRecommended !== false;
                const active = clientSelectedOption === tier;
                return (
                  <div
                    key={tier}
                    onClick={() => setClientSelectedOption(tier)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setClientSelectedOption(tier); }}
                    className={`relative cursor-pointer rounded-2xl border-2 bg-white p-6 shadow-sm transition select-none ${
                      active
                        ? "border-[#ff5c35] ring-4 ring-[#ff5c35]/15"
                        : "border-[#d9e2ec] hover:border-[#b8c7d6]"
                    }`}
                  >
                    {recommended && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="rounded-full bg-[#213343] px-3 py-1 text-[11px] font-bold text-white shadow">
                          Recommended
                        </span>
                      </div>
                    )}

                    {/* Selected indicator */}
                    <div className={`absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${active ? "border-[#ff5c35] bg-[#ff5c35]" : "border-[#d9e2ec] bg-white"}`}>
                      {active && <Check className="h-3.5 w-3.5 text-white" />}
                    </div>

                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                      {getTierDisplayName(mergedSettings, tier)}
                    </p>
                    <p className="mt-2 text-3xl font-extrabold text-[#213343]">
                      {formatMoney(tierResult.salePrice)}
                    </p>
                    {tierMaterialLines[tier] ? (
                      <p className="mt-2 text-xs font-semibold text-[#213343]">{tierMaterialLines[tier]}</p>
                    ) : null}
                    <p className="mt-2 text-sm leading-relaxed text-gray-500">{tierResult.description}</p>

                    {tierMaterials.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setExpandedTier(tier); }}
                        className="mt-5 w-full rounded-lg border border-[#d9e2ec] py-2 text-xs font-semibold text-[#213343] transition hover:bg-[#f6f8fb]"
                      >
                        View materials & details →
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-[#d9e2ec] bg-white p-6 text-center shadow-sm">
              <p className="text-lg font-bold text-[#213343]">{getTierDisplayName(mergedSettings, effectiveOption)}</p>
              <p className="mt-1 text-3xl font-extrabold text-[#213343]">{formatMoney(selectedResult.salePrice)}</p>
              <p className="mt-3 text-sm text-gray-500">{selectedResult.description}</p>
            </div>
          )}

          {!expired && (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#ff5c35] px-8 py-4 text-base font-bold text-white shadow-lg transition hover:bg-[#e94820]"
              >
                Continue — review proposal
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {expandedTier && (
          <MaterialsModal
            tier={expandedTier}
            tierLabel={getTierDisplayName(mergedSettings, expandedTier)}
            price={formatMoney(
              expandedTier === "Good" ? quote.good.salePrice
              : expandedTier === "Better" ? quote.better.salePrice
              : quote.best.salePrice
            )}
            materials={getTierMaterialsTableForProposal(mergedSettings, expandedTier, template, quote)}
            onClose={() => setExpandedTier(null)}
          />
        )}
      </div>
    );
  }

  // ── STEP 2: Review proposal ──────────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="min-h-screen bg-[#f5f8fa]">
        {header}
        <div className="mx-auto max-w-4xl px-5 py-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-[#213343]">Review your proposal</h1>
              <p className="mt-0.5 text-sm text-gray-500">
                Your selected option: <span className="font-semibold text-[#213343]">{getTierDisplayName(mergedSettings, effectiveOption)} — {formatMoney(selectedResult.salePrice)}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 transition hover:text-[#213343]"
            >
              <ArrowLeft className="h-4 w-4" /> Change option
            </button>
          </div>

          {isBlocks ? (
            /* ── Block Builder proposal: read-only iframe, no editor UI ── */
            <div className="rounded-xl border border-[#d9e2ec] bg-[#e9eef4] p-3 shadow-inner">
              <iframe
                srcDoc={blocksHtml}
                title="Proposal document"
                sandbox="allow-same-origin"
                style={{
                  width: "100%",
                  minHeight: 900,
                  border: "none",
                  borderRadius: 8,
                  display: "block",
                  background: "#ffffff",
                }}
              />
            </div>
          ) : (
            /* ── Legacy Tiptap proposal: existing render path unchanged ── */
            <div
              className={
                coverLayout === "elegant"
                  ? "rounded-xl border border-[#d9e2ec] bg-[#e9eef4] px-1 py-2 shadow-inner"
                  : "rounded-xl border border-[#d9e2ec] bg-[#e9eef4] px-6 py-8 shadow-inner"
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
          )}

          {!expired && (
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 rounded-xl border border-[#d9e2ec] bg-white px-6 py-3 text-sm font-semibold text-gray-500 shadow-sm transition hover:bg-[#f6f8fb]"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#ff5c35] px-8 py-4 text-base font-bold text-white shadow-lg transition hover:bg-[#e94820]"
              >
                Looks good — sign & accept
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── STEP 3: Sign & accept ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f5f8fa]">
      {header}
      <div className="mx-auto max-w-xl px-5 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[#213343]">Sign & accept</h1>
          <p className="mt-2 text-sm text-gray-500">
            Review your contract, then sign with your name below.
          </p>
        </div>

        {/* Selected option summary */}
        <div className="mb-6 flex items-center justify-between rounded-xl border border-[#d9e2ec] bg-white px-5 py-4 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Selected option</p>
            <p className="mt-0.5 text-base font-bold text-[#213343]">
              {getTierDisplayName(mergedSettings, effectiveOption)}
            </p>
            {tierMaterialLines[effectiveOption] ? (
              <p className="mt-0.5 text-xs text-gray-500">{tierMaterialLines[effectiveOption]}</p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold text-[#213343]">{formatMoney(selectedResult.salePrice)}</p>
            <button type="button" onClick={() => setStep(1)} className="mt-0.5 text-xs font-semibold text-[#ff5c35] hover:underline">
              Change
            </button>
          </div>
        </div>

        {/* Contract review */}
        <div className="mb-6 rounded-xl border border-[#d9e2ec] bg-white p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0f4f8] text-[#213343]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-[#213343]">Service Agreement</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Pre-filled with your project details, selected option, and pricing.
              </p>
              <button
                type="button"
                onClick={() => setShowContractModal(true)}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#213343] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a2a38]"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Review contract
                {contractRead && <Check className="h-3.5 w-3.5 text-green-300" />}
              </button>
            </div>
          </div>

          {contractRead && (
            <label className="mt-4 flex cursor-pointer items-start gap-3 border-t border-[#f0f4f8] pt-4 text-sm text-[#213343]">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#d9e2ec] accent-[#ff5c35]"
                checked={agreedToContract}
                onChange={(e) => setAgreedToContract(e.target.checked)}
              />
              <span className="leading-relaxed">
                I have read and agree to the contract terms, scope of work, and pricing above.
              </span>
            </label>
          )}

          {!contractRead && (
            <p className="mt-4 rounded-lg bg-[#f6f8fb] px-3 py-2.5 text-xs text-gray-500">
              Open the contract above to review it before signing.
            </p>
          )}
        </div>

        {/* Signature */}
        <div className="mb-8 rounded-xl border border-[#d9e2ec] bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-[#213343]">Your signature</p>
          <p className="mt-1 text-xs text-gray-500">
            Type your full legal name below. This serves as your electronic signature.
          </p>
          <input
            value={signatureName}
            onChange={(e) => { setSignatureName(e.target.value); setSignatureError(""); }}
            placeholder={quote.customerName || "Your full name"}
            disabled={!checklistComplete}
            className="mt-4 w-full rounded-xl border border-[#d9e2ec] px-4 py-3 text-lg font-medium italic text-[#213343] outline-none transition focus:border-[#ff5c35] focus:ring-2 focus:ring-[#ff5c35]/20 disabled:cursor-not-allowed disabled:opacity-40"
          />
          {signatureError && <p className="mt-2 text-xs text-red-500">{signatureError}</p>}
          <p className="mt-2 text-xs text-gray-400">
            Date: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={() => { setStep(2); setSignatureError(""); }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d9e2ec] bg-white px-6 py-3 text-sm font-semibold text-gray-500 shadow-sm transition hover:bg-[#f6f8fb]"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <button
            type="button"
            disabled={submitBusy || !checklistComplete || expired}
            onClick={() => void handleSign()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5c35] px-8 py-4 text-base font-bold text-white shadow-lg transition hover:bg-[#e94820] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="h-5 w-5" />
            {submitBusy ? "Saving…" : "Accept & sign"}
          </button>
        </div>
      </div>

      {showContractModal && (
        <ContractModal
          quote={quote}
          settings={mergedSettings}
          effectiveOption={effectiveOption}
          selectedResult={selectedResult}
          tierLabel={getTierDisplayName(mergedSettings, effectiveOption)}
          onClose={() => { setShowContractModal(false); setContractRead(true); }}
        />
      )}
    </div>
  );
}

function ContractModal({
  quote,
  settings,
  effectiveOption,
  selectedResult,
  tierLabel,
  onClose,
}: {
  quote: Quote;
  settings: ReturnType<typeof mergeAppSettings>;
  effectiveOption: PriceOptionName;
  selectedResult: { salePrice: number; description: string };
  tierLabel: string;
  onClose: () => void;
}) {
  const company = settings.companyProfile;
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const contractSections = [
    {
      title: "1. Scope of Work",
      content: quote.scopeSummary?.trim() ||
        `Contractor agrees to perform all work as described in the proposal for the ${tierLabel} package, including materials and labor as specified. Work will be completed in a professional and workmanlike manner.`,
    },
    {
      title: "2. Payment Terms",
      content: `Total contract amount: ${formatMoney(selectedResult.salePrice)}. A deposit may be required before work begins. Final payment is due upon completion of work. Any changes to scope must be agreed in writing and may affect the final price.`,
    },
    {
      title: "3. Warranty",
      content: quote.warrantyText?.trim() ||
        `Contractor provides a workmanship warranty on all labor performed. Manufacturer warranties apply to all materials used. Warranty claims must be submitted in writing within the warranty period.`,
    },
    {
      title: "4. Terms & Conditions",
      content: quote.termsText?.trim() ||
        `This agreement is between the contractor and the client named above. Client authorizes contractor to perform the work described. Any disputes shall be resolved through good-faith negotiation. Contractor is not liable for pre-existing conditions discovered during work. Work is subject to weather and material availability.`,
    },
    {
      title: "5. Authorization",
      content: `By signing this agreement, the client confirms they have the authority to enter into this contract, have reviewed the scope of work and pricing, and agree to all terms and conditions set forth herein.`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[#e5e7eb] bg-[#213343] px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Service Agreement</p>
            <p className="mt-0.5 text-base font-bold text-white">{company.businessName}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contract body */}
        <div className="overflow-y-auto px-6 py-6">

          {/* Parties */}
          <div className="mb-6 grid gap-4 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-4 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Contractor</p>
              <p className="mt-1 text-sm font-bold text-[#213343]">{company.businessName}</p>
              {company.contactName ? <p className="text-xs text-gray-500">{company.contactName}</p> : null}
              {company.email ? <p className="text-xs text-gray-500">{company.email}</p> : null}
              {company.phone ? <p className="text-xs text-gray-500">{company.phone}</p> : null}
              {company.licenseNumber ? <p className="mt-1 text-xs text-gray-400">License: {company.licenseNumber}</p> : null}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Client</p>
              <p className="mt-1 text-sm font-bold text-[#213343]">{quote.customerName || "—"}</p>
              {quote.customerAddress ? <p className="text-xs text-gray-500">{quote.customerAddress}</p> : null}
              {quote.customerEmail ? <p className="text-xs text-gray-500">{quote.customerEmail}</p> : null}
              {quote.customerPhone ? <p className="text-xs text-gray-500">{quote.customerPhone}</p> : null}
            </div>
          </div>

          {/* Agreement summary */}
          <div className="mb-6 flex items-center justify-between rounded-xl border-2 border-[#213343] bg-white px-5 py-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Selected package</p>
              <p className="mt-0.5 text-base font-bold text-[#213343]">{tierLabel}</p>
              <p className="mt-0.5 text-xs text-gray-500">{selectedResult.description}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total</p>
              <p className="mt-0.5 text-2xl font-extrabold text-[#213343]">{formatMoney(selectedResult.salePrice)}</p>
            </div>
          </div>

          {/* Contract sections */}
          <div className="space-y-5">
            {contractSections.map((section) => (
              <div key={section.title}>
                <p className="mb-1.5 text-sm font-bold text-[#213343]">{section.title}</p>
                <p className="text-sm leading-relaxed text-gray-600">{section.content}</p>
              </div>
            ))}
          </div>

          {/* Proposal reference */}
          <div className="mt-6 rounded-lg border border-dashed border-[#d9e2ec] px-4 py-3 text-xs text-gray-400">
            Proposal #{quote.proposalNumber ?? quote.id?.slice(-6).toUpperCase()} · Date: {today}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-[#e5e7eb] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-[#ff5c35] py-3.5 text-sm font-bold text-white transition hover:bg-[#e94820]"
          >
            I&apos;ve reviewed the contract — close
          </button>
        </div>
      </div>
    </div>
  );
}

function MaterialsModal({
  tier,
  tierLabel,
  price,
  materials,
  onClose,
}: {
  tier: PriceOptionName;
  tierLabel: string;
  price: string;
  materials: MaterialItem[];
  onClose: () => void;
}) {
  const grouped = materials.reduce<Record<string, MaterialItem[]>>((acc, item) => {
    const cat = item.category?.trim() || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});
  const categories = Object.keys(grouped);

  const tierColor: Record<PriceOptionName, string> = {
    Good: "bg-gray-100 text-gray-700",
    Better: "bg-blue-50 text-blue-700",
    Best: "bg-amber-50 text-amber-700",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-[#e5e7eb] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${tierColor[tier]}`}>{tierLabel}</span>
            <span className="text-xl font-bold text-[#213343]">{price}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {materials.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#d9e2ec] py-16 text-center">
              <p className="text-sm text-gray-400">No material details available for this option.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {categories.map((cat) => (
                <div key={cat}>
                  <div className="mb-4 flex items-center gap-3">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{cat}</p>
                    <div className="h-px flex-1 bg-[#e5e7eb]" />
                  </div>
                  <div className="space-y-3">
                    {grouped[cat].map((item) => (
                      <div key={item.id} className="flex overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
                        <div className="relative w-28 shrink-0 sm:w-36">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.imageUrl} alt={item.product || item.category} className="h-full min-h-28 w-full object-cover" />
                          ) : (
                            <div className="flex h-full min-h-28 w-full flex-col items-center justify-center bg-[#f6f8fb]">
                              <span className="text-lg font-bold text-gray-200">{(item.category || "?").slice(0, 2).toUpperCase()}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-4 py-4">
                          {item.brand && <p className="text-[10px] font-bold uppercase tracking-widest text-[#ff5c35]">{item.brand}</p>}
                          <p className="text-sm font-bold leading-snug text-[#213343]">{item.product || "—"}</p>
                          {item.category && <p className="text-[11px] font-medium text-gray-400">{item.category}</p>}
                          {item.warranty && (
                            <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-[11px] font-semibold text-green-700">
                              <Check className="h-3 w-3" /> {item.warranty}
                            </span>
                          )}
                          {item.notes && <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{item.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-[#e5e7eb] px-6 py-4">
          <button type="button" onClick={onClose} className="w-full rounded-xl bg-[#213343] py-3 text-sm font-semibold text-white transition hover:bg-[#1a2a38]">
            Close
          </button>
        </div>
      </div>
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
