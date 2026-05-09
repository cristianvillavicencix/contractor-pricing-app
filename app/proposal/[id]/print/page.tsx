"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  defaultSettings,
  mergeAppSettings,
  type AppSettings,
  type Quote,
} from "@/lib/app-data";
import {
  mergeProposalTemplates,
  type ProposalTemplate,
} from "@/lib/proposal-templates";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  getQuote,
  getProposalTemplateForTrade,
  getSignedUrlViaApi,
  loadCompanySettings,
} from "@/lib/supabase/data";
import { ProposalDocument } from "@/components/proposals/proposal-document";
import { PagedProposalPreview } from "@/components/proposals/paged-proposal-preview";
import type { CoverLayout } from "@/lib/pdf-generator";

type PrintWindow = Window & { __PAGED_READY?: boolean; __PAGED_PAGE_COUNT?: number };

export default function ProposalPrintPage() {
  const { id } = useParams<{ id: string }>();
  const [quote, setQuote] = useState<Quote | null | undefined>(undefined);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [template, setTemplate] = useState<ProposalTemplate | null>(null);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null);
  const [coverLayout, setCoverLayout] = useState<CoverLayout>("full");
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [existingPhotoCaptions, setExistingPhotoCaptions] = useState<string[]>([]);

  useEffect(() => {
    (window as PrintWindow).__PAGED_READY = false;

    const supabase = createSupabaseBrowserClient();
    let cancelled = false;
    async function load() {
      setQuote(undefined);
      try {
        const [dbQuote, dbSettings, dbTemplate] = await Promise.all([
          getQuote(supabase, id),
          loadCompanySettings<AppSettings>(supabase),
          (async () => {
            const q = await getQuote(supabase, id);
            return getProposalTemplateForTrade(supabase, q?.trade);
          })(),
        ]);
        if (cancelled) return;

        const mergedSettings = mergeAppSettings(dbSettings ?? defaultSettings);
        setSettings(mergedSettings);
        setQuote(dbQuote);

        // If no template saved yet, fall back to defaults in code.
        const defaultTemplates = mergeProposalTemplates([]);
        setTemplate(
          dbTemplate ??
            defaultTemplates.find((t) => t.trade === dbQuote?.trade) ??
            defaultTemplates[0] ??
            null
        );

        const coverPath = dbQuote?.coverImagePath ?? null;
        const paths = dbQuote?.existingPhotoPaths ?? [];
        const caps = dbQuote?.existingPhotoCaptions ?? [];
        setCoverLayout(dbQuote?.coverLayout ?? mergedSettings.branding.proposalCoverLayout);
        setExistingPhotoCaptions(caps);

        if (coverPath) {
          getSignedUrlViaApi({ bucket: "proposal-photos", path: coverPath })
            .then((url) => {
              if (!cancelled) setCoverPhotoUrl(url);
            })
            .catch(() => {
              if (!cancelled) setCoverPhotoUrl(null);
            });
        } else {
          setCoverPhotoUrl(null);
        }

        if (paths.length) {
          Promise.all(paths.map((p) => getSignedUrlViaApi({ bucket: "proposal-photos", path: p }).catch(() => "")))
            .then((urls) => {
              if (!cancelled) setExistingPhotos(urls.filter(Boolean));
            })
            .catch(() => {
              if (!cancelled) setExistingPhotos([]);
            });
        } else {
          setExistingPhotos([]);
        }
      } catch {
        if (cancelled) return;
        setQuote(null);
        setTemplate(null);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (quote === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f8fa] text-sm text-gray-500">
        Preparing proposal…
      </main>
    );
  }

  if (!quote || !template) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f8fa]">
        <div className="text-center">
          <p className="text-lg font-semibold text-[#213343]">Proposal not found</p>
          <p className="mt-2 text-sm text-gray-500">
            This proposal is not available.
          </p>
        </div>
      </main>
    );
  }

  const pagedRenderKey = JSON.stringify({
    quote,
    settings,
    template,
    coverPhotoUrl,
    coverLayout,
    existingPhotos,
    existingPhotoCaptions,
  });

  return (
    <main
      className={
        coverLayout === "elegant"
          ? "min-h-screen bg-[#e9eef4] px-2 py-3 print:bg-white print:p-0"
          : "min-h-screen bg-[#e9eef4] px-6 py-8 print:bg-white print:p-0"
      }
    >
      <div className="mx-auto max-w-260">
        <PagedProposalPreview
          renderKey={pagedRenderKey}
          onRendered={(pageCount) => {
            (window as PrintWindow).__PAGED_READY = true;
            (window as PrintWindow).__PAGED_PAGE_COUNT = pageCount;
          }}
        >
          <ProposalDocument
            template={template}
            quote={quote}
            settings={settings}
            photos={existingPhotos}
            photoCaptions={existingPhotoCaptions}
            coverPhotoUrl={coverPhotoUrl}
            coverLayout={coverLayout}
            proposalNumber={quote.proposalNumber}
            sectionOverrides={quote.sectionOverrides}
            sectionLayouts={quote.sectionLayouts}
            sectionOrder={quote.sectionOrder}
            customSections={quote.customSections}
          />
        </PagedProposalPreview>
      </div>
    </main>
  );
}
