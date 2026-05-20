"use client";

import { useState } from "react";
import { V2Shell } from "../_shared/Shell";
import { Icon } from "../_shared/icons";
import { PRODUCT_CATEGORIES, SAMPLE_PRODUCTS } from "../_shared/data";

const TIERS = ["all", "good", "better", "best"] as const;
type Tier = (typeof TIERS)[number];

export default function ProductsV2() {
  const [cat, setCat] = useState("roofing");
  const [tier, setTier] = useState<Tier>("all");
  const [activeOnly, setActiveOnly] = useState(false);
  const [brand, setBrand] = useState("all");
  const [query, setQuery] = useState("");

  const allInCat = SAMPLE_PRODUCTS.filter((p) => p.cat === cat);
  const brands = Array.from(new Set(allInCat.map((p) => p.brand)));

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
    if (query && !(p.name.toLowerCase().includes(query.toLowerCase()) || p.brand.toLowerCase().includes(query.toLowerCase()))) return false;
    return true;
  });

  return (
    <V2Shell>
      <div className="products-page view">
        <div className="page-head">
          <div>
            <div className="page-eyebrow">Catalog</div>
            <h1 className="page-title">Products &amp; services</h1>
            <div className="page-sub">{SAMPLE_PRODUCTS.length} items across {PRODUCT_CATEGORIES.length} categories</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div className="props-toolbar" style={{ margin: 0, padding: "6px 10px", display: "flex", gap: 8 }}>
              <Icon name="search" size={14} />
              <input placeholder="Search products" value={query} onChange={(e) => setQuery(e.target.value)}
                style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, minWidth: 160 }} />
            </div>
            <button className="btn primary"><Icon name="plus" size={14} /> Add product</button>
          </div>
        </div>

        <div className="products-tabs">
          {PRODUCT_CATEGORIES.map((c) => (
            <button key={c.id} className={`cat-tab ${cat === c.id ? "active" : ""}`} onClick={() => setCat(c.id)}>
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
                  <span>{t === "all" ? "All tiers" : t[0].toUpperCase() + t.slice(1)}</span>
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
                <div key={p.id} className={`product-card tier-${p.tier}`}>
                  <div className="img-wrap">
                    <div className="ph-img"><Icon name="image" size={36} /></div>
                    <div className="tier-stripe"></div>
                    <div className="price-tag">${p.price}<small>/{p.unit}</small></div>
                  </div>
                  <div className="body">
                    <div className="badges">
                      <span className={`tier-pill ${p.tier}`}>{p.tier}</span>
                      <span className="pill green" style={{ padding: "2px 7px", fontSize: 9.5 }}><span className="dot"></span>Active</span>
                      <span className="brand">{p.brand}</span>
                    </div>
                    <div className="name">{p.name}</div>
                    <div className="desc">{p.desc}</div>
                    <div className="specs">
                      <span><b>Type:</b> {p.type}</span>
                      <span><b>Warranty:</b> {p.warranty}</span>
                    </div>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div style={{ gridColumn: "1/-1", padding: "60px 20px", textAlign: "center", color: "var(--ink-3)" }}>
                  No products match these filters.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </V2Shell>
  );
}
