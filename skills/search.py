#!/usr/bin/env python3
"""
Google Maps Leads Scraper
Usage: python3 search.py "New York, hotel, 3~5 stars"
"""

import requests
import csv
import sys
import time
import re
import os
from datetime import datetime

API_KEY = "AIzaSyDHt9mP9tvb43KhJZnkh2ModEj_5v5Lxc4"
MAX_RESULTS = 300


def geocode(location):
    """Get lat/lng and viewport bounds for a location name."""
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    r = requests.get(url, params={"address": location, "key": API_KEY})
    data = r.json()
    if not data.get("results"):
        print(f"[ERROR] Cannot geocode: {location}")
        sys.exit(1)
    geo = data["results"][0]["geometry"]
    center = geo["location"]
    vp = geo["viewport"]
    return center["lat"], center["lng"], vp


def make_grid(viewport, n=4):
    """Divide a viewport into n×n grid cell centers."""
    sw = viewport["southwest"]
    ne = viewport["northeast"]
    lat_step = (ne["lat"] - sw["lat"]) / n
    lng_step = (ne["lng"] - sw["lng"]) / n
    cells = []
    for i in range(n):
        for j in range(n):
            lat = sw["lat"] + lat_step * (i + 0.5)
            lng = sw["lng"] + lng_step * (j + 0.5)
            # radius = half diagonal of cell, capped at 50000m
            import math
            dlat = lat_step * 111000
            dlng = lng_step * 111000 * math.cos(math.radians(lat))
            radius = min(int(math.sqrt(dlat**2 + dlng**2) / 2), 50000)
            cells.append((lat, lng, radius))
    return cells


def nearby_search(lat, lng, radius, keyword, page_token=None):
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "location": f"{lat},{lng}",
        "radius": radius,
        "keyword": keyword,
        "key": API_KEY,
    }
    if page_token:
        params["pagetoken"] = page_token
    r = requests.get(url, params=params)
    return r.json()


def text_search(query, page_token=None):
    url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    params = {"query": query, "key": API_KEY}
    if page_token:
        params["pagetoken"] = page_token
    r = requests.get(url, params=params)
    return r.json()


def get_details(place_id):
    url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        "place_id": place_id,
        "fields": "name,formatted_address,formatted_phone_number,website,rating,user_ratings_total",
        "key": API_KEY,
    }
    r = requests.get(url, params=params)
    data = r.json()
    return data.get("result", {})


def collect_places_text(query, seen, limit):
    """Text Search with pagination, up to 60 per query."""
    results = []
    data = text_search(query)
    for p in data.get("results", []):
        if p["place_id"] not in seen and len(seen) + len(results) < limit:
            results.append(p)
            seen.add(p["place_id"])

    pages = 0
    while data.get("next_page_token") and len(seen) < limit and pages < 2:
        time.sleep(2)  # Google requires delay before using next_page_token
        data = text_search(query, page_token=data["next_page_token"])
        for p in data.get("results", []):
            if p["place_id"] not in seen and len(seen) < limit:
                results.append(p)
                seen.add(p["place_id"])
        pages += 1

    return results


def collect_places_nearby(lat, lng, radius, keyword, seen, limit):
    """Nearby Search with pagination for a single grid cell."""
    results = []
    data = nearby_search(lat, lng, radius, keyword)
    for p in data.get("results", []):
        if p["place_id"] not in seen and len(seen) + len(results) < limit:
            results.append(p)
            seen.add(p["place_id"])

    pages = 0
    while data.get("next_page_token") and len(seen) < limit and pages < 2:
        time.sleep(2)
        data = nearby_search(lat, lng, radius, keyword, page_token=data["next_page_token"])
        for p in data.get("results", []):
            if p["place_id"] not in seen and len(seen) < limit:
                results.append(p)
                seen.add(p["place_id"])
        pages += 1

    return results


def parse_stars(star_str):
    """Parse '3~5 stars' or '4 stars' -> (min, max)."""
    s = star_str.lower().replace("stars", "").replace("star", "").strip()
    m = re.split(r"[~\-–]", s)
    if len(m) == 2:
        return float(m[0].strip()), float(m[1].strip())
    try:
        v = float(s)
        return v, 5.0
    except ValueError:
        return 0.0, 5.0


def main():
    raw = " ".join(sys.argv[1:]).strip()
    if not raw:
        print("Usage: python3 search.py \"New York, hotel, 3~5 stars\"")
        sys.exit(1)

    parts = [p.strip() for p in raw.split(",")]
    location = parts[0]
    biz_type = parts[1] if len(parts) > 1 else "business"
    star_str = parts[2] if len(parts) > 2 else ""

    min_stars, max_stars = parse_stars(star_str) if star_str else (0.0, 5.0)

    print(f"[1/4] Geocoding '{location}'...")
    center_lat, center_lng, viewport = geocode(location)

    seen_ids = set()
    all_places = []

    # Step 1: broad text search first
    print(f"[2/4] Running text search for '{biz_type} in {location}'...")
    places = collect_places_text(f"{biz_type} in {location}", seen_ids, MAX_RESULTS)
    all_places.extend(places)
    print(f"       → {len(all_places)} unique places so far")

    # Step 2: grid-based nearby search to reach 300
    if len(all_places) < MAX_RESULTS:
        print(f"[3/4] Running grid search to reach {MAX_RESULTS}...")
        grid = make_grid(viewport, n=4)  # 4×4 = 16 cells
        for idx, (lat, lng, radius) in enumerate(grid):
            if len(all_places) >= MAX_RESULTS:
                break
            print(f"       cell {idx+1}/{len(grid)}: {len(all_places)} places so far", end="\r")
            places = collect_places_nearby(lat, lng, radius, biz_type, seen_ids, MAX_RESULTS)
            all_places.extend(places)
        print(f"       → {len(all_places)} unique places after grid search")
    else:
        print("[3/4] Enough results from text search, skipping grid search")

    # Filter by star rating
    filtered = [
        p for p in all_places
        if min_stars <= p.get("rating", 0) <= max_stars
    ]
    print(f"       → {len(filtered)} places match rating {min_stars}~{max_stars} stars")

    target = filtered[:MAX_RESULTS]

    # Step 3: fetch details
    print(f"[4/4] Fetching details for {len(target)} places...")
    rows = []
    for i, place in enumerate(target):
        if (i + 1) % 20 == 0 or i == 0:
            print(f"       {i+1}/{len(target)}...", end="\r")
        details = get_details(place["place_id"])
        rows.append({
            "name":         details.get("name") or place.get("name", ""),
            "address":      details.get("formatted_address") or place.get("formatted_address", ""),
            "phone":        details.get("formatted_phone_number", ""),
            "website":      details.get("website", ""),
            "rating":       details.get("rating") or place.get("rating", ""),
            "review_count": details.get("user_ratings_total") or place.get("user_ratings_total", ""),
        })
        time.sleep(0.05)  # stay well within rate limits

    # Export CSV
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_loc = re.sub(r"[^\w]", "_", location)
    safe_biz = re.sub(r"[^\w]", "_", biz_type)
    out_dir = os.path.expanduser("~/Downloads")
    os.makedirs(out_dir, exist_ok=True)
    filename = os.path.join(out_dir, f"leads_{safe_loc}_{safe_biz}_{ts}.csv")

    with open(filename, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["name", "address", "phone", "website", "rating", "review_count"],
        )
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nDone! {len(rows)} leads saved to:\n{filename}")


if __name__ == "__main__":
    main()
