#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function parseArgs(argv) {
  const args = new Set(argv.slice(2));
  const companyIdx = argv.findIndex((value) => value === "--company");
  const companyId = companyIdx >= 0 ? argv[companyIdx + 1] : undefined;
  return {
    write: args.has("--write"),
    companyId,
  };
}

function loadEnvFromFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const sep = line.indexOf("=");
    if (sep <= 0) continue;
    const key = line.slice(0, sep).trim();
    const raw = line.slice(sep + 1).trim();
    const value =
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))
        ? raw.slice(1, -1)
        : raw;
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function getSelectedResult(quote) {
  if (quote.selectedOption === "Good") return quote.good;
  if (quote.selectedOption === "Better") return quote.better;
  return quote.best;
}

function parseAddress(address) {
  const parts = (address ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    line1: parts[0] ?? "",
    city: parts[1] ?? "",
    state: parts[2] ?? "Connecticut",
  };
}

function buildProjectFromQuote(quote) {
  const selected = getSelectedResult(quote);
  const parsedAddress = parseAddress(quote.customerAddress);
  const projectId = quote.projectId ?? quote.id;
  return {
    id: projectId,
    project_name: quote.projectName || "New Project",
    customer_name: quote.customerName || "Customer",
    customer_phone: quote.customerPhone ?? "",
    customer_email: quote.customerEmail ?? "",
    address: quote.jobAddress ?? parsedAddress.line1 ?? "",
    city: quote.jobCity ?? parsedAddress.city ?? "",
    state: quote.jobState ?? parsedAddress.state ?? "Connecticut",
    zip_code: quote.jobZipCode ?? "",
    trade: quote.trade ?? "Remodeling",
    status: "Planned",
    notes: [
      `Created automatically from proposal ${quote.proposalNumber ?? quote.id}.`,
      `Selected option: ${quote.selectedOption ?? "Better"}.`,
      `Final agreed price: ${Math.round(selected?.salePrice ?? 0)}.`,
      quote.scopeSummary ? `Scope: ${quote.scopeSummary}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    costs: {
      materials: 0,
      labor: 0,
      dumpster: 0,
      permits: 0,
      equipment: 0,
      subcontractor: 0,
      miscellaneous: 0,
    },
    project_size: quote.projectSize ?? "Medium",
    risk_level: quote.riskLevel ?? "Medium",
    contact_id: quote.contactId ?? null,
  };
}

async function main() {
  const repoRoot = process.cwd();
  loadEnvFromFile(path.join(repoRoot, ".env.local"));
  loadEnvFromFile(path.join(repoRoot, ".env"));

  const { write, companyId } = parseArgs(process.argv);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let quotesQuery = supabase
    .from("quotes")
    .select("id, company_id, project_id, data")
    .order("created_at", { ascending: false });
  let projectsQuery = supabase.from("projects").select("id, company_id, status");
  if (companyId) {
    quotesQuery = quotesQuery.eq("company_id", companyId);
    projectsQuery = projectsQuery.eq("company_id", companyId);
  }

  const [{ data: quoteRows, error: quotesError }, { data: projectRows, error: projectsError }] =
    await Promise.all([quotesQuery, projectsQuery]);
  if (quotesError) throw quotesError;
  if (projectsError) throw projectsError;

  const quoteUpdates = [];
  const projectStatusUpdates = [];
  const projectsToCreate = [];

  const now = Date.now();
  for (const row of quoteRows ?? []) {
    const quote = { ...(row.data ?? {}), id: row.id, projectId: row.project_id ?? row.data?.projectId };
    const nextQuote = { ...quote };
    let changed = false;

    if (!nextQuote.depositStatus) {
      nextQuote.depositStatus = "Pending";
      changed = true;
    }

    if (
      (nextQuote.status === "Draft" || nextQuote.status === "Sent") &&
      nextQuote.expiresAt &&
      new Date(nextQuote.expiresAt).getTime() < now
    ) {
      nextQuote.status = "Expired";
      changed = true;
    }

    if (
      nextQuote.status === "Accepted" &&
      nextQuote.depositStatus === "Paid" &&
      !nextQuote.projectId
    ) {
      const project = buildProjectFromQuote(nextQuote);
      nextQuote.projectId = project.id;
      nextQuote.projectCreatedAt = new Date().toISOString();
      nextQuote.projectCreatedFromProposalId = row.id;
      changed = true;
      projectsToCreate.push({
        ...project,
        company_id: row.company_id,
      });
    }

    if (changed) {
      quoteUpdates.push({
        id: row.id,
        project_id: nextQuote.projectId ?? null,
        data: nextQuote,
      });
    }
  }

  for (const row of projectRows ?? []) {
    if (row.status === "Pricing" || row.status === "Quoted") {
      projectStatusUpdates.push({ id: row.id, status: "Planned" });
    }
  }

  console.log("Legacy workflow migration preview");
  console.log(`- quote updates: ${quoteUpdates.length}`);
  console.log(`- project status updates: ${projectStatusUpdates.length}`);
  console.log(`- projects to create: ${projectsToCreate.length}`);
  console.log(`- mode: ${write ? "WRITE" : "DRY-RUN"}`);
  if (!write) {
    console.log("No changes written. Re-run with --write to apply.");
    return;
  }

  for (const project of projectsToCreate) {
    const { error } = await supabase.from("projects").upsert(project);
    if (error) throw error;
  }

  for (const quote of quoteUpdates) {
    const { error } = await supabase
      .from("quotes")
      .update({ project_id: quote.project_id, data: quote.data })
      .eq("id", quote.id);
    if (error) throw error;
  }

  for (const project of projectStatusUpdates) {
    const { error } = await supabase
      .from("projects")
      .update({ status: project.status })
      .eq("id", project.id);
    if (error) throw error;
  }

  console.log("Migration complete.");
}

main().catch((error) => {
  console.error("Migration failed:", error?.message ?? error);
  process.exit(1);
});
