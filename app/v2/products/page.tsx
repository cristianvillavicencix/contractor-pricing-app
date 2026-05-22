"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { deleteTierProduct, upsertTierProduct } from "@/lib/supabase/data";
import type { TierProduct } from "@/lib/app-data";
import { V2Shell } from "../_shared/Shell";
import { Icon } from "../_shared/icons";
import { PRODUCT_CATEGORIES, type Product } from "../_shared/data";
import { useV2LiveData } from "../_shared/live-data";

const TIERS = ["all", "good", "better", "best"] as const;
type Tier = (typeof TIERS)[number];
type TierProductDraft = TierProduct;

function emptyProduct(cat: string): TierProductDraft {
  return {
    id: crypto.randomUUID(),
    trade: categoryLabel(cat),
    tier: "Better",
    productName: "",
    productType: "",
    description: "",
    productBrand: "",
    productLine: "",
    imageUrl: "",
    warrantyYears: 0,
    isActive: true,
    notes: "",
  };
}

export default function ProductsV2() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { products, tierProducts, refetch } = useV2LiveData();
  const [cat, setCat] = useState("roofing");
  const [tier, setTier] = useState<Tier>("all");
  const [activeOnly, setActiveOnly] = useState(false);
  const [brand, setBrand] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<TierProductDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((product) => counts.set(product.cat, (counts.get(product.cat) ?? 0) + 1));
    const liveCategories = Array.from(counts.entries()).map(([id, count]) => ({
      id,
      label: categoryLabel(id),
      count,
    }));
    return liveCategories.length ? liveCategories : PRODUCT_CATEGORIES;
  }, [products]);

  const selectedCat = categories.some((category) => category.id === cat) ? cat : categories[0]?.id ?? "roofing";
  const allInCat = products.filter((p) => p.cat === selectedCat);
  const brands = Array.from(new Set(allInCat.map((p) => p.brand))).filter(Boolean);

  const tierCounts: Record<Tier, number> = {
    all: allInCat.length,
    good: allInCat.filter((p) => p.tier === "good").length,
    better: allInCat.filter((p) => p.tier === "better").length,
    best: allInCat.filter((p) => p.tier === "best").length,
  };

  const filtered = allInCat.filter((p) => {
    if (tier !== "all" && p.tier !== tier) return false;
    if (activeOnly && !p.active) return false;
    if (brand !== "all" && p.brand !== brand) return false;
    if (query) {
      const q = query.toLowerCase();
      if (![p.name, p.brand, p.type, p.line, p.desc].join(" ").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  function openProduct(product: Product) {
    const raw = tierProducts.find((item) => item.id === product.id);
    setSelected(raw ?? productToDraft(product));
    setMessage("");
  }

  function addProduct() {
    setSelected(emptyProduct(selectedCat));
    setMessage("");
  }

  async function saveProduct() {
    if (!selected) return;
    if (!selected.productName.trim()) {
      setMessage("Product name is required.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await upsertTierProduct(supabase, cleanProductForSave(selected));
      setSelected(null);
      refetch();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save product.");
    } finally {
      setSaving(false);
    }
  }

  async function removeProduct() {
    if (!selected) return;
    setSaving(true);
    setMessage("");
    try {
      await deleteTierProduct(supabase, selected.id);
      setSelected(null);
      refetch();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not delete product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <V2Shell>
      <div className="products-page view">
        <div className="page-head">
          <div>
            <div className="page-eyebrow">Catalog</div>
            <h1 className="page-title">Products &amp; services</h1>
            <div className="page-sub">{products.length} items across {categories.length} categories</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div className="props-toolbar" style={{ margin: 0, padding: "6px 10px", display: "flex", gap: 8 }}>
              <Icon name="search" size={14} />
              <input
                placeholder="Search products"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, minWidth: 160 }}
              />
            </div>
            <button className="btn primary" onClick={addProduct}><Icon name="plus" size={14} /> Add product</button>
          </div>
        </div>

        <div className="products-tabs">
          {categories.map((c) => (
            <button key={c.id} className={`cat-tab ${selectedCat === c.id ? "active" : ""}`} onClick={() => setCat(c.id)}>
              {c.label} <span className="ct">{c.count}</span>
            </button>
          ))}
        </div>

        <div className="products-split">
          <div className="filter-panel">
            <div className="filter-group">
              <div className="filter-title">Tier</div>
              {TIERS.map((t) => (
                <div key={t} className={`filter-row ${tier === t ? "active" : ""}`} onClick={() => setTier(t)}>
                  <span>{t === "all" ? "All tiers" : titleCase(t)}</span>
                  <span className="ct2">{tierCounts[t]}</span>
                </div>
              ))}
            </div>
            <div className="filter-group">
              <div className="filter-title">Availability</div>
              <label className="filter-check">
                <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
                Active products only
              </label>
            </div>
            <div className="filter-group">
              <div className="filter-title">Brand</div>
              <div className={`filter-row ${brand === "all" ? "active" : ""}`} onClick={() => setBrand("all")}>
                <span>All brands</span>
                <span className="ct2">{allInCat.length}</span>
              </div>
              {brands.map((b) => (
                <div key={b} className={`filter-row ${brand === b ? "active" : ""}`} onClick={() => setBrand(b)}>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b}</span>
                  <span className="ct2">{allInCat.filter((p) => p.brand === b).length}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="product-grid">
              {filtered.map((p) => (
                <button key={p.id} className={`product-card tier-${p.tier}`} onClick={() => openProduct(p)} style={{ textAlign: "left" }}>
                  <div className="img-wrap">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    ) : (
                      <div className="ph-img"><Icon name="image" size={36} /></div>
                    )}
                    <div className="tier-stripe"></div>
                  </div>
                  <div className="body">
                    <div className="badges">
                      <span className={`tier-pill ${p.tier}`}>{p.tier}</span>
                      <span className={`pill ${p.active ? "green" : "dark"}`} style={{ padding: "2px 7px", fontSize: 9.5 }}>
                        <span className="dot"></span>{p.active ? "Active" : "Inactive"}
                      </span>
                      <span className="brand">{p.brand}</span>
                    </div>
                    <div className="name">{p.name}</div>
                    <div className="desc">{p.desc}</div>
                    <div className="specs">
                      <span><b>Type:</b> {p.type}</span>
                      <span><b>Warranty:</b> {p.warranty}</span>
                    </div>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div style={{ gridColumn: "1/-1", padding: "60px 20px", textAlign: "center", color: "var(--ink-3)" }}>
                  No products match these filters.
                </div>
              )}
            </div>
          </div>
        </div>

        {selected ? (
          <ProductDrawer
            product={selected}
            message={message}
            saving={saving}
            onClose={() => setSelected(null)}
            onDelete={removeProduct}
            onSave={saveProduct}
            onChange={(patch) => setSelected((current) => current ? { ...current, ...patch } : current)}
          />
        ) : null}
      </div>
    </V2Shell>
  );
}

function ProductDrawer({
  product,
  message,
  saving,
  onClose,
  onDelete,
  onSave,
  onChange,
}: {
  product: TierProductDraft;
  message: string;
  saving: boolean;
  onClose: () => void;
  onDelete: () => void;
  onSave: () => void;
  onChange: (patch: Partial<TierProductDraft>) => void;
}) {
  const tierClass = String(product.tier || "Better").toLowerCase();

  return (
    <div
      onMouseDown={onClose}
      className="product-drawer-backdrop"
    >
      <aside
        onMouseDown={(e) => e.stopPropagation()}
        className="product-drawer product-editor-drawer"
      >
        <div className="product-drawer-head product-editor-head">
          <div>
            <div className="page-eyebrow">{product.trade} · {product.tier}</div>
            <h2 style={{ margin: "4px 0 0", fontSize: 26, letterSpacing: "-.04em" }}>{product.productName || "New product"}</h2>
          </div>
          <div className="product-editor-actions">
            <button className="btn ghost" style={{ color: "var(--rose)" }} disabled={saving} onClick={onDelete}>Delete</button>
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn primary" disabled={saving} onClick={onSave}>{saving ? "Saving..." : "Save product"}</button>
            <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></button>
          </div>
        </div>

        <div className="product-drawer-body product-editor-body">
          <div className="product-editor-grid">
            <div className="product-media-column">
              <div className={`product-editor-image tier-${tierClass}`}>
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.productName || "Product image"} />
                ) : (
                  <div className="ph-img"><Icon name="image" size={44} /></div>
                )}
                <div className="tier-stripe"></div>
              </div>

              <div className="product-side-panel">
                <div className="side-stat">
                  <span>Warranty</span>
                  <b>{product.warrantyYears || 0}y</b>
                </div>
                <div className="side-stat">
                  <span>Tier</span>
                  <b>{product.tier || "Better"}</b>
                </div>
                <div className="side-stat">
                  <span>Status</span>
                  <b>{product.isActive === false ? "Off" : "On"}</b>
                </div>
              </div>

              <Field label="Image URL" value={product.imageUrl ?? ""} onChange={(v) => onChange({ imageUrl: v })} />

              <div className="toggle-row">
                <div><div className="ttl">Active product</div><div className="sub2">Inactive products stay saved but can be hidden from the catalog.</div></div>
                <div className={`switch ${product.isActive !== false ? "on" : ""}`} onClick={() => onChange({ isActive: product.isActive === false })}></div>
              </div>
            </div>

            <div className="product-info-column">
              <div className="field-grid">
                <Field label="Product name" value={product.productName} onChange={(v) => onChange({ productName: v })} />
                <Field label="Brand" value={product.productBrand} onChange={(v) => onChange({ productBrand: v })} />
                <Field label="Product type" value={product.productType ?? ""} onChange={(v) => onChange({ productType: v })} />
                <Field label="Product line" value={product.productLine} onChange={(v) => onChange({ productLine: v })} />
                <Field label="Trade" value={product.trade} onChange={(v) => onChange({ trade: v })} />
                <SelectField label="Tier" value={product.tier} options={["Good", "Better", "Best"]} onChange={(v) => onChange({ tier: v })} />
                <NumberField label="Warranty years" value={product.warrantyYears ?? 0} onChange={(v) => onChange({ warrantyYears: v })} />
                <div className="ss-field full">
                  <label>Description</label>
                  <textarea value={product.description ?? ""} rows={5} onChange={(e) => onChange({ description: e.target.value })} />
                </div>
              </div>

              {message ? <div className="auth-alert error">{message}</div> : null}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="ss-field">
      <label>{label}</label>
      <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="ss-field">
      <label>{label}</label>
      <input type="number" value={value || ""} onChange={(e) => onChange(Number(e.target.value) || 0)} />
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="ss-field">
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </div>
  );
}

function productToDraft(product: Product): TierProductDraft {
  return {
    id: product.id,
    trade: categoryLabel(product.cat),
    tier: titleCase(product.tier),
    productName: product.name,
    productType: product.type,
    description: product.desc,
    productBrand: product.brand,
    productLine: product.line,
    imageUrl: product.imageUrl ?? "",
    warrantyYears: product.warrantyYears ?? (Number(product.warranty.replace(/\D/g, "")) || 0),
    isActive: product.active,
    notes: "",
  };
}

function cleanProductForSave(product: TierProductDraft): TierProductDraft {
  return {
    id: product.id,
    trade: product.trade,
    tier: product.tier,
    productId: product.productId,
    productName: product.productName,
    productType: product.productType,
    description: product.description,
    productBrand: product.productBrand,
    productLine: product.productLine,
    imageUrl: product.imageUrl,
    warrantyYears: product.warrantyYears,
    isActive: product.isActive,
    notes: "",
  };
}

function categoryLabel(id: string) {
  return id.split("-").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ") || "General";
}

function titleCase(value: string) {
  return value[0]?.toUpperCase() + value.slice(1).toLowerCase();
}
