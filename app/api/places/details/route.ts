import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

type AddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get("place_id")?.trim();
  if (!placeId) return NextResponse.json({ error: "Missing place_id" }, { status: 400 });

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ error: "Places API not configured" }, { status: 500 });

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "name,formatted_phone_number,address_components,formatted_address,website");
  url.searchParams.set("language", "en");
  url.searchParams.set("key", key);

  const res = await fetch(url.toString());
  const data = await res.json() as {
    status: string;
    result?: {
      name?: string;
      formatted_phone_number?: string;
      formatted_address?: string;
      website?: string;
      address_components?: AddressComponent[];
    };
  };

  if (data.status !== "OK" || !data.result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const r = data.result;
  const stateComponent = r.address_components?.find((c) =>
    c.types.includes("administrative_area_level_1")
  );

  return NextResponse.json({
    name: r.name ?? null,
    phone: r.formatted_phone_number ?? null,
    address: r.formatted_address?.replace(", USA", "") ?? null,
    website: r.website ?? null,
    state: stateComponent?.long_name ?? null,
  });
}
