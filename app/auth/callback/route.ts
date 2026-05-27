import { NextResponse } from "next/server";
import { getServerAppOrigin } from "@/lib/auth-redirect-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const origin = getServerAppOrigin(
    request.url,
    request.headers.get("x-forwarded-host"),
    request.headers.get("x-forwarded-proto")
  );
  const complete = new URL("/auth/complete", origin);
  complete.searchParams.set("next", next.startsWith("/") ? next : "/");
  return NextResponse.redirect(complete.toString());
}
