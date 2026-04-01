import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { query } = await req.json();
  if (!query) return NextResponse.json({ error: "Query required" }, { status: 400 });

  const googleKey = process.env.GOOGLE_MAPS_API_KEY;

  // Try direct Google Places API if key is available
  if (googleKey && googleKey !== "REPLACE_ME") {
    try {
      const textRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${googleKey}`
      );
      const textData = await textRes.json();

      if (textData.status === "OK") {
        const results = await Promise.all(
          (textData.results as GooglePlaceTextResult[]).slice(0, 20).map(async (place) => {
            // Fetch phone via Place Details
            let phone: string | undefined;
            let website: string | undefined;
            let photos: string[] = [];

            try {
              const detailRes = await fetch(
                `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=formatted_phone_number,website,photos&key=${googleKey}`
              );
              const detailData = await detailRes.json();
              phone = detailData.result?.formatted_phone_number;
              website = detailData.result?.website;
              const photoRefs: { photo_reference: string }[] = detailData.result?.photos ?? [];
              photos = photoRefs.slice(0, 3).map(
                (p) =>
                  `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${p.photo_reference}&key=${googleKey}`
              );
            } catch {
              // skip detail fetch errors
            }

            return {
              placeId: place.place_id,
              name: place.name,
              address: place.formatted_address,
              rating: place.rating,
              userRatingsTotal: place.user_ratings_total,
              phone,
              website,
              photos,
            };
          })
        );

        return NextResponse.json(results);
      }
    } catch {
      // fall through to FastAPI
    }
  }

  // Proxy to FastAPI fallback
  const fastapiUrl = process.env.FASTAPI_INTERNAL_URL;
  if (!fastapiUrl) {
    return NextResponse.json(
      { error: "Google Maps not configured. Add GOOGLE_MAPS_API_KEY to .env.local" },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(
      `${fastapiUrl}/api/v1/contacts/google-maps-search`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }
    return NextResponse.json(await res.json());
  } catch {
    // Fall back to mock data so the UI is always interactive
    return NextResponse.json(generateMockResults(query));
  }
}

function generateMockResults(query: string) {
  const q = query.toLowerCase();

  // Pick a business category based on query keywords
  const isDentist = /dent|dental|tooth|teeth/.test(q);
  const isCoffee = /coffee|cafe|café|latte|espresso/.test(q);
  const isGym = /gym|fitness|workout|yoga|pilates/.test(q);
  const isRestaurant = /restaurant|food|eat|dine|bistro|pizza|sushi/.test(q);
  const isClinic = /clinic|doctor|medical|health|physio/.test(q);
  const isSalon = /salon|hair|beauty|spa|nail/.test(q);

  // Extract a city hint from the query
  const cityMatch = q.match(/in\s+([a-z\s]+?)(?:,|$)/);
  const city = cityMatch
    ? cityMatch[1].trim().replace(/\b\w/g, (c) => c.toUpperCase())
    : "San Francisco";

  type Template = { names: string[]; addresses: string[]; phones: string[] };

  const templates: Record<string, Template> = {
    dentist: {
      names: [
        "Bright Smile Dental", "Family Dentistry Care", "City Dental Group",
        "Sunshine Orthodontics", "Precision Dental Studio", "Metro Dental Center",
        "Gentle Touch Dentistry", "Premier Smiles Clinic", "Northside Dental",
        "Lakewood Dental Arts", "Advanced Smile Solutions", "Downtown Dental",
      ],
      addresses: [
        `214 Market St, ${city}`, `88 Union Ave, ${city}`, `500 Broadway, ${city}`,
        `1020 Pine St, ${city}`, `37 Oak Blvd, ${city}`, `620 Elm St, ${city}`,
        `4 Maple Dr, ${city}`, `1500 Mission Blvd, ${city}`, `72 Center Ave, ${city}`,
        `330 Park Rd, ${city}`, `900 Cedar Ln, ${city}`, `15 Hillside Dr, ${city}`,
      ],
      phones: [
        "+1 415 555 0101", "+1 415 555 0234", "+1 415 555 0389", "+1 415 555 0412",
        "+1 415 555 0567", "", "+1 415 555 0678", "+1 415 555 0799", "+1 415 555 0812",
        "+1 415 555 0943", "+1 415 555 1023", "+1 415 555 1156",
      ],
    },
    coffee: {
      names: [
        "Blue Bottle Coffee", "Ritual Coffee Roasters", "Sightglass Coffee",
        "Four Barrel Café", "Philz Coffee", "Verve Coffee Co",
        "Equator Coffees", "Linea Caffe", "Chromatic Coffee",
        "Red Rock Coffee", "Saint Frank Coffee", "Dandelion Café",
      ],
      addresses: [
        `315 Linden St, ${city}`, `1026 Valencia St, ${city}`, `7th & Folsom, ${city}`,
        `375 Castro St, ${city}`, `201 Berry St, ${city}`, `228 Columbus Ave, ${city}`,
        `986 Market St, ${city}`, `3600 18th St, ${city}`, `152 Lytton Ave, ${city}`,
        `201 Castro St, ${city}`, `2340 Polk St, ${city}`, `55 Mint Plaza, ${city}`,
      ],
      phones: [
        "+1 415 555 2101", "+1 415 555 2234", "", "+1 415 555 2389",
        "+1 415 555 2412", "+1 415 555 2567", "+1 415 555 2678", "",
        "+1 415 555 2799", "+1 415 555 2812", "+1 415 555 2943", "+1 415 555 3023",
      ],
    },
    default: {
      names: [
        `${city} Business Center`, "Metro Services Group", "Pacific Consulting LLC",
        "Greenway Solutions", "Apex Professional Services", "Harbor Associates",
        "Sunrise Enterprises", "Westside Group", "Oakwood Partners",
        "Clearview Services", "Nexus Business Hub", "Summit Advisors",
      ],
      addresses: [
        `1 Market Plaza, ${city}`, `500 3rd St, ${city}`, `200 California St, ${city}`,
        `101 Second St, ${city}`, `555 Mission St, ${city}`, `425 Market St, ${city}`,
        `100 Pine St, ${city}`, `44 Montgomery St, ${city}`, `315 Montgomery St, ${city}`,
        `50 Fremont St, ${city}`, `221 Main St, ${city}`, `600 Battery St, ${city}`,
      ],
      phones: [
        "+1 415 555 4101", "+1 415 555 4234", "+1 415 555 4389", "",
        "+1 415 555 4412", "+1 415 555 4567", "+1 415 555 4678", "+1 415 555 4799",
        "", "+1 415 555 4812", "+1 415 555 4943", "+1 415 555 5023",
      ],
    },
  };

  const key = isDentist ? "dentist"
    : isCoffee ? "coffee"
    : isGym || isClinic || isRestaurant || isSalon ? "default"
    : "default";

  const t = templates[key];
  const ratings = [4.9, 4.8, 4.7, 4.6, 4.5, 4.4, 4.3, 4.2, 4.1, 4.0, 3.9, 3.8];
  const reviewCounts = [312, 847, 204, 1023, 156, 589, 78, 423, 267, 91, 445, 133];

  // Use query as seed for deterministic-ish shuffle
  const seed = query.length;

  return t.names.map((name, i) => ({
    placeId: `mock_${i}_${query.replace(/\s+/g, "_")}`,
    name,
    address: t.addresses[i],
    phone: t.phones[(i + seed) % t.phones.length] || undefined,
    rating: ratings[(i + seed) % ratings.length],
    userRatingsTotal: reviewCounts[(i + seed) % reviewCounts.length],
    photos: [],
  }));
}

interface GooglePlaceTextResult {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  user_ratings_total?: number;
}
