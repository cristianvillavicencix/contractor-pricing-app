"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Dummy URL/key only so SSR/RSC can render without throwing when env is missing.
 * The browser must use real credentials — see throw branch below.
 */
const SSR_PLACEHOLDER_URL = "https://placeholder.supabase.co";
const SSR_PLACEHOLDER_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJwbGFjZWhvbGRlciJ9.placeholder";

export function createSupabaseBrowserClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    if (typeof window === "undefined") {
      return createBrowserClient(SSR_PLACEHOLDER_URL, SSR_PLACEHOLDER_ANON_KEY);
    }
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copy `.env.example` to `.env.local`, add your Supabase URL and anon key, then restart `npm run dev`."
    );
  }

  return createBrowserClient(url, anonKey);
}

