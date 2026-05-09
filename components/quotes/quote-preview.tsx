"use client";

import type { CoverLayout, QuoteDocument } from "@/lib/pdf-generator";
import { formatMoney } from "@/lib/pdf-generator";
import {
  CoverPageElegant,
  ELEGANT_COVER_DEFAULT_HEADLINE,
  getContactInitials,
} from "@/components/proposals/cover-page-elegant";

function elegantPropsFromDoc(doc: QuoteDocument, coverImageUrl: string) {
  const price =
    doc.selectedOption === "Good"
      ? doc.goodPrice
      : doc.selectedOption === "Better"
        ? doc.betterPrice
        : doc.bestPrice;
  const detail = [doc.customerAddress, doc.projectName]
    .filter(Boolean)
    .slice(0, 2)
    .join("  |  ");

  const displayCompanyName =
    doc.elegantCoverBusinessName?.trim() || doc.companyName;
  const displayLogo =
    doc.elegantCoverLogoUrl?.trim() || doc.companyLogoUrl?.trim() || null;
  const displayPrice =
    doc.elegantCoverPriceDisplay?.trim() || formatMoney(price);
  const displayContactName =
    doc.elegantCoverContactName?.trim() ||
    doc.contactName ||
    doc.companyName;
  const displaySubtitle =
    doc.elegantCoverContactJobTitle?.trim() ||
    doc.contactTitle?.trim() ||
    "";
  const displayContactPhoto =
    doc.elegantCoverContactPhotoUrl?.trim() ||
    doc.contactPhotoUrl?.trim() ||
    null;

  return {
    coverPhotoUrl: coverImageUrl,
    logoUrl: displayLogo,
    companyName: displayCompanyName,
    bannerHeadline: doc.coverBannerHeadline?.trim() || ELEGANT_COVER_DEFAULT_HEADLINE,
    priceDisplay: displayPrice,
    detailLine: detail || doc.customerName,
    contactName: displayContactName,
    contactSubtitle: displaySubtitle,
    contactPhotoUrl: displayContactPhoto,
    initials: getContactInitials(displayContactName),
  } satisfies import("react").ComponentProps<typeof CoverPageElegant>;
}

export function QuotePreview({
  doc,
  coverImageUrl,
  coverLayout = "full",
}: {
  doc: QuoteDocument;
  coverImageUrl?: string | null;
  coverLayout?: CoverLayout;
}) {
  const companyMeta = [doc.companyPhone, doc.companyEmail, doc.companyWebsite]
    .filter(Boolean)
    .join("  ·  ");

  const elegant = coverLayout === "elegant";

  return (
    <div
      className={`mx-auto w-full bg-white font-sans text-[#111111] ${
        elegant
          ? "max-w-[210mm] shadow-none ring-0"
          : "max-w-[820px] shadow-sm ring-1 ring-[#E5E7EB]"
      }`}
    >
      {/* ── Cover page ── */}
      {coverImageUrl && elegant ? (
        <CoverPageElegant {...elegantPropsFromDoc(doc, coverImageUrl)} />
      ) : coverImageUrl ? (
        <CoverPhoto url={coverImageUrl} layout={coverLayout} doc={doc} />
      ) : null}

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-6 border-b border-[#E5E7EB] px-14 py-10">
        <div>
          {doc.companyLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={doc.companyLogoUrl}
              alt={doc.companyName}
              className="mb-3 h-9 w-auto max-w-40 object-contain"
            />
          ) : null}
          <p className="text-xl font-semibold tracking-tight">{doc.companyName}</p>
          {companyMeta && (
            <p className="mt-1.5 text-xs text-[#9CA3AF]">{companyMeta}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold tracking-tight">{doc.proposalTitle}</p>
          <p className="mt-1 text-xs text-[#9CA3AF]">{doc.proposalNumber}</p>
          <p className="mt-0.5 text-xs text-[#9CA3AF]">
            Created {doc.dateCreated} · Expires {doc.expiresAt}
          </p>
        </div>
      </div>

      <div className="space-y-8 px-14 py-10">
        {/* Customer + Project */}
        <div className="grid grid-cols-2 gap-4">
          <InfoBox label="Prepared For">
            <p className="text-sm font-semibold">{doc.customerName}</p>
            {doc.customerAddress && (
              <p className="mt-1 text-sm text-[#6B7280]">{doc.customerAddress}</p>
            )}
            {doc.customerPhone && (
              <p className="text-sm text-[#6B7280]">{doc.customerPhone}</p>
            )}
            {doc.customerEmail && (
              <p className="text-sm text-[#6B7280]">{doc.customerEmail}</p>
            )}
          </InfoBox>
          <InfoBox label="Project">
            <p className="text-sm font-semibold">{doc.projectName}</p>
            {doc.trade && (
              <p className="mt-1 text-sm text-[#6B7280]">{doc.trade}</p>
            )}
            {doc.customerAddress && (
              <p className="text-sm text-[#6B7280]">{doc.customerAddress}</p>
            )}
          </InfoBox>
        </div>

        {/* Scope */}
        <Section label="Scope of Work">
          <div className="rounded border border-[#E5E7EB] px-5 py-4">
            <p className="whitespace-pre-line text-sm leading-relaxed text-[#374151]">
              {doc.scopeSummary ||
                "Provide and install all materials and labor as required for the above project."}
            </p>
          </div>
        </Section>

        {/* Pricing */}
        <Section label="Pricing Options">
          <div className="grid grid-cols-3 gap-3">
            {(["Good", "Better", "Best"] as const).map((name) => {
              const price =
                name === "Good"
                  ? doc.goodPrice
                  : name === "Better"
                    ? doc.betterPrice
                    : doc.bestPrice;
              const isRecommended = name === "Better";

              return (
                <div
                  key={name}
                  className={`rounded border p-5 ${
                    isRecommended
                      ? "border-[#111111] bg-[#F9FAFB]"
                      : "border-[#E5E7EB]"
                  }`}
                >
                  {isRecommended ? (
                    <span className="mb-3 inline-block rounded bg-[#111111] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Recommended
                    </span>
                  ) : (
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                      {name}
                    </p>
                  )}
                  <p className="text-2xl font-bold tracking-tight">
                    {formatMoney(price)}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-[#9CA3AF]">
                    {doc.pricingDescriptions[name]}
                  </p>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Included Services */}
        {doc.includedServices.length > 0 && (
          <Section label="Included Services">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {doc.includedServices.map((service) => (
                <div key={service} className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#111111]" />
                  <span className="text-sm text-[#374151]">{service}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Warranty */}
        <Section label="Warranty">
          <div className="rounded border border-[#E5E7EB] px-5 py-4">
            <p className="text-sm leading-relaxed text-[#374151] text-justify [hyphens:auto]">
              {doc.warrantyText}
            </p>
          </div>
        </Section>

        {/* Terms */}
        <Section label="Terms & Conditions">
          <div className="rounded border border-[#E5E7EB] px-5 py-4">
            <p className="whitespace-pre-line text-sm leading-relaxed text-[#374151] text-justify [hyphens:auto]">
              {doc.termsText}
            </p>
          </div>
        </Section>

        {/* Certifications */}
        {doc.certifications.length > 0 && (
          <Section label="Certifications & Credentials">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {doc.certifications.map((cert) => (
                <div key={cert} className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#111111]" />
                  <span className="text-sm text-[#374151]">{cert}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Signatures */}
        <Section label="Authorization">
          <div className="grid grid-cols-2 gap-8">
            <SignatureBlock label="Customer Signature" sublabel="Signature  ·  Date" />
            <SignatureBlock
              label="Contractor Signature"
              sublabel={`${doc.companyName}  ·  Date`}
            />
          </div>
        </Section>

        {/* Footer */}
        <div className="border-t border-[#E5E7EB] pt-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#9CA3AF]">
              {doc.companyTagline || doc.companyFooterText || doc.companyName}
            </p>
            <p className="text-xs text-[#9CA3AF]">Page 1 of 1</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CoverPhoto({
  url,
  layout,
  doc,
}: {
  url: string;
  layout: CoverLayout;
  doc: QuoteDocument;
}) {
  if (layout === "full") {
    return (
      <div className="relative overflow-hidden" style={{ height: 420 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Cover" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-14 py-10">
          {doc.companyLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={doc.companyLogoUrl}
              alt={doc.companyName}
              className="mb-4 h-8 w-auto object-contain brightness-0 invert"
            />
          ) : null}
          <p className="text-2xl font-bold text-white">{doc.companyName}</p>
          <p className="mt-1.5 text-sm text-white/70">{doc.proposalTitle}</p>
          <p className="mt-3 text-xs text-white/50">
            Prepared for {doc.customerName}  ·  {doc.proposalNumber}
          </p>
          <p className="mt-1 text-xs text-white/40">{doc.dateCreated}</p>
        </div>
      </div>
    );
  }

  if (layout === "half") {
    return (
      <div>
        <div className="overflow-hidden" style={{ height: 260 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Cover" className="h-full w-full object-cover" />
        </div>
        <div className="border-b border-[#E5E7EB] px-14 py-8">
          {doc.companyLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={doc.companyLogoUrl}
              alt={doc.companyName}
              className="mb-3 h-8 w-auto object-contain"
            />
          ) : null}
          <p className="text-xl font-bold">{doc.companyName}</p>
          <p className="mt-1 text-sm text-[#6B7280]">{doc.proposalTitle}</p>
          <p className="mt-2 text-xs text-[#9CA3AF]">
            Prepared for {doc.customerName}  ·  {doc.proposalNumber}
          </p>
        </div>
      </div>
    );
  }

  // square
  return (
    <div className="border-b border-[#E5E7EB] px-14 py-10">
      <div className="flex items-center gap-10">
        <div className="overflow-hidden rounded" style={{ width: 240, height: 240, flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Cover" className="h-full w-full object-cover" />
        </div>
        <div>
          {doc.companyLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={doc.companyLogoUrl}
              alt={doc.companyName}
              className="mb-4 h-9 w-auto max-w-37.5 object-contain"
            />
          ) : null}
          <p className="text-2xl font-bold tracking-tight">{doc.companyName}</p>
          <p className="mt-2 text-base text-[#6B7280]">{doc.proposalTitle}</p>
          <p className="mt-3 text-sm text-[#9CA3AF]">Prepared for {doc.customerName}</p>
          <p className="mt-0.5 text-xs text-[#9CA3AF]">{doc.proposalNumber}  ·  {doc.dateCreated}</p>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF]">
        {label}
      </p>
      {children}
    </div>
  );
}

function InfoBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-[#E5E7EB] px-5 py-4">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF]">
        {label}
      </p>
      {children}
    </div>
  );
}

function SignatureBlock({ label, sublabel }: { label: string; sublabel: string }) {
  return (
    <div>
      <p className="mb-8 text-xs text-[#6B7280]">{label}</p>
      <div className="border-b border-[#374151]" />
      <p className="mt-1.5 text-[10px] text-[#9CA3AF]">{sublabel}</p>
    </div>
  );
}
