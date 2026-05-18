import { NextResponse, type NextRequest } from "next/server";
import { chromium } from "playwright";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Quote } from "@/lib/app-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const quoteId = new URL(request.url).searchParams.get("quoteId");
  if (!quoteId) {
    return NextResponse.json({ error: "quoteId is required" }, { status: 400 });
  }

  // Load quote via admin client (bypasses RLS, no cookie needed for a GET download)
  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const { data: row, error } = await admin
    .from("quotes")
    .select("id, data")
    .eq("id", quoteId)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const quote = { ...(row.data as Quote), id: row.id };
  const html = quote.proposalDocument;

  if (!html) {
    return NextResponse.json(
      { error: "This proposal has no TipTap content yet. Save it first." },
      { status: 400 }
    );
  }

  const fileName = `${quote.proposalNumber ?? `proposal-${quoteId.slice(-6).toUpperCase()}`}.pdf`;

  const fullHtml = buildPrintHtml(html, quote);

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.emulateMedia({ media: "print" });
    await page.setContent(fullHtml, { waitUntil: "networkidle" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "18mm", right: "20mm", bottom: "20mm", left: "20mm" },
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } finally {
    await browser.close();
  }
}

function buildPrintHtml(body: string, quote: Quote): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${quote.proposalNumber ?? "Proposal"} – ${quote.customerName}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }

    @page {
      size: A4;
      margin: 18mm 20mm 20mm;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.65;
      color: #1a1a1a;
    }

    .proposal-cover {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    h1 {
      font-size: 22pt;
      font-weight: 700;
      color: #213343;
      margin: 0 0 6px;
      line-height: 1.2;
    }

    h2 {
      font-size: 14pt;
      font-weight: 700;
      color: #213343;
      margin: 28px 0 8px;
      padding-bottom: 4px;
      border-bottom: 2px solid #e5e7eb;
      page-break-after: avoid;
      break-after: avoid;
    }

    h3 {
      font-size: 11pt;
      font-weight: 600;
      color: #374151;
      margin: 18px 0 6px;
      page-break-after: avoid;
      break-after: avoid;
    }

    p { margin: 0 0 10px; }
    p:last-child { margin-bottom: 0; }

    ul, ol {
      padding-left: 1.4em;
      margin: 0 0 10px;
    }

    li { margin-bottom: 4px; }

    hr {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 20px 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0 0 16px;
      font-size: 10.5pt;
      page-break-inside: avoid;
    }

    th, td {
      padding: 8px 10px;
      text-align: left;
      border: 1px solid #e5e7eb;
    }

    th {
      background: #213343 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color: white !important;
      font-weight: 600;
    }

    tr:nth-child(even) td {
      background: #f9fafb !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    a { color: #2563eb; text-decoration: underline; }

    img { max-width: 100%; height: auto; }

    /* Highlight */
    mark {
      background: #fef08a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  </style>
</head>
<body>
  ${body}
</body>
</html>`;
}
