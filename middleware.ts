import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return NextResponse.next();

  const response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const path = request.nextUrl.pathname;
  const isAuthRoute =
    path.startsWith("/login") ||
    path.startsWith("/auth/callback") ||
    path.startsWith("/auth/complete") ||
    path.startsWith("/auth/update-password");
  const isPublicProposalClientPage = /^\/proposal\/[^/]+\/(accept|payment)$/.test(path);
  const isPublicProposalClientApi =
    /^\/api\/proposal\/[^/]+\/client(\/accept)?$/.test(path);

  if (!session && !isAuthRoute && !isPublicProposalClientPage && !isPublicProposalClientApi) {
    url.pathname = "/login";
    url.searchParams.set("next", path + (request.nextUrl.search ?? ""));
    return NextResponse.redirect(url);
  }

  if (session && path === "/login") {
    url.pathname = "/auth/complete";
    url.searchParams.set("next", "/projects");
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|vendor/).*)"],
};

