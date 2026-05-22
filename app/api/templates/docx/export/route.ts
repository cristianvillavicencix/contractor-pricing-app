import { NextResponse } from "next/server";
import HTMLtoDOCX from "html-to-docx";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    html?: string;
    title?: string;
    footer?: string;
  };

  if (!body.html) {
    return NextResponse.json({ error: "Missing document HTML." }, { status: 400 });
  }

  const normalizedHtml = body.html
    .replaceAll('data-page-break="true"', 'class="page-break"')
    .replaceAll("tpl-page-break", "page-break");

  const docx = await HTMLtoDOCX(
    normalizedHtml,
    "<p></p>",
    {
      title: body.title ?? "Proposal Template",
      creator: "Contractor Studio",
      font: "Manrope",
      fontSize: 22,
      pageSize: { width: "8.5in", height: "11in" },
      margins: {
        top: "0.75in",
        right: "0.75in",
        bottom: "0.85in",
        left: "0.75in",
        footer: "0.45in",
      },
      footer: Boolean(body.footer),
      pageNumber: false,
      skipFirstHeaderFooter: false,
    },
    body.footer ? `<p style="font-size:10pt;color:#777;">${escapeHtml(body.footer)}</p>` : "<p></p>"
  );

  const bytes = docx instanceof Blob ? new Uint8Array(await docx.arrayBuffer()) : new Uint8Array(docx);

  return new Response(bytes, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safeFileName(body.title ?? "proposal-template")}.docx"`,
    },
  });
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function safeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "proposal-template";
}
