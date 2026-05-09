"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Check, ExternalLink, Shield } from "lucide-react";
import {
  defaultSettings,
  formatMoney,
  mergeAppSettings,
  storageKeys,
  type AppSettings,
  type Project,
  type Quote,
} from "@/lib/app-data";
import {
  mergeProposalTemplates,
  type ProposalTemplate,
} from "@/lib/proposal-templates";
import { readLocalStorage, writeLocalStorage } from "@/lib/use-local-storage";
import { ProposalDocument } from "@/components/proposals/proposal-document";
import { PagedProposalPreview } from "@/components/proposals/paged-proposal-preview";
import type { CoverLayout } from "@/lib/pdf-generator";

type AcceptanceState = "viewing" | "signing" | "accepted";

const ACCEPTED_KEY = "contractor-pricing-app:accepted-signatures";

export default function ClientAcceptancePage() {
  const { id } = useParams<{ id: string }>();

  const [quote, setQuote] = useState<Quote | null | undefined>(undefined); // undefined = loading
  const [settings, setSettings] = useState(defaultSettings);
  const [template, setTemplate] = useState<ProposalTemplate | null>(null);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null);
  const [coverLayout, setCoverLayout] = useState<CoverLayout>("full");
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [existingPhotoCaptions, setExistingPhotoCaptions] = useState<string[]>([]);
  const [state, setState] = useState<AcceptanceState>("viewing");
  const [signatureName, setSignatureName] = useState("");
  const [signatureError, setSignatureError] = useState("");

  useEffect(() => {
    const quotes = readLocalStorage<Quote[]>(storageKeys.quotes, []);
    const found = quotes.find((q) => q.id === id) ?? null;
    setQuote(found);

    const rawSettings = readLocalStorage<AppSettings>(storageKeys.settings, defaultSettings);
    setSettings(mergeAppSettings(rawSettings));

    const savedTemplates = readLocalStorage<ProposalTemplate[]>(storageKeys.proposalTemplates, []);
    const templates = mergeProposalTemplates(savedTemplates);
    setTemplate(templates.find((t) => t.trade === found?.trade) ?? templates[0]);

    // Load persisted photos for this quote
    if (id) {
      const photos = readLocalStorage<{
        coverImageUrl: string | null;
        existingPhotos: string[];
        existingPhotoCaptions?: string[];
        coverLayout?: CoverLayout;
      }>(
        `contractor-pricing-app:quote-photos:${id}`,
        { coverImageUrl: null, existingPhotos: [] }
      );
      setCoverPhotoUrl(photos.coverImageUrl);
      setCoverLayout(photos.coverLayout ?? rawSettings.branding.proposalCoverLayout);
      setExistingPhotos(photos.existingPhotos);
      setExistingPhotoCaptions(photos.existingPhotoCaptions ?? []);
    }
  }, [id]);

  if (quote === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa]">
        <p className="text-sm text-gray-400">Loading proposal…</p>
      </div>
    );
  }

  if (!quote || !template) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa]">
        <div className="text-center">
          <p className="text-2xl font-bold text-[#213343]">Proposal Not Found</p>
          <p className="mt-2 text-gray-500">
            This proposal link is no longer valid or the proposal has been removed.
          </p>
        </div>
      </div>
    );
  }

  const isExpired = isProposalExpired(quote);

  function handleSign() {
    if (isExpired) {
      setSignatureError("This proposal has expired. Please request an updated proposal before signing.");
      return;
    }

    const name = signatureName.trim();
    if (!name) {
      setSignatureError("Please type your full name to sign.");
      return;
    }
    if (name.length < 3) {
      setSignatureError("Please enter your full legal name.");
      return;
    }

    const record = {
      quoteId: id,
      customerName: quote!.customerName,
      signedAs: name,
      signedAt: new Date().toISOString(),
      proposalNumber: quote!.proposalNumber,
    };

    const existing = readLocalStorage<typeof record[]>(ACCEPTED_KEY, []);
    writeLocalStorage(ACCEPTED_KEY, [...existing, record]);
    const quotes = readLocalStorage<Quote[]>(storageKeys.quotes, []);
    writeLocalStorage(
      storageKeys.quotes,
      quotes.map((item) =>
        item.id === quote!.id
          ? { ...item, status: "Accepted", signedAt: record.signedAt, signedBy: name }
          : item
      )
    );

    if (quote!.projectId) {
      const projects = readLocalStorage<Project[]>(storageKeys.projects, []);
      writeLocalStorage(
        storageKeys.projects,
        projects.map((project) =>
          project.id === quote!.projectId ? { ...project, status: "Won" } : project
        )
      );
    }

    setState("accepted");
  }

  const selectedResult =
    quote.selectedOption === "Good"
      ? quote.good
      : quote.selectedOption === "Better"
      ? quote.better
      : quote.best;

  const mergedSettings = mergeAppSettings(settings);

  const pagedRenderKey = JSON.stringify({
    quote,
    settings: mergedSettings,
    template,
    coverPhotoUrl,
    coverLayout,
    existingPhotos,
    existingPhotoCaptions,
  });

  if (state === "accepted") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#f5f8fa] px-6 text-center">
        <div className="rounded-full bg-green-50 p-6">
          <Check className="h-12 w-12 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-[#213343]">Thank You, {quote.customerName}!</h1>
        <p className="max-w-md text-gray-500">
          Your proposal has been accepted and signed.{" "}
          {mergedSettings.companyProfile.contactName || mergedSettings.companyProfile.businessName} will
          be in touch shortly to confirm your project schedule.
        </p>

        {template.acceptance.paymentScheduleText && (
          <div className="mt-4 max-w-md rounded-lg border border-[#d9e2ec] bg-white p-5 text-left">
            <p className="text-sm font-semibold text-[#213343]">Payment Schedule</p>
            <p className="mt-2 text-sm text-gray-600">{template.acceptance.paymentScheduleText}</p>
          </div>
        )}

        {template.acceptance.paymentLinkUrl && (
          <a
            href={template.acceptance.paymentLinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#ff5c35] px-6 py-3 font-semibold text-white shadow transition hover:bg-[#e94820]"
          >
            Proceed to Payment Portal
            <ExternalLink className="h-4 w-4" />
          </a>
        )}

        <div className="mt-4 rounded-lg border border-[#d9e2ec] bg-white px-6 py-4 text-sm text-gray-500">
          <p>
            Signed by: <strong className="text-[#213343]">{signatureName}</strong>
          </p>
          <p className="mt-1">
            Date:{" "}
            {new Date().toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <p className="mt-1">
            Amount:{" "}
            <strong>{formatMoney(selectedResult.salePrice)}</strong> ({quote.selectedOption} option)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f8fa]">
      {/* Client banner */}
      <div className="sticky top-0 z-30 border-b border-[#d9e2ec] bg-white px-6 py-3 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#213343]">
              {mergedSettings.companyProfile.businessName}
            </p>
            <p className="text-xs text-gray-400">
              Proposal {quote.proposalNumber} · For {quote.customerName}
              {isExpired ? " · Expired" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <Shield className="h-3.5 w-3.5" />
              Secure
            </span>
            {state === "viewing" && !isExpired && (
              <button
                onClick={() => setState("signing")}
                className="rounded-lg bg-[#ff5c35] px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-[#e94820]"
              >
                Accept & Sign →
              </button>
            )}
          </div>
        </div>
      </div>

      {isExpired ? (
        <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-center text-sm font-medium text-red-700">
          This proposal expired on {quote.expiresAt}. Please request an updated proposal before signing.
        </div>
      ) : null}

      {/* Proposal document — same paginated view as editor preview, print route, and PDF */}
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
              quote={quote}
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

      {/* Signing overlay */}
      {state === "signing" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-6 sm:items-center">
          <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-[#213343]">Sign & Accept Proposal</h2>
            <p className="mt-2 text-sm text-gray-500">
              By signing below you accept the scope of work, pricing, and terms described in this
              proposal.
            </p>

            <div className="mt-6 rounded-lg border border-[#d9e2ec] bg-[#f5f8fa] p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-medium text-[#213343]">{quote.selectedOption} Option</p>
                <p className="text-2xl font-bold text-[#213343]">
                  {formatMoney(selectedResult.salePrice)}
                </p>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                {selectedResult.description}
              </p>
              {template.acceptance.paymentScheduleText && (
                <p className="mt-3 text-xs text-gray-500">
                  {template.acceptance.paymentScheduleText}
                </p>
              )}
            </div>

            <div className="mt-6">
              <label className="mb-1.5 block text-sm font-medium text-[#213343]">
                Type your full name to sign
              </label>
              <input
                value={signatureName}
                onChange={(e) => {
                  setSignatureName(e.target.value);
                  setSignatureError("");
                }}
                placeholder={quote.customerName}
                className="w-full rounded-lg border border-[#d9e2ec] px-4 py-3 text-lg font-medium italic outline-none focus:border-[#ff5c35] focus:ring-2 focus:ring-[#ff5c35]/20"
              />
              {signatureError && (
                <p className="mt-1.5 text-xs text-red-500">{signatureError}</p>
              )}
              <p className="mt-2 text-xs text-gray-400">
                Typed signatures are legally binding. Date:{" "}
                {new Date().toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setState("viewing");
                  setSignatureError("");
                }}
                className="flex-1 rounded-lg border border-[#d9e2ec] py-3 text-sm text-gray-500 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSign}
                className="flex-1 rounded-lg bg-[#ff5c35] py-3 text-sm font-semibold text-white shadow transition hover:bg-[#e94820]"
              >
                Accept & Sign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function isProposalExpired(quote: Quote) {
  if (!quote.expiresAt || quote.status === "Accepted") return false;
  return new Date(quote.expiresAt) < new Date();
}
