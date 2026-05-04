import { NextRequest, NextResponse } from 'next/server';
import { extractStreet, reverseGeocodeCoordinates } from '@/lib/geocoding';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get('lat'));
  const lon = Number(searchParams.get('lon'));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json(
      { success: false, error: 'Latitude and longitude are required' },
      { status: 400 }
    );
  }

  const result = await reverseGeocodeCoordinates(lat, lon);

  return NextResponse.json({
    success: true,
    displayName: result.displayName,
    address: result.address,
    street: extractStreet(result.address ?? undefined),
    pincode: result.address?.postcode ?? null,
    city: result.city,
    source: result.source,
  });
}
