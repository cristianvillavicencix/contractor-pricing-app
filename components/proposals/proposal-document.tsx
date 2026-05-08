"use client";

import { Fragment } from "react";
import { CheckSquare, Shield, Clock, Star } from "lucide-react";
import type { ProposalTemplate, CustomSection, MaterialItem } from "@/lib/proposal-templates";
import type { AppSettings, Quote } from "@/lib/app-data";
import { formatMoney, getEnabledCompanyCredentials } from "@/lib/app-data";
import type { CoverLayout } from "@/lib/pdf-generator";
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

  function renderSection(sectionId: string): ReactNode {
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
          className="px-14 py-16 print:break-before-page"
        >
          <SectionLabel />
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
      const existingPages = paginateTextItemsByHeight(
        template.existingConditions.checklistItems,
        {
          columns: existingLayout === "columns" ? 2 : 1,
          firstPagePx: existingLayout === "columns" ? 520 : 620,
          nextPagePx: existingLayout === "columns" ? 690 : 760,
          charsPerLine: existingLayout === "columns" ? 54 : 96,
          basePx: 28,
          linePx: 20,
          rowGapPx: 12,
        }
      );
      return (
        <>
          {existingPages.map((items, pageIndex) => (
            <section
              key={`conditions-${pageIndex}`}
              data-proposal-section="existingConditions"
              className="bg-[#f5f8fa] px-14 py-16 print:break-before-page"
            >
              <SectionLabel />
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#213343]">
                Existing Conditions{pageIndex > 0 ? " Continued" : ""}
              </h2>
              {pageIndex === 0 && (
                <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-500 text-justify [hyphens:auto]">
                  {template.existingConditions.introText}
                </p>
              )}
              <div
                className={
                  existingLayout === "columns"
                    ? "mt-8 grid gap-x-10 gap-y-3 md:grid-cols-2"
                    : "mt-8 space-y-3"
                }
              >
                {items.map((item, i) => (
                  <div key={`${pageIndex}-${i}`} className="flex items-start gap-3 border-b border-[#e8eef5] pb-3">
                    <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5c35]" />
                    <p className="text-sm leading-relaxed text-[#1a2733] text-justify [hyphens:auto]">{item}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
          {photos.length > 0 &&
            chunkPhotos(photos, layout("existingConditionPhotos", "twoColumns")).map(
              (photoGroup, pageIndex) => (
                <section
                  key={`condition-photos-${pageIndex}`}
                  data-proposal-section="existingConditions"
                  className="bg-white px-14 py-16 print:break-before-page"
                >
                  <SectionLabel />
                  <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#213343]">
                    Existing Conditions Photos
                  </h2>
                  <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-500">
                    Photo documentation from the inspection and project assessment.
                  </p>
                  <div
                    className={
                      layout("existingConditionPhotos", "twoColumns") === "one"
                        ? "mt-10"
                        : layout("existingConditionPhotos", "twoColumns") === "twoStacked"
                          ? "mt-10 grid gap-6"
                          : "mt-10 grid grid-cols-2 gap-5"
                    }
                  >
                    {photoGroup.map((src, index) => (
                      <figure key={`${src}-${index}`} className="break-inside-avoid">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt={`Existing condition photo ${pageIndex + 1}-${index + 1}`}
                          className={
                            layout("existingConditionPhotos", "twoColumns") === "one"
                              ? "h-[560px] w-full border border-[#d9e2ec] object-cover"
                              : layout("existingConditionPhotos", "twoColumns") === "twoStacked"
                                ? "h-[260px] w-full border border-[#d9e2ec] object-cover"
                                : "h-[360px] w-full border border-[#d9e2ec] object-cover"
                          }
                        />
                        <figcaption className="mt-2 text-xs leading-relaxed text-gray-500">
                          {photoCaptions[getPhotoGlobalIndex(pageIndex, index, layout("existingConditionPhotos", "twoColumns"))] ||
                            `Photo ${getPhotoGlobalIndex(pageIndex, index, layout("existingConditionPhotos", "twoColumns")) + 1}`}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </section>
              )
            )}
        </>
      );
    }

    // ── Scope of Work ─────────────────────────────────────────────────
    if (sectionId === "scopeOfWork") {
      if (!visible("scopeOfWork", template.scopeOfWork.enabled)) return null;
      const scopeLayout = layout("scopeOfWork", "numbered");
      const scopePages = paginateTextItemsByHeight(template.scopeOfWork.items, {
        columns: scopeLayout === "compact" ? 2 : 1,
        firstPagePx: scopeLayout === "compact" ? 500 : 560,
        nextPagePx: scopeLayout === "compact" ? 675 : 735,
        charsPerLine: scopeLayout === "compact" ? 42 : 88,
        basePx: scopeLayout === "compact" ? 30 : 26,
        linePx: scopeLayout === "compact" ? 24 : 21,
        rowGapPx: scopeLayout === "compact" ? 12 : 12,
      });
      return (
        <>
          {scopePages.map((items, pageIndex) => (
            <section
              key={`scope-${pageIndex}`}
              data-proposal-section="scopeOfWork"
              className="px-14 py-16 print:break-before-page"
            >
              <SectionLabel />
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#213343]">
                Scope of Work{pageIndex > 0 ? " Continued" : ""}
              </h2>
              {pageIndex === 0 && (
                <>
                  <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-500 text-justify [hyphens:auto]">
                    {template.scopeOfWork.introText}
                  </p>
                  {scopeSummary && (
                    <div className="mt-6 border-l-2 border-[#ff5c35] bg-[#fff9f7] px-5 py-4">
                      <p className="text-sm font-semibold text-[#ff5c35] mb-1">Project Summary</p>
                      <p className="text-sm leading-relaxed text-[#213343] text-justify [hyphens:auto]">{scopeSummary}</p>
                    </div>
                  )}
                </>
              )}
              <ol
                className={
                  layout("scopeOfWork", "numbered") === "compact"
                    ? "mt-8 grid gap-x-8 gap-y-3 md:grid-cols-2"
                    : "mt-8 space-y-3"
                }
              >
                {items.map((item, i) => {
                  const itemNumber =
                    scopePages
                      .slice(0, pageIndex)
                      .reduce((total, page) => total + page.length, 0) +
                    i +
                    1;
                  return (
                    <li key={`${pageIndex}-${i}`} className="flex items-start gap-4">
                      <span className="mt-0.5 text-xs font-semibold tracking-wide text-[#ff5c35]">{itemNumber}</span>
                      <p className="text-sm leading-relaxed text-[#1a2733] text-justify [hyphens:auto]">{item}</p>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
          {includedServices.length > 0 && (
            <section data-proposal-section="scopeOfWork" className="px-14 py-16 print:break-before-page">
              <SectionLabel />
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#213343]">Included Services</h2>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-500 text-justify [hyphens:auto]">
                The following services are included as part of the proposed scope unless otherwise noted in the terms or exclusions.
              </p>
              <div className="mt-8 grid gap-x-10 gap-y-3 md:grid-cols-2">
                {includedServices.map((service) => (
                  <div key={service} className="flex items-start gap-3 border-b border-[#e8eef5] pb-3">
                    <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5c35]" />
                    <p className="text-sm leading-relaxed text-[#1a2733]">{service}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      );
    }

    // ── Materials & Specs ─────────────────────────────────────────────
    if (sectionId === "materialsSpecs") {
      if (!visible("materialsSpecs", template.materialsSpecs.enabled)) return null;
      const matLayout = layout("materialsSpecs", "table");

      // Choose pagination strategy per layout.
      // Pixel budgets = available tbody height: page-1 has less room (title + intro overhead).
      const pages =
        matLayout === "cards"
          ? chunkArray(template.materialsSpecs.items, 6)
          : matLayout === "list"
            ? paginateMaterialItems(template.materialsSpecs.items, 660, 800)
            : paginateMaterialItems(template.materialsSpecs.items, 720, 860);

      return (
        <>
          {pages.map((items, pageIndex) => (
            <section
              key={`materials-${pageIndex}`}
              data-proposal-section="materialsSpecs"
              className="bg-[#f5f8fa] px-14 py-12 print:break-before-page"
            >
              <SectionLabel />
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#213343]">
                Materials &amp; Specifications{pageIndex > 0 ? " (Continued)" : ""}
              </h2>
              {pageIndex === 0 && (
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-500 text-justify [hyphens:auto]">
                  {template.materialsSpecs.introText}
                </p>
              )}
              {matLayout === "cards" ? (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {items.map((item) => (
                    <div key={item.id} className="border border-[#d9e2ec] bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-widest text-[#ff5c35]">{item.category}</p>
                      <p className="mt-1 font-bold text-[#213343]">{item.product}</p>
                      {item.brand && <p className="mt-1 text-sm text-gray-500">{item.brand}</p>}
                      {item.warranty && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                          <Shield className="h-3.5 w-3.5 shrink-0" />
                          {item.warranty}
                        </div>
                      )}
                      {item.notes && <p className="mt-2 text-xs leading-relaxed text-gray-400">{item.notes}</p>}
                    </div>
                  ))}
                </div>
              ) : matLayout === "list" ? (
                <div className="mt-6 space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 border-b border-[#e8eef5] pb-3">
                      <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff5c35]" />
                      <div>
                        <p className="text-sm font-semibold text-[#213343]">{item.category} — {item.product}</p>
                        {item.brand && <p className="text-xs text-gray-500">{item.brand}</p>}
                        {(item.warranty || item.notes) && (
                          <p className="mt-0.5 text-xs text-gray-400">{[item.warranty, item.notes].filter(Boolean).join(" · ")}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Table layout — fixed columns, compact cells, words wrap within their cell */
                <div className="mt-6 overflow-hidden border border-[#d9e2ec]">
                  <table className="w-full table-fixed text-xs">
                    <colgroup>
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "23%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "20%" }} />
                      <col style={{ width: "29%" }} />
                    </colgroup>
                    <thead className="bg-[#213343] text-left text-[10px] font-semibold uppercase tracking-widest text-white">
                      <tr>
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
          ))}
        </>
      );
    }

    // ── Timeline ──────────────────────────────────────────────────────
    if (sectionId === "timeline") {
      if (!visible("timeline", template.timeline.enabled)) return null;
      const tlLayout = layout("timeline", "steps");
      return (
        <>
          {paginatePhases(
            template.timeline.phases.map((p) => `${p.name}|||${p.description}`),
            tlLayout,
            700,
            840,
          ).map((phaseLines, pageIndex) => (
            <section
              key={`timeline-${pageIndex}`}
              data-proposal-section="timeline"
              className="px-14 py-16 print:break-before-page"
            >
              <SectionLabel />
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#213343]">
                Project Timeline{pageIndex > 0 ? " Continued" : ""}
              </h2>
              {pageIndex === 0 && (
                <>
                  <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
                    <Clock className="h-4 w-4" />
                    <span>Estimated {template.timeline.estimatedDays} day{template.timeline.estimatedDays !== 1 ? "s" : ""} on site</span>
                  </div>
                  <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-500 text-justify [hyphens:auto]">
                    {template.timeline.introText}
                  </p>
                </>
              )}
              {tlLayout === "compact" ? (
                /* 2-col numbered grid */
                <div className="mt-8 grid gap-x-8 gap-y-4 md:grid-cols-2">
                  {phaseLines.map((line, i) => {
                    const [name, description] = line.split("|||");
                    const globalIndex = template.timeline.phases.findIndex(
                      (p) => p.name === name && p.description === description
                    ) + 1;
                    return (
                      <div key={`${pageIndex}-${i}`} className="flex items-start gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#213343] text-xs font-bold text-white">
                          {globalIndex}
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
                /* Horizontal bars with orange left accent */
                <div className="mt-8 space-y-2">
                  {phaseLines.map((line, i) => {
                    const [name, description] = line.split("|||");
                    const globalIndex = template.timeline.phases.findIndex(
                      (p) => p.name === name && p.description === description
                    ) + 1;
                    return (
                      <div key={`${pageIndex}-${i}`} className="flex items-start gap-4 border-l-4 border-[#ff5c35] bg-[#f5f8fa] px-4 py-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#213343] text-[10px] font-bold text-white">
                          {globalIndex}
                        </span>
                        <div>
                          <p className="text-sm font-semibold leading-none text-[#213343]">{name}</p>
                          {description && (
                            <p className="mt-1 text-xs leading-relaxed text-gray-500">{description}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : tlLayout === "cards" ? (
                /* 2-col cards with dark header */
                <div className="mt-8 grid gap-3 md:grid-cols-2">
                  {phaseLines.map((line, i) => {
                    const [name, description] = line.split("|||");
                    const globalIndex = template.timeline.phases.findIndex(
                      (p) => p.name === name && p.description === description
                    ) + 1;
                    return (
                      <div key={`${pageIndex}-${i}`} className="overflow-hidden rounded-lg border border-[#d9e2ec]">
                        <div className="flex items-center gap-3 bg-[#213343] px-4 py-2.5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff5c35] text-[9px] font-bold text-white">
                            {globalIndex}
                          </span>
                          <p className="text-sm font-semibold text-white">{name}</p>
                        </div>
                        {description && (
                          <p className="bg-white px-4 py-3 text-xs leading-relaxed text-gray-500">{description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Default: vertical stepper */
                <div className="mt-10 space-y-0">
                  {phaseLines.map((line, i) => {
                    const [name, description] = line.split("|||");
                    const globalIndex = template.timeline.phases.findIndex(
                      (p) => p.name === name && p.description === description
                    ) + 1;
                    return (
                      <div key={`${pageIndex}-${i}`} className="flex gap-5">
                        <div className="flex flex-col items-center">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#213343] text-xs font-bold text-white">
                            {globalIndex}
                          </div>
                          {i < phaseLines.length - 1 && (
                            <div className="my-1 h-full min-h-[32px] w-px bg-[#d9e2ec]" />
                          )}
                        </div>
                        <div className="pb-8">
                          <p className="font-semibold text-[#213343]">{name}</p>
                          <p className="mt-1.5 text-sm leading-relaxed text-gray-500 text-justify [hyphens:auto]">{description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ))}
        </>
      );
    }

    // ── Pricing ───────────────────────────────────────────────────────
    if (sectionId === "pricing") {
      if (!visible("pricing", template.pricing.enabled)) return null;
      return (
        <section data-proposal-section="pricing" className="bg-[#f5f8fa] px-14 py-16 print:break-before-page">
          <SectionLabel />
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
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{tier}</p>
                    <p className="mt-2 text-4xl font-bold text-[#213343]">{formatMoney(result.salePrice)}</p>
                    <div className="my-4 h-px bg-[#f0f4f8]" />
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
      const warrantyItems = chunkArray(
        [
          { title: `${template.warranty.workmanshipYears}-Year Workmanship Warranty`, text: workmanshipText, primary: true },
          { title: "Manufacturer Warranty", text: template.warranty.manufacturerText, primary: false },
        ].flatMap((item) =>
          splitTextIntoPages(item.text, 1700).map((text, index) => ({
            ...item,
            text,
            title: index > 0 ? `${item.title} Continued` : item.title,
          }))
        ),
        wLayout === "stacked" ? 1 : 2
      );
      return (
        <>
          {warrantyItems.map((items, pageIndex) => (
            <section key={`warranty-${pageIndex}`} data-proposal-section="warranty" className="px-14 py-16 print:break-before-page">
              <SectionLabel />
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#213343]">
                Warranty{pageIndex > 0 ? " Continued" : ""}
              </h2>
              <div className={wLayout === "stacked" ? "mt-8 space-y-8" : "mt-8 grid gap-6 md:grid-cols-2"}>
                {items.map((item, index) => (
                  <div key={`${pageIndex}-${index}`} className={`border-l-2 pl-6 ${item.primary ? "border-[#213343]" : "border-[#d9e2ec]"}`}>
                    <div className="flex items-center gap-3">
                      <Shield className={`h-6 w-6 ${item.primary ? "text-[#ff5c35]" : "text-gray-400"}`} />
                      <p className="font-bold text-[#213343]">{item.title}</p>
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-gray-600 text-justify [hyphens:auto]">{item.text}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </>
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
        const pages = chunkArray(bulletItems, 18);
        return (
          <>
            {pages.map((items, pageIndex) => (
              <section key={`terms-${pageIndex}`} data-proposal-section="terms" className="bg-[#f5f8fa] px-14 py-16 print:break-before-page">
                <SectionLabel />
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#213343]">
                  Terms &amp; Conditions{pageIndex > 0 ? " Continued" : ""}
                </h2>
                <div className="mt-8 grid gap-x-10 gap-y-2 md:grid-cols-2">
                  {items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 border-b border-[#e8eef5] py-2">
                      <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff5c35]" />
                      <p className="text-sm leading-relaxed text-gray-600">{item}</p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </>
        );
      }
      return (
        <>
          {splitTextIntoPages(termsText, 2600).map((text, pageIndex) => (
            <section key={`terms-${pageIndex}`} data-proposal-section="terms" className="bg-[#f5f8fa] px-14 py-16 print:break-before-page">
              <SectionLabel />
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#213343]">
                Terms &amp; Conditions{pageIndex > 0 ? " Continued" : ""}
              </h2>
              <div className="mt-8 border-l-2 border-[#d9e2ec] bg-white pl-6">
                <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-gray-600">{text}</pre>
              </div>
            </section>
          ))}
        </>
      );
    }

    // ── Acceptance ────────────────────────────────────────────────────
    if (sectionId === "acceptance") {
      if (!visible("acceptance", template.acceptance.enabled)) return null;
      const aLayout = layout("acceptance", "standard");
      return (
        <section data-proposal-section="acceptance" className="px-14 py-16 print:break-before-page">
          <SectionLabel />
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#213343]">
            Acceptance &amp; Authorization
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-500">
            {template.acceptance.contractIntroText}
          </p>
          {template.acceptance.paymentScheduleText && (
            <div className="mt-6 border-l-2 border-[#d9e2ec] bg-[#f5f8fa] px-5 py-4">
              <p className="text-sm font-semibold text-[#213343]">Payment Schedule</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{template.acceptance.paymentScheduleText}</p>
            </div>
          )}
          {template.acceptance.showFinancingOption && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              Financing options are available. Ask us for details before signing.
            </div>
          )}
          {credentials.length > 0 && (
            <div className="mt-8 border-l-2 border-[#d9e2ec] bg-[#f5f8fa] px-5 py-4">
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
          )}
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
          className="px-14 py-16 print:break-before-page"
        >
          <SectionLabel />
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

  return (
    <div className="proposal-document bg-white font-sans text-[#1a2733]">
      {orderedSections.map((id) => (
        <Fragment key={id}>{renderSection(id)}</Fragment>
      ))}
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
  if (coverLayout === "half") {
    return (
      <section data-proposal-section="cover" className="flex flex-col overflow-hidden bg-white">
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
      <section data-proposal-section="cover" className="flex flex-col items-center justify-center overflow-hidden bg-white px-14 py-16 text-center">
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
    <section data-proposal-section="cover" className="relative flex flex-col overflow-hidden bg-[#1a2733]">
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

function chunkPhotos(photos: string[], photoLayout: string) {
  const perPage = photoLayout === "one" ? 1 : photoLayout === "grid" ? 4 : 2;
  const groups: string[][] = [];
  for (let index = 0; index < photos.length; index += perPage) {
    groups.push(photos.slice(index, index + perPage));
  }
  return groups;
}

function chunkArray<T>(items: T[], perPage: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += perPage) {
    chunks.push(items.slice(index, index + perPage));
  }
  return chunks.length > 0 ? chunks : [[]];
}

// Estimates rendered height of a single table row in pixels.
// py-2 (16px) + lines × 17px (text-xs leading-snug ≈ 16.5px rounded up).
function matRowPx(item: MaterialItem): number {
  const notesLines = Math.min(5, Math.ceil((item.notes?.length || 0) / 28));
  const otherLines = Math.ceil(
    Math.max(
      item.category?.length || 0,
      item.product?.length || 0,
      item.brand?.length || 0,
      item.warranty?.length || 0,
    ) / 18,
  );
  return 16 + Math.max(1, notesLines, otherLines) * 17;
}

// Splits material items into pages using pixel-height budgets.
// firstAvailPx / nextAvailPx = available tbody height for page 1 vs 2+.
function paginateMaterialItems(items: MaterialItem[], firstAvailPx: number, nextAvailPx: number) {
  const pages: MaterialItem[][] = [];
  let current: MaterialItem[] = [];
  let used = 0;
  let avail = firstAvailPx;

  for (const item of items) {
    const h = matRowPx(item);
    if (current.length > 0 && used + h > avail) {
      pages.push(current);
      current = [];
      used = 0;
      avail = nextAvailPx;
    }
    current.push(item);
    used += h;
  }

  if (current.length > 0) pages.push(current);
  return pages.length > 0 ? pages : [[]];
}

// Splits timeline phases into pages using pixel-height budgets.
// Handles 2-col layouts (compact/cards) by pairing items.
function paginatePhases(phases: string[], tlLayout: string, firstAvailPx: number, nextAvailPx: number) {
  function phasePx(p: string): number {
    const desc = p.split("|||")[1] || "";
    if (tlLayout === "steps") {
      const lines = Math.max(1, Math.ceil(desc.length / 56)); // text-sm ~638px wide
      return 32 + 22 + 6 + lines * 23; // pb-8 + title + mt-1.5 + desc
    }
    if (tlLayout === "bars") {
      const lines = Math.max(1, Math.ceil(desc.length / 56));
      return 24 + 18 + lines * 18 + 8; // py-3 + title + desc + space-y-2
    }
    // compact / cards — 2-col, ~30 chars per line at half width
    const lines = Math.max(1, Math.ceil(desc.length / 30));
    return tlLayout === "cards"
      ? 40 + lines * 18 + 12
      : 28 + 20 + lines * 18 + 16;
  }

  const pages: string[][] = [];
  let current: string[] = [];
  let used = 0;
  let avail = firstAvailPx;
  const twoCol = tlLayout === "compact" || tlLayout === "cards";

  if (twoCol) {
    for (let i = 0; i < phases.length; i += 2) {
      const pair = phases.slice(i, Math.min(i + 2, phases.length));
      const rowH = Math.max(...pair.map(phasePx));
      if (current.length > 0 && used + rowH > avail) {
        pages.push(current);
        current = [];
        used = 0;
        avail = nextAvailPx;
      }
      current.push(...pair);
      used += rowH;
    }
  } else {
    for (const p of phases) {
      const h = phasePx(p);
      if (current.length > 0 && used + h > avail) {
        pages.push(current);
        current = [];
        used = 0;
        avail = nextAvailPx;
      }
      current.push(p);
      used += h;
    }
  }

  if (current.length > 0) pages.push(current);
  return pages.length > 0 ? pages : [[]];
}

function paginateTextItemsByHeight(
  items: string[],
  {
    columns,
    firstPagePx,
    nextPagePx,
    charsPerLine,
    basePx,
    linePx,
    rowGapPx,
  }: {
    columns: 1 | 2;
    firstPagePx: number;
    nextPagePx: number;
    charsPerLine: number;
    basePx: number;
    linePx: number;
    rowGapPx: number;
  }
) {
  function itemHeight(item: string) {
    const normalizedLength = item.replace(/\s+/g, " ").trim().length;
    const lines = Math.max(1, Math.ceil(normalizedLength / charsPerLine));
    return basePx + lines * linePx;
  }

  const pages: string[][] = [];
  let current: string[] = [];
  let used = 0;
  let available = firstPagePx;

  if (columns === 2) {
    for (let index = 0; index < items.length; index += 2) {
      const row = items.slice(index, index + 2);
      const rowHeight = Math.max(...row.map(itemHeight)) + rowGapPx;
      if (current.length > 0 && used + rowHeight > available) {
        pages.push(current);
        current = [];
        used = 0;
        available = nextPagePx;
      }
      current.push(...row);
      used += rowHeight;
    }
  } else {
    for (const item of items) {
      const height = itemHeight(item) + rowGapPx;
      if (current.length > 0 && used + height > available) {
        pages.push(current);
        current = [];
        used = 0;
        available = nextPagePx;
      }
      current.push(item);
      used += height;
    }
  }

  if (current.length > 0) pages.push(current);
  return pages.length > 0 ? pages : [[]];
}

function paginateWeightedItems(items: string[], firstPageMax: number, nextPageMax: number) {
  const pages: string[][] = [];
  let currentPage: string[] = [];
  let currentWeight = 0;
  let maxWeight = firstPageMax;

  for (const item of items) {
    const itemWeight = Math.max(1, Math.ceil(item.length / 180));
    if (currentPage.length > 0 && currentWeight + itemWeight > maxWeight) {
      pages.push(currentPage);
      currentPage = [];
      currentWeight = 0;
      maxWeight = nextPageMax;
    }
    currentPage.push(item);
    currentWeight += itemWeight;
  }

  if (currentPage.length > 0) pages.push(currentPage);
  return pages.length > 0 ? pages : [[]];
}

function splitTextIntoPages(text: string, maxChars: number) {
  const normalized = text.trim();
  if (!normalized) return [""];
  const paragraphs = normalized.split(/\n\s*\n/);
  const pages: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if ((current + "\n\n" + paragraph).trim().length > maxChars && current) {
      pages.push(current.trim());
      current = paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  if (current.trim()) pages.push(current.trim());
  return pages;
}

function getPhotoGlobalIndex(pageIndex: number, index: number, photoLayout: string) {
  const perPage = photoLayout === "one" ? 1 : photoLayout === "grid" ? 4 : 2;
  return pageIndex * perPage + index;
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

function SectionLabel() {
  return (
    <div className="flex items-center gap-3">
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
