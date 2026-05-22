import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Body = {
  bucket: "proposal-assets" | "proposal-photos" | "branding";
  path: string; // filename only (server will prefix companyId)
  contentType: string;
  dataUrl: string;
  alreadyPrefixed?: boolean;
};

function dataUrlToBytes(dataUrl: string) {
  const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!m) throw new Error("Invalid data URL");
  const base64 = m[2]!;
  return Buffer.from(base64, "base64");
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Body;
  if (!body.bucket || !body.path || !body.dataUrl) {
    return NextResponse.json({ error: "bucket, path, dataUrl required" }, { status: 400 });
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

  const bytes = dataUrlToBytes(body.dataUrl);
  const cleanPath = body.path.replace(/^\/+/, "");
  const objectPath = body.alreadyPrefixed
    ? cleanPath
    : `${company.id}/${cleanPath}`;

  if (!objectPath.startsWith(`${company.id}/`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error: uploadError } = await admin.storage
    .from(body.bucket)
    .upload(objectPath, bytes, {
      contentType: body.contentType || "application/octet-stream",
      upsert: true,
    });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  return NextResponse.json({ path: objectPath });
}
