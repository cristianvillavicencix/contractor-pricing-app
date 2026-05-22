import { NextResponse } from "next/server";
import mammoth from "mammoth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing .docx file." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await mammoth.convertToHtml({ buffer });

  return NextResponse.json({
    html: result.value,
    messages: result.messages.map((message) => message.message),
  });
}
