"use client";

import { useEffect, useState } from "react";
import { tradeOptions, type TierProduct } from "@/lib/app-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  deleteTierProduct,
  listTierProducts,
  upsertTierProduct,
} from "@/lib/supabase/data";

const TIER_NAMES = ["Good", "Better", "Best"] as const;

type SupabaseBrowserClient = ReturnType<typeof createSupabaseBrowserClient>;
type TierProductDraft = Omit<TierProduct, "id"> & { id: string };

function emptyProduct(trade: string, tier: string): TierProductDraft {
  return {
    id: crypto.randomUUID(),
    trade: trade as TierProduct["trade"],
    tier: tier as TierProduct["tier"],
    productName: "",
    description: "",
    productBrand: "",
    productLine: "",
    imageUrl: "",
    warrantyYears: 0,
    unitCost: 0,
    laborCost: 0,
    defaultMargin: 0,
    defaultMarkup: 0,
    isActive: true,
    notes: "",
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
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    listTierProducts(supabase)
      .then((rows) => setProducts(rows))
      .catch(() => undefined)
      .finally(() => setIsLoading(false));
  }, [supabase]);

  function getProduct(trade: string, tier: string): TierProductDraft {
    return (
      products.find((p) => p.trade === trade && p.tier === tier) ??
      emptyProduct(trade, tier)
    );
  }

  function patchProduct(trade: string, tier: string, patch: Partial<TierProductDraft>) {
    setProducts((prev) => {
      const existing = prev.find((p) => p.trade === trade && p.tier === tier);
      if (existing) {
        return prev.map((p) =>
          p.trade === trade && p.tier === tier ? { ...p, ...patch } : p
        );
      }
      return [...prev, { ...emptyProduct(trade, tier), ...patch }];
    });
  }

  async function saveProduct(trade: string, tier: string) {
    const key = `${trade}:${tier}`;
    const draft = getProduct(trade, tier);
    setSavingKey(key);
    try {
      await upsertTierProduct(supabase, draft);
      setProducts((prev) =>
        prev.some((p) => p.trade === trade && p.tier === tier) ? prev : [...prev, draft]
      );
    } finally {
      setSavingKey(null);
    }
  }

  async function clearProduct(trade: string, tier: string) {
    const existing = products.find((p) => p.trade === trade && p.tier === tier);
    if (!existing) return;
    await deleteTierProduct(supabase, existing.id).catch(() => undefined);
    setProducts((prev) => prev.filter((p) => !(p.trade === trade && p.tier === tier)));
  }

  const content = isLoading ? (
    <div className="h-24 rounded-lg border border-dashed border-[#d9e2ec] bg-[#f6f8fb]" />
  ) : (
    <div className="space-y-8">
      {tradeOptions.map((trade) => (
        <section key={trade}>
          <p className="mb-3 text-sm font-semibold text-[#213343]">{trade}</p>
          <div className="grid gap-4 xl:grid-cols-3">
            {TIER_NAMES.map((tier) => {
              const product = getProduct(trade, tier);
              const key = `${trade}:${tier}`;
              const isSaving = savingKey === key;
              return (
                <div
                  key={tier}
                  className="space-y-3 rounded-lg border border-[#d9e2ec] bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${tierStyle(tier)}`}>
                      {tier}
                    </span>
                    <label className="flex items-center gap-2 text-[11px] font-medium text-gray-500">
                      <input
                        type="checkbox"
                        checked={product.isActive !== false}
                        onChange={(event) =>
                          patchProduct(trade, tier, { isActive: event.target.checked })
                        }
                        className="h-3.5 w-3.5 accent-[#ff5c35]"
                      />
                      Active
                    </label>
                  </div>

                  <TextField
                    label="Product Name"
                    value={product.productName}
                    placeholder="e.g. Timberline HDZ"
                    onChange={(value) => patchProduct(trade, tier, { productName: value })}
                  />
                  <TextField
                    label="Brand"
                    value={product.productBrand}
                    placeholder="e.g. GAF"
                    onChange={(value) => patchProduct(trade, tier, { productBrand: value })}
                  />
                  <TextField
                    label="Product Line"
                    value={product.productLine}
                    placeholder="e.g. Lifetime Shingle System"
                    onChange={(value) => patchProduct(trade, tier, { productLine: value })}
                  />
                  <TextField
                    label="Description"
                    value={product.description ?? ""}
                    placeholder="Short proposal-ready description"
                    onChange={(value) => patchProduct(trade, tier, { description: value })}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <NumberField
                      label="Material Cost"
                      value={product.unitCost ?? 0}
                      onChange={(value) => patchProduct(trade, tier, { unitCost: value })}
                    />
                    <NumberField
                      label="Labor Cost"
                      value={product.laborCost ?? 0}
                      onChange={(value) => patchProduct(trade, tier, { laborCost: value })}
                    />
                    <NumberField
                      label="Default Margin %"
                      value={product.defaultMargin ?? 0}
                      onChange={(value) => patchProduct(trade, tier, { defaultMargin: value })}
                    />
                    <NumberField
                      label="Default Markup %"
                      value={product.defaultMarkup ?? 0}
                      onChange={(value) => patchProduct(trade, tier, { defaultMarkup: value })}
                    />
                    <NumberField
                      label="Warranty Years"
                      value={product.warrantyYears || 0}
                      onChange={(value) => patchProduct(trade, tier, { warrantyYears: value })}
                    />
                    <TextField
                      label="Image URL"
                      value={product.imageUrl}
                      placeholder="https://..."
                      onChange={(value) => patchProduct(trade, tier, { imageUrl: value })}
                    />
                  </div>

                  <TextField
                    label="Notes"
                    value={product.notes}
                    placeholder="Internal or proposal note"
                    onChange={(value) => patchProduct(trade, tier, { notes: value })}
                  />

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void saveProduct(trade, tier)}
                      className="flex-1 rounded-md bg-[#ff5c35] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#e94820] disabled:opacity-60"
                    >
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                    {product.productName ? (
                      <button
                        type="button"
                        onClick={() => void clearProduct(trade, tier)}
                        className="rounded-md border border-[#d9e2ec] px-3 py-2 text-xs font-semibold text-gray-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );

  if (!framed) return content;

  return (
    <section className="elevated-panel rounded-lg border border-[#d9e2ec] bg-white p-5 dark:border-slate-600 sm:p-6">
      <div>
        <h3 className="text-xl font-semibold tracking-tight text-[#213343]">Good / Better / Best Products</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
          Assign products by trade and tier so quote drafts can load realistic costs and proposals show clear package choices.
        </p>
      </div>
      <div className="mt-6">{content}</div>
    </section>
  );
}

function TextField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs font-medium text-gray-500">
      {label}
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-[#d9e2ec] px-2.5 py-2 text-sm text-neutral-900 outline-none transition focus:border-[#111111]"
      />
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
        className="mt-1 w-full rounded-md border border-[#d9e2ec] px-2.5 py-2 text-sm text-neutral-900 outline-none transition focus:border-[#111111]"
      />
    </label>
  );
}

function tierStyle(tier: (typeof TIER_NAMES)[number]) {
  if (tier === "Best") return "bg-[#213343] text-white";
  if (tier === "Better") return "bg-[#f6f8fb] text-[#213343]";
  return "bg-[#f0f4f8] text-[#516f90]";
}
