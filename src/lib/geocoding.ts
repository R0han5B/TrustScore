const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export type Coordinates = {
  lat: number;
  lon: number;
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
        headers: {
          Accept: 'application/json',
          'User-Agent': 'TrustScore/1.0 (shop geocoding)',
        },
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

export { CITY_FALLBACKS };
