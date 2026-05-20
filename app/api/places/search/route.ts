import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

type PlaceResult = {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  user_ratings_total?: number;
};

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ suggestions: [] });

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ error: "Places API not configured" }, { status: 500 });

  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  url.searchParams.set("query", q);
  url.searchParams.set("language", "en");
  url.searchParams.set("key", key);

  const res = await fetch(url.toString());
  const data = await res.json() as { status: string; results: PlaceResult[] };

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    return NextResponse.json({ suggestions: [] });
  }

  const suggestions = (data.results ?? []).slice(0, 6).map((p) => ({
    place_id: p.place_id,
    name: p.name,
    address: p.formatted_address.replace(", USA", ""),
    rating: p.rating ?? null,
    total_ratings: p.user_ratings_total ?? 0,
  }));

  return NextResponse.json({ suggestions });
}
