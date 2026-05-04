const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

export type Coordinates = {
  lat: number;
  lon: number;
};

export type NominatimAddress = {
  road?: string;
  pedestrian?: string;
  footway?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state_district?: string;
  postcode?: string;
  house_number?: string;
};

export type NominatimSuggestion = {
  placeId: string;
  displayName: string;
  lat: number;
  lon: number;
  address: NominatimAddress;
};

const CITY_FALLBACKS: Record<string, Coordinates> = {
  mumbai: { lat: 19.076, lon: 72.8777 },
  delhi: { lat: 28.6139, lon: 77.209 },
  bengaluru: { lat: 12.9716, lon: 77.5946 },
  bangalore: { lat: 12.9716, lon: 77.5946 },
  chennai: { lat: 13.0827, lon: 80.2707 },
  hyderabad: { lat: 17.385, lon: 78.4867 },
  kolkata: { lat: 22.5726, lon: 88.3639 },
  pune: { lat: 18.5204, lon: 73.8567 },
  jaipur: { lat: 26.9124, lon: 75.7873 },
  nagpur: { lat: 21.1458, lon: 79.0882 },
};

export function buildShopGeocodeQuery(input: {
  name?: string;
  address: string;
  city: string;
  pincode?: string;
}) {
  return [input.name, input.address, input.city, input.pincode, 'India']
    .filter(Boolean)
    .join(', ');
}

function buildHeaders(context: string) {
  return {
    Accept: 'application/json',
    'User-Agent': `TrustScore/1.0 (${context})`,
  };
}

function mapNominatimSuggestion(result: {
  place_id?: string | number;
  display_name: string;
  lat: string;
  lon: string;
  address?: NominatimAddress;
}): NominatimSuggestion {
  return {
    placeId: String(result.place_id ?? result.display_name),
    displayName: result.display_name,
    lat: Number(result.lat),
    lon: Number(result.lon),
    address: result.address ?? {},
  };
}

function suggestionSpecificityScore(suggestion: NominatimSuggestion) {
  let score = 0;
  if (suggestion.address.house_number) score += 4;
  if (suggestion.address.road || suggestion.address.pedestrian || suggestion.address.footway) score += 4;
  if (suggestion.address.postcode) score += 2;
  if (suggestion.address.neighbourhood || suggestion.address.suburb) score += 1;
  if (suggestion.address.city || suggestion.address.town || suggestion.address.village) score += 1;
  return score;
}

export function extractCity(address?: NominatimAddress) {
  return (
    address?.city ||
    address?.town ||
    address?.village ||
    address?.county ||
    address?.state_district ||
    null
  );
}

export function extractStreet(address?: NominatimAddress) {
  const road = address?.road || address?.pedestrian || address?.footway;
  if (address?.house_number && road) {
    return `${address.house_number} ${road}`;
  }
  return road || address?.neighbourhood || address?.suburb || null;
}

export async function searchLocationSuggestions(queryText: string, limit = 5): Promise<NominatimSuggestion[]> {
  const query = new URLSearchParams({
    q: queryText.trim(),
    format: 'jsonv2',
    addressdetails: '1',
    limit: String(limit),
    countrycodes: 'in',
    dedupe: '1',
  });

  const response = await fetch(`${NOMINATIM_URL}?${query.toString()}`, {
    headers: buildHeaders('location search'),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to search locations');
  }

  const results = (await response.json()) as Array<{
    place_id?: string | number;
    display_name: string;
    lat: string;
    lon: string;
    address?: NominatimAddress;
  }>;

  return results
    .map(mapNominatimSuggestion)
    .sort((a, b) => suggestionSpecificityScore(b) - suggestionSpecificityScore(a));
}

export async function geocodeAddress(queryText: string, city?: string): Promise<{
  coordinates: Coordinates | null;
  source: 'nominatim' | 'city-fallback' | 'none';
}> {
  const normalizedCity = city?.trim().toLowerCase() || '';
  const queryCandidates = Array.from(
    new Set(
      [
        queryText.trim(),
        normalizedCity ? `${queryText.trim()}, ${city}, India` : '',
        normalizedCity ? `${city}, India` : '',
      ].filter(Boolean)
    )
  );

  try {
    for (const candidate of queryCandidates) {
      const query = new URLSearchParams({
        q: candidate,
        format: 'jsonv2',
        limit: '1',
        countrycodes: 'in',
      });

      const response = await fetch(`${NOMINATIM_URL}?${query.toString()}`, {
        headers: buildHeaders('shop geocoding'),
        cache: 'no-store',
      });

      if (!response.ok) {
        continue;
      }

      const results = (await response.json()) as Array<{ lat: string; lon: string }>;
      if (results.length > 0) {
        return {
          coordinates: {
            lat: Number(results[0].lat),
            lon: Number(results[0].lon),
          },
          source: 'nominatim',
        };
      }
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }

  const fallback = CITY_FALLBACKS[normalizedCity];
  if (fallback) {
    return { coordinates: fallback, source: 'city-fallback' };
  }

  return { coordinates: null, source: 'none' };
}

export async function reverseGeocodeCoordinates(lat: number, lon: number): Promise<{
  city: string | null;
  address: NominatimAddress | null;
  displayName: string | null;
  source: 'nominatim' | 'none';
}> {
  try {
    const query = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      format: 'jsonv2',
      zoom: '10',
      addressdetails: '1',
    });

    const response = await fetch(`${NOMINATIM_REVERSE_URL}?${query.toString()}`, {
      headers: buildHeaders('reverse geocoding'),
      cache: 'no-store',
    });

    if (!response.ok) {
      return { city: null, address: null, displayName: null, source: 'none' };
    }

    const result = (await response.json()) as {
      display_name?: string;
      address?: NominatimAddress;
    };

    const city = extractCity(result.address);

    return {
      city,
      address: result.address ?? null,
      displayName: result.display_name ?? null,
      source: city ? 'nominatim' : 'none',
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return { city: null, address: null, displayName: null, source: 'none' };
  }
}

export { CITY_FALLBACKS };
