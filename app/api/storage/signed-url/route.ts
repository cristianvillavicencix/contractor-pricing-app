import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Body = {
  bucket: "proposal-photos" | "branding";
  path: string;
  expiresIn?: number; // seconds
};

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Body;
  if (!body.bucket || !body.path) {
    return NextResponse.json({ error: "bucket and path required" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: company, error: companyError } = await admin
    .from("companies")
    .select("id")
    .eq("owner_user_id", user.id)
    .single();
  if (companyError || !company?.id) {
    return NextResponse.json({ error: "Company not found" }, { status: 400 });
  }

  if (!body.path.startsWith(`${company.id}/`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await admin.storage
    .from(body.bucket)
    .createSignedUrl(body.path, body.expiresIn ?? 60 * 30);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}

