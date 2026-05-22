"use client";

import { useEffect, useMemo, useState } from "react";
import { V2Shell } from "../_shared/Shell";
import { Icon } from "../_shared/icons";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  ASSET_CATEGORIES,
  deleteAsset,
  listAssets,
  uploadAsset,
  type ProposalAsset,
  type ProposalAssetCategory,
} from "@/lib/proposal-assets";

export default function AssetsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [assets, setAssets] = useState<ProposalAsset[]>([]);
  const [category, setCategory] = useState<ProposalAssetCategory>("Logos");
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function refreshAssets() {
    const next = await listAssets(supabase, { includeLegacySettings: true });
    setAssets(next);
  }

  useEffect(() => {
    // Initial data load synchronizes the UI with Supabase.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshAssets().catch((e) =>
      setError(e instanceof Error ? e.message : "Could not load assets.")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function handleUpload(file: File) {
    setUploading(true);
    setError("");
    try {
      await uploadAsset(supabase, file, category);
      await refreshAssets();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload asset.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(asset: ProposalAsset) {
    if (asset.legacy) {
      setError("Legacy assets from company settings are read-only here.");
      return;
    }
    setDeletingId(asset.id);
    setError("");
    try {
      await deleteAsset(supabase, asset);
      await refreshAssets();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete asset.");
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = assets.filter((asset) => asset.category === category);

  return (
    <V2Shell>
      <div className="view" style={{ display: "grid", gap: 22 }}>
        <div className="page-head">
          <div>
            <div className="page-eyebrow">Library</div>
            <h1 className="page-title">Assets</h1>
            <div className="page-sub">
              Reuse logos, covers, material photos, and gallery images across proposals.
            </div>
          </div>
          <label className="btn primary" style={{ cursor: uploading ? "wait" : "pointer" }}>
            <Icon name="plus" size={14} /> {uploading ? "Uploading…" : "Upload asset"}
            <input
              type="file"
              accept="image/*"
              hidden
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.currentTarget.value = "";
                if (file) void handleUpload(file);
              }}
            />
          </label>
        </div>

        {error && <div className="auth-alert error">{error}</div>}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {ASSET_CATEGORIES.map((item) => (
            <button
              key={item}
              className={`btn ghost ${category === item ? "active" : ""}`}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          {filtered.map((asset) => {
            const imageUrl = asset.publicUrl || asset.url || "";
            return (
              <div
                key={asset.id}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  overflow: "hidden",
                  background: "var(--surface)",
                }}
              >
                <div
                  style={{
                    aspectRatio: "16/10",
                    background: "#f3f4f6",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={asset.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <Icon name="image" size={24} />
                  )}
                </div>
                <div style={{ padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--ink)" }}>
                        {asset.name}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 3 }}>
                        {asset.legacy ? "Legacy settings asset" : asset.category}
                      </div>
                    </div>
                    {asset.sizeBytes ? (
                      <div style={{ fontSize: 11, color: "var(--ink-3)", whiteSpace: "nowrap" }}>
                        {(asset.sizeBytes / 1024).toFixed(0)} KB
                      </div>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button
                      className="btn ghost"
                      style={{ flex: 1, justifyContent: "center" }}
                      onClick={() => navigator.clipboard?.writeText(imageUrl || asset.path)}
                    >
                      Copy URL
                    </button>
                    <button
                      className="btn ghost"
                      disabled={asset.legacy || deletingId === asset.id}
                      style={{
                        justifyContent: "center",
                        opacity: asset.legacy ? 0.5 : 1,
                        cursor: asset.legacy ? "not-allowed" : "pointer",
                      }}
                      onClick={() => void handleDelete(asset)}
                    >
                      {deletingId === asset.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div
              style={{
                padding: 48,
                color: "var(--ink-3)",
                border: "1px dashed var(--line)",
                borderRadius: 12,
              }}
            >
              No {category.toLowerCase()} yet. Upload one to reuse it in Cover and Image blocks.
            </div>
          )}
        </div>
      </div>
    </V2Shell>
  );
}
