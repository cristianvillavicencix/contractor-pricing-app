"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Download, Eye, Loader2, Save, Send, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getQuote, loadCompanySettings, upsertQuote, getProposalTemplateForTrade } from "@/lib/supabase/data";
import {
  defaultSettings,
  formatMoney,
  mergeAppSettings,
  type AppSettings,
  type Quote,
} from "@/lib/app-data";
import {
  mergeProposalTemplates,
  type ProposalTemplate,
} from "@/lib/proposal-templates";
import { ProposalTiptapEditor } from "@/components/proposal-editor/proposal-tiptap-editor";
import { V2Shell } from "@/app/v2/_shared/Shell";

// ─── Send modal ───────────────────────────────────────────────────────────────

type SendState = "idle" | "sending" | "sent" | "error";

function SendModal({
  quote,
  settings,
  onClose,
  onSent,
}: {
  quote: Quote;
  settings: AppSettings;
  onClose: () => void;
  onSent: () => void;
}) {
  const companyName = settings.companyProfile.businessName || "us";
  const defaultSubject = `Your proposal from ${companyName}${quote.proposalNumber ? ` — ${quote.proposalNumber}` : ""}`;
  const defaultMessage = `Hi ${quote.customerName || "there"},\n\nPlease find your proposal attached. Click the button below to review, choose your preferred option, and sign.\n\nLet me know if you have any questions.\n\n${settings.companyProfile.contactName || ""}\n${companyName}`;

  const [to, setTo] = useState(quote.customerEmail ?? "");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultMessage);
  const [state, setState] = useState<SendState>("idle");
  const [error, setError] = useState("");

  async function handleSend() {
    if (!to.trim()) { setError("Recipient email is required."); return; }
    setState("sending");
    setError("");
    try {
      const res = await fetch(`/api/proposal/${quote.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.trim(),
          cc: cc.split(",").map((s) => s.trim()).filter(Boolean),
          subject,
          message,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Server error ${res.status}`);
      }
      setState("sent");
      setTimeout(() => { onSent(); onClose(); }, 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send.");
      setState("error");
    }
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const sent = state === "sent";
  const busy = state === "sending";

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(26,24,20,0.55)", display: "flex",
        alignItems: "center", justifyContent: "center", padding: 20,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 520,
        boxShadow: "0 24px 60px rgba(26,24,20,0.22)", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 22px", borderBottom: "1px solid #E8E4D9",
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#1A1814" }}>Send proposal</div>
            <div style={{ fontSize: 12, color: "#8A867E", marginTop: 2 }}>
              {quote.proposalNumber} · {quote.customerName}
            </div>
          </div>
          <button onClick={onClose} style={iconBtnStyle}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Success state */}
        {sent ? (
          <div style={{ padding: "48px 22px", textAlign: "center" }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%", background: "#E4F1E9",
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
            }}>
              <Check style={{ width: 24, height: 24, color: "#2F7D52" }} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#1A1814" }}>Proposal sent!</div>
            <div style={{ fontSize: 13, color: "#8A867E", marginTop: 6 }}>
              Email delivered to {to}
            </div>
          </div>
        ) : (
          <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
            {/* To */}
            <div>
              <label style={labelStyle}>To <span style={{ color: "#C24C3B" }}>*</span></label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="client@example.com"
                style={inputStyle}
              />
            </div>

            {/* CC */}
            <div>
              <label style={labelStyle}>CC <span style={{ color: "#8A867E", fontWeight: 400 }}>(optional, comma-separated)</span></label>
              <input
                type="text"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="colleague@example.com"
                style={inputStyle}
              />
            </div>

            {/* Subject */}
            <div>
              <label style={labelStyle}>Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Message */}
            <div>
              <label style={labelStyle}>Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }}
              />
            </div>

            {/* Info note */}
            <div style={{
              fontSize: 12, color: "#8A867E", background: "#FAFAF6",
              border: "1px solid #E8E4D9", borderRadius: 8, padding: "10px 12px",
            }}>
              The PDF will be attached automatically. The client will receive a link to review, choose a tier, and sign.
            </div>

            {/* Error */}
            {(state === "error") && (
              <div style={{
                fontSize: 13, color: "#C24C3B", background: "#FCEAE6",
                border: "1px solid #F2C3BC", borderRadius: 8, padding: "10px 12px",
              }}>
                {error}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4 }}>
              <button onClick={onClose} disabled={busy} style={ghostBtnStyle}>Cancel</button>
              <button
                onClick={() => void handleSend()}
                disabled={busy}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  background: busy ? "#4B4843" : "#213343", color: "#fff",
                  border: "none", borderRadius: 9, padding: "9px 20px",
                  fontSize: 13, fontWeight: 600, cursor: busy ? "wait" : "pointer",
                  transition: "background .15s",
                }}
                onMouseEnter={(e) => { if (!busy) e.currentTarget.style.background = "#ff5c35"; }}
                onMouseLeave={(e) => { if (!busy) e.currentTarget.style.background = "#213343"; }}
              >
                {busy
                  ? <><Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> Sending…</>
                  : <><Send style={{ width: 13, height: 13 }} /> Send proposal</>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Editor page ──────────────────────────────────────────────────────────────

function EditorContent() {
  const params = useSearchParams();
  const quoteId = params.get("id") ?? "";

  const [quote, setQuote] = useState<Quote | null>(null);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [template, setTemplate] = useState<ProposalTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  const htmlRef = useRef<string>("");
  const jsonRef = useRef<object>({});
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!quoteId) return;
    const supabase = createSupabaseBrowserClient();
    (async () => {
      const [q, s] = await Promise.all([
        getQuote(supabase, quoteId),
        loadCompanySettings<AppSettings>(supabase),
      ]);
      if (q) setQuote(q);
      if (s) setSettings(mergeAppSettings(s));

      if (q?.trade) {
        const saved = await getProposalTemplateForTrade(supabase, q.trade);
        const [merged] = mergeProposalTemplates(saved ? [saved] : []);
        if (merged) setTemplate(merged);
      }

      setIsLoading(false);
    })();
  }, [quoteId]);

  const handleChange = useCallback((html: string, json: object, silent = false) => {
    htmlRef.current = html;
    jsonRef.current = json;
    if (silent) return;
    setIsDirty(true);
    setIsSaved(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => { handleSave(html, json); }, 2000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = useCallback(async (html?: string, json?: object) => {
    if (!quote || !quoteId) return;
    const content = html ?? htmlRef.current;
    const contentJson = json ?? jsonRef.current;
    if (!content) return;
    setIsSaving(true);
    const supabase = createSupabaseBrowserClient();
    const updated: Quote = { ...quote, proposalDocument: content, proposalDocumentJson: contentJson };
    await upsertQuote(supabase, updated);
    setQuote(updated);
    setIsSaving(false);
    setIsSaved(true);
    setIsDirty(false);
    setTimeout(() => setIsSaved(false), 3000);
  }, [quote, quoteId]);

  const handleDownloadPdf = useCallback(async () => {
    if (!quoteId) return;
    await handleSave();
    window.open(`/api/proposals/pdf-tiptap?quoteId=${quoteId}`, "_blank");
  }, [quoteId, handleSave]);

  // After send succeeds: refresh quote to show updated status
  const handleSent = useCallback(async () => {
    if (!quoteId) return;
    const supabase = createSupabaseBrowserClient();
    const q = await getQuote(supabase, quoteId);
    if (q) setQuote(q);
  }, [quoteId]);

  if (!quoteId) {
    return <V2Shell><div style={centerStyle}><p style={mutedText}>No proposal ID provided.</p></div></V2Shell>;
  }

  if (isLoading) {
    return (
      <V2Shell>
        <div style={centerStyle}>
          <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite", color: "#C9A227" }} />
          <p style={mutedText}>Loading proposal…</p>
        </div>
      </V2Shell>
    );
  }

  if (!quote) {
    return <V2Shell><div style={centerStyle}><p style={mutedText}>Proposal not found.</p></div></V2Shell>;
  }

  const initialContent = quote.proposalDocument ?? null;
  const isSent = quote.status === "Sent" || quote.status === "Viewed" || quote.status === "Accepted";

  return (
    <>
      {sendOpen && (
        <SendModal
          quote={quote}
          settings={settings}
          onClose={() => setSendOpen(false)}
          onSent={handleSent}
        />
      )}

      <V2Shell fullBleedContent>
        <div className="proposal-editor-bar">
          <div className="proposal-editor-left">
            <Link
              href="/v2/proposals"
              className="proposal-editor-back"
            >
              <ArrowLeft style={{ width: 14, height: 14 }} />
              Proposals
            </Link>
            <span className="proposal-editor-divider">/</span>
            <span className="proposal-editor-ref">
              {quote.proposalNumber ?? "Proposal"}
            </span>
            {quote.customerName && (
              <span className="proposal-editor-customer">{quote.customerName}</span>
            )}
            {isSent && (
              <span className="pill blue" style={{ padding: "2px 8px", fontSize: 11 }}>
                <span className="dot"></span>
                {quote.status}
              </span>
            )}
          </div>

          <div className="proposal-editor-tiers">
            {(["good", "better", "best"] as const).map((tier) => (
              <div key={tier} className="proposal-editor-tier">
                <span>
                  {tier}
                </span>
                <b>
                  {formatMoney(quote[tier]?.salePrice ?? 0)}
                </b>
              </div>
            ))}
          </div>

          <div className="proposal-editor-actions">
            <span className="proposal-editor-save-state">
              {isSaving ? (
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> Saving…
                </span>
              ) : isSaved ? (
                <span style={{ display: "flex", alignItems: "center", gap: 5, color: "#2F7D52" }}>
                  <Check style={{ width: 12, height: 12 }} /> Saved
                </span>
              ) : isDirty ? "Unsaved changes" : null}
            </span>

            <button
              type="button"
              onClick={() => handleSave()}
              disabled={isSaving || !isDirty}
              className="btn ghost"
              style={{ opacity: isSaving || !isDirty ? 0.4 : 1, cursor: isDirty ? "pointer" : "default" }}
            >
              <Save style={{ width: 13, height: 13 }} /> Save
            </button>

            <a
              href={`/api/proposals/pdf-tiptap?quoteId=${quoteId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn ghost"
              style={{ textDecoration: "none" }}
            >
              <Eye style={{ width: 13, height: 13 }} /> Preview
            </a>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="btn primary"
            >
              <Download style={{ width: 13, height: 13 }} /> Download
            </button>

            <button
              type="button"
              onClick={() => setSendOpen(true)}
              className="btn dark"
            >
              <Send style={{ width: 13, height: 13 }} /> Send
            </button>
          </div>
        </div>

        {/* Tiptap editor */}
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          <ProposalTiptapEditor
            quote={quote}
            settings={settings}
            template={template}
            initialContent={initialContent}
            onChange={handleChange}
          />
        </div>
      </V2Shell>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const centerStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center",
  justifyContent: "center", gap: 10, height: "60vh",
};

const mutedText: React.CSSProperties = { color: "#8A867E", fontSize: 14 };

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600,
  color: "#4B4843", marginBottom: 5, letterSpacing: "0.02em",
};

const inputStyle: React.CSSProperties = {
  width: "100%", borderRadius: 9, border: "1px solid #E8E4D9",
  background: "#FAFAF6", padding: "9px 12px", fontSize: 13,
  color: "#1A1814", outline: "none", boxSizing: "border-box",
  fontFamily: "inherit",
};

const iconBtnStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center",
  width: 32, height: 32, borderRadius: 8, border: "none",
  background: "transparent", color: "#8A867E", cursor: "pointer",
};

const ghostBtnStyle: React.CSSProperties = {
  background: "#fff", border: "1px solid #E8E4D9", color: "#4B4843",
  borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 500,
  cursor: "pointer",
};

// ─── Export ───────────────────────────────────────────────────────────────────

export default function EditorPage() {
  return (
    <Suspense>
      <EditorContent />
    </Suspense>
  );
}
