import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppSettings } from "@/lib/app-data";
import { defaultSettings, mergeAppSettings } from "@/lib/app-data";
import { loadCompanySettings } from "@/lib/supabase/data";

export type ProposalAssetCategory =
  | "Logos"
  | "Cover Images"
  | "Material Images"
  | "Gallery Images";

export type ProposalAsset = {
  id: string;
  companyId?: string;
  category: ProposalAssetCategory;
  name: string;
  bucket: "proposal-assets" | "proposal-photos" | "branding";
  path: string;
  filePath?: string;
  url?: string;
  publicUrl?: string;
  contentType?: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt: string;
  updatedAt?: string;
  legacy?: boolean;
};

export const PROPOSAL_ASSETS_BUCKET = "proposal-assets" as const;
export const MAX_PROPOSAL_ASSET_BYTES = 5 * 1024 * 1024;

export const ASSET_CATEGORIES: ProposalAssetCategory[] = [
  "Logos",
  "Cover Images",
  "Material Images",
  "Gallery Images",
];

export type SettingsWithAssets = AppSettings & {
  assetLibrary?: ProposalAsset[];
};

type ProposalAssetRow = {
  id: string;
  company_id: string;
  name: string;
  category: string;
  file_path: string;
  public_url: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  updated_at: string;
};

function isMissingOptionalTableError(error: unknown) {
  const maybe = error as { code?: string; message?: string } | null | undefined;
  const message = maybe?.message?.toLowerCase() ?? "";
  return (
    maybe?.code === "PGRST205" ||
    maybe?.code === "42P01" ||
    message.includes("could not find the table") ||
    message.includes("does not exist")
  );
}

async function requireCompanyId(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase.rpc("current_company_id");
  if (error) throw error;
  if (!data) throw new Error("No company found for this user");
  return data as string;
}

function assertAssetCategory(category: ProposalAssetCategory) {
  if (!ASSET_CATEGORIES.includes(category)) {
    throw new Error("Invalid asset category.");
  }
}

function rowToAsset(row: ProposalAssetRow): ProposalAsset {
  return {
    id: row.id,
    companyId: row.company_id,
    category: row.category as ProposalAssetCategory,
    name: row.name,
    bucket: PROPOSAL_ASSETS_BUCKET,
    path: row.file_path,
    filePath: row.file_path,
    url: row.public_url ?? undefined,
    publicUrl: row.public_url ?? undefined,
    contentType: row.mime_type ?? undefined,
    mimeType: row.mime_type ?? undefined,
    sizeBytes: row.size_bytes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getAssetLibrary(settings: AppSettings | null | undefined): ProposalAsset[] {
  return ((settings as SettingsWithAssets | null | undefined)?.assetLibrary ?? [])
    .filter(Boolean)
    .map((asset) => ({ ...asset, legacy: true }));
}

export function withAsset(settings: AppSettings, asset: ProposalAsset): SettingsWithAssets {
  const current = getAssetLibrary(settings);
  const next = [asset, ...current.filter((item) => item.id !== asset.id)];
  return { ...(settings as SettingsWithAssets), assetLibrary: next };
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export function assetBucketForCategory(_category: ProposalAssetCategory): typeof PROPOSAL_ASSETS_BUCKET {
  void _category;
  return PROPOSAL_ASSETS_BUCKET;
}

export function safeAssetFileName(file: File, category: ProposalAssetCategory) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const prefix = category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${prefix}/${crypto.randomUUID()}.${ext}`;
}

export function validateAssetFile(file: File, category: ProposalAssetCategory) {
  assertAssetCategory(category);
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image assets can be uploaded.");
  }
  if (file.size > MAX_PROPOSAL_ASSET_BYTES) {
    throw new Error("Asset is too large. Use an image under 5 MB.");
  }
}

export async function getAssetUrl(
  supabase: SupabaseClient,
  asset: ProposalAsset
): Promise<string> {
  if (asset.publicUrl || asset.url) return asset.publicUrl || asset.url || "";

  const path = asset.filePath || asset.path;
  if (!path) return "";

  if (asset.bucket === PROPOSAL_ASSETS_BUCKET) {
    const { data } = supabase.storage.from(PROPOSAL_ASSETS_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  const res = await fetch("/api/storage/signed-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket: asset.bucket,
      path,
      expiresIn: 60 * 60,
    }),
  });
  if (!res.ok) return "";
  const body = (await res.json()) as { url?: string };
  return body.url ?? "";
}

export async function listAssets(
  supabase: SupabaseClient,
  options: { includeLegacySettings?: boolean } = {}
): Promise<ProposalAsset[]> {
  let tableAssets: ProposalAsset[] = [];

  const { data, error } = await supabase
    .from("proposal_assets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    if (!isMissingOptionalTableError(error)) throw error;
  } else {
    tableAssets = ((data ?? []) as ProposalAssetRow[]).map(rowToAsset);
  }

  if (!options.includeLegacySettings) return tableAssets;

  try {
    const rawSettings = await loadCompanySettings<AppSettings>(supabase);
    const legacy = getAssetLibrary(mergeAppSettings(rawSettings ?? defaultSettings));
    return [...tableAssets, ...legacy];
  } catch {
    return tableAssets;
  }
}

export async function uploadAsset(
  supabase: SupabaseClient,
  file: File,
  category: ProposalAssetCategory
): Promise<ProposalAsset> {
  validateAssetFile(file, category);

  const companyId = await requireCompanyId(supabase);
  const path = `${companyId}/${safeAssetFileName(file, category)}`;
  const dataUrl = await fileToDataUrl(file);

  const uploadRes = await fetch("/api/storage/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket: PROPOSAL_ASSETS_BUCKET,
      path,
      contentType: file.type,
      dataUrl,
      alreadyPrefixed: true,
    }),
  });

  if (!uploadRes.ok) {
    const body = await uploadRes.json().catch(() => ({}));
    throw new Error(body.error ?? "Upload failed");
  }

  const { data: publicData } = supabase.storage.from(PROPOSAL_ASSETS_BUCKET).getPublicUrl(path);
  const publicUrl = publicData.publicUrl;

  const { data, error } = await supabase
    .from("proposal_assets")
    .insert({
      company_id: companyId,
      name: file.name.replace(/\.[^.]+$/, ""),
      category,
      file_path: path,
      public_url: publicUrl,
      mime_type: file.type,
      size_bytes: file.size,
    })
    .select("*")
    .single();

  if (error) throw error;
  return rowToAsset(data as ProposalAssetRow);
}

export async function deleteAsset(supabase: SupabaseClient, asset: ProposalAsset) {
  if (asset.legacy) {
    throw new Error("Legacy assets stored in settings cannot be deleted here.");
  }

  const path = asset.filePath || asset.path;
  if (!path) throw new Error("Asset path is missing.");

  const { error } = await supabase.from("proposal_assets").delete().eq("id", asset.id);
  if (error) throw error;

  const res = await fetch("/api/storage/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucket: PROPOSAL_ASSETS_BUCKET, path }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Asset metadata was deleted, but storage cleanup failed.");
  }
}

export async function migrateDataUrlAssetsIfNeeded(): Promise<{ migrated: number }> {
  return { migrated: 0 };
}
