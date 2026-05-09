import { NextResponse, type NextRequest } from "next/server";
import { chromium } from "playwright";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PdfRequestBody = {
  quoteId?: string;
  storage?: Record<string, string>;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as PdfRequestBody;
  const quoteId = body.quoteId;

  if (!quoteId) {
    return NextResponse.json({ error: "quoteId is required" }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 1600 },
    });
    /* Use print CSS from first paint so Paged.js + @page margins match the PDF engine */
    await page.emulateMedia({ media: "print" });

    await page.addInitScript((storage) => {
      for (const [key, value] of Object.entries(storage ?? {})) {
        window.localStorage.setItem(key, value as string);
      }
    }, body.storage ?? {});

    await page.goto(`${origin}/proposal/${quoteId}/print`, {
      waitUntil: "networkidle",
    });

    await page
      .waitForFunction("window.__PAGED_READY === true", null, {
        timeout: 20000,
      })
      .catch(() => undefined);

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="proposal-${quoteId}.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
}
