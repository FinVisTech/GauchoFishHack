import os
import requests
from typing import Optional, Dict
import dotenv
dotenv.load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

GOOGLE_PLACES_TEXTSEARCH_URL = (
    "https://maps.googleapis.com/maps/api/place/textsearch/json"
)

class PlaceResolutionError(Exception):
    pass


def resolve_building(
    building_name: str,
    institution: str,
    api_key: Optional[str] = None,
) -> Optional[Dict]:
    """
    Resolve a fuzzy building name to an approximate lat/lng using Google Places.

    Returns None if no reasonable match is found.
    """

    if not building_name or not institution:
        raise ValueError("building_name and institution are required")

    api_key = api_key or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise PlaceResolutionError("Google API key not provided")

    # Core assumption: institution + building is the strongest prior
    query = f"{institution} {building_name}"

    params = {
        "query": query,
        "key": api_key,
    }

    response = requests.get(GOOGLE_PLACES_TEXTSEARCH_URL, params=params, timeout=5)
    response.raise_for_status()

    data = response.json()

    if not data.get("results"):
        return None

    # Deterministic choice: top-ranked result
    candidate = data["results"][0]

    geometry = candidate.get("geometry", {}).get("location")
    if not geometry:
        return None

    lat = geometry["lat"]
    lng = geometry["lng"]

    # Simple, transparent confidence heuristic
    confidence = 0.5

    name = candidate.get("name", "")
    address = candidate.get("formatted_address", "")
    partial = candidate.get("partial_match", False)

    if building_name.lower() in name.lower():
        confidence += 0.2

    if institution.lower() in address.lower():
        confidence += 0.2

    if not partial:
        confidence += 0.1

    confidence = min(confidence, 1.0)

    return {
        "lat": lat,
        "lng": lng,
        "place_name": name,
        "address": address,
        "confidence": confidence,
        "raw_query": query,
    }


result = resolve_building(
    building_name="Old Gym",
    institution="UCSB",
)

if result is None:
    print("No match found")
else:
    print(result)
