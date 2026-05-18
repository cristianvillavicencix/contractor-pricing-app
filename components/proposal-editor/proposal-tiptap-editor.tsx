"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { useEffect, useRef, useState } from "react";
import { ProposalToolbar } from "./toolbar";
import { SectionsSidebar, DEFAULT_SECTIONS, type SidebarSection } from "./sections-sidebar";
import type { Quote, AppSettings } from "@/lib/app-data";
import { formatMoney } from "@/lib/app-data";
import type { ProposalTemplate } from "@/lib/proposal-templates";

type Props = {
  quote: Quote;
  settings: AppSettings;
  template?: ProposalTemplate | null;
  initialContent?: string | null;
  onChange?: (html: string, json: object, silent?: boolean) => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nl2p(text: string): string {
  return text
    .split("\n\n")
    .map((para) => `<p>${esc(para.trim()).replace(/\n/g, "<br/>")}</p>`)
    .filter((p) => p !== "<p></p>")
    .join("\n");
}

// ─── Document builder ─────────────────────────────────────────────────────────

function buildInitialHtml(
  quote: Quote,
  settings: AppSettings,
  template: ProposalTemplate | null | undefined
): string {
  const co = settings.companyProfile;
  const fmt = formatMoney;
  const t = template;

  const sections: string[] = [];

  // ── Cover ─────────────────────────────────────────────────────────────────
  const tagline = t?.cover?.tagline ?? "Professional Solutions — Licensed, Insured & Warranted";
  sections.push(`
<div class="proposal-cover" data-section="cover" style="
  background:#213343;
  color:white;
  padding:56px 48px 48px;
  margin-bottom:32px;
  page-break-after:always;
  break-after:page;
">
  <p style="font-size:12pt;letter-spacing:0.12em;text-transform:uppercase;opacity:0.7;margin:0 0 8px;">${esc(co.businessName || "Your Company")}</p>
  <h1 style="font-size:36pt;font-weight:800;color:white;margin:0 0 6px;border:none;">PROPOSAL</h1>
  <p style="font-size:13pt;opacity:0.8;margin:0 0 32px;">${esc(tagline)}</p>

  <div style="border-top:1px solid rgba(255,255,255,0.2);padding-top:24px;display:flex;gap:48px;flex-wrap:wrap;">
    <div>
      <p style="font-size:9pt;text-transform:uppercase;letter-spacing:0.1em;opacity:0.6;margin:0 0 4px;">Prepared for</p>
      <p style="font-size:14pt;font-weight:700;margin:0 0 4px;">${esc(quote.customerName)}</p>
      ${quote.customerAddress ? `<p style="font-size:10pt;opacity:0.8;margin:0;">${esc(quote.customerAddress)}</p>` : ""}
      ${quote.customerPhone ? `<p style="font-size:10pt;opacity:0.7;margin:0;">${esc(quote.customerPhone)}</p>` : ""}
    </div>
    <div>
      <p style="font-size:9pt;text-transform:uppercase;letter-spacing:0.1em;opacity:0.6;margin:0 0 4px;">Prepared by</p>
      <p style="font-size:14pt;font-weight:700;margin:0 0 4px;">${esc(co.businessName || "")}</p>
      ${co.contactName ? `<p style="font-size:10pt;opacity:0.8;margin:0;">${esc(co.contactName)}</p>` : ""}
      ${co.phone ? `<p style="font-size:10pt;opacity:0.7;margin:0;">${esc(co.phone)}</p>` : ""}
      ${co.email ? `<p style="font-size:10pt;opacity:0.7;margin:0;">${esc(co.email)}</p>` : ""}
    </div>
    ${quote.proposalNumber ? `
    <div>
      <p style="font-size:9pt;text-transform:uppercase;letter-spacing:0.1em;opacity:0.6;margin:0 0 4px;">Proposal #</p>
      <p style="font-size:14pt;font-weight:700;margin:0;">${esc(quote.proposalNumber)}</p>
    </div>` : ""}
    <div>
      <p style="font-size:9pt;text-transform:uppercase;letter-spacing:0.1em;opacity:0.6;margin:0 0 4px;">Date</p>
      <p style="font-size:14pt;font-weight:700;margin:0;">${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
    </div>
  </div>
</div>`);

  // ── Executive Summary ─────────────────────────────────────────────────────
  if (!t || t.executiveSummary?.enabled !== false) {
    const es = t?.executiveSummary;
    sections.push(`
<div data-section="executiveSummary">
<h2 id="section-executiveSummary">Executive Summary</h2>
${es?.problemHeading ? `<h3>${esc(es.problemHeading)}</h3>` : ""}
${es?.problemText ? nl2p(es.problemText) : "<p>Describe the problem this proposal addresses.</p>"}
${es?.solutionHeading ? `<h3>${esc(es.solutionHeading)}</h3>` : ""}
${es?.solutionText ? nl2p(es.solutionText) : ""}
${es?.valueHeading ? `<h3>${esc(es.valueHeading)}</h3>` : ""}
${es?.valueText ? nl2p(es.valueText) : ""}
</div>`);
  }

  // ── Existing Conditions ───────────────────────────────────────────────────
  if (t?.existingConditions?.enabled !== false) {
    const ec = t?.existingConditions;
    const items = ec?.checklistItems ?? [];
    sections.push(`
<div data-section="existingConditions">
<h2 id="section-existingConditions">Existing Conditions</h2>
${ec?.introText ? nl2p(ec.introText) : ""}
${items.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("\n")}</ul>` : ""}
</div>`);
  }

  // ── Scope of Work ─────────────────────────────────────────────────────────
  if (t?.scopeOfWork?.enabled !== false) {
    const sw = t?.scopeOfWork;
    const scope = quote.scopeSummary || sw?.introText || "Describe the full scope of work here.";
    const items = sw?.items ?? [];
    sections.push(`
<div data-section="scopeOfWork">
<h2 id="section-scopeOfWork">Scope of Work</h2>
${nl2p(scope)}
${items.length ? `<ol>${items.map((i) => `<li>${esc(i)}</li>`).join("\n")}</ol>` : ""}
</div>`);
  }

  // ── Materials & Specs ─────────────────────────────────────────────────────
  if (t?.materialsSpecs?.enabled !== false) {
    const ms = t?.materialsSpecs;
    const items = ms?.items ?? [];
    sections.push(`
<div data-section="materialsSpecs">
<h2 id="section-materialsSpecs">Materials &amp; Specifications</h2>
${ms?.introText ? nl2p(ms.introText) : ""}
${items.length ? `
<table>
  <thead>
    <tr>
      <th>Category</th>
      <th>Product</th>
      <th>Brand</th>
      <th>Warranty</th>
      <th>Notes</th>
    </tr>
  </thead>
  <tbody>
    ${items.map((item) => `
    <tr>
      <td><strong>${esc(item.category ?? "")}</strong></td>
      <td>${esc(item.product ?? "")}</td>
      <td>${esc(item.brand ?? "")}</td>
      <td>${esc(item.warranty ?? "")}</td>
      <td style="font-size:9.5pt;color:#6b7280;">${esc(item.notes ?? "")}</td>
    </tr>`).join("")}
  </tbody>
</table>` : ""}
</div>`);
  }

  // ── Timeline ──────────────────────────────────────────────────────────────
  if (t?.timeline?.enabled !== false) {
    const tl = t?.timeline;
    const phases = tl?.phases ?? [];
    sections.push(`
<div data-section="timeline">
<h2 id="section-timeline">Project Timeline</h2>
${tl?.introText ? nl2p(tl.introText) : ""}
${tl?.estimatedDays ? `<p><strong>Estimated duration:</strong> ${tl.estimatedDays} day${tl.estimatedDays !== 1 ? "s" : ""}</p>` : ""}
${phases.length ? `
<table>
  <thead><tr><th style="width:30%">Phase</th><th>Description</th></tr></thead>
  <tbody>
    ${phases.map((p) => `
    <tr>
      <td><strong>${esc(p.name ?? "")}</strong></td>
      <td style="font-size:9.5pt;">${esc(p.description ?? "")}</td>
    </tr>`).join("")}
  </tbody>
</table>` : ""}
</div>`);
  }

  // ── Pricing ───────────────────────────────────────────────────────────────
  if (t?.pricing?.enabled !== false) {
    const pr = t?.pricing;
    const goodDesc = quote.good?.description || "Standard quality materials and installation";
    const betterDesc = quote.better?.description || "Enhanced materials with extended warranty";
    const bestDesc = quote.best?.description || "Premium materials — top-tier protection";

    sections.push(`
<div data-section="pricing">
<h2 id="section-pricing">Investment Options</h2>
${pr?.introText ? nl2p(pr.introText) : ""}
<table>
  <thead>
    <tr>
      <th style="width:14%">Option</th>
      <th>Description</th>
      <th style="width:18%;text-align:right;">Investment</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>✓ Good</strong></td>
      <td>${esc(goodDesc)}</td>
      <td style="text-align:right;font-weight:700;">${fmt(quote.good?.salePrice ?? 0)}</td>
    </tr>
    <tr>
      <td><strong>⭐ Better</strong></td>
      <td>${esc(betterDesc)}</td>
      <td style="text-align:right;font-weight:700;">${fmt(quote.better?.salePrice ?? 0)}</td>
    </tr>
    <tr>
      <td><strong>🏆 Best</strong></td>
      <td>${esc(bestDesc)}</td>
      <td style="text-align:right;font-weight:700;">${fmt(quote.best?.salePrice ?? 0)}</td>
    </tr>
  </tbody>
</table>
${pr?.financingText ? `<p style="font-size:9.5pt;color:#6b7280;">${esc(pr.financingText)}</p>` : ""}
${pr?.allowancesText ? `<p style="font-size:9.5pt;color:#6b7280;">${esc(pr.allowancesText)}</p>` : ""}
</div>`);
  }

  // ── Warranty ──────────────────────────────────────────────────────────────
  if (t?.warranty?.enabled !== false) {
    const w = t?.warranty;
    const workText = quote.warrantyText || w?.workmanshipText || "Describe your workmanship warranty here.";
    sections.push(`
<div data-section="warranty">
<h2 id="section-warranty">Warranty</h2>
${w?.workmanshipYears ? `<p><strong>Workmanship warranty:</strong> ${w.workmanshipYears} year${w.workmanshipYears !== 1 ? "s" : ""}</p>` : ""}
${nl2p(workText)}
${w?.manufacturerText ? nl2p(w.manufacturerText) : ""}
</div>`);
  }

  // ── Terms & Conditions ────────────────────────────────────────────────────
  if (t?.terms?.enabled !== false) {
    const termsText = quote.termsText || t?.terms?.text || "Include your standard terms and conditions here.";
    sections.push(`
<div data-section="terms">
<h2 id="section-terms">Terms &amp; Conditions</h2>
${nl2p(termsText)}
</div>`);
  }

  // ── Acceptance / Signature ────────────────────────────────────────────────
  if (t?.acceptance?.enabled !== false) {
    const ac = t?.acceptance;
    sections.push(`
<div data-section="acceptance">
<h2 id="section-acceptance">Authorization &amp; Acceptance</h2>
${ac?.contractIntroText ? nl2p(ac.contractIntroText) : ""}
${ac?.paymentScheduleText ? `<p><strong>Payment Schedule:</strong> ${esc(ac.paymentScheduleText)}</p>` : ""}
<br/>
<table style="border:none;">
  <tbody>
    <tr style="border:none;">
      <td style="border:none;padding:0 24px 0 0;width:50%;vertical-align:bottom;">
        <p style="border-bottom:1px solid #374151;padding-bottom:4px;margin-bottom:4px;">&nbsp;</p>
        <p style="font-size:9pt;color:#6b7280;margin:0;">Client Signature</p>
      </td>
      <td style="border:none;padding:0 0 0 24px;width:50%;vertical-align:bottom;">
        <p style="border-bottom:1px solid #374151;padding-bottom:4px;margin-bottom:4px;">&nbsp;</p>
        <p style="font-size:9pt;color:#6b7280;margin:0;">Date</p>
      </td>
    </tr>
    <tr style="border:none;">
      <td colspan="2" style="border:none;padding:16px 0 0;vertical-align:bottom;">
        <p style="border-bottom:1px solid #374151;padding-bottom:4px;margin-bottom:4px;">&nbsp;</p>
        <p style="font-size:9pt;color:#6b7280;margin:0;">Printed Name</p>
      </td>
    </tr>
  </tbody>
</table>
</div>`);
  }

  return sections.join("\n\n");
}

// ─── Editor component ─────────────────────────────────────────────────────────

export function ProposalTiptapEditor({ quote, settings, template, initialContent, onChange }: Props) {
  const [sections, setSections] = useState<SidebarSection[]>(DEFAULT_SECTIONS);
  const documentRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: "Start writing your proposal…" }),
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false }),
    ],
    content: initialContent || buildInitialHtml(quote, settings, template),
    editorProps: {
      attributes: { class: "proposal-tiptap-content focus:outline-none" },
    },
    onCreate: ({ editor }) => {
      onChange?.(editor.getHTML(), editor.getJSON(), true);
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML(), editor.getJSON());
    },
  });

  // If template/quote loads async after mount, refresh content if editor is still empty
  useEffect(() => {
    if (editor && !initialContent && !editor.isEmpty) return;
    if (editor && !initialContent && template) {
      editor.commands.setContent(buildInitialHtml(quote, settings, template));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  // If saved content loads async after editor mount
  useEffect(() => {
    if (editor && initialContent) {
      editor.commands.setContent(initialContent);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent]);

  function handleToggleVisible(id: string) {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s))
    );
  }

  // CSS to hide toggled-off sections in the live document
  const hiddenCss = sections
    .filter((s) => !s.visible)
    .map((s) =>
      s.id === "cover"
        ? `.proposal-cover[data-section="cover"] { display: none !important; }`
        : `[data-section="${s.id}"] { display: none !important; }`
    )
    .join("\n");

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <ProposalToolbar editor={editor} />
      </div>

      {/* Body: sidebar + document */}
      <div className="flex flex-1 min-h-0">
        <SectionsSidebar
          documentRef={documentRef}
          sections={sections}
          onToggleVisible={handleToggleVisible}
          onReorder={setSections}
        />

        {/* Scrollable document area */}
        <div className="flex-1 overflow-y-auto bg-[#f0f0f0] py-8 px-4 proposal-scroll-area">
          {hiddenCss && <style>{hiddenCss}</style>}
          <div
            ref={documentRef}
            className="mx-auto bg-white shadow-lg"
            style={{ width: "210mm", minHeight: "297mm", padding: "0" }}
          >
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  );
}
