"use client";

import type { CSSProperties } from "react";
import type { Quote } from "@/lib/app-data";

export const ELEGANT_COVER_DEFAULT_HEADLINE = "PROPOSED INVESTMENT";

/** Pie verde: foto + nombre + cargo del contacto. */
const FOOTER_GREEN_HEIGHT = "38mm";

/** Banda de precio anclada encima del pie verde, como la referencia. */
const PRICE_BAND_HEIGHT = "66mm";

/** Area superior reservada para logo y cielo limpio. */
const TOP_BRAND_HEIGHT = "35mm";

/** Monto grande de la banda oscura. */
const COVER_PRICE_FONT_MM = "18mm";

/** Logo/nombre arriba, centrado sobre fondo claro. */
const COVER_COMPANY_NAME_FONT_MM = "6.6mm";

const priceBandDark: CSSProperties = {
  background:
    "linear-gradient(to bottom, rgba(25, 29, 33, 0) 0%, rgba(27, 35, 41, 0.56) 18%, rgba(27, 34, 40, 0.88) 46%, rgba(23, 28, 33, 0.98) 100%)",
  WebkitBackdropFilter: "blur(14px) saturate(0.92)",
  backdropFilter: "blur(14px) saturate(0.92)",
};

const headerGlassDark: CSSProperties = {
  background:
    "linear-gradient(to bottom, rgba(12, 15, 18, 0.94) 0%, rgba(14, 18, 22, 0.8) 42%, rgba(14, 18, 22, 0.34) 76%, rgba(14, 18, 22, 0) 100%)",
  WebkitBackdropFilter: "blur(18px) saturate(0.9)",
  backdropFilter: "blur(18px) saturate(0.9)",
};

/** Verde bosque cercano a la referencia */
const BUILDERS_GREEN = "#174c36";

/** Nombre sobre pie verde (verde menta claro, como la referencia). */
const BUILDERS_NAME_MINT = "#a6d87b";

export function getContactInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function getSelectedQuotePrice(quote: Quote) {
  if (quote.selectedOption === "Good") return quote.good.salePrice;
  if (quote.selectedOption === "Better") return quote.better.salePrice;
  return quote.best.salePrice;
}

/** Dirección y proyecto (sin trade — el cargo va solo junto al contacto en el pie). */
export function getElegantCoverDetailLine(quote: Quote | undefined) {
  if (!quote) return "";
  const market = extractMarketLabel(quote.customerAddress);
  const parts = [quote.trade, market, quote.projectName].filter(
    (p): p is string => Boolean(p && p.trim())
  );
  return parts.slice(0, 3).join("  |  ");
}

function extractMarketLabel(address: string | undefined) {
  if (!address) return "";
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) return parts.slice(-2).join(", ");
  return address.trim();
}

export type CoverPageElegantProps = {
  coverPhotoUrl?: string | null;
  logoUrl?: string | null;
  companyName: string;
  bannerHeadline: string;
  priceDisplay: string;
  detailLine: string;
  contactName: string;
  contactSubtitle: string;
  contactPhotoUrl?: string | null;
  initials: string;
};

/**
 * Portada tipo Builders Capital: una sola hoja A4, solo capas absolutas.
 * Cielo/logo arriba → imagen grande del proyecto → banda oscura con precio → pie verde con contacto.
 */
export function CoverPageElegant({
  coverPhotoUrl,
  logoUrl,
  companyName,
  bannerHeadline,
  priceDisplay,
  detailLine,
  contactName,
  contactSubtitle,
  contactPhotoUrl,
  initials,
}: CoverPageElegantProps) {
  const detailParts = detailLine
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
  const displayContactSubtitle =
    contactSubtitle.trim() || "Project Consultant";

  return (
    <section
      data-proposal-section="cover"
      data-page="proposal-cover"
      className="cover-page-elegant relative isolate box-border overflow-hidden bg-[#aecbe2] font-sans"
      style={{
        width: "210mm",
        /* 296.5mm: margen de seguridad para Paged.js (297mm exacto a veces parte en 2 hojas por redondeo). */
        height: "296.5mm",
        maxWidth: "210mm",
        maxHeight: "296.5mm",
        margin: 0,
        padding: 0,
      }}
    >
      <div className="absolute inset-0 z-0 bg-linear-to-b from-[#d8f0ff] via-[#a7d3f4] to-[#8cb6d5]" />

      {/* Logo / marca arriba, limpio sobre cielo. */}
      <div
        className="elegant-cover-header-bar absolute left-0 right-0 top-0 z-30 flex items-center justify-center gap-x-[3.2mm] overflow-visible px-[10mm] text-center"
        style={{ height: TOP_BRAND_HEIGHT }}
      >
        <div
          aria-hidden="true"
          className="elegant-cover-header-glass pointer-events-none absolute inset-x-0 top-0 z-0"
          style={{ ...headerGlassDark, height: `calc(${TOP_BRAND_HEIGHT} + 14mm)` }}
        />
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="relative z-10 max-h-[18mm] w-auto max-w-[45mm] shrink-0 object-contain"
          />
        ) : (
          <div className="relative z-10 grid h-[16mm] w-[16mm] shrink-0 place-items-center bg-[#79b642] text-[5mm] font-black leading-none text-white">
            {companyName.slice(0, 2).toUpperCase()}
          </div>
        )}
        <p
          className="relative z-10 line-clamp-2 max-w-[92mm] text-left font-black uppercase leading-[0.98] tracking-[0.03em] text-white drop-shadow-sm"
          style={{ fontSize: COVER_COMPANY_NAME_FONT_MM }}
        >
          {companyName}
        </p>
      </div>

      {/* Imagen principal del proyecto/casa. */}
      <div
        className="absolute left-0 right-0 z-10 overflow-hidden"
        style={{
          top: 0,
          bottom: `calc(${FOOTER_GREEN_HEIGHT} + ${PRICE_BAND_HEIGHT} - 10mm)`,
        }}
      >
        {coverPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverPhotoUrl}
            alt=""
            className="h-full w-full object-cover object-center"
          />
        ) : (
          <div className="flex h-full items-end justify-center px-[10mm] pb-[2mm]">
            <div className="h-[64mm] w-[178mm] bg-linear-to-t from-[#444a40] via-[#e8e5dc] to-[#f7f4ea] shadow-[0_18px_40px_rgba(28,38,48,0.18)]" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-[32mm] bg-linear-to-t from-[rgba(25,31,35,0.64)] to-transparent" />
      </div>

      {/* Banda oscura con precio. */}
      <div
        className="elegant-cover-price-band absolute left-0 right-0 z-20 flex flex-col items-center justify-center overflow-visible px-[8mm] py-[4mm] text-center text-white"
        style={{
          bottom: FOOTER_GREEN_HEIGHT,
          height: PRICE_BAND_HEIGHT,
        }}
      >
        <div
          aria-hidden="true"
          className="elegant-cover-price-glass pointer-events-none absolute bottom-0 left-0 right-0 top-[-24mm] z-0"
          style={{
            ...priceBandDark,
          }}
        />
        <p className="relative z-10 text-[5.2mm] font-black uppercase leading-none tracking-[0.02em] text-white">
          {bannerHeadline}
        </p>
        <p
          className="relative z-10 mt-[4mm] font-black leading-none tracking-tight text-[#f6fff2]"
          style={{ fontSize: COVER_PRICE_FONT_MM, lineHeight: 1 }}
        >
          {priceDisplay}
        </p>
        {detailParts.length > 0 ? (
          <div className="relative z-10 mt-[8mm] flex max-w-[190mm] flex-wrap items-center justify-center gap-x-[5mm] gap-y-[2mm] text-[4.1mm] font-extrabold leading-none text-white">
            {detailParts.map((part, index) => (
              <div key={`${part}-${index}`} className="flex items-center gap-x-[5mm]">
                {index > 0 ? (
                  <span className="block h-[8mm] w-[0.7mm] bg-[#8ed650]" />
                ) : null}
                <span>{part}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Pie verde: foto + nombre + cargo. */}
      <div
        className="elegant-cover-footer-bar absolute bottom-0 left-0 right-0 z-20 flex flex-row items-center justify-center overflow-hidden px-[6mm] py-[2mm]"
        style={{ height: FOOTER_GREEN_HEIGHT, backgroundColor: BUILDERS_GREEN }}
      >
        <div className="elegant-cover-footer-cluster flex max-w-[min(94%,156mm)] flex-row items-center gap-x-[5mm]">
          {contactPhotoUrl?.trim() ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={contactPhotoUrl.trim()}
              alt=""
              className="h-[18mm] w-[18mm] shrink-0 rounded-full border-2 border-white/35 object-cover object-center shadow-md"
            />
          ) : (
            <div
              className="flex h-[18mm] w-[18mm] shrink-0 items-center justify-center rounded-full border-2 border-white/35 bg-white/10 text-[5mm] font-black text-white shadow-md"
              style={{ fontFamily: "inherit" }}
            >
              {initials}
            </div>
          )}
          <div className="elegant-cover-footer-text min-w-0 flex-1 text-left">
            <div
              className="elegant-cover-contact-lock inline-block max-w-full break-inside-avoid"
              data-subtitle={displayContactSubtitle}
            >
              <div
                className="truncate font-black leading-none"
                style={{
                  color: BUILDERS_NAME_MINT,
                  fontSize: "6.4mm",
                  lineHeight: 1,
                }}
              >
                {contactName}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
