"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImageIcon, Plus, Search, Trash2, X } from "lucide-react";
import { type TierProduct } from "@/lib/app-data";
import { getDefaultTierProducts } from "@/lib/tier-products-defaults";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  deleteTierProduct,
  listTierProducts,
  upsertTierProduct,
} from "@/lib/supabase/data";

const DEFAULT_TRADES = ["Roofing", "Siding", "Painting", "Drywall", "Gutters", "Remodeling"];
const DEFAULT_TIERS = ["Good", "Better", "Best"];
const DEFAULT_TYPES = ["Asphalt Shingle", "Metal", "Tile", "Wood", "Synthetic"];
type SupabaseBrowserClient = ReturnType<typeof createSupabaseBrowserClient>;
type TierProductDraft = Omit<TierProduct, "id"> & { id: string };

function newProduct(overrides: Partial<TierProductDraft> = {}): TierProductDraft {
  return {
    id: crypto.randomUUID(),
    trade: "Roofing",
    tier: "Good",
    productName: "",
    productType: "",
    description: "",
    productBrand: "",
    productLine: "",
    colorName: "",
    colorHex: "",
    imageUrl: "",
    warrantyYears: 0,
    unitCost: 0,
    laborCost: 0,
    defaultMargin: 0,
    defaultMarkup: 0,
    isActive: true,
    notes: "",
    ...overrides,
  };
}

export function TierProductsManager({
  supabase,
  framed = true,
}: {
  supabase: SupabaseBrowserClient;
  framed?: boolean;
}) {
  const [products, setProducts] = useState<TierProductDraft[]>([]);
  const [selectedTrade, setSelectedTrade] = useState<string>("Roofing");
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [activeOnly, setActiveOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    listTierProducts(supabase)
      .then((rows) => setProducts(rows.length ? rows : seedRows()))
      .catch(() => setProducts(seedRows()))
      .finally(() => setIsLoading(false));
  }, [supabase]);

  useEffect(() => {
    if (isSearchOpen) searchInputRef.current?.focus();
  }, [isSearchOpen]);

  const trades = useMemo(
    () => unique([...DEFAULT_TRADES, ...products.map((product) => product.trade)]),
    [products]
  );
  const tiers = useMemo(
    () => unique([...DEFAULT_TIERS, ...products.map((product) => product.tier)]),
    [products]
  );
  const tradeProducts = useMemo(
    () => products.filter((product) => product.trade === selectedTrade),
    [products, selectedTrade]
  );
  const branchProducts = useMemo(() => {
    if (!selectedTier) return tradeProducts;
    return tradeProducts.filter((product) => product.tier === selectedTier);
  }, [selectedTier, tradeProducts]);
  const brands = useMemo(
    () => unique(branchProducts.map((product) => product.productBrand)),
    [branchProducts]
  );
  const productTypes = useMemo(
    () => unique([...DEFAULT_TYPES, ...branchProducts.map((product) => product.productType ?? "")]),
    [branchProducts]
  );
  const allProductTypes = useMemo(
    () => unique([...DEFAULT_TYPES, ...products.map((product) => product.productType ?? "")]),
    [products]
  );
  const allBrands = useMemo(
    () => unique(products.map((product) => product.productBrand)),
    [products]
  );
  const visibleProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return branchProducts.filter((product) => {
      const searchable = [
        product.productName,
        product.productType,
        product.productBrand,
        product.productLine,
        product.colorName,
        product.description,
        product.trade,
        product.tier,
      ]
        .join(" ")
        .toLowerCase();

      if (query && !searchable.includes(query)) return false;
      if (selectedType && product.productType !== selectedType) return false;
      if (selectedBrand && product.productBrand !== selectedBrand) return false;
      if (activeOnly && product.isActive === false) return false;
      return true;
    });
  }, [activeOnly, branchProducts, searchQuery, selectedBrand, selectedType]);
  const selectedProduct = selectedProductId
    ? products.find((product) => product.id === selectedProductId) ?? null
    : null;

  function updateProduct(id: string, patch: Partial<TierProductDraft>) {
    setProducts((current) =>
      current.map((product) => (product.id === id ? { ...product, ...patch } : product))
    );
  }

  function addRow(base?: Partial<TierProductDraft>) {
    const row = newProduct({
      trade: selectedTrade,
      tier: selectedTier ?? "Good",
      ...base,
    });
    setMessage(null);
    setProducts((current) => [row, ...current]);
    setSelectedProductId(row.id);
  }

  async function saveRow(product: TierProductDraft) {
    setSavingId(product.id);
    setMessage(null);
    try {
      await upsertTierProduct(supabase, product);
      if (selectedProductId === product.id) setSelectedProductId(null);
      setMessage("Product saved.");
      window.setTimeout(() => setMessage(null), 2500);
    } catch (error) {
      setMessage(getErrorMessage(error, "Could not save product."));
    } finally {
      setSavingId(null);
    }
  }

  async function deleteRow(product: TierProductDraft) {
    setProducts((current) => current.filter((row) => row.id !== product.id));
    if (selectedProductId === product.id) setSelectedProductId(null);
    if (product.productName || product.productBrand || product.productLine) {
      await deleteTierProduct(supabase, product.id).catch((error) => {
        setMessage(getErrorMessage(error, "Could not delete product."));
      });
    }
  }

  function selectTrade(trade: string) {
    setSelectedTrade(trade);
    setSelectedTier(null);
    setSelectedType(null);
    setSelectedBrand(null);
  }

  function selectTier(tier: string | null) {
    setSelectedTier(tier);
    setSelectedType(null);
    setSelectedBrand(null);
  }

  const content = (
    <div className="space-y-4">
      {isLoading ? (
        <div className="h-56 rounded-lg border border-dashed border-[#d9e2ec] bg-[#f6f8fb]" />
      ) : (
        <div className="space-y-4">
          {message ? (
            <div className="rounded-lg border border-[#d9e2ec] bg-white px-4 py-3 text-sm text-gray-600">
              {message}
            </div>
          ) : null}
          <div className="rounded-lg border border-[#d9e2ec] bg-white p-2">
            <div className="relative min-h-10">
              <div className="flex items-center gap-2 overflow-x-auto pr-[22rem] max-sm:pr-[13rem]">
                {trades.map((trade) => {
                  const active = selectedTrade === trade;
                  const count = products.filter((product) => product.trade === trade).length;
                  return (
                    <button
                      key={trade}
                      type="button"
                      onClick={() => selectTrade(trade)}
                      className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                        active
                          ? "bg-[#213343] text-white"
                          : "text-gray-600 hover:bg-[#f6f8fb] hover:text-[#213343]"
                      }`}
                    >
                      <span>{trade}</span>
                      <span className={active ? "text-white/70" : "text-gray-400"}>{count}</span>
                    </button>
                  );
                })}
              </div>
              <div className="absolute bottom-0 right-0 top-0 flex items-center gap-2 bg-white pl-2">
                <div
                  className={`flex h-10 items-center overflow-hidden rounded-md border border-[#d9e2ec] bg-white transition-[width,border-color] duration-200 ${
                    isSearchOpen || searchQuery ? "w-56 max-sm:w-40" : "w-10"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(true)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center text-gray-500 transition hover:text-[#213343]"
                    aria-label="Search products"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onFocus={() => setIsSearchOpen(true)}
                    onBlur={() => {
                      if (!searchQuery.trim()) setIsSearchOpen(false);
                    }}
                    placeholder={`Search ${selectedTier ? `${selectedTier} ` : ""}${selectedTrade}...`}
                    className="min-w-0 flex-1 border-0 bg-transparent pr-2 text-sm text-neutral-900 outline-none"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setSearchQuery("");
                        searchInputRef.current?.focus();
                      }}
                      className="flex h-10 w-8 shrink-0 items-center justify-center text-gray-400 transition hover:text-[#213343]"
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => addRow()}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-[#ff5c35] px-3 text-sm font-semibold text-white transition hover:bg-[#e94820]"
                >
                  <Plus className="h-4 w-4" />
                  <span className="max-sm:hidden">Add product</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <aside className="h-fit rounded-lg border border-[#d9e2ec] bg-white">
            <div className="border-b border-[#e6edf4] pb-3">
              <p className="px-3 pt-3 text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                Filters
              </p>
            </div>

            <FilterSection title="Tier">
              <FilterOption
                active={selectedTier === null}
                label="All tiers"
                count={tradeProducts.length}
                onClick={() => selectTier(null)}
              />
              {tiers.map((tier) => (
                <FilterOption
                  key={tier}
                  active={selectedTier === tier}
                  label={tier}
                  count={tradeProducts.filter((product) => product.tier === tier).length}
                  onClick={() => selectTier(tier)}
                />
              ))}
            </FilterSection>

            <FilterSection title="Availability">
              <label className="flex items-center gap-2 text-sm text-[#213343]">
                <input
                  type="checkbox"
                  checked={activeOnly}
                  onChange={(event) => setActiveOnly(event.target.checked)}
                  className="h-4 w-4 accent-[#ff5c35]"
                />
                Active products only
              </label>
            </FilterSection>

            <FilterSection title="Type">
              <FilterOption
                active={selectedType === null}
                label="All types"
                count={branchProducts.length}
                onClick={() => setSelectedType(null)}
              />
              {productTypes.map((type) => (
                <FilterOption
                  key={type}
                  active={selectedType === type}
                  label={type}
                  count={branchProducts.filter((product) => product.productType === type).length}
                  onClick={() => setSelectedType(type)}
                />
              ))}
            </FilterSection>

            <FilterSection title="Brand">
              <FilterOption
                active={selectedBrand === null}
                label="All brands"
                count={branchProducts.length}
                onClick={() => setSelectedBrand(null)}
              />
              {brands.map((brand) => {
                const count = branchProducts.filter((product) => product.productBrand === brand).length;
                return (
                  <FilterOption
                    key={brand}
                    active={selectedBrand === brand}
                    label={brand}
                    count={count}
                    onClick={() => setSelectedBrand(brand)}
                  />
                );
              })}
              {brands.length === 0 ? (
                <p className="px-2 py-1 text-xs text-gray-400">No brands in this tier yet.</p>
              ) : null}
            </FilterSection>

          </aside>

          <div className="min-w-0">
            <ProductsGrid
              products={visibleProducts}
              onOpen={(product) => setSelectedProductId(product.id)}
            />
            {visibleProducts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#d9e2ec] bg-white px-5 py-10 text-center text-sm text-gray-500">
                No materials for {selectedTrade}{selectedTier ? ` / ${selectedTier}` : ""}. Add one to start this catalog.
              </div>
            ) : null}
          </div>
        </div>
        </div>
      )}

      {selectedProduct ? (
        <ProductDrawer
          product={selectedProduct}
          saving={savingId === selectedProduct.id}
          onClose={() => setSelectedProductId(null)}
          onUpdate={(patch) => updateProduct(selectedProduct.id, patch)}
          onSave={() => void saveRow(selectedProduct)}
          onDelete={() => void deleteRow(selectedProduct)}
          tradeOptions={trades}
          tierOptions={tiers}
          typeOptions={allProductTypes}
          brandOptions={allBrands}
        />
      ) : null}
    </div>
  );

  if (!framed) return content;

  return (
    <section className="elevated-panel rounded-lg border border-[#d9e2ec] bg-white p-5 dark:border-slate-600 sm:p-6">
      {content}
    </section>
  );
}

function ProductsGrid({
  products,
  onOpen,
}: {
  products: TierProductDraft[];
  onOpen: (product: TierProductDraft) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {products.map((product) => (
        <button
          key={product.id}
          type="button"
          onClick={() => onOpen(product)}
          className="group flex h-full flex-col overflow-hidden rounded-lg border border-[#d9e2ec] bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#b8c7d6] hover:shadow-md"
        >
          <ProductImage product={product} />
          <div className="flex flex-1 flex-col gap-2.5 p-3">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <Badge>{product.tier}</Badge>
              {product.isActive === false ? <Badge muted>Inactive</Badge> : <Badge tone="green">Active</Badge>}
              <span className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                {product.productBrand || "No brand"}
              </span>
            </div>
            <div>
              <h5 className="line-clamp-2 text-[15px] font-semibold leading-5 text-[#18394a]">
                {product.productName || "Untitled material"}
              </h5>
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-gray-500">
                {product.description || "Add a short customer-facing description."}
              </p>
            </div>
            <div className="mt-auto flex min-w-0 items-center gap-1.5 pt-1 text-[11px] leading-5 text-gray-500">
              <span className="truncate">
                <span className="font-semibold text-gray-600">Type:</span> {product.productType || "-"}
              </span>
              <span className="text-gray-300">/</span>
              <span className="truncate">
                <span className="font-semibold text-gray-600">Line:</span> {product.productLine || "-"}
              </span>
              <span className="text-gray-300">/</span>
              <span className="shrink-0">
                <span className="font-semibold text-gray-600">Warranty:</span> {product.warrantyYears ? `${product.warrantyYears}y` : "-"}
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function ProductDrawer({
  product,
  saving,
  onClose,
  onUpdate,
  onSave,
  onDelete,
  tradeOptions,
  tierOptions,
  typeOptions,
  brandOptions,
}: {
  product: TierProductDraft;
  saving: boolean;
  onClose: () => void;
  onUpdate: (patch: Partial<TierProductDraft>) => void;
  onSave: () => void;
  onDelete: () => void;
  tradeOptions: string[];
  tierOptions: string[];
  typeOptions: string[];
  brandOptions: string[];
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#213343]/30 backdrop-blur-sm">
      <aside className="h-full w-full overflow-auto bg-white shadow-2xl sm:w-[min(50vw,760px)] sm:min-w-140">
        <div className="sticky top-0 z-10 border-b border-[#d9e2ec] bg-white px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                {product.trade} / {product.tier}
              </p>
              <h3 className="mt-1 truncate text-xl font-semibold tracking-tight text-[#213343]">
                {product.productName || "New material"}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#d9e2ec] text-gray-500 transition hover:bg-[#f6f8fb]"
              aria-label="Close product editor"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <CategoryField label="Trade" value={product.trade} options={tradeOptions} onChange={(value) => onUpdate({ trade: value })} />
            <CategoryField label="Tier" value={product.tier} options={tierOptions} onChange={(value) => onUpdate({ tier: value })} />
            <Field label="Material / Product" value={product.productName} onChange={(value) => onUpdate({ productName: value })} />
            <CategoryField label="Type" value={product.productType ?? ""} options={typeOptions} onChange={(value) => onUpdate({ productType: value })} />
            <CategoryField label="Brand" value={product.productBrand} options={brandOptions} onChange={(value) => onUpdate({ productBrand: value })} />
            <Field label="Line" value={product.productLine} onChange={(value) => onUpdate({ productLine: value })} />
            <Field label="Image URL" value={product.imageUrl} onChange={(value) => onUpdate({ imageUrl: value })} />
          </div>

          <label className="block text-xs font-medium text-gray-500">
            Description
            <textarea
              value={product.description ?? ""}
              onChange={(event) => onUpdate({ description: event.target.value })}
              rows={4}
              className="mt-1 w-full resize-none rounded-md border border-[#d9e2ec] px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-[#ff5c35]"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField label="Warranty years" value={product.warrantyYears ?? 0} onChange={(value) => onUpdate({ warrantyYears: value })} />
            <label className="flex h-full min-h-18 items-center gap-3 rounded-md border border-[#d9e2ec] px-3 py-2 text-sm font-medium text-[#213343]">
              <input
                type="checkbox"
                checked={product.isActive !== false}
                onChange={(event) => onUpdate({ isActive: event.target.checked })}
                className="h-4 w-4 accent-[#ff5c35]"
              />
              Active
            </label>
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-[#d9e2ec] bg-white px-5 py-4 sm:px-6">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-[#f0d5d2] px-4 py-2.5 text-sm font-semibold text-[#b42318] transition hover:bg-[#fff5f4]"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-md border border-[#d9e2ec] px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-[#f6f8fb] sm:flex-none"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={onSave}
                className="flex-1 rounded-md bg-[#ff5c35] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e94820] disabled:opacity-60 sm:flex-none"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function ProductImage({ product }: { product: TierProductDraft }) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const imageFailed = Boolean(product.imageUrl && failedImageUrl === product.imageUrl);

  if (product.imageUrl && !imageFailed) {
    return (
      <div className="aspect-[16/10] overflow-hidden bg-[#edf3f7]">
        <img
          src={product.imageUrl}
          alt={product.productName || "Product image"}
          onError={() => setFailedImageUrl(product.imageUrl)}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
      </div>
    );
  }

  return (
    <div className="flex aspect-[16/10] items-center justify-center bg-[linear-gradient(135deg,#edf3f7_0%,#d9e7ef_45%,#f8fafc_100%)]">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/70 bg-white/80 text-[#7890a1] shadow-sm">
        <ImageIcon className="h-7 w-7" />
      </div>
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-[#e6edf4] px-3 py-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function FilterOption({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition ${
        active
          ? "bg-[#213343] font-semibold text-white"
          : "text-gray-600 hover:bg-[#f6f8fb] hover:text-[#213343]"
      }`}
    >
      <span className="truncate">{label}</span>
      <span className={active ? "text-white/70" : "text-gray-400"}>{count}</span>
    </button>
  );
}

function Badge({
  children,
  muted = false,
  tone,
}: {
  children: React.ReactNode;
  muted?: boolean;
  tone?: "green";
}) {
  const classes = tone === "green"
    ? "bg-green-50 text-green-700"
    : muted
      ? "bg-gray-100 text-gray-500"
      : "bg-[#fff0eb] text-[#c2410c]";

  return <span className={`rounded px-2 py-1 text-xs font-semibold ${classes}`}>{children}</span>;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-xs font-medium text-gray-500">
      {label}
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-[#d9e2ec] px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-[#ff5c35]"
      />
    </label>
  );
}

function CategoryField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const trimmed = value.trim();
  const listId = `product-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-options`;
  const exists = options.some((option) => option.toLowerCase() === trimmed.toLowerCase());

  return (
    <label className="block text-xs font-medium text-gray-500">
      {label}
      <input
        value={value}
        list={listId}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-[#d9e2ec] px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-[#ff5c35]"
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      {trimmed && !exists ? (
        <span className="mt-1 block text-[11px] font-medium text-[#ff5c35]">
          Create "{trimmed}" when saved
        </span>
      ) : null}
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-xs font-medium text-gray-500">
      {label}
      <input
        type="number"
        min="0"
        value={value || ""}
        placeholder="0"
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="mt-1 w-full rounded-md border border-[#d9e2ec] px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-[#ff5c35]"
      />
    </label>
  );
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const maybeError = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts = [maybeError.message, maybeError.details, maybeError.hint, maybeError.code]
      .filter((part): part is string => typeof part === "string" && part.trim().length > 0);
    if (parts.length) return parts.join(" ");
  }
  return fallback;
}

function seedRows() {
  return getDefaultTierProducts();
}
