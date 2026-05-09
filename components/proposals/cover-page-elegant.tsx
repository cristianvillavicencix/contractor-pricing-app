"use client";

import type { CSSProperties } from "react";
import type { Quote } from "@/lib/app-data";

export const ELEGANT_COVER_DEFAULT_HEADLINE = "PROPOSED INVESTMENT";

/** Pie verde: foto + nombre + cargo del contacto. */
const FOOTER_GREEN_HEIGHT = "36mm";

/** Barra superior: altura fija para que no empuje el resto del layout (todo va absolute sobre la foto). */
const HEADER_BAR_HEIGHT = "30mm";

/** Banda de precio: altura fija anclada encima del pie verde. */
const PRICE_BAND_HEIGHT = "52mm";

/** Monto en la banda oscura. */
const COVER_PRICE_FONT_MM = "10.8mm";
/** Nombre empresa en cabecera — un poco menor que el precio. */
const COVER_COMPANY_NAME_FONT_MM = "9.2mm";

const frostedPriceDark: CSSProperties = {
  backgroundColor: "rgba(28, 30, 32, 0.78)",
  WebkitBackdropFilter: "blur(16px)",
};

/** Barra superior: blur + vidrio oscuro (“negrito”), alineado con la banda del precio. */
const frostedHeaderDark: CSSProperties = {
  backgroundColor: "rgba(22, 24, 26, 0.82)",
  WebkitBackdropFilter: "blur(18px)",
};

/** Verde bosque cercano a la referencia */
const BUILDERS_GREEN = "#174c36";

/** Nombre sobre pie verde (verde menta claro, como la referencia). */
const BUILDERS_NAME_MINT = "#a7f3d0";

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
  const parts = [quote.customerAddress, quote.projectName].filter(
    (p): p is string => Boolean(p && p.trim())
  );
  return parts.slice(0, 2).join("  |  ");
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
 * Imagen → logo + marca arriba sobre el cielo → banda oscura blur (precio + detalle) → pie verde con foto redonda y texto centrado.
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
      {coverPhotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverPhotoUrl}
          alt=""
          className="absolute inset-0 z-0 block h-full w-full object-cover object-center"
        />
      ) : (
        <div className="absolute inset-0 z-0 bg-linear-to-b from-[#87b8e5] via-[#b8d4ec] to-[#dfeaf3]" />
      )}

      {/* Cabecera: blur + vidrio oscuro; logo y nombre en blanco / contraste. */}
      <div
        className="elegant-cover-header-bar absolute left-0 right-0 top-0 z-30 flex flex-row flex-nowrap items-center justify-center gap-x-[3.5mm] overflow-hidden border-b border-white/12 px-[4mm] backdrop-blur-[18px]"
        style={{ ...frostedHeaderDark, height: HEADER_BAR_HEIGHT }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="max-h-[21mm] w-auto max-w-[38%] shrink-0 object-contain drop-shadow-md"
          />
        ) : null}
        <p
          className={`line-clamp-2 min-w-0 max-w-[min(85%,155mm)] font-bold uppercase leading-[0.98] tracking-[0.06em] text-white drop-shadow-md ${
            logoUrl ? "text-left" : "text-center"
          }`}
          style={{ fontSize: COVER_COMPANY_NAME_FONT_MM }}
        >
          {companyName}
        </p>
      </div>

      {/* Banda oscura blur: altura fija, pegada encima del pie verde */}
      <div
        className="elegant-cover-price-band relative absolute left-0 right-0 z-10 flex flex-col items-center justify-center overflow-hidden px-[5mm] py-[4mm] text-center text-white backdrop-blur-[14px]"
        style={{
          ...frostedPriceDark,
          bottom: FOOTER_GREEN_HEIGHT,
          height: PRICE_BAND_HEIGHT,
          top: "auto",
        }}
      >
        {/* Color blend across the whole band: green at bottom → dark at top (reduces contrast). */}
        <div
          aria-hidden="true"
          className="elegant-cover-price-fade pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "linear-gradient(to top, rgba(23, 76, 54, 0.62) 0%, rgba(28, 30, 32, 0.58) 55%, rgba(28, 30, 32, 0.82) 100%)",
            WebkitBackdropFilter: "blur(20px)",
            backdropFilter: "blur(20px)",
          }}
        />
        <p className="relative z-10 text-[11px] font-semibold uppercase tracking-[0.18em] text-white sm:text-[12px]">
          {bannerHeadline}
        </p>
        <p
          className="relative z-10 mt-[2mm] font-bold leading-none tracking-tight text-white"
          style={{ fontSize: COVER_PRICE_FONT_MM, lineHeight: 1 }}
        >
          {priceDisplay}
        </p>
        {detailLine ? (
          <p className="relative z-10 mt-[2.5mm] max-w-[198mm] text-[10px] uppercase leading-relaxed tracking-wide text-white/90 sm:text-[11px]">
            {detailLine}
          </p>
        ) : null}
      </div>

      {/* Pie verde: foto + nombre + cargo en un solo cluster (evita que Paged.js parta el cargo a la página 2). */}
      <div
        className="elegant-cover-footer-bar absolute bottom-0 left-0 right-0 z-20 flex flex-row items-center justify-center overflow-hidden px-[6mm] py-[2mm]"
        style={{ height: FOOTER_GREEN_HEIGHT, backgroundColor: BUILDERS_GREEN }}
      >
        <div className="elegant-cover-footer-cluster flex max-w-[min(94%,185mm)] flex-row items-center gap-x-[4.5mm]">
          {contactPhotoUrl?.trim() ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={contactPhotoUrl.trim()}
              alt=""
              className="h-[13mm] w-[13mm] shrink-0 rounded-full border-2 border-white/40 object-cover object-center shadow-md"
            />
          ) : (
            <div
              className="flex h-[13mm] w-[13mm] shrink-0 items-center justify-center rounded-full border-2 border-white/40 bg-white/10 text-[11px] font-bold text-white shadow-md"
              style={{ fontFamily: "inherit" }}
            >
              {initials}
            </div>
          )}
          {/* Un solo <p>: dos párrafos hermanos suelen fragmentarse en Paged.js y el cargo acaba en la hoja 2. */}
          <div className="elegant-cover-footer-text min-w-0 flex-1 text-left">
            <p
              className="text-[15px] font-bold leading-snug text-white sm:text-[16px]"
              style={{ color: BUILDERS_NAME_MINT }}
            >
              {contactName}
              {contactSubtitle?.trim() ? (
                <>
                  <br />
                  <span className="mt-[0.5mm] block line-clamp-2 text-[11px] font-semibold leading-snug tracking-wide text-white/95 sm:text-[12px]">
                    {contactSubtitle.trim()}
                  </span>
                </>
              ) : null}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
