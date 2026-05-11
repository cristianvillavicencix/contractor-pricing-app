"use client";

import { Fragment } from "react";
import { CheckSquare, Shield, Clock, Star } from "lucide-react";
import type { ProposalTemplate, CustomSection } from "@/lib/proposal-templates";
import type { AppSettings, PriceOptionName, Quote } from "@/lib/app-data";
import {
  formatMoney,
  getEnabledCompanyCredentials,
  getTierDisplayName,
  getTierMaterialSummaries,
  getTierMaterialsTableForProposal,
} from "@/lib/app-data";
import type { CoverLayout } from "@/lib/pdf-generator";
import {
  CoverPageElegant,
  ELEGANT_COVER_DEFAULT_HEADLINE,
  getContactInitials,
  getElegantCoverDetailLine,
  getSelectedQuotePrice,
} from "@/components/proposals/cover-page-elegant";
import type { ReactNode } from "react";

export type SectionOverrides = Partial<Record<string, boolean>>;
export type SectionLayouts = Partial<Record<string, string>>;

export type ProposalDocumentProps = {
  template: ProposalTemplate;
  quote?: Quote;
  settings: AppSettings;
  photos?: string[];
  photoCaptions?: string[];
  coverPhotoUrl?: string | null;
  coverLayout?: CoverLayout;
  sectionOverrides?: SectionOverrides;
  sectionLayouts?: SectionLayouts;
  sectionOrder?: string[];
  customSections?: CustomSection[];
  proposalNumber?: string;
  preparedDate?: string;
};

const DEFAULT_SECTION_ORDER = [
  "cover", "executiveSummary", "existingConditions", "scopeOfWork",
  "materialsSpecs", "timeline", "pricing", "warranty", "terms", "acceptance",
];

/** 1-based position among non-cover sections in `order` up through `indexInOrder` (matches sidebar when reordering). */
function sectionOrdinalInOrder(
  sectionId: string,
  indexInOrder: number,
  order: string[]
): number | null {
  if (sectionId === "cover") return null;
  return order.slice(0, indexInOrder + 1).filter((id) => id !== "cover").length;
}

/** Paged.js uses this for explicit page breaks (break-before in CSS often never reaches its parser). */
const PAGED_NEW_PAGE = { "data-break-before": "page" as const };

function pagedChapterProps(startNewChapter: boolean) {
  return startNewChapter ? PAGED_NEW_PAGE : {};
}

export function ProposalDocument({
  template,
  quote,
  settings,
  photos = [],
  photoCaptions = [],
  coverPhotoUrl,
  coverLayout = "full",
  sectionOverrides = {},
  sectionLayouts = {},
  sectionOrder,
  customSections = [],
  proposalNumber,
  preparedDate,
}: ProposalDocumentProps) {
  const company = settings.companyProfile;
  const brand = settings.branding;

  const displayDate =
    preparedDate ??
    new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  const displayProposalNumber =
    proposalNumber ?? quote?.proposalNumber ?? "PRO-001";

  function visible(key: string, templateEnabled: boolean): boolean {
    return sectionOverrides[key] ?? templateEnabled;
  }

  function layout(key: string, fallback: string) {
    return sectionLayouts[key] ?? fallback;
  }

  const scopeSummary = quote?.scopeSummary?.trim() ?? "";
  const workmanshipText =
    quote?.warrantyText?.trim() || template.warranty.workmanshipText;
  const termsText = quote?.termsText?.trim() || template.terms.text;
  const credentials =
    settings.proposalSettings.showCertifications
      ? quote?.certifications ?? getEnabledCompanyCredentials(settings)
      : [];
  const includedServices = quote?.includedServices ?? [];

  const orderedSections = sectionOrder ?? DEFAULT_SECTION_ORDER;

  function renderSection(
    sectionId: string,
    startNewChapter: boolean,
    sectionChapter: number | null
  ): ReactNode {
    // ── Cover ────────────────────────────────────────────────────────
    if (sectionId === "cover") {
      if (!visible("cover", template.cover.enabled)) return null;
      return (
        <CoverSection
          company={company}
          brand={brand}
          quote={quote}
          template={template}
          coverPhotoUrl={coverPhotoUrl}
          coverLayout={coverLayout}
          displayDate={displayDate}
          displayProposalNumber={displayProposalNumber}
        />
      );
    }

    // ── Executive Summary ─────────────────────────────────────────────
    if (sectionId === "executiveSummary") {
      if (!visible("executiveSummary", template.executiveSummary.enabled)) return null;
      return (
        <section
          data-proposal-section="executiveSummary"
          className="px-0 py-6"
          {...pagedChapterProps(startNewChapter)}
        >
          <SectionLabel chapter={sectionChapter} />
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#213343]">
            Executive Summary
          </h2>
          <div
            className={
              layout("executiveSummary", "stacked") === "columns"
                ? "mt-10 grid gap-8 md:grid-cols-3"
                : layout("executiveSummary", "stacked") === "compact"
                  ? "mt-8 space-y-5"
                  : "mt-10 space-y-8"
            }
          >
            <SummaryCard heading={template.executiveSummary.problemHeading} text={template.executiveSummary.problemText} color="#ff5c35" />
            <SummaryCard heading={template.executiveSummary.solutionHeading} text={template.executiveSummary.solutionText} color="#213343" />
            <SummaryCard heading={template.executiveSummary.valueHeading} text={template.executiveSummary.valueText} color="#16a34a" />
          </div>
        </section>
      );
    }

    // ── Existing Conditions ───────────────────────────────────────────
    if (sectionId === "existingConditions") {
      if (!visible("existingConditions", template.existingConditions.enabled)) return null;
      const existingLayout = layout("existingConditions", "list");
      const photoLayout = layout("existingConditionPhotos", "twoColumns");
      return (
        <>
          <section
            data-proposal-section="existingConditions"
            className="px-0 py-6"
            {...pagedChapterProps(startNewChapter)}
          >
            <SectionLabel chapter={sectionChapter} />
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#213343]">Existing Conditions</h2>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-500 text-justify [hyphens:auto]">
              {template.existingConditions.introText}
            </p>
            <div
              className={
                existingLayout === "columns"
                  ? "mt-8 grid gap-x-10 gap-y-3 md:grid-cols-2"
                  : "mt-8 space-y-3"
              }
            >
              {template.existingConditions.checklistItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 border-b border-[#e8eef5] pb-3 break-inside-avoid"
                >
                  <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5c35]" />
                  <p className="text-sm leading-relaxed text-[#1a2733] text-justify [hyphens:auto]">{item}</p>
                </div>
              ))}
            </div>
          </section>
          {photos.length > 0 ? (
            <section
              data-proposal-section="existingConditions"
              className="px-0 py-6"
              {...PAGED_NEW_PAGE}
            >
              <SectionLabel chapter={sectionChapter} />
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#213343]">
                Existing Conditions Photos
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-500">
                Photo documentation from the inspection and project assessment.
              </p>
              <div
                className={
                  photoLayout === "one"
                    ? "mt-10"
                    : photoLayout === "twoStacked"
                      ? "mt-10 grid gap-6"
                      : "mt-10 grid grid-cols-2 gap-5"
                }
              >
                {photos.map((src, index) => (
                  <figure key={`${src}-${index}`} className="break-inside-avoid">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`Existing condition photo ${index + 1}`}
                      className={
                        photoLayout === "one"
                          ? "h-[560px] w-full border border-[#d9e2ec] object-cover"
                          : photoLayout === "twoStacked"
                            ? "h-[260px] w-full border border-[#d9e2ec] object-cover"
                            : "h-[360px] w-full border border-[#d9e2ec] object-cover"
                      }
                    />
                    <figcaption className="mt-2 text-xs leading-relaxed text-gray-500">
                      {photoCaptions[index] || `Photo ${index + 1}`}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          ) : null}
        </>
      );
    }

    // ── Scope of Work ─────────────────────────────────────────────────
    if (sectionId === "scopeOfWork") {
      if (!visible("scopeOfWork", template.scopeOfWork.enabled)) return null;
      const scopeLayout = layout("scopeOfWork", "numbered");
      return (
        <>
          <section
            data-proposal-section="scopeOfWork"
            className="px-0 py-6"
            {...pagedChapterProps(startNewChapter)}
          >
            <SectionLabel chapter={sectionChapter} />
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#213343]">Scope of Work</h2>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-500 text-justify [hyphens:auto]">
              {template.scopeOfWork.introText}
            </p>
            {scopeSummary ? (
              <div className="mt-6 border-l-2 border-[#ff5c35] bg-[#fff9f7] px-5 py-4">
                <p className="text-sm font-semibold text-[#ff5c35] mb-1">Project Summary</p>
                <p className="text-sm leading-relaxed text-[#213343] text-justify [hyphens:auto]">{scopeSummary}</p>
              </div>
            ) : null}
            <ol
              className={
                scopeLayout === "compact"
                  ? "mt-8 grid gap-x-8 gap-y-3 md:grid-cols-2"
                  : "mt-8 space-y-3"
              }
            >
              {template.scopeOfWork.items.map((item, i) => (
                <li key={i} className="flex items-start gap-4 break-inside-avoid">
                  <span className="mt-0.5 text-xs font-semibold tracking-wide text-[#ff5c35]">{i + 1}</span>
                  <p className="text-sm leading-relaxed text-[#1a2733] text-justify [hyphens:auto]">{item}</p>
                </li>
              ))}
            </ol>
          </section>
          {includedServices.length > 0 ? (
            <section
              data-proposal-section="scopeOfWork"
              className="px-0 py-6"
              {...PAGED_NEW_PAGE}
            >
              <SectionLabel chapter={sectionChapter} />
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#213343]">Included Services</h2>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-500 text-justify [hyphens:auto]">
                The following services are included as part of the proposed scope unless otherwise noted in the terms or exclusions.
              </p>
              <div className="mt-8 grid gap-x-10 gap-y-3 md:grid-cols-2">
                {includedServices.map((service) => (
                  <div key={service} className="flex items-start gap-3 border-b border-[#e8eef5] pb-3 break-inside-avoid">
                    <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5c35]" />
                    <p className="text-sm leading-relaxed text-[#1a2733]">{service}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      );
    }

    // ── Materials & Specs ─────────────────────────────────────────────
    if (sectionId === "materialsSpecs") {
      if (!visible("materialsSpecs", template.materialsSpecs.enabled)) return null;
      const matLayout = layout("materialsSpecs", "table");
      const selectedTier = quote?.selectedOption ?? "Better";
      const items = getTierMaterialsTableForProposal(
        settings,
        selectedTier,
        template,
        quote ?? null
      );

      return (
        <section
          data-proposal-section="materialsSpecs"
          className="px-0 py-6"
          {...pagedChapterProps(startNewChapter)}
        >
          <SectionLabel chapter={sectionChapter} />
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#213343]">
            Materials &amp; Specifications
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-500 text-justify [hyphens:auto]">
            {template.materialsSpecs.introText}
          </p>
          {matLayout === "cards" ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {items.map((item) => (
                <div key={item.id} className="break-inside-avoid border border-[#d9e2ec] bg-white p-4">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={`${item.product || item.category} material`}
                      className="mb-3 h-28 w-full rounded object-cover"
                    />
                  ) : null}
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#ff5c35]">{item.category}</p>
                  <p className="mt-1 font-bold text-[#213343]">{item.product}</p>
                  {item.brand ? <p className="mt-1 text-sm text-gray-500">{item.brand}</p> : null}
                  {item.warranty ? (
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                      <Shield className="h-3.5 w-3.5 shrink-0" />
                      {item.warranty}
                    </div>
                  ) : null}
                  {item.notes ? <p className="mt-2 text-xs leading-relaxed text-gray-400">{item.notes}</p> : null}
                </div>
              ))}
            </div>
          ) : matLayout === "list" ? (
            <div className="mt-6 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-start gap-3 border-b border-[#e8eef5] pb-3 break-inside-avoid">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={`${item.product || item.category} material`}
                      className="h-12 w-12 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff5c35]" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-[#213343]">{item.category} — {item.product}</p>
                    {item.brand ? <p className="text-xs text-gray-500">{item.brand}</p> : null}
                    {(item.warranty || item.notes) ? (
                      <p className="mt-0.5 text-xs text-gray-400">{[item.warranty, item.notes].filter(Boolean).join(" · ")}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 overflow-hidden border border-[#d9e2ec]">
              <table className="w-full table-fixed text-xs">
                <colgroup>
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "21%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "23%" }} />
                </colgroup>
                <thead className="bg-[#213343] text-left text-[10px] font-semibold uppercase tracking-widest text-white">
                  <tr>
                    <th className="px-3 py-2.5">Image</th>
                    <th className="px-3 py-2.5">Category</th>
                    <th className="px-3 py-2.5">Product</th>
                    <th className="px-3 py-2.5">Brand</th>
                    <th className="px-3 py-2.5">Warranty</th>
                    <th className="px-3 py-2.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d9e2ec] bg-white">
                  {items.map((item) => (
                    <tr key={item.id} className="align-top">
                      <td className="px-3 py-2">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={`${item.product || item.category} material`}
                            className="h-10 w-10 rounded object-cover"
                          />
                        ) : (
                          <span className="text-[10px] text-gray-300">—</span>
                        )}
                      </td>
                      <td className="break-words px-3 py-2 font-medium leading-snug text-[#213343]">{item.category}</td>
                      <td className="break-words px-3 py-2 leading-snug text-[#213343]">{item.product}</td>
                      <td className="break-words px-3 py-2 leading-snug text-gray-500">{item.brand}</td>
                      <td className="break-words px-3 py-2 leading-snug text-gray-500">{item.warranty}</td>
                      <td className="px-3 py-2 leading-snug text-gray-400">
                        <span className="line-clamp-5 wrap-break-word">{item.notes}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      );
    }

    // ── Timeline ──────────────────────────────────────────────────────
    if (sectionId === "timeline") {
      if (!visible("timeline", template.timeline.enabled)) return null;
      const tlLayout = layout("timeline", "steps");
      const phaseLines = template.timeline.phases.map((p) => `${p.name}|||${p.description}`);
      return (
        <section
          data-proposal-section="timeline"
          className="px-0 py-6"
          {...pagedChapterProps(startNewChapter)}
        >
          <SectionLabel chapter={sectionChapter} />
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#213343]">Project Timeline</h2>
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
            <Clock className="h-4 w-4" />
            <span>
              Estimated {template.timeline.estimatedDays} day
              {template.timeline.estimatedDays !== 1 ? "s" : ""} on site
            </span>
          </div>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-500 text-justify [hyphens:auto]">
            {template.timeline.introText}
          </p>
          {tlLayout === "compact" ? (
            <div className="mt-8 grid gap-x-8 gap-y-4 md:grid-cols-2">
              {phaseLines.map((line, i) => {
                const [name, description] = line.split("|||");
                const displayPhaseIndex = i + 1;
                return (
                  <div key={i} className="flex items-start gap-3 break-inside-avoid">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#213343] text-xs font-bold text-white">
                      {displayPhaseIndex}
                    </div>
                    <div>
                      <p className="font-semibold text-[#213343] text-sm">{name}</p>
                      <p className="mt-1 text-xs leading-relaxed text-gray-500">{description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : tlLayout === "bars" ? (
            <div className="mt-8 space-y-2">
              {phaseLines.map((line, i) => {
                const [name, description] = line.split("|||");
                const displayPhaseIndex = i + 1;
                return (
                  <div
                    key={i}
                    className="flex items-start gap-4 border border-[#e8eef5] border-l-4 border-l-[#ff5c35] bg-white px-4 py-3 break-inside-avoid"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#213343] text-[10px] font-bold text-white">
                      {displayPhaseIndex}
                    </span>
                    <div>
                      <p className="text-sm font-semibold leading-none text-[#213343]">{name}</p>
                      {description ? (
                        <p className="mt-1 text-xs leading-relaxed text-gray-500">{description}</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : tlLayout === "cards" ? (
            <div className="mt-8 grid gap-3 md:grid-cols-2">
              {phaseLines.map((line, i) => {
                const [name, description] = line.split("|||");
                const displayPhaseIndex = i + 1;
                return (
                  <div key={i} className="overflow-hidden rounded-lg border border-[#d9e2ec] break-inside-avoid">
                    <div className="flex items-center gap-3 bg-[#213343] px-4 py-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff5c35] text-[9px] font-bold text-white">
                        {displayPhaseIndex}
                      </span>
                      <p className="text-sm font-semibold text-white">{name}</p>
                    </div>
                    {description ? (
                      <p className="bg-white px-4 py-3 text-xs leading-relaxed text-gray-500">{description}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-10 space-y-0">
              {phaseLines.map((line, i) => {
                const [name, description] = line.split("|||");
                const displayPhaseIndex = i + 1;
                return (
                  <div key={i} className="flex gap-5 break-inside-avoid">
                    <div className="flex flex-col items-center">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#213343] text-xs font-bold text-white">
                        {displayPhaseIndex}
                      </div>
                      {i < phaseLines.length - 1 ? (
                        <div className="my-1 h-full min-h-[32px] w-px bg-[#d9e2ec]" />
                      ) : null}
                    </div>
                    <div className="pb-8">
                      <p className="font-semibold text-[#213343]">{name}</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-gray-500 text-justify [hyphens:auto]">
                        {description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      );
    }

    // ── Pricing ───────────────────────────────────────────────────────
    if (sectionId === "pricing") {
      if (!visible("pricing", template.pricing.enabled)) return null;
      return (
        <section
          data-proposal-section="pricing"
          className="bg-white px-0 py-6"
          {...pagedChapterProps(startNewChapter)}
        >
          <SectionLabel chapter={sectionChapter} />
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#213343]">Your Investment</h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-500">{template.pricing.introText}</p>
          {quote && (
            <div
              className={
                layout("pricing", "cards") === "list"
                  ? "mt-8 space-y-3"
                  : "mt-8 grid gap-5 md:grid-cols-3"
              }
            >
              {(["good", "better", "best"] as const).map((tier) => {
                const result = quote[tier];
                const isSelected = quote.selectedOption.toLowerCase() === tier;
                const tierName: PriceOptionName =
                  tier === "good" ? "Good" : tier === "better" ? "Better" : "Best";
                const materialsLine = getTierMaterialSummaries(settings, quote)[tierName];
                return (
                  <div
                    key={tier}
                    className={`relative overflow-hidden border bg-white p-6 transition ${isSelected ? "border-[#ff5c35]" : "border-[#d9e2ec]"}`}
                  >
                    {isSelected && (
                      <div className="absolute right-0 top-0 bg-[#ff5c35] px-3 py-1">
                        <div className="flex items-center gap-1">
                          <Star className="h-2.5 w-2.5 fill-white text-white" />
                          <span className="text-[10px] font-bold uppercase tracking-wide text-white">Recommended</span>
                        </div>
                      </div>
                    )}
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                      {getTierDisplayName(settings, tierName)}
                    </p>
                    <p className="mt-2 text-4xl font-bold text-[#213343]">{formatMoney(result.salePrice)}</p>
                    <div className="my-4 h-px bg-[#f0f4f8]" />
                    {materialsLine ? (
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#ff5c35]">
                        Materials / brand
                      </p>
                    ) : null}
                    {materialsLine ? (
                      <p className="mt-1 text-sm font-medium leading-snug text-[#213343]">{materialsLine}</p>
                    ) : null}
                    {materialsLine ? <div className="my-3 h-px bg-[#f0f4f8]" /> : null}
                    <p className="text-sm leading-relaxed text-gray-600">{result.description}</p>
                  </div>
                );
              })}
            </div>
          )}
          {template.pricing.allowancesText && (
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <strong>Allowances &amp; Exclusions:</strong> {template.pricing.allowancesText}
            </div>
          )}
          {template.pricing.showFinancingOption && template.pricing.financingText && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              <strong>Financing Available:</strong> {template.pricing.financingText}
            </div>
          )}
        </section>
      );
    }

    // ── Warranty ──────────────────────────────────────────────────────
    if (sectionId === "warranty") {
      if (!visible("warranty", template.warranty.enabled)) return null;
      const wLayout = layout("warranty", "columns");
      return (
        <section
          data-proposal-section="warranty"
          className="px-0 py-6"
          {...pagedChapterProps(startNewChapter)}
        >
          <SectionLabel chapter={sectionChapter} />
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#213343]">Warranty</h2>
          <div className={wLayout === "stacked" ? "mt-8 space-y-8" : "mt-8 grid gap-6 md:grid-cols-2"}>
            <div className="border-l-2 border-[#213343] pl-6 break-inside-avoid">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-[#ff5c35]" />
                <p className="font-bold text-[#213343]">
                  {template.warranty.workmanshipYears}-Year Workmanship Warranty
                </p>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-gray-600 text-justify [hyphens:auto]">
                {workmanshipText}
              </p>
            </div>
            <div className="border-l-2 border-[#d9e2ec] pl-6 break-inside-avoid">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-gray-400" />
                <p className="font-bold text-[#213343]">Manufacturer Warranty</p>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-gray-600 text-justify [hyphens:auto]">
                {template.warranty.manufacturerText}
              </p>
            </div>
          </div>
        </section>
      );
    }

    // ── Terms & Conditions ────────────────────────────────────────────
    if (sectionId === "terms") {
      if (!visible("terms", template.terms.enabled)) return null;
      const tLayout = layout("terms", "text");
      if (tLayout === "bullets") {
        const bulletItems = termsText
          .split(/\n/)
          .map((l) => l.trim())
          .filter(Boolean);
        return (
          <section
            data-proposal-section="terms"
            className="px-0 py-6"
            {...pagedChapterProps(startNewChapter)}
          >
            <SectionLabel chapter={sectionChapter} />
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#213343]">Terms &amp; Conditions</h2>
            <div className="mt-8 grid gap-x-10 gap-y-2 md:grid-cols-2">
              {bulletItems.map((item, i) => (
                <div key={i} className="flex items-start gap-2 border-b border-[#e8eef5] py-2 break-inside-avoid">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff5c35]" />
                  <p className="text-sm leading-relaxed text-gray-600">{item}</p>
                </div>
              ))}
            </div>
          </section>
        );
      }
      return (
        <section
          data-proposal-section="terms"
          className="px-0 py-6"
          {...pagedChapterProps(startNewChapter)}
        >
          <SectionLabel chapter={sectionChapter} />
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#213343]">Terms &amp; Conditions</h2>
          <div className="mt-8 border-l-2 border-[#d9e2ec] bg-white pl-6">
            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-gray-600">{termsText}</pre>
          </div>
        </section>
      );
    }

    // ── Acceptance ────────────────────────────────────────────────────
    if (sectionId === "acceptance") {
      if (!visible("acceptance", template.acceptance.enabled)) return null;
      const aLayout = layout("acceptance", "standard");
      return (
        <section
          data-proposal-section="acceptance"
          className="px-0 py-6"
          {...pagedChapterProps(startNewChapter)}
        >
          <SectionLabel chapter={sectionChapter} />
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#213343]">
            Acceptance &amp; Authorization
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-500">
            {template.acceptance.contractIntroText}
          </p>
          {template.acceptance.paymentScheduleText ? (
            <div className="mt-6 border-l-2 border-[#d9e2ec] bg-white px-5 py-4">
              <p className="text-sm font-semibold text-[#213343]">Payment Schedule</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{template.acceptance.paymentScheduleText}</p>
            </div>
          ) : null}
          {template.acceptance.showFinancingOption ? (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              Financing options are available. Ask us for details before signing.
            </div>
          ) : null}
          {credentials.length > 0 ? (
            <div className="mt-8 border-l-2 border-[#d9e2ec] bg-white px-5 py-4">
              <p className="text-sm font-semibold text-[#213343]">Certifications &amp; Credentials</p>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {credentials.map((credential) => (
                  <div key={credential} className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#213343]" />
                    <p className="text-sm text-gray-600">{credential}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className={`mt-12 grid gap-10 ${aLayout === "compact" ? "grid-cols-1" : "md:grid-cols-2"}`}>
            <SignatureBlock label="Customer Signature" name={quote?.customerName ?? "Customer Name"} />
            <SignatureBlock label="Contractor Signature" name={company.contactName || company.businessName} />
          </div>
          {template.acceptance.paymentLinkUrl && (
            <div className="mt-12 flex justify-center print:hidden">
              <a
                href={template.acceptance.paymentLinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#ff5c35] px-10 py-4 text-base font-semibold text-white shadow-lg shadow-[#ff5c35]/30 transition hover:bg-[#e94820]"
              >
                Proceed to Payment Portal →
              </a>
            </div>
          )}
        </section>
      );
    }

    // ── Custom sections ────────────────────────────────────────────────
    const custom = customSections.find((s) => s.id === sectionId);
    if (custom && visible(custom.id, custom.enabled)) {
      return (
        <section
          data-proposal-section={custom.id}
          className="px-0 py-6"
          {...pagedChapterProps(startNewChapter)}
        >
          <SectionLabel chapter={sectionChapter} />
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#213343]">{custom.title}</h2>
          {custom.content && (
            <div className="mt-8 space-y-3">
              {custom.content.split(/\n\n+/).map((para, i) => (
                <p key={i} className="text-sm leading-relaxed text-gray-600 text-justify [hyphens:auto]">
                  {para.replace(/\n/g, " ")}
                </p>
              ))}
            </div>
          )}
        </section>
      );
    }

    return null;
  }

  const sectionNodes: ReactNode[] = [];
  let coverRendered = false;
  let sawNonCover = false;
  for (let i = 0; i < orderedSections.length; i++) {
    const id = orderedSections[i];
    const startNewChapter = id !== "cover" && (coverRendered || sawNonCover);
    const sectionChapter = sectionOrdinalInOrder(id, i, orderedSections);
    const node = renderSection(id, startNewChapter, sectionChapter);
    sectionNodes.push(<Fragment key={id}>{node}</Fragment>);
    if (node != null) {
      if (id === "cover") coverRendered = true;
      else sawNonCover = true;
    }
  }

  return (
    <div className="proposal-document bg-white font-sans text-[#1a2733]">
      {sectionNodes}
      <footer className="border-t border-[#d9e2ec] px-14 py-6">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <p>
            {company.businessName}
            {company.phone ? ` · ${company.phone}` : ""}
            {company.email ? ` · ${company.email}` : ""}
          </p>
          <p>{brand.footerText}</p>
        </div>
      </footer>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function CoverSection({
  company,
  brand,
  quote,
  template,
  coverPhotoUrl,
  coverLayout,
  displayDate,
  displayProposalNumber,
}: {
  company: AppSettings["companyProfile"];
  brand: AppSettings["branding"];
  quote?: Quote;
  template: ProposalTemplate;
  coverPhotoUrl?: string | null;
  coverLayout: CoverLayout;
  displayDate: string;
  displayProposalNumber: string;
}) {
  if (coverLayout === "elegant") {
    const c = template.cover;
    const bannerHeadline =
      c.bannerHeadline?.trim() || ELEGANT_COVER_DEFAULT_HEADLINE;
    const detail = getElegantCoverDetailLine(quote);
    const displayCompanyName = c.elegantBusinessName?.trim() || company.businessName;
    const displayLogo =
      c.elegantLogoUrl?.trim() || brand.logoUrl?.trim() || null;
    const displayPrice =
      c.elegantPriceDisplay?.trim() ||
      (quote ? formatMoney(getSelectedQuotePrice(quote)) : "—");
    const displayContactName =
      c.elegantContactName?.trim() ||
      company.contactName ||
      company.businessName;
    const jobLine =
      c.elegantContactJobTitle?.trim() ||
      company.contactJobTitle?.trim() ||
      "";
    const displayContactPhoto =
      c.elegantContactPhotoUrl?.trim() ||
      company.contactPhotoUrl?.trim() ||
      null;
    const initials = getContactInitials(displayContactName);

    return (
      <CoverPageElegant
        coverPhotoUrl={coverPhotoUrl}
        logoUrl={displayLogo}
        companyName={displayCompanyName}
        bannerHeadline={bannerHeadline}
        priceDisplay={displayPrice}
        detailLine={detail || quote?.customerName || ""}
        contactName={displayContactName}
        contactSubtitle={jobLine}
        contactPhotoUrl={displayContactPhoto}
        initials={initials}
      />
    );
  }

  if (coverLayout === "half") {
    return (
      <section data-proposal-section="cover" data-page="proposal-cover" className="flex flex-col overflow-hidden bg-white">
        <div className="h-[42%] bg-[#1a2733]">
          {coverPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverPhotoUrl} alt="Property" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="flex flex-1 flex-col justify-between px-14 py-12">
          <CoverBrand company={company} brand={brand} dark={false} />
          <CoverMain quote={quote} template={template} dark={false} titleClassName="text-5xl" />
          <CoverMeta company={company} brand={brand} template={template} displayDate={displayDate} displayProposalNumber={displayProposalNumber} dark={false} />
        </div>
      </section>
    );
  }

  if (coverLayout === "square") {
    return (
      <section data-proposal-section="cover" data-page="proposal-cover" className="flex flex-col items-center justify-center overflow-hidden bg-white px-14 py-16 text-center">
        <CoverBrand company={company} brand={brand} dark={false} centered />
        {coverPhotoUrl ? (
          <div className="mt-10 aspect-square w-[52%] overflow-hidden border border-[#d9e2ec]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverPhotoUrl} alt="Property" className="h-full w-full object-cover" />
          </div>
        ) : null}
        <div className="mt-10">
          <CoverMain quote={quote} template={template} dark={false} centered titleClassName="text-4xl" />
        </div>
        <div className="mt-12 w-full">
          <CoverMeta company={company} brand={brand} template={template} displayDate={displayDate} displayProposalNumber={displayProposalNumber} dark={false} centered />
        </div>
      </section>
    );
  }

  return (
    <section data-proposal-section="cover" data-page="proposal-cover" className="relative flex flex-col overflow-hidden bg-[#1a2733]">
      {coverPhotoUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverPhotoUrl} alt="Property" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[#1a2733]/80" />
        </>
      )}
      <div className="relative z-10 h-1.5 w-full bg-[#ff5c35]" />
      <div className="relative z-10 flex flex-1 flex-col justify-between px-14 py-16">
        <CoverBrand company={company} brand={brand} dark />
        <CoverMain quote={quote} template={template} dark titleClassName="text-5xl" />
        <CoverMeta company={company} brand={brand} template={template} displayDate={displayDate} displayProposalNumber={displayProposalNumber} dark />
      </div>
    </section>
  );
}

function CoverBrand({
  company,
  brand,
  dark,
  centered = false,
}: {
  company: AppSettings["companyProfile"];
  brand: AppSettings["branding"];
  dark: boolean;
  centered?: boolean;
}) {
  if (brand.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={brand.logoUrl} alt="Company logo" className={`h-12 object-contain ${centered ? "mx-auto" : ""}`} />
    );
  }
  return (
    <p className={`text-sm font-semibold uppercase tracking-widest ${dark ? "text-white/40" : "text-gray-400"}`}>
      {company.businessName}
    </p>
  );
}

function CoverMain({
  quote,
  template,
  dark,
  centered = false,
  titleClassName,
}: {
  quote?: Quote;
  template: ProposalTemplate;
  dark: boolean;
  centered?: boolean;
  titleClassName: string;
}) {
  return (
    <div className={centered ? "text-center" : ""}>
      {quote && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff5c35]">Prepared for</p>
          <h1 className={`mt-2 font-bold leading-tight ${dark ? "text-white" : "text-[#213343]"} ${titleClassName}`}>
            {quote.customerName}
          </h1>
          {quote.customerAddress && (
            <p className={`mt-3 text-lg ${dark ? "text-white/50" : "text-gray-500"}`}>{quote.customerAddress}</p>
          )}
        </div>
      )}
      <div className={`mt-10 h-px w-20 bg-[#ff5c35] ${centered ? "mx-auto" : ""}`} />
      {template.cover.tagline && (
        <p className={`mt-6 max-w-xl text-lg leading-relaxed ${centered ? "mx-auto" : ""} ${dark ? "text-white/60" : "text-gray-500"}`}>
          {template.cover.tagline}
        </p>
      )}
    </div>
  );
}

function CoverMeta({
  company,
  brand,
  template,
  displayDate,
  displayProposalNumber,
  dark,
  centered = false,
}: {
  company: AppSettings["companyProfile"];
  brand: AppSettings["branding"];
  template: ProposalTemplate;
  displayDate: string;
  displayProposalNumber: string;
  dark: boolean;
  centered?: boolean;
}) {
  const muted = dark ? "text-white/40" : "text-gray-400";
  const strong = dark ? "text-white/60" : "text-[#213343]";
  return (
    <div className={`flex items-end justify-between gap-8 text-sm ${muted} ${centered ? "justify-center text-center" : ""}`}>
      {!centered && (
        <div className="space-y-1">
          {brand.logoUrl && <p className={`font-semibold ${strong}`}>{company.businessName}</p>}
          {company.phone && <p>{company.phone}</p>}
          {company.email && <p>{company.email}</p>}
          {company.website && <p>{company.website}</p>}
        </div>
      )}
      <div className={centered ? "space-y-1" : "space-y-1 text-right"}>
        {template.cover.showProposalNumber && <p className={`font-medium ${strong}`}>{displayProposalNumber}</p>}
        {template.cover.showPreparedBy && <p>{displayDate}</p>}
        {company.licenseNumber && <p>Lic. {company.licenseNumber}</p>}
      </div>
    </div>
  );
}

function SectionLabel({ chapter }: { chapter?: number | null }) {
  return (
    <div className="flex items-center gap-3">
      {chapter != null ? (
        <span className="shrink-0 text-xs font-bold tabular-nums text-[#ff5c35]">{chapter}.</span>
      ) : null}
      <div className="h-px w-16 bg-[#ff5c35]" />
      <div className="h-px flex-1 bg-[#d9e2ec]" />
    </div>
  );
}

function SummaryCard({ heading, text, color }: { heading: string; text: string; color: string }) {
  return (
    <div className="border-t pt-4" style={{ borderColor: color }}>
      <h3 className="font-bold text-[#213343]">{heading}</h3>
      <p className="mt-3 text-sm leading-relaxed text-gray-600 text-justify [hyphens:auto]">{text}</p>
    </div>
  );
}

function SignatureBlock({ label, name }: { label: string; name: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</p>
      <div className="mt-6 border-b-2 border-[#213343] pb-10" />
      <div className="mt-2 flex justify-between text-xs text-gray-400">
        <span>{name}</span>
        <span>Date: _______________</span>
      </div>
    </div>
  );
}
