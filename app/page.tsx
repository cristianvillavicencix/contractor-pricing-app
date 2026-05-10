"use client";

import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { ErrorPanel, PageSkeleton } from "@/components/ui/list-states";
import {
  formatMargin,
  formatMoney,
  mergeAppSettings,
  defaultSettings,
  type Quote,
  type AppSettings,
} from "@/lib/app-data";
import { t } from "@/lib/ui-strings";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { listProjects, listQuotes, loadCompanySettings } from "@/lib/supabase/data";

export default function DashboardPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["dashboard", "lists"],
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const [rawSettings, dbProjects, dbQuotes] = await Promise.all([
        loadCompanySettings<AppSettings | null>(supabase),
        listProjects(supabase),
        listQuotes(supabase),
      ]);
      const settings = mergeAppSettings(rawSettings ?? defaultSettings);
      return { settings, projects: dbProjects, quotes: dbQuotes };
    },
  });

  const projects = data?.projects ?? [];
  const quotes = data?.quotes ?? [];

  const activeProjects = projects.filter(
    (p) => p.status !== "Won" && p.status !== "Lost" && p.status !== "Archived"
  );
  const wonProjects = projects.filter((p) => p.status === "Won");
  const pendingQuotes = quotes.filter((q) => q.status === "Draft" || q.status === "Sent");
  const acceptedQuotes = quotes.filter((q) => q.status === "Accepted");
  const recentlySignedQuotes = useMemo(
    () =>
      acceptedQuotes.filter((q) => {
        if (!q.signedAt) return false;
        const sinceMs = new Date().getTime() - new Date(q.signedAt).getTime();
        return sinceMs < 7 * 24 * 60 * 60 * 1000;
      }),
    [acceptedQuotes]
  );
  const winRate = quotes.length > 0 ? acceptedQuotes.length / quotes.length : 0;

  const pipelineValue = activeProjects.reduce((sum, p) => {
    const matchedQuote = quotes
      .filter((q) => q.projectId === p.id)
      .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))[0];
    if (matchedQuote) {
      const selected = getSelectedResult(matchedQuote);
      return sum + selected.salePrice;
    }
    return sum;
  }, 0);

  const quoteMargins = quotes.map((q) => getSelectedResult(q).margin);
  const quoteProfits = quotes.map((q) => getSelectedResult(q).profit);
  const avgMargin = average(quoteMargins);
  const avgProfit = average(quoteProfits);

  const statusCounts: Record<string, number> = {};
  for (const p of projects) {
    statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1;
  }

  const recentQuotes = [...quotes]
    .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
    .slice(0, 5);

  if (isPending) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] lg:flex">
        <AppSidebar />
        <main className="min-w-0 flex-1 p-5 sm:p-8 lg:p-10">
          <PageSkeleton rows={6} />
        </main>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] lg:flex">
        <AppSidebar />
        <main className="flex min-w-0 flex-1 items-center justify-center p-6">
          <div className="max-w-md">
            <ErrorPanel
              title="Could not load dashboard"
              message={error instanceof Error ? error.message : "Failed to load"}
              onRetry={() => void refetch()}
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)] lg:flex">
      <AppSidebar />

      <main className="min-w-0 flex-1 overflow-auto p-5 pb-24 sm:p-8 sm:pb-24 lg:p-10">
        <div className="w-full">
          <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div>
              <p className="page-kicker text-sm font-medium">Dashboard</p>
              <h2 className="page-title mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Overview</h2>
              <p className="page-description mt-3 max-w-2xl text-sm">
                Your business at a glance — pipeline, quotes, and margins.
              </p>
            </div>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--brand-accent)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[var(--brand-accent-hover)]"
            >
              New Pricing
              <ArrowRight className="h-4 w-4" />
            </Link>
          </header>

          <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Pipeline Value"
              value={formatMoney(pipelineValue)}
              detail={`${activeProjects.length} active project${activeProjects.length !== 1 ? "s" : ""}`}
              accent
            />
            <MetricCard
              label="Active Projects"
              value={String(activeProjects.length)}
              detail={`${wonProjects.length} won · ${projects.filter((p) => p.status === "Lost").length} lost`}
            />
            <MetricCard
              label="Quotes Pending"
              value={String(pendingQuotes.length)}
              detail={`${acceptedQuotes.length} accepted`}
              badge={
                recentlySignedQuotes.length > 0
                  ? `${recentlySignedQuotes.length} signed this week`
                  : undefined
              }
            />
            <MetricCard
              label="Win Rate"
              value={quotes.length ? `${(winRate * 100).toFixed(0)}%` : "—"}
              detail={`Avg margin ${quotes.length ? formatMargin(avgMargin) : "—"}`}
            />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
            <div className="elevated-panel rounded-lg border border-[#d9e2ec] bg-white dark:border-slate-600">
              <div className="flex items-center justify-between border-b border-[#d9e2ec] p-5 sm:p-6">
                <div>
                  <h3 className="text-base font-semibold tracking-tight">Recent Quotes</h3>
                  <p className="mt-0.5 text-sm text-gray-500">Latest proposals across all projects.</p>
                </div>
                <Link href="/quotes" className="text-xs font-medium text-gray-400 transition hover:text-black">
                  View all →
                </Link>
              </div>

              {recentQuotes.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {recentQuotes.map((quote) => {
                    const selected = getSelectedResult(quote);
                    return (
                      <div
                        key={quote.id}
                        className="grid gap-3 p-5 text-sm sm:grid-cols-[1.5fr_1fr_1fr_1fr_100px] sm:items-center sm:p-6"
                      >
                        <div>
                          <p className="font-medium text-black">{quote.projectName}</p>
                          <p className="mt-0.5 text-xs text-gray-500">{quote.customerName}</p>
                        </div>
                        <span className="text-gray-600">{quote.selectedOption}</span>
                        <span className="font-medium">{formatMoney(selected.salePrice)}</span>
                        <span className="text-gray-600">{formatMargin(selected.margin)}</span>
                        <QuoteStatusBadge status={quote.status} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-10 text-center">
                  <p className="font-semibold tracking-tight">{t("emptyDashboardQuotes")}</p>
                  <p className="mt-2 text-sm text-gray-500">{t("emptyQuotesHint")}</p>
                  <Link
                    href="/projects"
                    className="mt-4 inline-block text-sm font-medium text-[var(--brand-accent)] hover:underline"
                  >
                    Go to projects →
                  </Link>
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div className="elevated-panel rounded-lg border border-[#d9e2ec] bg-white p-5 dark:border-slate-600">
                <h3 className="text-sm font-semibold tracking-tight">Projects by Status</h3>
                <div className="mt-4 space-y-2">
                  {(["Draft", "Pricing", "Quoted", "Won", "Lost", "Archived"] as const).map((status) => {
                    const count = statusCounts[status] ?? 0;
                    const pct = projects.length > 0 ? (count / projects.length) * 100 : 0;
                    return (
                      <div key={status}>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">{status}</span>
                          <span className="font-medium text-black">{count}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-[#f0f4f8]">
                          <div
                            className="h-1.5 rounded-full bg-[var(--brand-navy)]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {quotes.length > 0 && (
                <div className="elevated-panel rounded-lg border border-[#d9e2ec] bg-white p-5 dark:border-slate-600">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-gray-400" />
                    <h3 className="text-sm font-semibold tracking-tight">Quote Averages</h3>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Avg Margin</p>
                      <p className="mt-1 text-xl font-semibold">{formatMargin(avgMargin)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Avg Profit</p>
                      <p className="mt-1 text-xl font-semibold">{formatMoney(avgProfit)}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {[
                  { title: "Projects", href: "/projects", desc: `${projects.length} total` },
                  { title: "Quotes", href: "/quotes", desc: `${quotes.length} saved` },
                  { title: "Contacts", href: "/contacts", desc: "Customer directory" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center justify-between rounded-lg border border-[#d9e2ec] bg-white px-4 py-3 transition hover:border-[#b7c7d6] hover:bg-[#f6f8fb]"
                  >
                    <div>
                      <p className="text-sm font-medium text-black">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  badge,
  accent = false,
}: {
  label: string;
  value: string;
  detail: string;
  badge?: string;
  accent?: boolean;
}) {
  return (
    <article
      className={`rounded-lg border p-5 sm:p-6 ${accent ? "border-[#111111] bg-[#111111] text-white" : "elevated-panel border-[#d9e2ec] bg-white dark:border-slate-600"}`}
    >
      <p className={`text-sm font-medium ${accent ? "text-white/70" : "text-gray-500"}`}>{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className={`mt-2 text-sm ${accent ? "text-white/60" : "text-gray-500"}`}>{detail}</p>
      {badge ? (
        <p
          className={`mt-3 inline-flex rounded-md px-2 py-1 text-xs font-medium ${
            accent ? "bg-white/10 text-white" : "bg-green-50 text-green-700"
          }`}
        >
          {badge}
        </p>
      ) : null}
    </article>
  );
}

function QuoteStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Draft: "bg-gray-100 text-gray-600",
    Sent: "bg-blue-50 text-blue-700",
    Accepted: "bg-green-50 text-green-700",
    Declined: "bg-red-50 text-red-700",
  };
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {status}
    </span>
  );
}

function getSelectedResult(quote: Quote) {
  if (quote.selectedOption === "Good") return quote.good;
  if (quote.selectedOption === "Better") return quote.better;
  return quote.best;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
