"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  getAssetUrl,
  listAssets,
  type ProposalAsset,
  type ProposalAssetCategory,
} from "@/lib/proposal-assets";

export function AssetPicker({
  category,
  value,
  onSelect,
}: {
  category: ProposalAssetCategory;
  value?: string;
  onSelect: (url: string) => void;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [assets, setAssets] = useState<ProposalAsset[]>([]);
  const [open, setOpen] = useState(false);
  const [loadingUrlId, setLoadingUrlId] = useState<string | null>(null);

  useEffect(() => {
    listAssets(supabase, { includeLegacySettings: true })
      .then((items) => setAssets(items.filter((asset) => asset.category === category)))
      .catch(() => setAssets([]));
  }, [category, supabase]);

  async function handleSelect(asset: ProposalAsset) {
    setLoadingUrlId(asset.id);
    try {
      const url = await getAssetUrl(supabase, asset);
      if (url) {
        onSelect(url);
        setOpen(false);
      }
    } finally {
      setLoadingUrlId(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          background: "#f9fafb",
          padding: "8px 10px",
          fontSize: 12.5,
          fontWeight: 700,
          color: "#374151",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {value ? "Change asset" : `Select from ${category}`}
      </button>
      {open && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, maxHeight: 220, overflow: "auto" }}>
          {assets.map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => void handleSelect(asset)}
              style={{
                border: value === (asset.publicUrl || asset.url || asset.path) ? "2px solid #16a34a" : "1px solid #e5e7eb",
                borderRadius: 8,
                overflow: "hidden",
                padding: 0,
                background: "#fff",
                cursor: "pointer",
              }}
            >
              <div style={{ aspectRatio: "4/3", background: "#f3f4f6" }}>
                {(asset.publicUrl || asset.url) && (
                  <img
                    src={asset.publicUrl || asset.url}
                    alt={asset.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                )}
              </div>
              <div style={{ padding: "6px 7px", fontSize: 11, color: "#374151", textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {loadingUrlId === asset.id ? "Selecting…" : asset.name}
              </div>
            </button>
          ))}
          {assets.length === 0 && (
            <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "#9ca3af", padding: 10, lineHeight: 1.5 }}>
              No assets yet. Upload them in /v2/assets.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
