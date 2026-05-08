"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  defaultSettings,
  mergeAppSettings,
  storageKeys,
  type AppSettings,
  type Project,
  type Quote,
} from "@/lib/app-data";
import {
  mergeProposalTemplates,
  type ProposalTemplate,
} from "@/lib/proposal-templates";
import { readLocalStorage } from "@/lib/use-local-storage";
import { ProposalDocument } from "@/components/proposals/proposal-document";
import { PagedProposalPreview } from "@/components/proposals/paged-proposal-preview";
import type { CoverLayout } from "@/lib/pdf-generator";

type QuotePhotos = {
  coverImageUrl: string | null;
  existingPhotos: string[];
  existingPhotoCaptions?: string[];
  coverLayout?: CoverLayout;
};

type PrintWindow = Window & { __PAGED_READY?: boolean; __PAGED_PAGE_COUNT?: number };

function quotePhotosKey(id: string) {
  return `contractor-pricing-app:quote-photos:${id}`;
}

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

    const quotes = readLocalStorage<Quote[]>(storageKeys.quotes, []);
    const found = quotes.find((item) => item.id === id) ?? null;
    setQuote(found);

    const mergedSettings = mergeAppSettings(
      readLocalStorage<AppSettings>(storageKeys.settings, defaultSettings)
    );
    setSettings(mergedSettings);

    const savedTemplates = readLocalStorage<ProposalTemplate[]>(
      storageKeys.proposalTemplates,
      []
    );
    const templates = mergeProposalTemplates(savedTemplates);
    setTemplate(templates.find((item) => item.trade === found?.trade) ?? templates[0]);

    const photos = readLocalStorage<QuotePhotos>(quotePhotosKey(id), {
      coverImageUrl: null,
      existingPhotos: [],
    });
    setCoverPhotoUrl(photos.coverImageUrl);
    setCoverLayout(photos.coverLayout ?? mergedSettings.branding.proposalCoverLayout);
    setExistingPhotos(photos.existingPhotos);
    setExistingPhotoCaptions(photos.existingPhotoCaptions ?? []);
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
            This proposal is not available in local storage.
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
    <main className="min-h-screen bg-[#e9eef4] px-6 py-8 print:bg-white print:p-0">
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
