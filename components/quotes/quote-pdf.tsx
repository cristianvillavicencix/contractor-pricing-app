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
import { formatMoney, pricingDescriptions } from "@/lib/pdf-generator";

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

function CoverPage({
  doc,
  coverImageUrl,
  coverLayout,
}: {
  doc: QuoteDocument;
  coverImageUrl: string;
  coverLayout: CoverLayout;
}) {
  if (coverLayout === "full") {
    return (
      <Page size="LETTER" style={{ padding: 0, backgroundColor: c.black }}>
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
      <Page size="LETTER" style={{ padding: 0, backgroundColor: c.white }}>
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
      size="LETTER"
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

  return (
    <Document>
      {/* Cover page — full single page */}
      {coverImageUrl && (
        <CoverPage doc={doc} coverImageUrl={coverImageUrl} coverLayout={coverLayout} />
      )}

      <Page size="LETTER" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            {doc.companyLogoUrl ? (
              <Image
                src={doc.companyLogoUrl}
                style={{ height: 28, width: 100, objectFit: "contain", marginBottom: 8, objectPositionX: 0 }}
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

        {/* Customer + Project */}
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

        {/* Scope */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Scope of Work</Text>
          <View style={s.scopeBox}>
            <ScopeLines text={doc.scopeSummary} />
          </View>
        </View>

        {/* Pricing */}
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
                  <Text style={s.pricingCardDesc}>{pricingDescriptions[name]}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Included Services */}
        {doc.includedServices.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Included Services</Text>
            <View style={s.dotGrid}>
              {doc.includedServices.map((service) => (
                <View key={service} style={s.dotItem}>
                  <View style={s.dot} />
                  <Text style={s.dotText}>{service}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Warranty */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Warranty</Text>
          <View style={s.textBlock}>
            <Text style={s.textBlockContent}>{doc.warrantyText}</Text>
          </View>
        </View>

        {/* Terms */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Terms & Conditions</Text>
          <View style={s.textBlock}>
            <Text style={s.textBlockContent}>{doc.termsText}</Text>
          </View>
        </View>

        {/* Certifications */}
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

        {/* Signatures */}
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

        {/* Footer */}
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
      </Page>
    </Document>
  );
}

export async function downloadQuotePDF(
  doc: QuoteDocument,
  coverImageUrl?: string,
  coverLayout: import("@/lib/pdf-generator").CoverLayout = "full"
): Promise<void> {
  const blob = await pdf(
    <QuotePDFDocument doc={doc} coverImageUrl={coverImageUrl} coverLayout={coverLayout} />
  ).toBlob();
  const fileName = `${doc.proposalNumber} - ${doc.customerName}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
