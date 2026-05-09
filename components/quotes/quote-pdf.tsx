"use client";

import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import type { CoverLayout, QuoteDocument } from "@/lib/pdf-generator";
import { formatMoney } from "@/lib/pdf-generator";

Font.register({
  family: "Inter",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiA.woff2",
      fontWeight: 600,
    },
  ],
});

const c = {
  black: "#111111",
  dark: "#374151",
  mid: "#6B7280",
  muted: "#9CA3AF",
  border: "#E5E7EB",
  bg: "#F9FAFB",
  white: "#FFFFFF",
};

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: c.black,
    backgroundColor: c.white,
    paddingTop: 52,
    paddingBottom: 52,
    paddingHorizontal: 56,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    marginBottom: 24,
  },
  companyName: { fontSize: 16, fontFamily: "Helvetica-Bold", color: c.black },
  companyMeta: { fontSize: 8, color: c.mid, marginTop: 4, lineHeight: 1.6 },
  proposalMetaRight: { alignItems: "flex-end" },
  proposalNumber: { fontSize: 8, color: c.mid },
  proposalDate: { fontSize: 8, color: c.mid, marginTop: 3 },
  // Section
  section: { marginBottom: 20 },
  pageTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: c.black,
    marginBottom: 16,
  },
  pageIntro: { fontSize: 9, color: c.mid, lineHeight: 1.6, marginBottom: 16 },
  sectionLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: c.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  // Two-column info
  infoGrid: { flexDirection: "row", gap: 16, marginBottom: 20 },
  infoBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: c.border,
    padding: 12,
    borderRadius: 4,
  },
  infoBoxLabel: { fontSize: 7, color: c.muted, marginBottom: 6, letterSpacing: 0.5 },
  infoLine: { fontSize: 8.5, color: c.dark, lineHeight: 1.6 },
  infoLineBold: { fontSize: 9, fontFamily: "Helvetica-Bold", color: c.black, marginBottom: 3 },
  // Scope
  scopeBox: {
    borderWidth: 1,
    borderColor: c.border,
    padding: 12,
    borderRadius: 4,
    marginBottom: 20,
  },
  scopeLine: { fontSize: 8.5, color: c.dark, lineHeight: 1.7 },
  scopeLineSpacer: { marginTop: 2 },
  // Pricing
  pricingGrid: { flexDirection: "row", gap: 8, marginBottom: 20 },
  pricingCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: c.border,
    padding: 12,
    borderRadius: 4,
  },
  pricingCardRecommended: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: c.black,
    padding: 12,
    borderRadius: 4,
    backgroundColor: c.bg,
  },
  pricingCardName: { fontSize: 8, color: c.mid, marginBottom: 2 },
  pricingCardBadge: {
    backgroundColor: c.black,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  pricingCardBadgeText: { fontSize: 6.5, color: c.white, fontFamily: "Helvetica-Bold" },
  pricingCardPrice: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: c.black,
    marginBottom: 6,
  },
  pricingCardDesc: { fontSize: 7.5, color: c.mid, lineHeight: 1.5 },
  // Services / Certifications grid
  dotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 20,
  },
  dotItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: "48%",
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: c.black,
  },
  dotText: { fontSize: 8.5, color: c.dark },
  // Text blocks
  textBlock: {
    borderWidth: 1,
    borderColor: c.border,
    padding: 12,
    borderRadius: 4,
    marginBottom: 20,
  },
  textBlockContent: { fontSize: 8, color: c.dark, lineHeight: 1.7 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photo: { width: "31%", height: 120, objectFit: "cover", borderRadius: 4 },
  photoCaption: { fontSize: 7.5, color: c.mid, lineHeight: 1.4, marginTop: 5 },
  // Signature
  signatureGrid: { flexDirection: "row", gap: 20, marginBottom: 20 },
  signatureBox: { flex: 1 },
  signatureLabel: { fontSize: 7.5, color: c.mid, marginBottom: 20 },
  signatureLine: { borderBottomWidth: 1, borderBottomColor: c.dark, marginBottom: 4 },
  signatureSubLabel: { fontSize: 7, color: c.muted },
  // Footer
  footer: {
    position: "absolute",
    bottom: 28,
    left: 56,
    right: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingTop: 10,
  },
  footerText: { fontSize: 7, color: c.muted },
  pageNumber: { fontSize: 7, color: c.muted },
});

function pdfContactInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function coverSelectedPrice(doc: QuoteDocument) {
  if (doc.selectedOption === "Good") return doc.goodPrice;
  if (doc.selectedOption === "Better") return doc.betterPrice;
  return doc.bestPrice;
}

function CoverPage({
  doc,
  coverImageUrl,
  coverLayout,
}: {
  doc: QuoteDocument;
  coverImageUrl: string;
  coverLayout: CoverLayout;
}) {
  if (coverLayout === "elegant") {
    const bannerHeadline = doc.coverBannerHeadline?.trim() || "PROPOSED INVESTMENT";
    const price = coverSelectedPrice(doc);
    const detail = [doc.customerAddress, doc.projectName]
      .filter(Boolean)
      .slice(0, 2)
      .join("  |  ");
    const displayCompanyName =
      doc.elegantCoverBusinessName?.trim() || doc.companyName;
    const displayLogoUrl =
      doc.elegantCoverLogoUrl?.trim() || doc.companyLogoUrl?.trim() || "";
    const displayPriceText =
      doc.elegantCoverPriceDisplay?.trim() || formatMoney(price);
    const displayContactName =
      doc.elegantCoverContactName?.trim() ||
      doc.contactName ||
      doc.companyName;
    const displayContactPhoto =
      doc.elegantCoverContactPhotoUrl?.trim() || doc.contactPhotoUrl?.trim() || "";
    const displayContactTitle =
      doc.elegantCoverContactJobTitle?.trim() || doc.contactTitle?.trim() || "";
    const initials = pdfContactInitials(displayContactName);

    const frostedPriceDark = {
      backgroundColor: "rgba(28, 30, 32, 0.78)",
      borderColor: "rgba(255,255,255,0.15)",
    } as const;
    const buildersGreen = "#174c36";
    const buildersNameMint = "#a7f3d0";
    /** Alturas fijas (mm→pt ~2.835): cabecera y banda de precio no crecen con el contenido. */
    const headerBarPt = 85;
    /** ~36mm pie verde: foto + nombre + cargo */
    const footerHeightPt = 102;
    const priceBandHeightPt = 147;

    const coverTitleFontPt = 36;
    const coverPriceFontPt = 42;

    return (
      <Page size="A4" style={{ padding: 0, fontFamily: "Inter" }}>
        <View style={{ width: "100%", height: "100%", position: "relative" }}>
          <Image
            src={coverImageUrl}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: headerBarPt,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 14,
              overflow: "hidden",
              backgroundColor: "rgba(22, 24, 26, 0.82)",
              borderBottomWidth: 1,
              borderBottomColor: "rgba(255,255,255,0.12)",
            }}
          >
            {displayLogoUrl ? (
              <Image
                src={displayLogoUrl}
                style={{
                  height: 46,
                  maxWidth: 140,
                  objectFit: "contain",
                  marginRight: 12,
                }}
              />
            ) : null}
            <Text
              style={{
                flexShrink: 1,
                fontSize: coverTitleFontPt,
                fontFamily: "Helvetica-Bold",
                color: "#ffffff",
                textAlign: displayLogoUrl ? "left" : "center",
                maxWidth: "82%",
                letterSpacing: 1.2,
                textTransform: "uppercase",
                lineHeight: 1.05,
              }}
            >
              {displayCompanyName}
            </Text>
          </View>
          <View
            style={{
              position: "absolute",
              bottom: footerHeightPt,
              left: 0,
              right: 0,
              height: priceBandHeightPt,
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 16,
              ...frostedPriceDark,
              borderTopWidth: 1,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                color: "#ffffff",
                textAlign: "center",
                letterSpacing: 2.2,
                textTransform: "uppercase",
                fontFamily: "Inter",
                fontWeight: 600,
                opacity: 0.95,
              }}
            >
              {bannerHeadline}
            </Text>
            <Text
              style={{
                marginTop: 8,
                fontSize: coverPriceFontPt,
                lineHeight: 1,
                color: "#ffffff",
                textAlign: "center",
                fontFamily: "Helvetica-Bold",
              }}
            >
              {displayPriceText}
            </Text>
            {detail ? (
              <Text
                style={{
                  marginTop: 10,
                  fontSize: 10,
                  lineHeight: 1.45,
                  color: "rgba(255,255,255,0.9)",
                  textAlign: "center",
                  fontFamily: "Inter",
                  maxWidth: "198mm",
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                }}
              >
                {detail}
              </Text>
            ) : null}
          </View>
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: footerHeightPt,
              backgroundColor: buildersGreen,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: 18,
              paddingVertical: 6,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", maxWidth: "185mm" }}>
              <View style={{ marginRight: 14 }}>
                {displayContactPhoto ? (
                  <Image
                    src={displayContactPhoto}
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 25,
                      borderWidth: 2,
                      borderColor: "rgba(255,255,255,0.4)",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 25,
                      borderWidth: 2,
                      borderColor: "rgba(255,255,255,0.4)",
                      backgroundColor: "rgba(255,255,255,0.1)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 13, color: "#ffffff", fontFamily: "Helvetica-Bold" }}>
                      {initials}
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ flexShrink: 1 }}>
                <Text
                  style={{
                    fontSize: 16,
                    color: buildersNameMint,
                    fontFamily: "Helvetica-Bold",
                  }}
                >
                  {displayContactName}
                </Text>
                {displayContactTitle ? (
                  <Text
                    style={{
                      marginTop: 5,
                      fontSize: 12,
                      color: "#ffffff",
                      fontWeight: 600,
                      opacity: 0.95,
                    }}
                  >
                    {displayContactTitle}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      </Page>
    );
  }

  if (coverLayout === "full") {
    return (
      <Page size="A4" style={{ padding: 0, backgroundColor: c.black }}>
        <View style={{ position: "relative", width: "100%", height: "100%" }}>
          <Image
            src={coverImageUrl}
            style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }}
          />
          {/* Gradient overlay via semi-transparent view */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "60%",
              backgroundColor: "rgba(0,0,0,0.6)",
            }}
          />
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: 52,
            }}
          >
            {doc.companyLogoUrl ? (
              <Image
                src={doc.companyLogoUrl}
                style={{ height: 32, width: 120, objectFit: "contain", marginBottom: 14, objectPositionX: 0 }}
              />
            ) : null}
            <Text style={{ fontSize: 24, color: c.white, fontFamily: "Helvetica-Bold" }}>
              {doc.companyName}
            </Text>
            <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 7 }}>
              {doc.proposalTitle}
            </Text>
            <Text style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", marginTop: 12 }}>
              Prepared for {doc.customerName}  ·  {doc.proposalNumber}
            </Text>
            <Text style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
              {doc.dateCreated}
            </Text>
          </View>
        </View>
      </Page>
    );
  }

  if (coverLayout === "half") {
    return (
      <Page size="A4" style={{ padding: 0, backgroundColor: c.white }}>
        <Image
          src={coverImageUrl}
          style={{ width: "100%", height: 320, objectFit: "cover" }}
        />
        <View style={{ padding: 52 }}>
          {doc.companyLogoUrl ? (
            <Image
              src={doc.companyLogoUrl}
              style={{ height: 36, width: 140, objectFit: "contain", marginBottom: 16, objectPositionX: 0 }}
            />
          ) : null}
          <Text style={{ fontSize: 22, fontFamily: "Helvetica-Bold", color: c.black }}>
            {doc.companyName}
          </Text>
          <Text style={{ fontSize: 12, color: c.mid, marginTop: 7 }}>
            {doc.proposalTitle}
          </Text>
          <Text style={{ fontSize: 9, color: c.muted, marginTop: 12 }}>
            Prepared for {doc.customerName}  ·  {doc.proposalNumber}
          </Text>
          <Text style={{ fontSize: 9, color: c.muted, marginTop: 4 }}>
            {doc.dateCreated}
          </Text>
        </View>
      </Page>
    );
  }

  // square
  return (
    <Page
      size="A4"
      style={{
        padding: 0,
        backgroundColor: c.white,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View style={{ alignItems: "center", padding: 52 }}>
        {doc.companyLogoUrl ? (
          <Image
            src={doc.companyLogoUrl}
            style={{ height: 40, width: 160, objectFit: "contain", marginBottom: 28 }}
          />
        ) : null}
        <Image
          src={coverImageUrl}
          style={{ width: 300, height: 300, objectFit: "cover", borderRadius: 4 }}
        />
        <Text
          style={{
            fontSize: 20,
            fontFamily: "Helvetica-Bold",
            color: c.black,
            marginTop: 28,
          }}
        >
          {doc.companyName}
        </Text>
        <Text style={{ fontSize: 11, color: c.mid, marginTop: 7 }}>
          {doc.proposalTitle}
        </Text>
        <Text style={{ fontSize: 9, color: c.muted, marginTop: 10 }}>
          Prepared for {doc.customerName}  ·  {doc.proposalNumber}
        </Text>
        <Text style={{ fontSize: 9, color: c.muted, marginTop: 4 }}>
          {doc.dateCreated}
        </Text>
      </View>
    </Page>
  );
}

function ScopeLines({ text }: { text: string }) {
  const lines = text
    ? text.split("\n").filter((l) => l.trim() !== "")
    : ["Provide and install all materials and labor as required for the above project."];

  return (
    <>
      {lines.map((line, i) => (
        <Text
          key={i}
          style={[s.scopeLine, i > 0 ? s.scopeLineSpacer : {}]}
        >
          {line}
        </Text>
      ))}
    </>
  );
}

function QuotePDFDocument({
  doc,
  coverImageUrl,
  coverLayout = "full",
}: {
  doc: QuoteDocument;
  coverImageUrl?: string;
  coverLayout?: CoverLayout;
}) {
  const companyMeta = [doc.companyPhone, doc.companyEmail, doc.companyWebsite]
    .filter(Boolean)
    .join("  ·  ");
  const visible = (section: string) => doc.sectionOverrides[section] ?? true;

  return (
    <Document>
      {coverImageUrl && visible("cover") && (
        <CoverPage doc={doc} coverImageUrl={coverImageUrl} coverLayout={coverLayout} />
      )}

      <Page size="A4" style={s.page}>
        <PdfHeader doc={doc} companyMeta={companyMeta} />
        <Text style={s.pageTitle}>Proposal Overview</Text>
        <View style={s.infoGrid}>
          <View style={s.infoBox}>
            <Text style={s.infoBoxLabel}>PREPARED FOR</Text>
            <Text style={s.infoLineBold}>{doc.customerName}</Text>
            {doc.customerAddress ? (
              <Text style={s.infoLine}>{doc.customerAddress}</Text>
            ) : null}
            {doc.customerPhone ? (
              <Text style={s.infoLine}>{doc.customerPhone}</Text>
            ) : null}
            {doc.customerEmail ? (
              <Text style={s.infoLine}>{doc.customerEmail}</Text>
            ) : null}
          </View>
          <View style={s.infoBox}>
            <Text style={s.infoBoxLabel}>PROJECT</Text>
            <Text style={s.infoLineBold}>{doc.projectName}</Text>
            {doc.trade ? <Text style={s.infoLine}>{doc.trade}</Text> : null}
            {doc.customerAddress ? (
              <Text style={s.infoLine}>{doc.customerAddress}</Text>
            ) : null}
          </View>
        </View>

        {visible("pricing") && (
          <View style={s.section}>
          <Text style={s.sectionLabel}>Pricing Options</Text>
          <View style={s.pricingGrid}>
            {(["Good", "Better", "Best"] as const).map((name) => {
              const price =
                name === "Good"
                  ? doc.goodPrice
                  : name === "Better"
                    ? doc.betterPrice
                    : doc.bestPrice;
              const isRecommended = name === "Better";
              const cardStyle = isRecommended ? s.pricingCardRecommended : s.pricingCard;

              return (
                <View key={name} style={cardStyle}>
                  {isRecommended ? (
                    <View style={s.pricingCardBadge}>
                      <Text style={s.pricingCardBadgeText}>RECOMMENDED</Text>
                    </View>
                  ) : (
                    <Text style={s.pricingCardName}>{name}</Text>
                  )}
                  <Text style={s.pricingCardPrice}>{formatMoney(price)}</Text>
                  <Text style={s.pricingCardDesc}>{doc.pricingDescriptions[name]}</Text>
                </View>
              );
            })}
          </View>
          </View>
        )}

        <PdfFooter doc={doc} />
      </Page>

      {visible("scopeOfWork") && (
        <Page size="A4" style={s.page}>
          <PdfHeader doc={doc} companyMeta={companyMeta} />
          <Text style={s.pageTitle}>Scope of Work</Text>
          <View style={s.scopeBox}>
            <ScopeLines text={doc.scopeSummary} />
          </View>
          <PdfFooter doc={doc} />
        </Page>
      )}

      {visible("existingConditions") &&
        chunkPdfPhotos(
          doc.existingPhotos,
          doc.sectionLayouts.existingConditionPhotos ?? "twoColumns"
        ).map((photoGroup, pageIndex) => {
          const photoLayout =
            doc.sectionLayouts.existingConditionPhotos ?? "twoColumns";

          return (
            <Page key={`photos-${pageIndex}`} size="A4" style={s.page}>
              <PdfHeader doc={doc} companyMeta={companyMeta} />
              <Text style={s.pageTitle}>Existing Conditions</Text>
              <Text style={s.pageIntro}>
                Photos and site observations included with this proposal.
              </Text>
              <View
                style={
                  photoLayout === "one" || photoLayout === "twoStacked"
                    ? { gap: 12 }
                    : s.photoGrid
                }
              >
                {photoGroup.map((photo, index) => {
                  const globalIndex = getPdfPhotoGlobalIndex(
                    pageIndex,
                    index,
                    photoLayout
                  );
                  const caption =
                    doc.existingPhotoCaptions[globalIndex] ||
                    `Photo ${globalIndex + 1}`;

                  return (
                    <View key={`${pageIndex}-${index}`} style={getPdfPhotoWrapStyle(photoLayout)}>
                      <Image src={photo} style={getPdfPhotoStyle(photoLayout)} />
                      <Text style={s.photoCaption}>{caption}</Text>
                    </View>
                  );
                })}
              </View>
              <PdfFooter doc={doc} />
            </Page>
          );
        })}

      {doc.includedServices.length > 0 && visible("scopeOfWork") && (
        <Page size="A4" style={s.page}>
          <PdfHeader doc={doc} companyMeta={companyMeta} />
          <Text style={s.pageTitle}>Included Services</Text>
            <Text style={s.sectionLabel}>Included Services</Text>
            <View style={s.dotGrid}>
              {doc.includedServices.map((service) => (
                <View key={service} style={s.dotItem}>
                  <View style={s.dot} />
                  <Text style={s.dotText}>{service}</Text>
                </View>
              ))}
            </View>
          <PdfFooter doc={doc} />
        </Page>
      )}

      {visible("warranty") && (
        <Page size="A4" style={s.page}>
          <PdfHeader doc={doc} companyMeta={companyMeta} />
          <Text style={s.pageTitle}>Warranty</Text>
          <Text style={s.sectionLabel}>Warranty</Text>
          <View style={s.textBlock}>
            <Text style={s.textBlockContent}>{doc.warrantyText}</Text>
          </View>
          <PdfFooter doc={doc} />
        </Page>
      )}

      {visible("terms") && (
        <Page size="A4" style={s.page}>
          <PdfHeader doc={doc} companyMeta={companyMeta} />
          <Text style={s.pageTitle}>Terms & Conditions</Text>
          <Text style={s.sectionLabel}>Terms & Conditions</Text>
          <View style={s.textBlock}>
            <Text style={s.textBlockContent}>{doc.termsText}</Text>
          </View>
          <PdfFooter doc={doc} />
        </Page>
      )}

      {(doc.certifications.length > 0 || visible("acceptance")) && (
        <Page size="A4" style={s.page}>
          <PdfHeader doc={doc} companyMeta={companyMeta} />
          <Text style={s.pageTitle}>Authorization</Text>
          {doc.certifications.length > 0 && (
            <View style={s.section}>
            <Text style={s.sectionLabel}>Certifications & Credentials</Text>
            <View style={s.dotGrid}>
              {doc.certifications.map((cert) => (
                <View key={cert} style={s.dotItem}>
                  <View style={s.dot} />
                  <Text style={s.dotText}>{cert}</Text>
                </View>
              ))}
            </View>
            </View>
          )}

          {visible("acceptance") && (
            <View style={s.section}>
          <Text style={s.sectionLabel}>Authorization</Text>
          <View style={s.signatureGrid}>
            <View style={s.signatureBox}>
              <Text style={s.signatureLabel}>Customer Signature</Text>
              <View style={s.signatureLine} />
              <Text style={s.signatureSubLabel}>Signature  ·  Date</Text>
            </View>
            <View style={s.signatureBox}>
              <Text style={s.signatureLabel}>Contractor Signature</Text>
              <View style={s.signatureLine} />
              <Text style={s.signatureSubLabel}>
                {doc.companyName}  ·  Date
              </Text>
            </View>
          </View>
            </View>
          )}
          <PdfFooter doc={doc} />
        </Page>
      )}
    </Document>
  );
}

function PdfHeader({
  doc,
  companyMeta,
}: {
  doc: QuoteDocument;
  companyMeta: string;
}) {
  return (
    <View style={s.header}>
      <View>
        {doc.companyLogoUrl ? (
          <Image
            src={doc.companyLogoUrl}
            style={{
              height: 28,
              width: 100,
              objectFit: "contain",
              marginBottom: 8,
              objectPositionX: 0,
            }}
          />
        ) : null}
        <Text style={s.companyName}>{doc.companyName}</Text>
        {companyMeta ? <Text style={s.companyMeta}>{companyMeta}</Text> : null}
      </View>
      <View style={s.proposalMetaRight}>
        <Text style={s.companyName}>{doc.proposalTitle}</Text>
        <Text style={s.proposalNumber}>{doc.proposalNumber}</Text>
        <Text style={s.proposalDate}>
          Created {doc.dateCreated}  ·  Expires {doc.expiresAt}
        </Text>
      </View>
    </View>
  );
}

function PdfFooter({ doc }: { doc: QuoteDocument }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>
        {doc.companyTagline || doc.companyFooterText || doc.companyName}
      </Text>
      <Text
        style={s.pageNumber}
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  );
}

function chunkPdfPhotos(photos: string[], photoLayout: string) {
  const perPage =
    photoLayout === "one" ? 1 : photoLayout === "grid" ? 4 : 2;
  const groups: string[][] = [];

  for (let index = 0; index < photos.length; index += perPage) {
    groups.push(photos.slice(index, index + perPage));
  }

  return groups;
}

function getPdfPhotoStyle(photoLayout: string) {
  if (photoLayout === "one") {
    return { width: "100%", height: 500, objectFit: "cover" as const };
  }

  if (photoLayout === "twoStacked") {
    return { width: "100%", height: 240, objectFit: "cover" as const };
  }

  if (photoLayout === "grid") {
    return { width: "48%", height: 170, objectFit: "cover" as const };
  }

  return { width: "48%", height: 360, objectFit: "cover" as const };
}

function getPdfPhotoWrapStyle(photoLayout: string) {
  if (photoLayout === "one" || photoLayout === "twoStacked") {
    return { width: "100%" };
  }

  return { width: "48%" };
}

function getPdfPhotoGlobalIndex(
  pageIndex: number,
  index: number,
  photoLayout: string
) {
  const perPage =
    photoLayout === "one" ? 1 : photoLayout === "grid" ? 4 : 2;
  return pageIndex * perPage + index;
}

export async function downloadQuotePDF(
  doc: QuoteDocument,
  coverImageUrl?: string,
  coverLayout: import("@/lib/pdf-generator").CoverLayout = "full"
): Promise<void> {
  const quoteBlob = await pdf(
    <QuotePDFDocument doc={doc} coverImageUrl={coverImageUrl} coverLayout={coverLayout} />
  ).toBlob();
  const blob = await appendCredentialDocuments(quoteBlob, doc);
  const fileName = `${doc.proposalNumber} - ${doc.customerName}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

async function appendCredentialDocuments(
  quoteBlob: Blob,
  doc: QuoteDocument
) {
  const documents = doc.certificationDocuments.filter(
    (document) => document.dataUrl
  );

  if (documents.length === 0) return quoteBlob;

  const { PDFDocument: PDFLibDocument } = await import("pdf-lib");
  const mergedPdf = await PDFLibDocument.load(await quoteBlob.arrayBuffer());

  for (const document of documents) {
    const fileBytes = dataUrlToUint8Array(document.dataUrl);

    try {
      if (isPdfDocument(document)) {
        const attachedPdf = await PDFLibDocument.load(fileBytes);
        const pages = await mergedPdf.copyPages(
          attachedPdf,
          attachedPdf.getPageIndices()
        );
        pages.forEach((page) => mergedPdf.addPage(page));
        continue;
      }

      if (isImageDocument(document)) {
        const image = document.fileType.includes("png")
          ? await mergedPdf.embedPng(fileBytes)
          : await mergedPdf.embedJpg(fileBytes);
        const page = mergedPdf.addPage();
        const { width, height } = page.getSize();
        const margin = 48;
        const scale = Math.min(
          (width - margin * 2) / image.width,
          (height - margin * 2) / image.height
        );

        page.drawImage(image, {
          x: (width - image.width * scale) / 2,
          y: (height - image.height * scale) / 2,
          width: image.width * scale,
          height: image.height * scale,
        });
      }
    } catch {
      // If a browser cannot read a specific credential file, keep the quote usable
      // and continue with the remaining documents.
    }
  }

  const mergedBytes = await mergedPdf.save();
  const mergedBuffer = mergedBytes.buffer.slice(
    mergedBytes.byteOffset,
    mergedBytes.byteOffset + mergedBytes.byteLength
  ) as ArrayBuffer;
  return new Blob([mergedBuffer], { type: "application/pdf" });
}

function dataUrlToUint8Array(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function isPdfDocument(document: QuoteDocument["certificationDocuments"][number]) {
  return (
    document.fileType === "application/pdf" ||
    document.dataUrl.startsWith("data:application/pdf")
  );
}

function isImageDocument(
  document: QuoteDocument["certificationDocuments"][number]
) {
  return (
    document.fileType.includes("png") ||
    document.fileType.includes("jpeg") ||
    document.fileType.includes("jpg") ||
    document.dataUrl.startsWith("data:image/")
  );
}
