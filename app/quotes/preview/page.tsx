import { redirect } from "next/navigation";

// Deprecated: the old Tiptap preview page.
// All proposal management now lives in /v2/proposals.
// Legacy editor still accessible via /quotes/editor (admin fallback).
export default function QuotesPreviewPage() {
  redirect("/v2/proposals");
}
