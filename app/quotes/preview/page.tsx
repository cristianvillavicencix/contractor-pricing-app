"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  Check,
  ChevronDown,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  GripVertical,
  ImagePlus,
  Plus,
  Printer,
  Trash2,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
  buildQuoteDocument,
  defaultIncludedServices,
  type CoverLayout,
  type QuoteDocument,
} from "@/lib/pdf-generator";
import { ScopeWizard } from "@/components/quotes/scope-wizard";
import {
  defaultSettings,
  formatMoney,
  getEnabledCompanyCredentialDocuments,
  getEnabledCompanyCredentials,
  getTierMaterialSummaries,
  mergeAppSettings,
  quoteStatusOptions,
  type AppSettings,
  type PriceOptionName,
  type Project,
  type Quote,
  type QuoteStatus,
} from "@/lib/app-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  getQuote,
  getProposalTemplateForTrade,
  listProposalTemplates,
  listQuoteVersions,
  loadCompanySettings,
  saveQuoteVersion,
  upsertProposalTemplate,
  upsertQuote,
  uploadImageViaApi,
  getSignedUrlViaApi,
} from "@/lib/supabase/data";
import {
  cloneProposalTemplateWithNewIdentity,
  mergeProposalTemplates,
  PROPOSAL_SECTIONS,
  type CustomSection,
  type MaterialItem,
  type TimelinePhase,
  type ProposalTemplate,
} from "@/lib/proposal-templates";
import { MaterialsTableEditor } from "@/components/proposals/materials-table-editor";
import { ProposalDocument } from "@/components/proposals/proposal-document";
import { PagedProposalPreview } from "@/components/proposals/paged-proposal-preview";
import type {
  SectionLayouts,
  SectionOverrides,
} from "@/components/proposals/proposal-document";
import { TemplateEditorPanel } from "@/components/proposals/template-editor-panel";

type ServiceItem = { name: string; visible: boolean };
type ProposalHealthItem = { label: string; ok: boolean; detail: string };
type QuoteVersionSnapshot = {
  id: string;
  savedAt: string;
  proposalNumber?: string;
  scopeSummary: string;
  warrantyText: string;
  termsText: string;
  includedServices: string[];
  certifications: string[];
  pricingDescriptions: Record<"Good" | "Better" | "Best", string>;
  sectionOverrides: SectionOverrides;
  sectionLayouts: SectionLayouts;
  sectionOrder: string[];
  customSections: CustomSection[];
  tierMaterialSummaries: Record<"Good" | "Better" | "Best", string>;
};
type QuotePhotosFields = {
  coverImagePath?: string | null;
  existingPhotoPaths?: string[];
  existingPhotoCaptions?: string[];
  coverLayout?: CoverLayout;
};

const SERVICES_COLLAPSE_AT = 6;
// localStorage keys removed — this screen is Supabase-backed

const COVER_LAYOUTS: { id: CoverLayout; label: string }[] = [
  { id: "full", label: "Full" },
  { id: "half", label: "Half" },
  { id: "square", label: "Square" },
  { id: "elegant", label: "Elegante" },
];

function QuotePreviewContent() {
  const searchParams = useSearchParams();
  const quoteId = searchParams.get("id");
  return <QuotePreviewContentClient quoteId={quoteId} />;
}

function QuotePreviewContentClient({ quoteId }: { quoteId: string | null }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [quote, setQuote] = useState<Quote | null | undefined>(undefined);
  const [project, setProject] = useState<Project | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [quoteVersions, setQuoteVersions] = useState<QuoteVersionSnapshot[]>([]);

  // Cover/customer editable fields (stored on the quote)
  const [customerName, setCustomerName] = useState(quote?.customerName ?? "");
  const [customerAddress, setCustomerAddress] = useState(quote?.customerAddress ?? "");
  const [customerPhone, setCustomerPhone] = useState(quote?.customerPhone ?? "");
  const [customerEmail, setCustomerEmail] = useState(quote?.customerEmail ?? "");
  const [projectName, setProjectName] = useState(quote?.projectName ?? "");
  const [selectedOption, setSelectedOption] = useState<Quote["selectedOption"]>(
    quote?.selectedOption ?? "Better"
  );

  const [scope, setScope] = useState(quote?.scopeSummary ?? "");
  const [warranty, setWarranty] = useState(
    quote?.warrantyText ?? settings.proposalSettings.defaultWarrantyText
  );
  const [terms, setTerms] = useState(
    quote?.termsText ?? settings.proposalSettings.defaultTerms
  );
  const [pricingDescriptions, setPricingDescriptions] = useState(() => ({
    Good: quote?.good.description ?? settings.proposalSettings.goodDescription,
    Better:
      quote?.better.description ?? settings.proposalSettings.betterDescription,
    Best: quote?.best.description ?? settings.proposalSettings.bestDescription,
  }));
  const [tierMaterialSummaries, setTierMaterialSummaries] = useState<
    Record<PriceOptionName, string>
  >(() => ({
    Good: "",
    Better: "",
    Best: "",
  }));
  const [services, setServices] = useState<ServiceItem[]>(() =>
    (quote?.includedServices ?? settings.proposalSettings.defaultIncludedServices ?? defaultIncludedServices).map((name) => ({
      name,
      visible: true,
    }))
  );
  const [certs, setCerts] = useState<ServiceItem[]>(() =>
    (quote?.certifications ?? getEnabledCompanyCredentials(settings)).map((name) => ({
      name,
      visible: true,
    }))
  );
  const [sectionOverrides, setSectionOverrides] = useState<SectionOverrides>(
    () => quote?.sectionOverrides ?? {}
  );
  const [sectionLayouts, setSectionLayouts] = useState<SectionLayouts>(
    () => quote?.sectionLayouts ?? {}
  );
  const [sectionOrder, setSectionOrder] = useState<string[]>(() => {
    const saved = quote?.sectionOrder ?? PROPOSAL_SECTIONS.map((s) => s.id);
    // Ensure any newly-added built-in sections are appended to existing saved orders
    const builtInIds = PROPOSAL_SECTIONS.map((s) => s.id);
    const missing = builtInIds.filter((id) => !saved.includes(id));
    return [...saved, ...missing];
  });
  const [customSections, setCustomSections] = useState<CustomSection[]>(
    () => quote?.customSections ?? []
  );

  const [showAllServices, setShowAllServices] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [newService, setNewService] = useState("");
  const [newCert, setNewCert] = useState("");
  const [coverImagePath, setCoverImagePath] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [existingPhotoPaths, setExistingPhotoPaths] = useState<string[]>([]);
  const [coverLayout, setCoverLayout] = useState<CoverLayout>(
    () => settings.branding.proposalCoverLayout
  );
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("preview");
  const [dragSectionIndex, setDragSectionIndex] = useState<number | null>(null);
  const [dragOverSectionIndex, setDragOverSectionIndex] = useState<number | null>(null);
  const isInitialized = useRef(false);

  // Proposal modal + photos + template editor
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  /** When duplicating to a new trade, the panel edits this clone instead of the quote’s template. */
  const [templateEditorDraft, setTemplateEditorDraft] = useState<ProposalTemplate | null>(null);
  const [showDuplicateTemplateModal, setShowDuplicateTemplateModal] = useState(false);
  const [duplicateTemplateTradeName, setDuplicateTemplateTradeName] = useState("");
  const [duplicateTemplateError, setDuplicateTemplateError] = useState("");
  const [duplicateTemplateBusy, setDuplicateTemplateBusy] = useState(false);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [existingPhotoCaptions, setExistingPhotoCaptions] = useState<string[]>([]);

  // Collapsible panel state
  const [showScope, setShowScope] = useState(false);
  const [showServices, setShowServices] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showCerts, setShowCerts] = useState(true);
  const [showProposalHealth, setShowProposalHealth] = useState(false);
  const [activeProposalSection, setActiveProposalSection] = useState<
    string | null
  >("cover");

  const [proposalTemplate, setProposalTemplate] = useState<ProposalTemplate>(() => {
    const defaults = mergeProposalTemplates([]);
    return defaults[0]!;
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!quoteId) return;
      setIsLoading(true);
      setLoadError(null);
      try {
        const [dbSettings, dbQuote] = await Promise.all([
          loadCompanySettings<AppSettings>(supabase),
          getQuote(supabase, quoteId),
        ]);
        if (cancelled) return;
        const mergedSettings = mergeAppSettings(dbSettings ?? defaultSettings);
        setSettings(mergedSettings);

        let quoteForSession = dbQuote;
        if (dbQuote && !dbQuote.clientPortalToken) {
          const withToken = { ...dbQuote, clientPortalToken: crypto.randomUUID() };
          await upsertQuote(supabase, withToken);
          quoteForSession = withToken;
        }
        setQuote(quoteForSession);
        setProject(undefined);

        if (quoteForSession) {
          setTierMaterialSummaries(getTierMaterialSummaries(mergedSettings, quoteForSession));
        }

        const qWithPhotos = quoteForSession as (Quote & QuotePhotosFields) | null;
        setCoverLayout(qWithPhotos?.coverLayout ?? mergedSettings.branding.proposalCoverLayout);
        setCoverImagePath(qWithPhotos?.coverImagePath ?? null);
        setExistingPhotoPaths(qWithPhotos?.existingPhotoPaths ?? []);
        setExistingPhotoCaptions(qWithPhotos?.existingPhotoCaptions ?? []);

        // Signed URLs for preview
        const coverPath = qWithPhotos?.coverImagePath ?? undefined;
        if (coverPath) {
          getSignedUrlViaApi({ bucket: "proposal-photos", path: coverPath })
            .then((url) => setCoverImageUrl(url))
            .catch(() => setCoverImageUrl(null));
        } else {
          setCoverImageUrl(null);
        }

        const paths = qWithPhotos?.existingPhotoPaths ?? [];
        if (paths.length) {
          Promise.all(
            paths.map((p) =>
              getSignedUrlViaApi({ bucket: "proposal-photos", path: p }).catch(() => "")
            )
          ).then((urls) => setExistingPhotos(urls.filter(Boolean)));
        } else {
          setExistingPhotos([]);
        }

        // Template for this trade
        const dbTemplate = await getProposalTemplateForTrade(supabase, quoteForSession?.trade);
        const defaults = mergeProposalTemplates([]);
        setProposalTemplate(
          dbTemplate ??
            defaults.find((t) => t.trade === quoteForSession?.trade) ??
            defaults[0]
        );

        const versions = await listQuoteVersions(supabase, quoteId);
        if (!cancelled) {
          setQuoteVersions(
            versions.map((v) => {
              const snap = v.snapshot as Record<string, unknown> | null | undefined;
              return {
                id: v.id,
                savedAt: v.savedAt,
                proposalNumber: snap?.proposalNumber as string | undefined,
                scopeSummary: (snap?.scopeSummary as string) ?? "",
                warrantyText: (snap?.warrantyText as string) ?? "",
                termsText: (snap?.termsText as string) ?? "",
                includedServices: (snap?.includedServices as string[]) ?? [],
                certifications: (snap?.certifications as string[]) ?? [],
                pricingDescriptions:
                  (snap?.pricingDescriptions as QuoteVersionSnapshot["pricingDescriptions"]) ?? {},
                sectionOverrides: (snap?.sectionOverrides as SectionOverrides) ?? {},
                sectionLayouts: (snap?.sectionLayouts as SectionLayouts) ?? {},
                sectionOrder: (snap?.sectionOrder as string[]) ?? [],
                customSections: (snap?.customSections as CustomSection[]) ?? [],
                tierMaterialSummaries:
                  (snap?.tierMaterialSummaries as QuoteVersionSnapshot["tierMaterialSummaries"]) ?? {
                    Good: "",
                    Better: "",
                    Best: "",
                  },
              };
            })
          );
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Failed to load quote");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [quoteId, supabase]);

  const photoUploadRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const elegantLogoInputRef = useRef<HTMLInputElement>(null);
  const elegantContactPhotoInputRef = useRef<HTMLInputElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);

  const blockingState = loadError
    ? ("error" as const)
    : quote === undefined || isLoading
      ? ("loading" as const)
      : !quote
        ? ("notFound" as const)
        : null;

  const quoteForDoc: Quote | null =
    quote && !blockingState
      ? {
          ...quote,
          customerName,
          customerAddress,
          customerPhone,
          customerEmail,
          projectName,
          selectedOption,
        }
      : null;

  const doc: QuoteDocument | null = quoteForDoc
    ? {
        ...buildQuoteDocument(quoteForDoc, project, settings, proposalTemplate),
    scopeSummary: scope,
    warrantyText: warranty,
    termsText: terms,
    includedServices: services.filter((s) => s.visible).map((s) => s.name),
    pricingDescriptions,
    tierMaterialSummaries,
    certifications: settings.proposalSettings.showCertifications
      ? certs.filter((c) => c.visible).map((c) => c.name)
      : [],
    existingPhotos,
    existingPhotoCaptions,
    sectionOverrides,
    sectionLayouts,
    certificationDocuments: settings.proposalSettings.showCertifications
      ? getEnabledCompanyCredentialDocuments(settings).filter((document) =>
          certs.some(
            (cert) => cert.visible && cert.name === document.credentialName
          )
        )
      : [],
      }
    : null;
  const mergedProfile = mergeAppSettings(settings).companyProfile;
  const elegantPriceAuto = formatMoney(
    quote
      ? selectedOption === "Good"
        ? quote.good.salePrice
        : selectedOption === "Better"
          ? quote.better.salePrice
          : quote.best.salePrice
      : 0
  );
  const proposalQuote: Quote | null =
    quote && quoteForDoc
      ? {
          ...quoteForDoc,
          good: { ...quote.good, description: pricingDescriptions.Good },
          better: { ...quote.better, description: pricingDescriptions.Better },
          best: { ...quote.best, description: pricingDescriptions.Best },
          tierMaterials: tierMaterialSummaries,
          scopeSummary: scope,
          warrantyText: warranty,
          termsText: terms,
          includedServices: services.filter((s) => s.visible).map((s) => s.name),
          certifications: certs.filter((c) => c.visible).map((c) => c.name),
          sectionOverrides,
          sectionLayouts,
          sectionOrder,
          customSections,
          selectedOption,
        }
      : null;

  const tradeSuggestions = doc
    ? (settings.contentDefaults.tradeServices[doc.trade] ?? doc.tradeServiceSuggestions ?? []).filter(
        (s) => !services.some((item) => item.name === s)
      )
    : [];

  useEffect(() => {
    if (!activeProposalSection) return;

    const frame = window.requestAnimationFrame(() => {
      const container = previewScrollRef.current;
      const target = container?.querySelector<HTMLElement>(
        `[data-proposal-section="${activeProposalSection}"]`
      );

      target?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeProposalSection, sectionLayouts, sectionOverrides]);

  // Mark dirty whenever any proposal content changes (skip first render)
  useEffect(() => {
    if (!isInitialized.current) { isInitialized.current = true; return; }
    setIsDirty(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, warranty, terms, services, certs, sectionOverrides, sectionLayouts,
      sectionOrder, customSections, existingPhotos, coverImageUrl, coverLayout,
      proposalTemplate, pricingDescriptions, tierMaterialSummaries, selectedOption]);

  // Warn before closing/refreshing with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  function saveProposal({ manual }: { manual: boolean }) {
    if (!quote) return;
    const nextQuote: Quote & {
      coverImagePath?: string | null;
      existingPhotoPaths?: string[];
      existingPhotoCaptions?: string[];
      coverLayout?: CoverLayout;
    } = {
      ...quote,
      customerName,
      customerAddress,
      customerPhone,
      customerEmail,
      projectName,
      selectedOption,
      good: { ...quote.good, description: pricingDescriptions.Good },
      better: { ...quote.better, description: pricingDescriptions.Better },
      best: { ...quote.best, description: pricingDescriptions.Best },
      tierMaterials: tierMaterialSummaries,
      scopeSummary: scope,
      warrantyText: warranty,
      termsText: terms,
      includedServices: services.filter((s) => s.visible).map((s) => s.name),
      certifications: certs.filter((c) => c.visible).map((c) => c.name),
      sectionOverrides,
      sectionLayouts,
      sectionOrder,
      customSections,
      coverImagePath,
      existingPhotoPaths,
      existingPhotoCaptions,
      coverLayout,
    };

    upsertQuote(supabase, nextQuote).catch(() => undefined);
    setQuote(nextQuote);
    upsertProposalTemplate(supabase, proposalTemplate).catch(() => undefined);
    if (manual) {
      saveQuoteVersion(supabase, quote.id, {
        proposalNumber: quote.proposalNumber,
        scopeSummary: scope,
        warrantyText: warranty,
        termsText: terms,
        includedServices: services.filter((s) => s.visible).map((s) => s.name),
        certifications: certs.filter((c) => c.visible).map((c) => c.name),
        pricingDescriptions,
        tierMaterialSummaries,
        sectionOverrides,
        sectionLayouts,
        sectionOrder,
        customSections,
      })
        .then(async () => {
          const versions = await listQuoteVersions(supabase, quote.id);
          setQuoteVersions(
            versions.map((v) => {
              const snap = v.snapshot as Record<string, unknown> | null | undefined;
              return {
                id: v.id,
                savedAt: v.savedAt,
                proposalNumber: snap?.proposalNumber as string | undefined,
                scopeSummary: (snap?.scopeSummary as string) ?? "",
                warrantyText: (snap?.warrantyText as string) ?? "",
                termsText: (snap?.termsText as string) ?? "",
                includedServices: (snap?.includedServices as string[]) ?? [],
                certifications: (snap?.certifications as string[]) ?? [],
                pricingDescriptions:
                  (snap?.pricingDescriptions as QuoteVersionSnapshot["pricingDescriptions"]) ?? {},
                sectionOverrides: (snap?.sectionOverrides as SectionOverrides) ?? {},
                sectionLayouts: (snap?.sectionLayouts as SectionLayouts) ?? {},
                sectionOrder: (snap?.sectionOrder as string[]) ?? [],
                customSections: (snap?.customSections as CustomSection[]) ?? [],
                tierMaterialSummaries:
                  (snap?.tierMaterialSummaries as QuoteVersionSnapshot["tierMaterialSummaries"]) ?? {
                    Good: "",
                    Better: "",
                    Best: "",
                  },
              };
            })
          );
        })
        .catch(() => undefined);
    }
    setIsDirty(false);
    setIsSaved(true);
    setIsAutoSaving(false);
    setTimeout(() => setIsSaved(false), 2000);
  }

  function handleSave() {
    saveProposal({ manual: true });
  }

  useEffect(() => {
    if (!isDirty || isSaved) return;
    const timer = window.setTimeout(() => {
      setIsAutoSaving(true);
      saveProposal({ manual: false });
    }, 2500);
    return () => window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, isSaved, scope, warranty, terms, services, certs, sectionOverrides,
      sectionLayouts, sectionOrder, customSections, existingPhotos, coverImageUrl,
      coverLayout, proposalTemplate, pricingDescriptions, tierMaterialSummaries, selectedOption]);

  async function handleDownload() {
    if (!quote) return;
    setIsDownloading(true);
    try {
      saveProposal({ manual: false });

      const response = await fetch("/api/proposals/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: quote.id }),
      });

      if (!response.ok) {
        throw new Error("PDF generation failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${doc?.proposalNumber || "proposal"}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  }

  function handlePrint() {
    // Print should use the same paginated layout the user sees in the live A4 preview.
    // Opening the full preview modal ensures the preview is visible and sized correctly.
    setShowProposalModal(true);
    // Give React a moment to mount the modal before opening the print dialog.
    window.setTimeout(() => window.print(), 250);
  }

  function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const MAX_BYTES = 1.2 * 1024 * 1024;
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      alert(`"${file.name}" exceeds the 1 MB limit for cover photos. Please resize it before uploading.`);
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const result = ev.target?.result;
      if (typeof result !== "string") return;
      try {
        const name = `${quoteId ?? "quote"}/cover-${crypto.randomUUID()}.jpg`;
        const { path } = await uploadImageViaApi({
          bucket: "proposal-photos",
          fileName: name,
          contentType: file.type || "image/jpeg",
          dataUrl: result,
        });
        const signed = await getSignedUrlViaApi({ bucket: "proposal-photos", path });
        setCoverImagePath(path);
        setCoverImageUrl(signed);
      } catch {
        // ignore
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleElegantImageUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    field: "elegantLogoUrl" | "elegantContactPhotoUrl"
  ) {
    const MAX_BYTES = 1.2 * 1024 * 1024;
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > MAX_BYTES) {
      alert(`Image exceeds the 1 MB limit. Resize before uploading.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setProposalTemplate((current) => ({
          ...current,
          cover: { ...current.cover, [field]: result },
          lastModified: new Date().toISOString().slice(0, 10),
        }));
      }
    };
    reader.readAsDataURL(file);
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const MAX_BYTES = 1.2 * 1024 * 1024; // ~1.2 MB — base64 adds ~33% overhead
    const files = Array.from(e.target.files ?? []);
    const oversized = files.filter((f) => f.size > MAX_BYTES);
    if (oversized.length > 0) {
      alert(`"${oversized[0].name}" exceeds the 1 MB limit per photo. Please resize it before uploading.`);
    }
    files.filter((f) => f.size <= MAX_BYTES).forEach((file) => {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const result = ev.target?.result;
        if (typeof result !== "string") return;
        try {
          const name = `${quoteId ?? "quote"}/existing-${crypto.randomUUID()}.jpg`;
          const { path } = await uploadImageViaApi({
            bucket: "proposal-photos",
            fileName: name,
            contentType: file.type || "image/jpeg",
            dataUrl: result,
          });
          const signed = await getSignedUrlViaApi({ bucket: "proposal-photos", path });
          setExistingPhotoPaths((prev) => [...prev, path]);
          setExistingPhotos((prev) => [...prev, signed]);
          setExistingPhotoCaptions((prev) => [...prev, ""]);
        } catch {
          // ignore
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  function handleTemplateSave(updated: ProposalTemplate) {
    if (proposalTemplate && updated.trade.trim() === proposalTemplate.trade.trim()) {
      setProposalTemplate(updated);
    }
    upsertProposalTemplate(supabase, updated).catch(() => undefined);
    setShowTemplateEditor(false);
    setTemplateEditorDraft(null);
  }

  async function handleDuplicateTemplateSubmit() {
    if (!proposalTemplate) return;
    const name = duplicateTemplateTradeName.trim();
    if (!name) {
      setDuplicateTemplateError("Enter a trade name for the new template.");
      return;
    }
    if (name.toLowerCase() === proposalTemplate.trade.trim().toLowerCase()) {
      setDuplicateTemplateError("Use a different name than this quote’s trade.");
      return;
    }
    setDuplicateTemplateBusy(true);
    setDuplicateTemplateError("");
    try {
      const saved = await listProposalTemplates(supabase);
      const merged = mergeProposalTemplates(saved);
      if (merged.some((t) => t.trade.trim().toLowerCase() === name.toLowerCase())) {
        setDuplicateTemplateError("A template with this trade name already exists.");
        return;
      }
      const id = `custom-${Math.random().toString(36).slice(2, 10)}`;
      const copy = cloneProposalTemplateWithNewIdentity(proposalTemplate, {
        id,
        trade: name,
        name: `${name} Proposal`,
      });
      setShowDuplicateTemplateModal(false);
      setDuplicateTemplateTradeName("");
      setTemplateEditorDraft(copy);
      setShowTemplateEditor(true);
    } catch (e) {
      setDuplicateTemplateError(
        e instanceof Error ? e.message : "Could not verify template names. Try again."
      );
    } finally {
      setDuplicateTemplateBusy(false);
    }
  }

  function updateTemplate<K extends keyof ProposalTemplate>(
    key: K,
    value: ProposalTemplate[K]
  ) {
    setProposalTemplate((current) => ({
      ...current,
      [key]: value,
      lastModified: new Date().toISOString().slice(0, 10),
    }));
  }

  function moveSectionUp(index: number) {
    if (index <= 0) return;
    setSectionOrder((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moveSectionDown(index: number) {
    setSectionOrder((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  function addCustomSection() {
    const id = `custom-${Math.random().toString(36).slice(2, 8)}`;
    const section: CustomSection = { id, title: "Custom Section", content: "", enabled: true };
    setCustomSections((prev) => [...prev, section]);
    setSectionOrder((prev) => [...prev, id]);
    setActiveProposalSection(id);
  }

  function removeCustomSection(id: string) {
    setCustomSections((prev) => prev.filter((s) => s.id !== id));
    setSectionOrder((prev) => prev.filter((sid) => sid !== id));
  }

  function isSectionVisible(sectionId: string) {
    const custom = customSections.find((s) => s.id === sectionId);
    if (custom) return sectionOverrides[sectionId] ?? custom.enabled;

    const section = proposalTemplate?.[sectionId as keyof ProposalTemplate];
    const templateEnabled =
      typeof section === "object" &&
      section !== null &&
      "enabled" in section &&
      typeof section.enabled === "boolean"
        ? section.enabled
        : true;

    return sectionOverrides[sectionId] ?? templateEnabled;
  }

  function toggleSection(sectionId: string) {
    setSectionOverrides((current) => ({
      ...current,
      [sectionId]: !isSectionVisible(sectionId),
    }));
  }

  function getSectionLayout(sectionId: string) {
    return sectionLayouts[sectionId] ?? defaultSectionLayout(sectionId);
  }

  function setSectionLayout(sectionId: string, value: string) {
    setSectionLayouts((current) => ({ ...current, [sectionId]: value }));
  }

  function toggleService(name: string) {
    setServices((prev) =>
      prev.map((s) => (s.name === name ? { ...s, visible: !s.visible } : s))
    );
  }

  function toggleCert(name: string) {
    setCerts((prev) =>
      prev.map((c) => (c.name === name ? { ...c, visible: !c.visible } : c))
    );
  }

  function addService() {
    const trimmed = newService.trim();
    if (!trimmed || services.some((s) => s.name === trimmed)) return;
    setServices((prev) => [...prev, { name: trimmed, visible: true }]);
    setNewService("");
  }

  function addCert() {
    const trimmed = newCert.trim();
    if (!trimmed || certs.some((c) => c.name === trimmed)) return;
    setCerts((prev) => [...prev, { name: trimmed, visible: true }]);
    setNewCert("");
  }

  function addSuggestion(name: string) {
    setServices((prev) => [...prev, { name, visible: true }]);
  }

  function removeExistingPhoto(index: number) {
    setExistingPhotos((prev) => prev.filter((_, idx) => idx !== index));
    setExistingPhotoCaptions((prev) => prev.filter((_, idx) => idx !== index));
  }

  function updateExistingPhotoCaption(index: number, value: string) {
    setExistingPhotoCaptions((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function restoreVersion(version: QuoteVersionSnapshot) {
    setScope(version.scopeSummary);
    setWarranty(version.warrantyText);
    setTerms(version.termsText);
    setServices(version.includedServices.map((name) => ({ name, visible: true })));
    setCerts(version.certifications.map((name) => ({ name, visible: true })));
    setPricingDescriptions(
      version.pricingDescriptions ?? pricingDescriptions
    );
    setTierMaterialSummaries(
      version.tierMaterialSummaries ?? { Good: "", Better: "", Best: "" }
    );
    setSectionOverrides(version.sectionOverrides);
    setSectionLayouts(version.sectionLayouts);
    setSectionOrder(version.sectionOrder);
    setCustomSections(version.customSections);
    setShowVersions(false);
    setIsDirty(true);
  }

  const displayedServices = showAllServices
    ? services
    : services.slice(0, SERVICES_COLLAPSE_AT);
  const hiddenCount = services.length - SERVICES_COLLAPSE_AT;
  const visibleSectionCount = sectionOrder.filter((sectionId) =>
    isSectionVisible(sectionId)
  ).length;
  const healthItems = quote
    ? getProposalHealthItems({
        quote,
        coverImageUrl,
        scope,
        warranty,
        terms,
        services,
        existingPhotos,
        existingPhotoCaptions,
        sectionOrder,
        isSectionVisible,
      })
    : [];
  const unresolvedHealthItems = healthItems.filter((item) => !item.ok);
  const proposalHealth =
    unresolvedHealthItems.length === 0
      ? "Ready to send"
      : unresolvedHealthItems.length <= 2
        ? "Needs review"
        : "Needs work";
  const proposalPs = settings.proposalSettings;
  const pagedRenderKey = JSON.stringify({
    quoteId: quote?.id ?? "",
    selectedOption,
    scope,
    warranty,
    terms,
    services,
    certs,
    pricingDescriptions,
    tierMaterialSummaries,
    sectionOverrides,
    sectionLayouts,
    sectionOrder,
    customSections,
    existingPhotos,
    existingPhotoCaptions,
    coverImageUrl,
    coverLayout,
    proposalTemplate,
    companyTierMaterialsTables: {
      Good: proposalPs.goodTierMaterialsTable,
      Better: proposalPs.betterTierMaterialsTable,
      Best: proposalPs.bestTierMaterialsTable,
    },
  });

  if (blockingState === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa]">
        <div className="text-center">
          <p className="text-lg font-semibold text-[#b42318]">Failed to load proposal</p>
          <p className="mt-2 text-sm text-gray-500">{loadError}</p>
          <Link href="/quotes" className="mt-4 inline-flex items-center rounded-lg bg-[var(--brand-accent)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-accent-hover)]">
            Back to Proposals
          </Link>
        </div>
      </div>
    );
  }
  if (blockingState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa] text-sm text-gray-500">
        Loading proposal…
      </div>
    );
  }
  if (blockingState === "notFound") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa]">
        <div className="text-center">
          <p className="text-lg font-semibold">Proposal not found</p>
          <Link href="/quotes" className="mt-4 inline-flex items-center rounded-lg bg-[var(--brand-accent)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-accent-hover)]">
            Back to Proposals
          </Link>
        </div>
      </div>
    );
  }

  if (!quote || !proposalQuote || !doc) {
    return null;
  }

  return (
    <div className="h-screen overflow-hidden bg-[#f5f8fa] text-[#213343]">
      {/* Toolbar */}
      <div className="print:hidden sticky top-0 z-10 border-b border-[#d9e2ec] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Link
            href="/quotes"
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" />
            Proposals
          </Link>
          <p className="hidden text-sm text-gray-500 sm:block">
            {doc.proposalNumber} · {quote.customerName}
          </p>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 rounded-lg border border-[#d9e2ec] bg-white px-3 py-2 text-xs font-semibold text-gray-600">
              <span>Status</span>
              <select
                value={quote.status}
                onChange={(event) => {
                  const nextStatus = event.target.value as QuoteStatus;
                  setQuote((current) => (current ? { ...current, status: nextStatus } : current));
                  setIsDirty(true);
                }}
                className="rounded border border-[#d9e2ec] bg-white px-2 py-1 text-xs text-[#213343] outline-none focus:border-[var(--brand-accent)]"
              >
                {quoteStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                isSaved
                  ? "border-green-200 bg-green-50 text-green-700"
                  : isDirty
                  ? "border-[#ff5c35] bg-[#fff1ea] text-[#ff5c35]"
                  : "border-[#d9e2ec] hover:bg-[#f6f8fb]"
              }`}
            >
              {isSaved ? <Check className="h-4 w-4" /> : null}
              <span className="hidden sm:inline">
                {isAutoSaving ? "Auto-saving…" : isSaved ? "Saved!" : isDirty ? "Save changes" : "Save"}
              </span>
              <span className="sm:hidden">
                {isSaved ? "✓" : isDirty ? "●" : "Save"}
              </span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-lg border border-[#d9e2ec] px-4 py-2 text-sm font-semibold transition hover:bg-[#f6f8fb]"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-2 rounded-lg bg-[var(--brand-accent)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-accent-hover)] disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">
                {isDownloading ? "Generating…" : "Download PDF"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile tab bar */}
      <div className="print:hidden sticky top-16.25 z-10 flex border-b border-[#d9e2ec] bg-white lg:hidden">
        <button
          onClick={() => setMobileTab("preview")}
          className={`flex-1 py-3 text-sm font-semibold transition ${mobileTab === "preview" ? "border-b-2 border-[var(--brand-accent)] text-[#213343]" : "text-gray-400"}`}
        >
          Preview
        </button>
        <button
          onClick={() => setMobileTab("edit")}
          className={`flex-1 py-3 text-sm font-semibold transition ${mobileTab === "edit" ? "border-b-2 border-[var(--brand-accent)] text-[#213343]" : "text-gray-400"}`}
        >
          Edit
        </button>
      </div>

      {/* Layout */}
      <div className="mx-auto flex h-[calc(100vh-65px)] max-w-[1680px] gap-10 overflow-hidden px-5 py-6 sm:px-8 lg:h-[calc(100vh-65px)]">
        {/* ── Editor sidebar ── */}
        <aside className={`print:hidden h-full shrink-0 overflow-y-auto pr-1 lg:block lg:w-90 xl:w-105 ${mobileTab === "edit" ? "block w-full" : "hidden"}`}>
          <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Proposal Sections
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Open one section at a time, edit its content, and use the eye to control what the client sees.
            </p>
            <div className="mt-3 flex items-center justify-between rounded border border-[#d9e2ec] bg-white px-3 py-2 text-xs">
              <span className="text-gray-400">Client-visible sections</span>
              <span className="font-medium text-[#213343]">
                {visibleSectionCount} / {sectionOrder.length}
              </span>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverUpload}
            className="hidden"
          />
          <input
            ref={photoUploadRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <input
            ref={elegantLogoInputRef}
            type="file"
            accept="image/*"
            onChange={(ev) => handleElegantImageUpload(ev, "elegantLogoUrl")}
            className="hidden"
          />
          <input
            ref={elegantContactPhotoInputRef}
            type="file"
            accept="image/*"
            onChange={(ev) => handleElegantImageUpload(ev, "elegantContactPhotoUrl")}
            className="hidden"
          />

          <div className="space-y-2">
            {sectionOrder.map((sectionId, index) => {
              const builtIn = PROPOSAL_SECTIONS.find((s) => s.id === sectionId);
              const custom = customSections.find((s) => s.id === sectionId);
              if (!builtIn && !custom) return null;

              const panelLabel = builtIn?.label ?? custom?.title ?? "Custom Section";
              const panelOrdinal =
                sectionId === "cover"
                  ? null
                  : sectionOrder.slice(0, index + 1).filter((id) => id !== "cover").length;
              const panelDescription = builtIn?.description ?? "Custom content for your proposal";
              const sectionVisible = isSectionVisible(sectionId);
              const open = activeProposalSection === sectionId;
              const isDragging = dragSectionIndex === index;
              const isDragOver = dragOverSectionIndex === index;

              return (
                <div
                  key={sectionId}
                  draggable
                  onDragStart={() => setDragSectionIndex(index)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverSectionIndex(index); }}
                  onDrop={() => {
                    if (dragSectionIndex === null || dragSectionIndex === index) return;
                    setSectionOrder((current) => {
                      const next = [...current];
                      const [moved] = next.splice(dragSectionIndex, 1);
                      next.splice(index, 0, moved);
                      return next;
                    });
                    setDragSectionIndex(null);
                    setDragOverSectionIndex(null);
                  }}
                  onDragEnd={() => { setDragSectionIndex(null); setDragOverSectionIndex(null); }}
                  className={`transition-opacity ${isDragging ? "opacity-40" : "opacity-100"} ${isDragOver && dragSectionIndex !== index ? "ring-2 ring-[#ff5c35] ring-offset-1 rounded" : ""}`}
                >
                <ProposalSectionPanel
                  label={panelOrdinal != null ? `${panelOrdinal}. ${panelLabel}` : panelLabel}
                  description={panelDescription}
                  open={open}
                  visible={sectionVisible}
                  onOpen={() => setActiveProposalSection((current) => current === sectionId ? null : sectionId)}
                  onToggleVisible={() => toggleSection(sectionId)}
                >
                  {sectionId === "cover" && (
                    <div className="space-y-3">
                      <LayoutPicker
                        label="Cover Layout"
                        value={coverLayout}
                        options={COVER_LAYOUTS.map(({ id, label }) => ({
                          value: id,
                          label,
                        }))}
                        onChange={(value) => setCoverLayout(value as CoverLayout)}
                      />

                      <SidebarSubsection
                        title="Cover photo"
                        description="Main project image used on the first page."
                      >
                      {coverImageUrl ? (
                        <>
                          <div className="relative overflow-hidden rounded border border-[#d9e2ec]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={coverImageUrl}
                              alt="Cover"
                              className="h-36 w-full object-cover"
                            />
                            <button
                              onClick={() => setCoverImageUrl(null)}
                              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full rounded border border-[#d9e2ec] py-1.5 text-xs font-medium text-gray-500 transition hover:bg-[#f6f8fb]"
                          >
                            Replace Photo
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex w-full items-center justify-center gap-2 rounded border border-dashed border-[#d9e2ec] py-5 text-sm text-gray-400 transition hover:border-[#111111] hover:text-[#111111]"
                        >
                          <ImagePlus className="h-4 w-4" />
                          Upload cover photo
                        </button>
                      )}
                      </SidebarSubsection>

                      <SidebarSubsection
                        title="Client / project"
                        description="Shown on the cover and proposal metadata."
                      >
                        <div className="space-y-3">
                          <CompactInput
                            label="Customer name"
                            value={customerName}
                            onChange={setCustomerName}
                            placeholder="Customer"
                          />
                          <CompactInput
                            label="Customer address"
                            value={customerAddress}
                            onChange={setCustomerAddress}
                            placeholder="123 Main St, City, ST 00000"
                          />
                          <CompactInput
                            label="Customer phone"
                            value={customerPhone}
                            onChange={setCustomerPhone}
                            placeholder="(555) 555-5555"
                          />
                          <CompactInput
                            label="Customer email"
                            value={customerEmail}
                            onChange={setCustomerEmail}
                            placeholder="name@example.com"
                          />
                          <CompactInput
                            label="Project name"
                            value={projectName}
                            onChange={setProjectName}
                            placeholder="Project"
                          />
                        </div>
                      </SidebarSubsection>

                      <SidebarSubsection
                        title="Cover text"
                        description="Headline and supporting copy used by cover layouts."
                      >
                        <div className="space-y-3">
                          <EditTextarea
                            label="Cover Tagline"
                            value={proposalTemplate.cover.tagline}
                            onChange={(value) =>
                              updateTemplate("cover", {
                                ...proposalTemplate.cover,
                                tagline: value,
                              })
                            }
                            rows={2}
                          />
                          {coverLayout === "elegant" ? (
                            <CompactInput
                              label="Price band headline"
                              value={proposalTemplate.cover.bannerHeadline ?? ""}
                              onChange={(value) =>
                                updateTemplate("cover", {
                                  ...proposalTemplate.cover,
                                  bannerHeadline:
                                    value.trim() === "" ? undefined : value.trim(),
                                })
                              }
                              placeholder="PROPOSED INVESTMENT"
                            />
                          ) : null}
                        </div>
                      </SidebarSubsection>

                      {coverLayout === "elegant" ? (
                        <SidebarSubsection
                          title="Elegante cover details"
                          description="Optional overrides for logo, price and footer contact."
                          muted
                        >
                          <div className="space-y-3">
                          <CompactInput
                            label="Company name override"
                            value={proposalTemplate.cover.elegantBusinessName ?? ""}
                            onChange={(value) =>
                              updateTemplate("cover", {
                                ...proposalTemplate.cover,
                                elegantBusinessName:
                                  value.trim() === "" ? undefined : value.trim(),
                              })
                            }
                            placeholder={mergedProfile.businessName || "Como en Ajustes"}
                          />
                          <div>
                            <span className="mb-1.5 block text-sm font-medium">
                              Header logo override
                            </span>
                            {proposalTemplate.cover.elegantLogoUrl ? (
                              <div className="relative overflow-hidden rounded border border-[#d9e2ec]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={proposalTemplate.cover.elegantLogoUrl}
                                  alt=""
                                  className="h-16 w-full object-contain bg-white"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateTemplate("cover", {
                                      ...proposalTemplate.cover,
                                      elegantLogoUrl: undefined,
                                    })
                                  }
                                  className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <p className="mb-2 text-xs text-gray-400">
                                Sin override: se usa el logo de Ajustes.
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => elegantLogoInputRef.current?.click()}
                              className="w-full rounded border border-[#d9e2ec] py-1.5 text-xs font-medium text-gray-600 transition hover:bg-[#f6f8fb]"
                            >
                              {proposalTemplate.cover.elegantLogoUrl
                                ? "Replace logo"
                                : "Upload logo"}
                            </button>
                          </div>
                          <label className="block">
                            <span className="mb-1.5 block text-sm font-medium">
                              Price shown override
                            </span>
                            <input
                              value={proposalTemplate.cover.elegantPriceDisplay ?? ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                updateTemplate("cover", {
                                  ...proposalTemplate.cover,
                                  elegantPriceDisplay:
                                    v.trim() === "" ? undefined : v,
                                });
                              }}
                              placeholder={`Automático: ${elegantPriceAuto}`}
                              className="w-full rounded border border-[#d9e2ec] px-3 py-2 text-sm outline-none transition focus:border-[#111111]"
                            />
                          </label>
                          <CompactInput
                            label="Footer contact name"
                            value={proposalTemplate.cover.elegantContactName ?? ""}
                            onChange={(value) =>
                              updateTemplate("cover", {
                                ...proposalTemplate.cover,
                                elegantContactName:
                                  value.trim() === "" ? undefined : value.trim(),
                              })
                            }
                            placeholder={
                              mergedProfile.contactName ||
                              mergedProfile.businessName ||
                              "Como en Ajustes"
                            }
                          />
                          <CompactInput
                            label="Footer contact title"
                            value={proposalTemplate.cover.elegantContactJobTitle ?? ""}
                            onChange={(value) =>
                              updateTemplate("cover", {
                                ...proposalTemplate.cover,
                                elegantContactJobTitle:
                                  value.trim() === "" ? undefined : value.trim(),
                              })
                            }
                            placeholder={
                              mergedProfile.contactJobTitle?.trim() ||
                              "Como en Ajustes"
                            }
                          />
                          <div>
                            <span className="mb-1.5 block text-sm font-medium">
                              Footer contact photo
                            </span>
                            {proposalTemplate.cover.elegantContactPhotoUrl ? (
                              <div className="relative mb-2 inline-block">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={proposalTemplate.cover.elegantContactPhotoUrl}
                                  alt=""
                                  className="h-16 w-16 rounded-full border border-[#d9e2ec] object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateTemplate("cover", {
                                      ...proposalTemplate.cover,
                                      elegantContactPhotoUrl: undefined,
                                    })
                                  }
                                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <p className="mb-2 text-xs text-gray-400">
                                Sin override: foto de contacto en Ajustes.
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                elegantContactPhotoInputRef.current?.click()
                              }
                              className="w-full rounded border border-[#d9e2ec] py-1.5 text-xs font-medium text-gray-600 transition hover:bg-[#f6f8fb]"
                            >
                              {proposalTemplate.cover.elegantContactPhotoUrl
                                ? "Replace photo"
                                : "Upload photo"}
                            </button>
                          </div>
                          </div>
                        </SidebarSubsection>
                      ) : null}
                    </div>
                  )}

                  {sectionId === "executiveSummary" && (
                    <div className="space-y-3">
                      <LayoutPicker
                        value={getSectionLayout(sectionId)}
                        options={[
                          { value: "stacked", label: "Rows" },
                          { value: "columns", label: "Columns" },
                          { value: "compact", label: "Compact" },
                        ]}
                        onChange={(value) => setSectionLayout(sectionId, value)}
                      />
                      <CompactInput
                        label="Problem Heading"
                        value={proposalTemplate.executiveSummary.problemHeading}
                        onChange={(value) =>
                          updateTemplate("executiveSummary", {
                            ...proposalTemplate.executiveSummary,
                            problemHeading: value,
                          })
                        }
                      />
                      <EditTextarea
                        label="Problem Text"
                        value={proposalTemplate.executiveSummary.problemText}
                        onChange={(value) =>
                          updateTemplate("executiveSummary", {
                            ...proposalTemplate.executiveSummary,
                            problemText: value,
                          })
                        }
                      />
                      <CompactInput
                        label="Solution Heading"
                        value={proposalTemplate.executiveSummary.solutionHeading}
                        onChange={(value) =>
                          updateTemplate("executiveSummary", {
                            ...proposalTemplate.executiveSummary,
                            solutionHeading: value,
                          })
                        }
                      />
                      <EditTextarea
                        label="Solution Text"
                        value={proposalTemplate.executiveSummary.solutionText}
                        onChange={(value) =>
                          updateTemplate("executiveSummary", {
                            ...proposalTemplate.executiveSummary,
                            solutionText: value,
                          })
                        }
                      />
                      <CompactInput
                        label="Value Heading"
                        value={proposalTemplate.executiveSummary.valueHeading}
                        onChange={(value) =>
                          updateTemplate("executiveSummary", {
                            ...proposalTemplate.executiveSummary,
                            valueHeading: value,
                          })
                        }
                      />
                      <EditTextarea
                        label="Value Text"
                        value={proposalTemplate.executiveSummary.valueText}
                        onChange={(value) =>
                          updateTemplate("executiveSummary", {
                            ...proposalTemplate.executiveSummary,
                            valueText: value,
                          })
                        }
                      />
                    </div>
                  )}

                  {sectionId === "existingConditions" && (
                    <div className="space-y-3">
                      <LayoutPicker
                        value={getSectionLayout(sectionId)}
                        options={[
                          { value: "list", label: "Rows" },
                          { value: "columns", label: "Columns" },
                        ]}
                        onChange={(value) => setSectionLayout(sectionId, value)}
                      />
                      <EditTextarea
                        label="Intro Text"
                        value={proposalTemplate.existingConditions.introText}
                        onChange={(value) =>
                          updateTemplate("existingConditions", {
                            ...proposalTemplate.existingConditions,
                            introText: value,
                          })
                        }
                      />
                      <WorkItemsList
                        label="Condition Items"
                        placeholder="Add condition item..."
                        items={proposalTemplate.existingConditions.checklistItems}
                        onChange={(items) => updateTemplate("existingConditions", { ...proposalTemplate.existingConditions, checklistItems: items })}
                      />
                      <LayoutPicker
                        label="Photo Layout"
                        value={getSectionLayout("existingConditionPhotos")}
                        options={[
                          { value: "one", label: "1 / Page" },
                          { value: "twoStacked", label: "2 / Page" },
                          { value: "twoColumns", label: "2 Col" },
                          { value: "grid", label: "Grid" },
                        ]}
                        onChange={(value) =>
                          setSectionLayout("existingConditionPhotos", value)
                        }
                      />
                      <p className="mb-2 text-xs text-gray-400">
                        Add inspection or before photos for this proposal.
                      </p>
                      {existingPhotos.length > 0 && (
                        <div className="mb-2 space-y-2">
                          {existingPhotos.map((src, i) => (
                            <div
                              key={`${src}-${i}`}
                              className="grid grid-cols-[72px_1fr_auto] items-start gap-2 rounded border border-[#d9e2ec] bg-white p-2"
                            >
                              <div className="relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={src}
                                  alt={`Photo ${i + 1}`}
                                  className="h-16 w-full rounded border border-[#d9e2ec] object-cover"
                                />
                              </div>
                              <textarea
                                value={existingPhotoCaptions[i] ?? ""}
                                onChange={(event) =>
                                  updateExistingPhotoCaption(i, event.target.value)
                                }
                                rows={2}
                                placeholder={`Description for photo ${i + 1}...`}
                                className="min-h-16 w-full resize-none rounded border border-[#d9e2ec] px-2 py-1.5 text-xs outline-none transition focus:border-[#111111]"
                              />
                              <button
                                onClick={() => removeExistingPhoto(i)}
                                className="rounded p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                                type="button"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => photoUploadRef.current?.click()}
                        className="flex w-full items-center justify-center gap-2 rounded border border-dashed border-[#d9e2ec] py-3 text-xs text-gray-400 transition hover:border-[#111111] hover:text-[#111111]"
                      >
                        <ImagePlus className="h-3.5 w-3.5" />
                        Upload photos
                      </button>
                    </div>
                  )}

                  {sectionId === "scopeOfWork" && (
                    <div className="space-y-4">
                      <LayoutPicker
                        label="Work items layout"
                        value={getSectionLayout(sectionId)}
                        options={[
                          { value: "numbered", label: "Rows" },
                          { value: "compact", label: "2 Col" },
                        ]}
                        onChange={(value) => setSectionLayout(sectionId, value)}
                      />
                      <SidebarSubsection
                        title="Scope introduction"
                        description="Short paragraph before the detailed work list."
                      >
                        <EditTextarea
                          label="Scope Intro"
                          value={proposalTemplate.scopeOfWork.introText}
                          onChange={(value) =>
                            updateTemplate("scopeOfWork", {
                              ...proposalTemplate.scopeOfWork,
                              introText: value,
                            })
                          }
                          rows={3}
                        />
                      </SidebarSubsection>
                      <SidebarSubsection
                        title="Project summary"
                        description="Optional summary generated by the wizard or edited manually."
                      >
                        <ScopeWizard
                          trade={doc.trade || "Roofing"}
                          onGenerate={(text) => {
                            setScope(text);
                            setShowScope(true);
                          }}
                        />
                        <button
                          onClick={() => setShowScope((v) => !v)}
                          className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-400 transition hover:text-[#213343]"
                        >
                          <ChevronDown
                            className={`h-3 w-3 transition-transform ${
                              showScope ? "" : "-rotate-90"
                            }`}
                          />
                          Edit text manually
                        </button>
                        {showScope && (
                          <textarea
                            value={scope}
                            onChange={(e) => setScope(e.target.value)}
                            rows={5}
                            placeholder="Describe the scope of this project..."
                            className="mt-1.5 w-full resize-none rounded border border-[#d9e2ec] px-3 py-2.5 text-sm outline-none transition focus:border-[#111111]"
                          />
                        )}
                      </SidebarSubsection>
                      <SidebarSubsection
                        title="Detailed work items"
                        description="The numbered items that define exactly what will be performed."
                      >
                        <WorkItemsList
                          label="Work Items"
                          items={proposalTemplate.scopeOfWork.items}
                          onChange={(items) =>
                            updateTemplate("scopeOfWork", {
                              ...proposalTemplate.scopeOfWork,
                              items,
                            })
                          }
                        />
                      </SidebarSubsection>

                      <SidebarSubsection
                        title="Included services"
                        description="Services shown after the detailed scope items."
                        collapsible
                        open={showServices}
                        onOpenChange={setShowServices}
                      >
                        <div className="space-y-1">
                          {displayedServices.map((item) => (
                            <VisibilityRow
                              key={item.name}
                              label={item.name}
                              visible={item.visible}
                              onToggle={() => toggleService(item.name)}
                            />
                          ))}

                          {services.length > SERVICES_COLLAPSE_AT && (
                            <button
                              onClick={() => setShowAllServices((v) => !v)}
                              className="w-full pt-0.5 text-left text-xs text-gray-400 transition hover:text-[#213343]"
                            >
                              {showAllServices
                                ? "Show less"
                                : `Show ${hiddenCount} more`}
                            </button>
                          )}

                          <div className="flex gap-1.5 pt-0.5">
                            <input
                              value={newService}
                              onChange={(e) => setNewService(e.target.value)}
                              onKeyDown={(e) =>
                                e.key === "Enter" && addService()
                              }
                              placeholder="Add service..."
                              className="min-w-0 flex-1 rounded border border-[#d9e2ec] px-3 py-1.5 text-sm outline-none focus:border-[#111111]"
                            />
                            <button
                              onClick={addService}
                              className="rounded border border-[#d9e2ec] px-3 py-1.5 text-sm font-medium transition hover:bg-[#f6f8fb]"
                            >
                              Add
                            </button>
                          </div>
                        </div>

                        {tradeSuggestions.length > 0 && (
                          <div className="pt-1">
                            <button
                              onClick={() => setShowSuggestions((v) => !v)}
                              className="flex w-full items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 transition hover:text-[#213343]"
                            >
                              <ChevronDown
                                className={`h-3 w-3 transition-transform ${
                                  showSuggestions ? "" : "-rotate-90"
                                }`}
                              />
                              Suggestions · {doc.trade}
                            </button>
                            {showSuggestions && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {tradeSuggestions.map((suggestion) => (
                                  <button
                                    key={suggestion}
                                    onClick={() => addSuggestion(suggestion)}
                                    className="rounded border border-[#d9e2ec] px-2 py-1 text-[11px] text-gray-500 transition hover:border-[#111111] hover:text-[#111111]"
                                  >
                                    + {suggestion}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </SidebarSubsection>
                    </div>
                  )}

                  {sectionId === "materialsSpecs" && (
                    <div className="space-y-3">
                      <LayoutPicker
                        value={getSectionLayout(sectionId)}
                        options={[{ value: "table", label: "Table" }, { value: "cards", label: "Cards" }, { value: "list", label: "List" }]}
                        onChange={(value) => setSectionLayout(sectionId, value)}
                      />
                      <EditTextarea
                        label="Materials Intro"
                        value={proposalTemplate.materialsSpecs.introText}
                        onChange={(value) => updateTemplate("materialsSpecs", { ...proposalTemplate.materialsSpecs, introText: value })}
                      />
                      <MaterialsTableEditor
                        items={proposalTemplate.materialsSpecs.items}
                        onChange={(items) => updateTemplate("materialsSpecs", { ...proposalTemplate.materialsSpecs, items })}
                      />
                      <SidebarSubsection
                        title="Materials by package"
                        description="Good / Better / Best rows in the proposal when that tier is selected. Non-empty tiers override company Proposal Settings; leave empty to use Settings."
                      >
                        <div className="space-y-3">
                          {(["Good", "Better", "Best"] as const).map((pkg) => (
                            <div key={pkg}>
                              <MaterialsTableEditor
                                title={`${pkg} tier`}
                                items={proposalTemplate.tierMaterialsByPackage?.[pkg] ?? []}
                                onChange={(items) =>
                                  updateTemplate("tierMaterialsByPackage", {
                                    ...proposalTemplate.tierMaterialsByPackage,
                                    [pkg]: items,
                                  })
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </SidebarSubsection>
                    </div>
                  )}

                  {sectionId === "timeline" && (
                    <div className="space-y-3">
                      <LayoutPicker
                        value={getSectionLayout(sectionId)}
                        options={[
                          { value: "steps", label: "Steps" },
                          { value: "compact", label: "2-Col" },
                          { value: "bars", label: "Bars" },
                          { value: "cards", label: "Cards" },
                        ]}
                        onChange={(value) => setSectionLayout(sectionId, value)}
                      />
                      <CompactInput
                        label="Estimated Days"
                        value={String(proposalTemplate.timeline.estimatedDays)}
                        onChange={(value) => updateTemplate("timeline", { ...proposalTemplate.timeline, estimatedDays: Number(value) || 1 })}
                      />
                      <EditTextarea
                        label="Timeline Intro"
                        value={proposalTemplate.timeline.introText}
                        onChange={(value) => updateTemplate("timeline", { ...proposalTemplate.timeline, introText: value })}
                      />
                      <PhasesEditor
                        phases={proposalTemplate.timeline.phases}
                        onChange={(phases) => updateTemplate("timeline", { ...proposalTemplate.timeline, phases })}
                      />
                    </div>
                  )}

                  {sectionId === "pricing" && (
                    <div className="space-y-3 text-sm">
                      <LayoutPicker
                        label="Pricing layout"
                        value={getSectionLayout(sectionId)}
                        options={[
                          { value: "cards", label: "Cards" },
                          { value: "list", label: "Rows" },
                        ]}
                        onChange={(value) => setSectionLayout(sectionId, value)}
                      />
                      <p className="text-xs text-gray-400">
                        Customer-facing prices. Internal margin and profit are hidden.
                      </p>

                      <SidebarSubsection
                        title="Selected option"
                        description="This is the option highlighted as recommended in the proposal."
                      >
                        <div className="grid grid-cols-3 gap-1">
                          {(["Good", "Better", "Best"] as const).map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setSelectedOption(option)}
                              className={`rounded border px-2 py-2 text-xs font-semibold transition ${
                                selectedOption === option
                                  ? "border-[#111111] bg-[#111111] text-white"
                                  : "border-[#d9e2ec] text-gray-500 hover:bg-[#f6f8fb]"
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </SidebarSubsection>

                      <SidebarSubsection
                        title="Customer price options"
                        description="Shown to the client. Profit and margin stay internal."
                      >
                        <div className="space-y-2">
                          <MiniPriceRow
                            label="Good"
                            value={formatMoney(doc.goodPrice)}
                            recommended={selectedOption === "Good"}
                          />
                          <MiniPriceRow
                            label="Better"
                            value={formatMoney(doc.betterPrice)}
                            recommended={selectedOption === "Better"}
                          />
                          <MiniPriceRow
                            label="Best"
                            value={formatMoney(doc.bestPrice)}
                            recommended={selectedOption === "Best"}
                          />
                        </div>
                      </SidebarSubsection>

                      <SidebarSubsection
                        title="Pricing copy"
                        description="Intro and package descriptions shown in the Investment section."
                      >
                        <div className="space-y-3">
                          <EditTextarea
                            label="Pricing Intro"
                            value={proposalTemplate.pricing.introText}
                            onChange={(value) =>
                              updateTemplate("pricing", {
                                ...proposalTemplate.pricing,
                                introText: value,
                              })
                            }
                          />
                          <EditTextarea
                            label="Good Package Text"
                            value={pricingDescriptions.Good}
                            onChange={(value) =>
                              setPricingDescriptions((current) => ({
                                ...current,
                                Good: value,
                              }))
                            }
                            rows={2}
                          />
                          <EditTextarea
                            label="Better Package Text"
                            value={pricingDescriptions.Better}
                            onChange={(value) =>
                              setPricingDescriptions((current) => ({
                                ...current,
                                Better: value,
                              }))
                            }
                            rows={2}
                          />
                          <EditTextarea
                            label="Best Package Text"
                            value={pricingDescriptions.Best}
                            onChange={(value) =>
                              setPricingDescriptions((current) => ({
                                ...current,
                                Best: value,
                              }))
                            }
                            rows={2}
                          />
                          <p className="text-xs text-gray-400">
                            Materials / brand (optional): shown under each price, e.g. IKO, GAF, Owens Corning.
                          </p>
                          <EditTextarea
                            label="Good — materials / brand"
                            value={tierMaterialSummaries.Good}
                            onChange={(value) =>
                              setTierMaterialSummaries((current) => ({ ...current, Good: value }))
                            }
                            rows={1}
                          />
                          <EditTextarea
                            label="Better — materials / brand"
                            value={tierMaterialSummaries.Better}
                            onChange={(value) =>
                              setTierMaterialSummaries((current) => ({ ...current, Better: value }))
                            }
                            rows={1}
                          />
                          <EditTextarea
                            label="Best — materials / brand"
                            value={tierMaterialSummaries.Best}
                            onChange={(value) =>
                              setTierMaterialSummaries((current) => ({ ...current, Best: value }))
                            }
                            rows={1}
                          />
                        </div>
                      </SidebarSubsection>

                      <SidebarSubsection
                        title="Allowances & financing"
                        description="Optional notes shown below pricing."
                      >
                        <div className="space-y-3">
                          <VisibilityRow
                            label="Show financing note"
                            visible={proposalTemplate.pricing.showFinancingOption}
                            onToggle={() =>
                              updateTemplate("pricing", {
                                ...proposalTemplate.pricing,
                                showFinancingOption:
                                  !proposalTemplate.pricing.showFinancingOption,
                              })
                            }
                          />
                          <EditTextarea
                            label="Allowances & Exclusions"
                            value={proposalTemplate.pricing.allowancesText}
                            onChange={(value) =>
                              updateTemplate("pricing", {
                                ...proposalTemplate.pricing,
                                allowancesText: value,
                              })
                            }
                          />
                          {proposalTemplate.pricing.showFinancingOption ? (
                            <EditTextarea
                              label="Financing Text"
                              value={proposalTemplate.pricing.financingText}
                              onChange={(value) =>
                                updateTemplate("pricing", {
                                  ...proposalTemplate.pricing,
                                  financingText: value,
                                })
                              }
                            />
                          ) : null}
                        </div>
                      </SidebarSubsection>
                    </div>
                  )}

                  {sectionId === "warranty" && (
                    <div className="space-y-3">
                      <LayoutPicker
                        value={getSectionLayout(sectionId)}
                        options={[{ value: "columns", label: "2 Columns" }, { value: "stacked", label: "Stacked" }]}
                        onChange={(value) => setSectionLayout(sectionId, value)}
                      />
                      <CompactInput
                        label="Workmanship Years"
                        value={String(proposalTemplate.warranty.workmanshipYears)}
                        onChange={(value) =>
                          updateTemplate("warranty", {
                            ...proposalTemplate.warranty,
                            workmanshipYears: Number(value) || 1,
                          })
                        }
                      />
                      <EditTextarea
                        label="Warranty Text"
                        value={warranty}
                        onChange={setWarranty}
                      />
                      <EditTextarea
                        label="Manufacturer Warranty"
                        value={proposalTemplate.warranty.manufacturerText}
                        onChange={(value) =>
                          updateTemplate("warranty", {
                            ...proposalTemplate.warranty,
                            manufacturerText: value,
                          })
                        }
                      />
                    </div>
                  )}

                  {sectionId === "terms" && (
                    <div className="space-y-3">
                      <LayoutPicker
                        value={getSectionLayout(sectionId)}
                        options={[{ value: "text", label: "Text" }, { value: "bullets", label: "Bullets" }]}
                        onChange={(value) => setSectionLayout(sectionId, value)}
                      />
                      <EditTextarea label="Terms & Conditions" value={terms} onChange={setTerms} rows={6} />
                    </div>
                  )}

                  {sectionId === "acceptance" && (
                    <div className="space-y-4">
                      <LayoutPicker
                        value={getSectionLayout(sectionId)}
                        options={[{ value: "standard", label: "Standard" }, { value: "compact", label: "Compact" }]}
                        onChange={(value) => setSectionLayout(sectionId, value)}
                      />
                      <EditTextarea
                        label="Acceptance Text"
                        value={proposalTemplate.acceptance.contractIntroText}
                        onChange={(value) =>
                          updateTemplate("acceptance", {
                            ...proposalTemplate.acceptance,
                            contractIntroText: value,
                          })
                        }
                      />
                      <EditTextarea
                        label="Payment Schedule"
                        value={proposalTemplate.acceptance.paymentScheduleText}
                        onChange={(value) =>
                          updateTemplate("acceptance", {
                            ...proposalTemplate.acceptance,
                            paymentScheduleText: value,
                          })
                        }
                      />
                      <CompactInput
                        label="Payment Portal URL"
                        value={proposalTemplate.acceptance.paymentLinkUrl}
                        onChange={(value) =>
                          updateTemplate("acceptance", {
                            ...proposalTemplate.acceptance,
                            paymentLinkUrl: value,
                          })
                        }
                      />
                      <SidebarSubsection
                        title="Certifications"
                        description="Which items appear on this proposal."
                        collapsible
                        open={showCerts}
                        onOpenChange={setShowCerts}
                      >
                        <div className="space-y-1">
                          {certs.map((cert) => (
                            <VisibilityRow
                              key={cert.name}
                              label={cert.name}
                              visible={cert.visible}
                              onToggle={() => toggleCert(cert.name)}
                            />
                          ))}
                          <div className="flex gap-1.5 pt-0.5">
                            <input
                              value={newCert}
                              onChange={(e) => setNewCert(e.target.value)}
                              onKeyDown={(e) =>
                                e.key === "Enter" && addCert()
                              }
                              placeholder="Add certification..."
                              className="min-w-0 flex-1 rounded border border-[#d9e2ec] px-3 py-1.5 text-sm outline-none focus:border-[#111111]"
                            />
                            <button
                              onClick={addCert}
                              className="rounded border border-[#d9e2ec] px-3 py-1.5 text-sm font-medium transition hover:bg-[#f6f8fb]"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </SidebarSubsection>

                      <Link
                        href={
                          quote.clientPortalToken
                            ? `/proposal/${quote.id}/accept?t=${encodeURIComponent(quote.clientPortalToken)}`
                            : `/proposal/${quote.id}/accept`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center justify-center gap-2 rounded-lg border border-[#ff5c35] px-3 py-2 text-xs font-semibold text-[#ff5c35] transition hover:bg-[#fff1ea] ${!quote.clientPortalToken ? "pointer-events-none opacity-50" : ""}`}
                        aria-disabled={!quote.clientPortalToken}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open Client Portal
                      </Link>
                    </div>
                  )}
                  {custom && (
                    <div className="space-y-3">
                      <CompactInput
                        label="Section Title"
                        value={custom.title}
                        onChange={(value) => setCustomSections((prev) => prev.map((s) => s.id === custom.id ? { ...s, title: value } : s))}
                      />
                      <EditTextarea
                        label="Content"
                        value={custom.content}
                        onChange={(value) => setCustomSections((prev) => prev.map((s) => s.id === custom.id ? { ...s, content: value } : s))}
                        rows={6}
                        placeholder="Enter your custom section text here..."
                      />
                      <button
                        type="button"
                        onClick={() => removeCustomSection(custom.id)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete Section
                      </button>
                    </div>
                  )}
                </ProposalSectionPanel>
                </div>
              );
            })}
            <button
              type="button"
              onClick={addCustomSection}
              className="flex w-full items-center justify-center gap-2 rounded border border-dashed border-[#d9e2ec] py-2.5 text-xs text-gray-400 transition hover:border-[#213343] hover:text-[#213343]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Custom Section
            </button>

            <div className="rounded border border-[#d9e2ec] bg-white">
              <button
                type="button"
                onClick={() => setShowProposalHealth((value) => !value)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-[#f6f8fb]"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Proposal Health
                  </p>
                  <p className="mt-0.5 truncate text-sm font-medium text-[#213343]">
                    {proposalHealth}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded px-2 py-1 text-xs font-medium ${
                      proposalHealth === "Ready to send"
                        ? "bg-green-50 text-green-700"
                        : proposalHealth === "Needs review"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-700"
                    }`}
                  >
                    {unresolvedHealthItems.length} issue{unresolvedHealthItems.length === 1 ? "" : "s"}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-gray-400 transition-transform ${
                      showProposalHealth ? "" : "-rotate-90"
                    }`}
                  />
                </div>
              </button>

              {showProposalHealth ? (
                <div className="border-t border-[#eef2f6] px-3 py-3">
                  <div className="space-y-1.5">
                    {healthItems.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-start gap-2 text-xs leading-relaxed"
                      >
                        {item.ok ? (
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
                        ) : (
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                        )}
                        <div>
                          <p className={item.ok ? "text-gray-500" : "font-medium text-[#213343]"}>
                            {item.label}
                          </p>
                          {!item.ok ? (
                            <p className="text-gray-400">{item.detail}</p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>

                  {quoteVersions.length > 0 ? (
                    <div className="mt-3 border-t border-[#eef2f6] pt-2">
                      <button
                        type="button"
                        onClick={() => setShowVersions((value) => !value)}
                        className="flex w-full items-center justify-between text-xs text-gray-400 transition hover:text-[#213343]"
                      >
                        <span>
                          {quoteVersions.length} saved version{quoteVersions.length === 1 ? "" : "s"}
                        </span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform ${
                            showVersions ? "" : "-rotate-90"
                          }`}
                        />
                      </button>
                      {showVersions ? (
                        <div className="mt-2 space-y-1.5">
                          {quoteVersions.slice(0, 5).map((version) => (
                            <div
                              key={version.id}
                              className="flex items-center justify-between gap-2 rounded border border-[#eef2f6] px-2 py-1.5 text-xs"
                            >
                              <span className="truncate text-gray-500">
                                {new Date(version.savedAt).toLocaleString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </span>
                              <button
                                type="button"
                                onClick={() => restoreVersion(version)}
                                className="shrink-0 font-medium text-[#ff5c35] transition hover:text-[#e94820]"
                              >
                                Restore
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          </div>
        </aside>

        {/* ── Document preview ── */}
        <div ref={previewScrollRef} className={`min-w-0 flex-1 overflow-y-auto pr-1 ${mobileTab === "edit" ? "hidden lg:block" : "block"}`}>
          <div className="mx-auto max-w-260 space-y-6">
            <div className="print:hidden rounded-xl border border-[#d9e2ec] bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Live A4 Proposal Preview
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Paginated preview refreshes shortly after you pause typing (same layout as print, PDF, and client portal). Each sheet is A4 with live page breaks.
              </p>
            </div>
            <div
              className={
                coverLayout === "elegant"
                  ? "rounded border border-[#d9e2ec] bg-[#e9eef4] px-1 py-2 shadow-inner"
                  : "rounded border border-[#d9e2ec] bg-[#e9eef4] px-8 py-8 shadow-inner"
              }
            >
              <PagedProposalPreview debounceMs={380} renderKey={pagedRenderKey}>
                <ProposalDocument
                  template={proposalTemplate}
                  quote={proposalQuote}
                  settings={settings}
                  photos={existingPhotos}
                  photoCaptions={existingPhotoCaptions}
                  coverPhotoUrl={coverImageUrl}
                  coverLayout={coverLayout}
                  proposalNumber={doc.proposalNumber}
                  sectionOverrides={sectionOverrides}
                  sectionLayouts={sectionLayouts}
                  sectionOrder={sectionOrder}
                  customSections={customSections}
                />
              </PagedProposalPreview>
            </div>
          </div>
        </div>
      </div>

      {/* ── Full Proposal Preview Modal ── */}
      {showProposalModal && proposalTemplate && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#d9e2ec] bg-white px-6 py-3 shadow-sm print:hidden">
            <p className="text-sm font-semibold text-[#213343]">
              Full Proposal — {doc.proposalNumber} · {quote.customerName}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-md border border-[#d9e2ec] px-3 py-2 text-sm transition hover:bg-gray-50"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
              <button
                onClick={() => setShowProposalModal(false)}
                className="flex items-center gap-1.5 rounded-md border border-[#d9e2ec] px-3 py-2 text-sm transition hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
                Close
              </button>
            </div>
          </div>
          <div
            className={
              coverLayout === "elegant"
                ? "bg-[#e9eef4] px-2 py-3"
                : "bg-[#e9eef4] px-6 py-8"
            }
          >
            <div className="mx-auto max-w-260">
              <PagedProposalPreview debounceMs={380} renderKey={pagedRenderKey}>
              <ProposalDocument
                template={proposalTemplate}
                quote={proposalQuote}
                settings={settings}
                photos={existingPhotos}
                photoCaptions={existingPhotoCaptions}
                coverPhotoUrl={coverImageUrl}
                coverLayout={coverLayout}
                proposalNumber={doc.proposalNumber}
                sectionOverrides={sectionOverrides}
                sectionLayouts={sectionLayouts}
                sectionOrder={sectionOrder}
                customSections={customSections}
              />
              </PagedProposalPreview>
            </div>
          </div>
        </div>
      )}

      {/* ── Template Editor Panel ── */}
      {proposalTemplate && (
        <>
          {showDuplicateTemplateModal ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl">
                <h3 className="text-lg font-bold text-[#213343]">Duplicate template</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Copying from <span className="font-medium text-[#213343]">{proposalTemplate.trade}</span>. The new
                  name must be unique — quotes use it to pick which template to load.
                </p>
                <div className="mt-5">
                  <label className="mb-1.5 block text-sm font-medium text-[#213343]">New trade / service name</label>
                  <input
                    autoFocus
                    value={duplicateTemplateTradeName}
                    onChange={(e) => {
                      setDuplicateTemplateTradeName(e.target.value);
                      setDuplicateTemplateError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && void handleDuplicateTemplateSubmit()}
                    placeholder="e.g. Commercial Roofing"
                    className="w-full rounded-lg border border-[#d9e2ec] px-4 py-2.5 text-sm outline-none focus:border-[#ff5c35] focus:ring-2 focus:ring-[#ff5c35]/20"
                  />
                  {duplicateTemplateError ? (
                    <p className="mt-1.5 text-xs text-red-500">{duplicateTemplateError}</p>
                  ) : null}
                </div>
                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDuplicateTemplateModal(false);
                      setDuplicateTemplateTradeName("");
                      setDuplicateTemplateError("");
                    }}
                    className="flex-1 rounded-lg border border-[#d9e2ec] py-2.5 text-sm text-gray-500 transition hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={duplicateTemplateBusy}
                    onClick={() => void handleDuplicateTemplateSubmit()}
                    className="flex-1 rounded-lg bg-[#ff5c35] py-2.5 text-sm font-semibold text-white transition hover:bg-[#e94820] disabled:opacity-60"
                  >
                    {duplicateTemplateBusy ? "Checking…" : "Open copy in editor"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          <TemplateEditorPanel
            key={`${(templateEditorDraft ?? proposalTemplate).id}-${
              (templateEditorDraft ?? proposalTemplate).lastModified
            }-${showTemplateEditor ? "open" : "closed"}`}
            template={templateEditorDraft ?? proposalTemplate}
            open={showTemplateEditor}
            onClose={() => {
              setShowTemplateEditor(false);
              setTemplateEditorDraft(null);
            }}
            onSave={handleTemplateSave}
          />
        </>
      )}
    </div>
  );
}

function ProposalSectionPanel({
  label,
  description,
  open,
  visible,
  onOpen,
  onToggleVisible,
  children,
}: {
  label: string;
  description: string;
  open: boolean;
  visible: boolean;
  onOpen: () => void;
  onToggleVisible: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className={`overflow-hidden rounded border transition ${
        open
          ? visible
            ? "border-[#213343] bg-white"
            : "border-gray-300 bg-[#f6f8fb]"
          : visible
            ? "border-[#d9e2ec] bg-white"
            : "border-[#e6edf4] bg-[#f6f8fb]"
      }`}
    >
      <div className="flex items-center gap-1.5 px-2 py-2">
        <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-gray-300 active:cursor-grabbing" />
        <button
          onClick={onOpen}
          className="min-w-0 flex-1 text-left"
          type="button"
          title={open ? "Collapse section editor" : "Expand section editor"}
        >
          <div className="flex items-center gap-1.5">
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${open ? "" : "-rotate-90"}`}
              aria-hidden
            />
            <span className={`truncate text-sm font-medium ${visible ? "text-[#213343]" : "text-gray-400"}`}>
              {label}
            </span>
          </div>
          {open && (
            <p className="mt-1 pl-5 text-xs leading-relaxed text-gray-400">{description}</p>
          )}
        </button>
        <span
          className={`hidden shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium sm:inline-flex ${
            visible ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"
          }`}
        >
          {visible ? "Shown" : "Hidden"}
        </span>
        <button
          onClick={onToggleVisible}
          title={
            visible
              ? "Eye: hide this block from the client (PDF, preview, portal). Chevron on the title collapses the editor only."
              : "Eye: show this block to the client again"
          }
          className="shrink-0 rounded p-1 text-gray-400 transition hover:bg-[#f6f8fb] hover:text-[#213343]"
          type="button"
        >
          {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 opacity-40" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-[#eef2f6] px-3 py-3">
          {!visible ? (
            <div className="mb-3 rounded border border-gray-200 bg-white px-3 py-2 text-xs leading-relaxed text-gray-500">
              Hidden from the client: preview, PDF, and portal. Use the <strong>chevron on the section title</strong> to
              collapse this editor; use the <strong>eye</strong> only to include or exclude the section from what the
              client sees.
            </div>
          ) : null}
          {children}
        </div>
      )}
    </div>
  );
}

function VisibilityRow({
  label,
  visible,
  onToggle,
}: {
  label: string;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded border px-3 py-1.5 text-sm transition ${
        visible ? "border-[#d9e2ec]" : "border-[#e9ecef] bg-[#f6f8fb]"
      }`}
    >
      <span className={visible ? "text-[#213343]" : "text-gray-400"}>
        {label}
      </span>
      <button
        onClick={onToggle}
        title={visible ? "Hide this line from the client proposal" : "Show on client proposal"}
        className="shrink-0 text-gray-400 transition hover:text-[#213343]"
        type="button"
      >
        {visible ? (
          <Eye className="h-3.5 w-3.5" />
        ) : (
          <EyeOff className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    </div>
  );
}

function SidebarSubsection({
  title,
  description,
  muted = false,
  collapsible = false,
  open: openControlled,
  onOpenChange,
  children,
}: {
  title: string;
  description?: string;
  muted?: boolean;
  /** One header row: title + chevron toggles children (avoids a second “close” row under the title). */
  collapsible?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(true);
  const controlled = collapsible && typeof openControlled === "boolean" && onOpenChange;
  const expanded = collapsible ? (controlled ? openControlled : uncontrolledOpen) : true;

  function toggle() {
    if (!collapsible) return;
    if (controlled) onOpenChange(!openControlled);
    else setUncontrolledOpen((o) => !o);
  }

  const headerBody = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p>
      {description ? (
        <p className="mt-1 text-xs leading-relaxed text-gray-400">{description}</p>
      ) : null}
    </>
  );

  return (
    <div
      className={`rounded border p-3 ${
        muted
          ? "border-[#e8eef5] bg-[#f9fafb]"
          : "border-[#e8eef5] bg-white"
      }`}
    >
      {collapsible ? (
        <button
          type="button"
          onClick={toggle}
          className="mb-3 flex w-full items-start justify-between gap-2 rounded-md text-left outline-none ring-[#ff5c35] focus-visible:ring-2"
        >
          <div className="min-w-0">{headerBody}</div>
          <ChevronDown
            className={`mt-0.5 h-4 w-4 shrink-0 text-gray-400 transition-transform ${expanded ? "" : "-rotate-90"}`}
            aria-hidden
          />
        </button>
      ) : (
        <div className="mb-3">{headerBody}</div>
      )}
      {expanded ? children : null}
    </div>
  );
}

function defaultSectionLayout(sectionId: string) {
  if (sectionId === "executiveSummary") return "stacked";
  if (sectionId === "existingConditions") return "list";
  if (sectionId === "existingConditionPhotos") return "twoColumns";
  if (sectionId === "scopeOfWork") return "numbered";
  if (sectionId === "materialsSpecs") return "table";
  if (sectionId === "timeline") return "steps";
  if (sectionId === "pricing") return "cards";
  if (sectionId === "warranty") return "columns";
  if (sectionId === "terms") return "text";
  if (sectionId === "acceptance") return "standard";
  return "default";
}

function LayoutPicker({
  label = "Layout",
  value,
  options,
  onChange,
}: {
  label?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <div className="flex gap-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex-1 rounded border py-1.5 text-xs font-medium transition ${
              value === option.value
                ? "border-[#111111] bg-[#111111] text-white"
                : "border-[#d9e2ec] text-gray-500 hover:bg-[#f6f8fb]"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MiniPriceRow({
  label,
  value,
  recommended = false,
}: {
  label: string;
  value: string;
  recommended?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded border border-[#d9e2ec] px-3 py-2">
      <span className="text-gray-500">
        {label}
        {recommended ? (
          <span className="ml-2 rounded bg-[#111111] px-1.5 py-0.5 text-[10px] font-semibold text-white">
            Rec
          </span>
        ) : null}
      </span>
      <span className="font-semibold text-[#213343]">{value}</span>
    </div>
  );
}

function getProposalHealthItems({
  quote,
  coverImageUrl,
  scope,
  warranty,
  terms,
  services,
  existingPhotos,
  existingPhotoCaptions,
  sectionOrder,
  isSectionVisible,
}: {
  quote: Quote;
  coverImageUrl: string | null;
  scope: string;
  warranty: string;
  terms: string;
  services: ServiceItem[];
  existingPhotos: string[];
  existingPhotoCaptions: string[];
  sectionOrder: string[];
  isSectionVisible: (sectionId: string) => boolean;
}): ProposalHealthItem[] {
  const visibleSections = sectionOrder.filter(isSectionVisible);
  const missingCaptions = existingPhotos.filter(
    (_, index) => !existingPhotoCaptions[index]?.trim()
  ).length;
  const expires = quote.expiresAt ? new Date(quote.expiresAt) : null;
  const expired = Boolean(expires && expires < new Date());

  return [
    {
      label: "Cover photo",
      ok: Boolean(coverImageUrl),
      detail: "Add a property or project photo so the first page feels complete.",
    },
    {
      label: "Scope summary",
      ok: scope.trim().length >= 40,
      detail: "Add a clear project summary before sending.",
    },
    {
      label: "Included services",
      ok: services.some((service) => service.visible),
      detail: "Show at least one included service or hide the Scope services block.",
    },
    {
      label: "Photo descriptions",
      ok: missingCaptions === 0,
      detail: `${missingCaptions} existing-condition photo${missingCaptions === 1 ? "" : "s"} need descriptions.`,
    },
    {
      label: "Warranty text",
      ok: warranty.trim().length >= 30,
      detail: "Add warranty language or hide the warranty section.",
    },
    {
      label: "Terms",
      ok: terms.trim().length >= 60,
      detail: "Terms should be present before the client signs.",
    },
    {
      label: "Expiration date",
      ok: !expired,
      detail: "This proposal is expired. Update the quote before sending.",
    },
    {
      label: "Visible sections",
      ok: visibleSections.length >= 4,
      detail: "Too many sections are hidden. Confirm the client still has enough context.",
    },
  ];
}

function CompactInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded border border-[#d9e2ec] px-3 py-2 text-sm outline-none transition focus:border-[#111111]"
      />
    </label>
  );
}

function PhasesEditor({
  phases,
  onChange,
}: {
  phases: TimelinePhase[];
  onChange: (phases: TimelinePhase[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  function startEdit(phase: TimelinePhase) {
    setEditingId(phase.id);
    setEditName(phase.name);
    setEditDesc(phase.description);
  }

  function commitEdit() {
    if (!editingId) return;
    onChange(phases.map((p) => p.id === editingId ? { ...p, name: editName, description: editDesc } : p));
    setEditingId(null);
  }

  function removePhase(id: string) {
    onChange(phases.filter((p) => p.id !== id));
    if (editingId === id) setEditingId(null);
  }

  function addPhase() {
    if (!newName.trim()) return;
    const id = Math.random().toString(36).slice(2, 8);
    onChange([...phases, { id, name: newName, description: newDesc }]);
    setNewName("");
    setNewDesc("");
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">Timeline Phases</p>
      <div className="space-y-1.5">
        {phases.map((phase, i) => (
          <div key={phase.id} className="overflow-hidden rounded border border-[#d9e2ec]">
            {editingId === phase.id ? (
              <div className="space-y-1.5 p-2">
                <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Phase name" className="w-full rounded border border-[#d9e2ec] px-2 py-1.5 text-xs outline-none focus:border-[#111111]" />
                <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} placeholder="Description" className="w-full resize-none rounded border border-[#d9e2ec] px-2 py-1.5 text-xs outline-none focus:border-[#111111]" />
                <div className="flex justify-end gap-1.5 pt-0.5">
                  <button onClick={() => setEditingId(null)} className="rounded border border-[#d9e2ec] px-3 py-1 text-xs transition hover:bg-gray-50">Cancel</button>
                  <button onClick={commitEdit} className="rounded bg-[#111111] px-3 py-1 text-xs text-white transition hover:bg-[#333]">Save</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 p-2">
                <span className="mt-0.5 w-4 shrink-0 text-center text-[10px] font-bold text-[#ff5c35]">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-[#213343]">{phase.name}</p>
                  {phase.description && <p className="mt-0.5 line-clamp-2 text-[10px] text-gray-400">{phase.description}</p>}
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <button onClick={() => startEdit(phase)} className="rounded p-1 text-gray-400 transition hover:bg-[#f6f8fb] hover:text-[#213343]">
                    <Edit3 className="h-3 w-3" />
                  </button>
                  <button onClick={() => removePhase(phase.id)} className="rounded p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 space-y-1.5">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addPhase()} placeholder="New phase name..." className="w-full rounded border border-[#d9e2ec] px-3 py-1.5 text-xs outline-none focus:border-[#111111]" />
        {newName && (
          <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} placeholder="Description (optional)..." className="w-full resize-none rounded border border-[#d9e2ec] px-3 py-1.5 text-xs outline-none focus:border-[#111111]" />
        )}
        <button onClick={addPhase} disabled={!newName.trim()} className="flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-[#d9e2ec] py-1.5 text-xs text-gray-400 transition hover:border-[#111111] hover:text-[#111111] disabled:opacity-50">
          <Plus className="h-3 w-3" />
          Add Phase
        </button>
      </div>
    </div>
  );
}

function WorkItemsList({
  items,
  onChange,
  label = "Detailed Work Items",
  placeholder = "Add work item...",
}: {
  items: string[];
  onChange: (items: string[]) => void;
  label?: string;
  placeholder?: string;
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [newItem, setNewItem] = useState("");

  function startEdit(index: number) {
    setEditingIndex(index);
    setEditingValue(items[index]);
  }

  function commitEdit(index: number) {
    const trimmed = editingValue.trim();
    if (!trimmed) {
      onChange(items.filter((_, i) => i !== index));
    } else {
      const next = [...items];
      next[index] = trimmed;
      onChange(next);
    }
    setEditingIndex(null);
    setEditingValue("");
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  }

  function addItem() {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    onChange([...items, trimmed]);
    setNewItem("");
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <span className="mt-2 w-4 shrink-0 text-center text-[10px] font-semibold text-[#ff5c35]">
              {i + 1}
            </span>
            {editingIndex === i ? (
              <textarea
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={() => commitEdit(i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    commitEdit(i);
                  }
                  if (e.key === "Escape") setEditingIndex(null);
                }}
                autoFocus
                rows={2}
                className="flex-1 resize-none rounded border border-[#111111] px-2 py-1.5 text-xs outline-none w-full"
              />
            ) : (
              <div className="flex flex-1 items-start gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(i)}
                  className="flex-1 rounded border border-transparent px-2 py-1.5 text-left text-xs text-[#213343] transition hover:border-[#d9e2ec] hover:bg-[#f6f8fb]"
                >
                  {item}
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="mt-0.5 shrink-0 rounded p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded border border-[#d9e2ec] px-3 py-1.5 text-xs outline-none focus:border-[#111111]"
        />
        <button
          type="button"
          onClick={addItem}
          className="rounded border border-[#d9e2ec] px-3 py-1.5 text-xs font-medium transition hover:bg-[#f6f8fb]"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function EditTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-none rounded border border-[#d9e2ec] px-3 py-2.5 text-sm outline-none transition focus:border-[#111111]"
      />
    </label>
  );
}

export default function QuotePreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa]">
          <p className="text-sm text-gray-400">Loading preview…</p>
        </div>
      }
    >
      <QuotePreviewContent />
    </Suspense>
  );
}
