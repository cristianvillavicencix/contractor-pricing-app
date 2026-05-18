import type { TierProduct } from "./app-data";
import { defaultRoofleCatalogProducts } from "./default-roofle-catalog";

const TIER_ORDER = new Map([
  ["Good", 0],
  ["Better", 1],
  ["Best", 2],
]);

export function getDefaultTierProducts(): TierProduct[] {
  return defaultRoofleCatalogProducts.map((product) => ({ ...product }));
}

export function mergeTierProductsWithDefaults(products: TierProduct[]): TierProduct[] {
  const byId = new Map<string, TierProduct>();

  for (const product of getDefaultTierProducts()) {
    byId.set(product.id, product);
  }

  for (const product of products) {
    const defaultProduct = byId.get(product.id);
    if (!defaultProduct) {
      byId.set(product.id, product);
      continue;
    }

    byId.set(product.id, {
      ...defaultProduct,
      ...product,
      imageUrl: product.imageUrl || defaultProduct.imageUrl,
    });
  }

  return Array.from(byId.values()).sort(compareTierProducts);
}

function compareTierProducts(a: TierProduct, b: TierProduct) {
  return (
    a.trade.localeCompare(b.trade) ||
    ((TIER_ORDER.get(a.tier) ?? 99) - (TIER_ORDER.get(b.tier) ?? 99)) ||
    a.productBrand.localeCompare(b.productBrand) ||
    a.productLine.localeCompare(b.productLine) ||
    a.productName.localeCompare(b.productName)
  );
}
