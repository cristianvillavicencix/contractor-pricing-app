"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Download, Send, Save, Check, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getQuote, loadCompanySettings, upsertQuote, getProposalTemplateForTrade } from "@/lib/supabase/data";
import {
  defaultSettings,
  formatMoney,
  mergeAppSettings,
  type AppSettings,
  type Quote,
} from "@/lib/app-data";
import {
  mergeProposalTemplates,
  type ProposalTemplate,
} from "@/lib/proposal-templates";
import { ProposalTiptapEditor } from "@/components/proposal-editor/proposal-tiptap-editor";

function EditorContent() {
  const params = useSearchParams();
  const quoteId = params.get("id") ?? "";

  const [quote, setQuote] = useState<Quote | null>(null);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [template, setTemplate] = useState<ProposalTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const htmlRef = useRef<string>("");
  const jsonRef = useRef<object>({});
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load quote + settings
  useEffect(() => {
    if (!quoteId) return;
    const supabase = createSupabaseBrowserClient();
    (async () => {
      const [q, s] = await Promise.all([
        getQuote(supabase, quoteId),
        loadCompanySettings<AppSettings>(supabase),
      ]);
      if (q) setQuote(q);
      if (s) setSettings(mergeAppSettings(s));

      // Load template for this trade
      if (q?.trade) {
        const saved = await getProposalTemplateForTrade(supabase, q.trade);
        const [merged] = mergeProposalTemplates(saved ? [saved] : []);
        if (merged) setTemplate(merged);
      }

      setIsLoading(false);
    })();
  }, [quoteId]);

  const handleChange = useCallback((html: string, json: object, silent = false) => {
    htmlRef.current = html;
    jsonRef.current = json;
    if (silent) return; // onCreate fires without marking dirty

    setIsDirty(true);
    setIsSaved(false);

    // Auto-save after 2s of inactivity
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      handleSave(html, json);
    }, 2000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = useCallback(async (html?: string, json?: object) => {
    if (!quote || !quoteId) return;
    const content = html ?? htmlRef.current;
    const contentJson = json ?? jsonRef.current;
    if (!content) return;

    setIsSaving(true);
    const supabase = createSupabaseBrowserClient();
    const updated: Quote = {
      ...quote,
      proposalDocument: content,
      proposalDocumentJson: contentJson,
    };
    await upsertQuote(supabase, updated);
    setQuote(updated);
    setIsSaving(false);
    setIsSaved(true);
    setIsDirty(false);
    setTimeout(() => setIsSaved(false), 3000);
  }, [quote, quoteId]);

  const handleDownloadPdf = useCallback(async () => {
    if (!quoteId) return;
    await handleSave();
    window.open(`/api/proposals/pdf-tiptap?quoteId=${quoteId}`, "_blank");
  }, [quoteId, handleSave]);

  if (!quoteId) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-400">
        No proposal ID provided.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center gap-2 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading proposal…
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-400">
        Proposal not found.
      </div>
    );
  }

  const initialContent = quote.proposalDocument ?? null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white text-[#213343]">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/quotes"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#213343]"
          >
            <ArrowLeft className="h-4 w-4" />
            Proposals
          </Link>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-semibold">{quote.proposalNumber ?? `Proposal`}</span>
          <span className="text-xs text-gray-400">{quote.customerName}</span>
        </div>

        {/* Tier prices */}
        <div className="hidden items-center gap-2 sm:flex">
          {(["good", "better", "best"] as const).map((tier) => (
            <div
              key={tier}
              className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                {tier}
              </span>
              <span className="text-sm font-bold text-[#213343]">
                {formatMoney(quote[tier]?.salePrice ?? 0)}
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Save status */}
          <span className="text-xs text-gray-400">
            {isSaving ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving…
              </span>
            ) : isSaved ? (
              <span className="flex items-center gap-1 text-green-600">
                <Check className="h-3 w-3" /> Saved
              </span>
            ) : isDirty ? (
              "Unsaved changes"
            ) : null}
          </span>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving || !isDirty}
            className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
          >
            <Save className="h-3.5 w-3.5" />
            Save
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 rounded-md bg-[#f5c842] px-3 py-1.5 text-sm font-semibold text-black transition hover:bg-[#e6b800]"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>

          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md bg-[#213343] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#1a2733]"
          >
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="min-h-0 flex-1">
        <ProposalTiptapEditor
          quote={quote}
          settings={settings}
          template={template}
          initialContent={initialContent}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense>
      <EditorContent />
    </Suspense>
  );
}
