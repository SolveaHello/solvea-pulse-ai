"""
Google Places API integration for contact extraction.
- Text Search to find businesses
- Place Details to get phone numbers
"""

import asyncio
import httpx
from app.config import settings

PLACES_TEXT_SEARCH = "https://maps.googleapis.com/maps/api/place/textsearch/json"
PLACES_DETAILS = "https://maps.googleapis.com/maps/api/place/details/json"


async def search_places(query: str) -> list[dict]:
    """Search for places using Text Search API. Returns list of place summaries."""
    params = {
        "query": query,
        "key": settings.GOOGLE_MAPS_API_KEY,
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(PLACES_TEXT_SEARCH, params=params)
        resp.raise_for_status()
        data = resp.json()

    if data.get("status") not in ("OK", "ZERO_RESULTS"):
        raise ValueError(f"Places API error: {data.get('status')} - {data.get('error_message', '')}")

    return [
        {
            "placeId": r["place_id"],
            "name": r.get("name", ""),
            "address": r.get("formatted_address", ""),
            "rating": r.get("rating"),
            "userRatingsTotal": r.get("user_ratings_total"),
        }
        for r in data.get("results", [])
    ]


async def get_place_details(place_id: str) -> dict:
    """Get detailed info for a single place including phone number."""
    params = {
        "place_id": place_id,
        "fields": "name,formatted_phone_number,international_phone_number,website,formatted_address",
        "key": settings.GOOGLE_MAPS_API_KEY,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(PLACES_DETAILS, params=params)
        resp.raise_for_status()
        data = resp.json()

    result = data.get("result", {})
    return {
        "placeId": place_id,
        "name": result.get("name", ""),
        "address": result.get("formatted_address", ""),
        "phone": result.get("international_phone_number") or result.get("formatted_phone_number"),
        "website": result.get("website"),
    }


async def search_places_with_details(query: str) -> list[dict]:
    """
    Combined: text search then fetch details for each result concurrently.
    Returns places with phone numbers enriched.
    """
    places = await search_places(query)
    if not places:
        return []

    # Fetch details for all places concurrently (max 20 results)
    details_tasks = [get_place_details(p["placeId"]) for p in places[:20]]
    details_list = await asyncio.gather(*details_tasks, return_exceptions=True)

    enriched = []
    for place, details in zip(places[:20], details_list):
        if isinstance(details, Exception):
            enriched.append(place)
        else:
            enriched.append({**place, **details})

    return enriched
