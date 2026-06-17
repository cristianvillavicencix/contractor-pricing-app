import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PdfRequestBody = {
  quoteId?: string;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as PdfRequestBody;
  const quoteId = body.quoteId;

  if (!quoteId) {
    return NextResponse.json({ error: "quoteId is required" }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const isVercel = Boolean(process.env.VERCEL);
  const browser = isVercel
    ? await launchBrowserForVercel()
    : await launchBrowserForLocal();

  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 1600 },
    });
    /* Use print CSS from first paint so Paged.js + @page margins match the PDF engine */
    await page.emulateMedia({ media: "print" });

    // Forward auth cookies so the print page can load data from Supabase (RLS-protected).
    const cookies = request.cookies.getAll();
    if (cookies.length > 0) {
      await page.context().addCookies(
        cookies.map((c) => ({
          name: c.name,
          value: c.value,
          domain: new URL(origin).hostname,
          path: "/",
        }))
      );
    }

    await page.goto(`${origin}/proposal/${quoteId}/print`, {
      waitUntil: "networkidle",
    });

    // Give Paged.js time to finish paginating. We avoid waitForFunction here because
    // the Playwright and Playwright-core Page typings diverge on this overload.
    await page.waitForTimeout(1500);

    const pagedPageCount = await page
      .evaluate(() => {
        const win = window as Window & { __PAGED_PAGE_COUNT?: number };
        return (
          win.__PAGED_PAGE_COUNT ??
          document.querySelectorAll(".paged-proposal-output .pagedjs_page").length
        );
      })
      .catch(() => 0);

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      pageRanges: pagedPageCount > 0 ? `1-${pagedPageCount}` : undefined,
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

async function launchBrowserForVercel() {
  const [{ chromium }, chromiumPackModule] = await Promise.all([
    import("playwright-core"),
    import("@sparticuz/chromium"),
  ]);
  const chromiumPack = chromiumPackModule.default;
  return chromium.launch({
    args: chromiumPack.args,
    executablePath: await chromiumPack.executablePath(),
    headless: true,
  });
}

async function launchBrowserForLocal() {
  const { chromium } = await import("playwright");
  return chromium.launch({ headless: true });
}
