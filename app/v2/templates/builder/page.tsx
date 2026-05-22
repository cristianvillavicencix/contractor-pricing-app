"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { V2Shell } from "../../_shared/Shell";
import { Icon } from "../../_shared/icons";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  listProposalTemplates,
  loadCompanySettings,
  upsertProposalTemplate,
} from "@/lib/supabase/data";
import {
  defaultBlockProposalTemplates,
  mergeProposalTemplates,
  PROPOSAL_TEMPLATE_CATEGORIES,
  type ProposalTemplate,
  type ProposalTemplateCategory,
} from "@/lib/proposal-templates";
import { defaultSettings, mergeAppSettings, type AppSettings, type Quote } from "@/lib/app-data";
import { createDefaultProposalBlocks, normalizeProposalBlocks } from "@/lib/proposal-blocks";
import type { ProposalBlock } from "@/types/proposal-blocks";
import { BlockEditor } from "@/components/block-editor/BlockEditor";

function TemplateBuilderInner() {
  const params = useSearchParams();
  const requestedId = params.get("templateId");
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [templates, setTemplates] = useState<ProposalTemplate[]>(defaultBlockProposalTemplates);
  const [settings, setSettings] = useState<AppSettings>(() => defaultSettings);
  const [activeId, setActiveId] = useState(requestedId ?? defaultBlockProposalTemplates[0]?.id ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [saved, rawSettings] = await Promise.all([
          listProposalTemplates(supabase),
          loadCompanySettings<AppSettings>(supabase).catch(() => null),
        ]);
        if (cancelled) return;
        const merged = mergeProposalTemplates(saved).filter((t) => t.builderVersion === "blocks");
        setTemplates(merged.length ? merged : defaultBlockProposalTemplates);
        setSettings(mergeAppSettings(rawSettings ?? defaultSettings));
        if (requestedId && merged.some((t) => t.id === requestedId)) setActiveId(requestedId);
        else setActiveId((merged[0] ?? defaultBlockProposalTemplates[0]).id);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load templates.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [requestedId, supabase]);

  const activeTemplate = templates.find((t) => t.id === activeId) ?? templates[0] ?? defaultBlockProposalTemplates[0];
  const blocks = normalizeProposalBlocks(
    activeTemplate.proposalBlocks?.length
      ? activeTemplate.proposalBlocks
      : createDefaultProposalBlocks(activeTemplate, settings)
  );
  const dummyQuote = makeTemplatePreviewQuote(activeTemplate);

  async function saveTemplate(updatedBlocks: ProposalBlock[]) {
    const updated: ProposalTemplate = {
      ...activeTemplate,
      builderVersion: "blocks",
      category: activeTemplate.category ?? (activeTemplate.trade as ProposalTemplateCategory) ?? "Generic",
      proposalBlocks: normalizeProposalBlocks(updatedBlocks),
      lastModified: new Date().toISOString().slice(0, 10),
    };
    await upsertProposalTemplate(supabase, updated);
    setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function duplicateTemplate(updatedBlocks: ProposalBlock[]) {
    const copy: ProposalTemplate = {
      ...JSON.parse(JSON.stringify(activeTemplate)),
      id: `block-${crypto.randomUUID()}`,
      name: `${activeTemplate.name} Copy`,
      builderVersion: "blocks",
      proposalBlocks: normalizeProposalBlocks(updatedBlocks),
      lastModified: new Date().toISOString().slice(0, 10),
    };
    await upsertProposalTemplate(supabase, copy);
    setTemplates((prev) => [copy, ...prev]);
    setActiveId(copy.id);
  }

  function createBlankTemplate(category: ProposalTemplateCategory) {
    const source = defaultBlockProposalTemplates.find((t) => t.category === category) ?? defaultBlockProposalTemplates[0];
    const copy: ProposalTemplate = {
      ...JSON.parse(JSON.stringify(source)),
      id: `block-${crypto.randomUUID()}`,
      trade: category,
      category,
      name: `${category} Template`,
      builderVersion: "blocks",
      lastModified: new Date().toISOString().slice(0, 10),
    };
    setTemplates((prev) => [copy, ...prev]);
    setActiveId(copy.id);
    void upsertProposalTemplate(supabase, copy);
  }

  if (loading) {
    return <div style={center}>Loading block templates…</div>;
  }

  if (error) {
    return (
      <div style={center}>
        <p style={{ color: "#991b1b", margin: 0 }}>{error}</p>
        <Link href="/proposals" className="btn ghost">Back to proposals</Link>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", overflow: "hidden" }}>
      <aside
        style={{
          width: 280,
          borderRight: "1px solid #e5e7eb",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 16, borderBottom: "1px solid #e5e7eb" }}>
          <Link href="/proposals" className="btn ghost" style={{ marginBottom: 12 }}>
            <Icon name="chevron-l" size={14} /> Proposals
          </Link>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>Block Templates</div>
          <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 3 }}>
            Professional reusable proposal structures.
          </div>
        </div>

        <div style={{ padding: 12, display: "flex", gap: 6, flexWrap: "wrap", borderBottom: "1px solid #f3f4f6" }}>
          {PROPOSAL_TEMPLATE_CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => createBlankTemplate(category)}
              style={{
                border: "1px solid #e5e7eb",
                background: "#f9fafb",
                borderRadius: 999,
                padding: "5px 9px",
                fontSize: 11.5,
                cursor: "pointer",
                color: "#374151",
              }}
              title={`Create ${category} template`}
            >
              + {category}
            </button>
          ))}
        </div>

        <div style={{ overflow: "auto", padding: 10 }}>
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => setActiveId(template.id)}
              style={{
                width: "100%",
                textAlign: "left",
                border: activeId === template.id ? "1px solid #d6a817" : "1px solid #e5e7eb",
                background: activeId === template.id ? "#fffbea" : "#fff",
                borderRadius: 10,
                padding: 12,
                marginBottom: 8,
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 800, color: "#111827" }}>{template.name}</div>
              <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 3 }}>
                {template.category ?? template.trade} · {template.proposalBlocks?.length ?? 0} blocks
              </div>
            </button>
          ))}
        </div>
      </aside>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <BlockEditor
          key={activeTemplate.id}
          mode="template"
          initialBlocks={blocks}
          quote={dummyQuote}
          settings={settings}
          template={activeTemplate}
          supabase={supabase}
          backHref="/v2/proposals"
          titleOverride={activeTemplate.name}
          subtitleOverride={`${activeTemplate.category ?? activeTemplate.trade} template`}
          onSaveBlocks={saveTemplate}
          onDuplicateTemplate={duplicateTemplate}
        />
      </div>
    </div>
  );
}

export default function TemplateBuilderPage() {
  return (
    <V2Shell fullBleedContent>
      <Suspense fallback={<div style={center}>Loading…</div>}>
        <TemplateBuilderInner />
      </Suspense>
    </V2Shell>
  );
}

function makeTemplatePreviewQuote(template: ProposalTemplate): Quote {
  const now = new Date();
  const expires = new Date(now.getTime() + 14 * 86_400_000);
  const result = {
    name: "Better" as const,
    salePrice: 12500,
    profit: 3750,
    margin: 0.3,
    markup: 0.43,
    description: "Template preview price",
    useCase: "Preview",
  };
  return {
    id: `template-${template.id}`,
    projectName: template.name,
    customerName: "Sample Client",
    customerAddress: "123 Main St, Stamford, CT",
    trade: template.trade,
    proposalTitle: template.name,
    proposalNumber: "TPL-001",
    good: { ...result, name: "Good", salePrice: 9800 },
    better: result,
    best: { ...result, name: "Best", salePrice: 15800 },
    selectedOption: "Better",
    status: "Draft",
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    builderVersion: "blocks",
    proposalBlocks: template.proposalBlocks,
  };
}

const center: React.CSSProperties = {
  flex: 1,
  minHeight: 400,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexDirection: "column",
  gap: 12,
  color: "#6b7280",
};
