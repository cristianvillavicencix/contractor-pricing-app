import { NextResponse, type NextRequest } from "next/server";
import { mergeAppSettings, defaultSettings, type AppSettings, type Quote } from "@/lib/app-data";
import { mergeProposalTemplates, type MaterialItem, type ProposalTemplate } from "@/lib/proposal-templates";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const SIGNED_URL_TTL = 60 * 60; // 1 hour

async function signProposalPhotoPath(admin: ReturnType<typeof createSupabaseAdminClient>, path: string) {
  const { data, error } = await admin.storage
    .from("proposal-photos")
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

async function withSignedMaterialImages(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  companyId: string,
  rows: MaterialItem[] | undefined
): Promise<MaterialItem[] | undefined> {
  if (!rows?.length) return rows;
  const prefix = `${companyId}/`;
  const next: MaterialItem[] = [];
  for (const row of rows) {
    const imagePath = row.imagePath?.trim();
    if (imagePath && imagePath.startsWith(prefix)) {
      const signed = await signProposalPhotoPath(admin, imagePath);
      next.push({ ...row, imageUrl: signed ?? row.imageUrl });
    } else {
      next.push(row);
    }
  }
  return next;
}

function isProposalExpired(quote: Quote) {
  if (!quote.expiresAt || quote.status === "Accepted" || quote.status === "converted_to_project") return false;
  return new Date(quote.expiresAt) < new Date();
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ quoteId: string }> }
) {
  const { quoteId } = await context.params;
  const token = request.nextUrl.searchParams.get("t")?.trim();
  if (!quoteId || !token) {
    return NextResponse.json({ error: "Missing proposal or token" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: row, error } = await admin
    .from("quotes")
    .select("id, company_id, project_id, data")
    .eq("id", quoteId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to load proposal" }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const quote = { ...(row.data as Quote), id: row.id, projectId: row.project_id ?? (row.data as Quote).projectId };
  if (!quote.clientPortalToken || quote.clientPortalToken !== token) {
    return NextResponse.json({ error: "Invalid link" }, { status: 403 });
  }

  const companyId = row.company_id as string;
  const trade = (quote.trade ?? "").trim();

  const { data: settingsRow } = await admin
    .from("company_settings")
    .select("data")
    .eq("company_id", companyId)
    .maybeSingle();

  let templateJson: ProposalTemplate | null = null;
  if (trade) {
    const { data } = await admin
      .from("proposal_templates")
      .select("data")
      .eq("company_id", companyId)
      .eq("trade", trade)
      .maybeSingle();
    templateJson = (data?.data ?? null) as ProposalTemplate | null;
  }
  if (!templateJson) {
    const { data } = await admin
      .from("proposal_templates")
      .select("data")
      .eq("company_id", companyId)
      .limit(1)
      .maybeSingle();
    templateJson = (data?.data ?? null) as ProposalTemplate | null;
  }

  const settings = mergeAppSettings((settingsRow?.data ?? defaultSettings) as AppSettings);
  const defaults = mergeProposalTemplates([]);
  const template =
    templateJson ??
    defaults.find((t) => t.trade === quote.trade) ??
    defaults[0] ??
    null;

  if (!template) {
    return NextResponse.json({ error: "Proposal template unavailable" }, { status: 500 });
  }

  const pathPrefix = `${companyId}/`;
  let coverPhotoUrl: string | null = null;
  const coverPath = quote.coverImagePath ?? null;
  if (coverPath && coverPath.startsWith(pathPrefix)) {
    coverPhotoUrl = await signProposalPhotoPath(admin, coverPath);
  }

  const paths = quote.existingPhotoPaths ?? [];
  const existingPhotos: string[] = [];
  for (const p of paths) {
    if (p.startsWith(pathPrefix)) {
      const url = await signProposalPhotoPath(admin, p);
      if (url) existingPhotos.push(url);
    } else {
      existingPhotos.push("");
    }
  }

  const safeQuote = { ...quote };
  delete safeQuote.clientPortalToken;

  const signedQuoteTierRows = {
    Good: await withSignedMaterialImages(admin, companyId, safeQuote.tierMaterialsTable?.Good),
    Better: await withSignedMaterialImages(admin, companyId, safeQuote.tierMaterialsTable?.Better),
    Best: await withSignedMaterialImages(admin, companyId, safeQuote.tierMaterialsTable?.Best),
  };
  const safeQuoteWithSignedRows: Quote = {
    ...safeQuote,
    tierMaterialsTable: {
      ...safeQuote.tierMaterialsTable,
      ...Object.fromEntries(
        Object.entries(signedQuoteTierRows).filter(([, rows]) => Array.isArray(rows))
      ),
    },
  };

  const settingsWithSignedRows: AppSettings = {
    ...settings,
    proposalSettings: {
      ...settings.proposalSettings,
      goodTierMaterialsTable: (await withSignedMaterialImages(
        admin,
        companyId,
        settings.proposalSettings.goodTierMaterialsTable
      )) ?? settings.proposalSettings.goodTierMaterialsTable,
      betterTierMaterialsTable: (await withSignedMaterialImages(
        admin,
        companyId,
        settings.proposalSettings.betterTierMaterialsTable
      )) ?? settings.proposalSettings.betterTierMaterialsTable,
      bestTierMaterialsTable: (await withSignedMaterialImages(
        admin,
        companyId,
        settings.proposalSettings.bestTierMaterialsTable
      )) ?? settings.proposalSettings.bestTierMaterialsTable,
    },
  };

  const templateWithSignedRows: ProposalTemplate = {
    ...template,
    materialsSpecs: {
      ...template.materialsSpecs,
      items:
        (await withSignedMaterialImages(admin, companyId, template.materialsSpecs.items)) ??
        template.materialsSpecs.items,
    },
    tierMaterialsByPackage: {
      ...template.tierMaterialsByPackage,
      Good: await withSignedMaterialImages(admin, companyId, template.tierMaterialsByPackage?.Good),
      Better: await withSignedMaterialImages(admin, companyId, template.tierMaterialsByPackage?.Better),
      Best: await withSignedMaterialImages(admin, companyId, template.tierMaterialsByPackage?.Best),
    },
  };

  return NextResponse.json({
    quote: safeQuoteWithSignedRows,
    settings: settingsWithSignedRows,
    template: templateWithSignedRows,
    coverPhotoUrl,
    coverLayout: quote.coverLayout ?? settings.branding.proposalCoverLayout,
    existingPhotos,
    existingPhotoCaptions: quote.existingPhotoCaptions ?? [],
    expired: isProposalExpired(quote),
    alreadyAccepted: quote.status === "Accepted" || quote.status === "converted_to_project",
  });
}
