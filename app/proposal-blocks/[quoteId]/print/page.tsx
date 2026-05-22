/**
 * Print preview page for the block builder.
 *
 * Shows exactly what the PDF route will render so you can review it before
 * exporting. Use Cmd+P / Ctrl+P from this page to print, or click "↓ PDF"
 * to download via Playwright.
 *
 * Route: /proposal-blocks/<quoteId>/print
 * Auth:  requires a valid user session (enforced by proxy.ts middleware)
 */

import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildBlocksPrintHtml, BLOCKS_PRINT_CSS } from "@/lib/proposal-blocks";
import type { Quote } from "@/lib/app-data";
import type { ProposalBlock } from "@/types/proposal-blocks";
import { PrintButton } from "./PrintButton";

interface PageProps {
  params: Promise<{ quoteId: string }>;
}

// Screen-only styles (hidden when printing)
const SCREEN_CSS = `
  @media print {
    .preview-toolbar { display: none !important; }
    .blk-print-wrap  { padding-top: 0 !important; }
  }
  .preview-toolbar {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 20px;
    height: 50px;
    background: #1a1814;
    font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
    font-size: 13px;
    box-shadow: 0 2px 12px rgba(0,0,0,.3);
  }
  .preview-toolbar a {
    color: #c9a227;
    text-decoration: none;
    font-weight: 600;
    white-space: nowrap;
  }
  .tb-title {
    flex: 1;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #e8e4d9;
    font-size: 13px;
  }
  .tb-badge {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    padding: 3px 10px;
    border-radius: 99px;
    border: 1px solid rgba(201,162,39,.4);
    color: #c9a227;
    white-space: nowrap;
  }
  .tb-pdf-link {
    padding: 7px 14px;
    border-radius: 7px;
    border: 1px solid rgba(255,255,255,.18);
    color: #e8e4d9 !important;
    font-size: 12.5px;
    font-weight: 600;
    text-decoration: none !important;
    white-space: nowrap;
  }
  .tb-print-btn {
    padding: 7px 16px;
    border-radius: 7px;
    border: none;
    background: #c9a227;
    color: #1a1814;
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
  }
  .blk-print-wrap {
    padding-top: 58px;
    min-height: 100vh;
    background: #e4e2de;
  }
  .blk-page {
    max-width: 794px;
    margin: 0 auto;
    background: #fff;
    padding: 60px 72px 72px;
    box-shadow: 0 3px 24px rgba(0,0,0,.22), 0 0 0 1px rgba(0,0,0,.06);
    min-height: 1122px;
  }
  @media print {
    .blk-print-wrap { background: #fff; padding-top: 0; }
    .blk-page { box-shadow: none; max-width: 100%; padding: 0; min-height: unset; }
  }
`;

export default async function PrintPreviewPage({ params }: PageProps) {
  const { quoteId } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: row, error } = await supabase
    .from("quotes")
    .select("id, data")
    .eq("id", quoteId)
    .maybeSingle();

  if (error || !row) {
    notFound();
  }

  const quote: Quote = { ...(row.data as Quote), id: row.id };
  const rawBlocks = (quote as { proposalBlocks?: unknown[] }).proposalBlocks;

  if (!Array.isArray(rawBlocks) || rawBlocks.length === 0) {
    return (
      <div style={{ fontFamily: "sans-serif", padding: 48 }}>
        <h2>No block content</h2>
        <p>
          This proposal has not been saved in the Block Builder yet.
        </p>
        <p>
          <a href={`/quotes/builder?quoteId=${quoteId}`}>Open in Block Builder →</a>
        </p>
      </div>
    );
  }

  const blocks = rawBlocks as ProposalBlock[];
  const enabledBlocks = blocks.filter((b) => b.enabled).sort((a, b) => a.position - b.position);

  if (enabledBlocks.length === 0) {
    return (
      <div style={{ fontFamily: "sans-serif", padding: 48 }}>
        <h2>All blocks are disabled</h2>
        <p>Enable at least one block in the Block Builder before previewing.</p>
        <p>
          <a href={`/quotes/builder?quoteId=${quoteId}`}>← Back to Block Builder</a>
        </p>
      </div>
    );
  }

  const title = `${quote.proposalNumber ?? "Proposal"} — ${quote.customerName ?? ""}`;

  // Build the body HTML — same function used by the PDF route
  const bodyHtml = buildPrintBodyHtml(enabledBlocks, quote);

  return (
    <>
      {/* Inject both the print CSS and the screen-wrapper CSS */}
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: BLOCKS_PRINT_CSS + SCREEN_CSS }} />

      {/* Screen-only toolbar */}
      <div className="preview-toolbar">
        <a href={`/quotes/builder?quoteId=${quoteId}`}>← Builder</a>
        <span className="tb-title">{title}</span>
        <span className="tb-badge">
          {enabledBlocks.length}/{blocks.length} blocks
        </span>
        <a
          href={`/api/proposals/pdf-blocks?quoteId=${quoteId}`}
          className="tb-pdf-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          ↓ PDF
        </a>
        <PrintButton className="tb-print-btn" />
      </div>

      {/* Print content — A4 page simulation on screen */}
      <div className="blk-print-wrap">
        <div
          className="blk-page"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Inline block → HTML builder (extracts only the body parts, no <html> wrapper)
// ---------------------------------------------------------------------------

function buildPrintBodyHtml(blocks: ProposalBlock[], quote: Quote): string {
  // buildBlocksPrintHtml returns a full <!DOCTYPE html>…</html> document.
  // We call it per-block and strip the wrapper to get just the inner content.
  return blocks
    .map((block) => {
      const full = buildBlocksPrintHtml([block], quote);
      const open = '<div class="blk-page">';
      const close = "</div>\n</body>";
      const start = full.indexOf(open);
      const end = full.lastIndexOf(close);
      if (start === -1 || end === -1) return "";
      return full.slice(start + open.length, end).trim();
    })
    .join("\n");
}
