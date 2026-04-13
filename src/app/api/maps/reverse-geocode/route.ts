import { NextRequest, NextResponse } from 'next/server';
import { reverseGeocodeCoordinates } from '@/lib/geocoding';

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
    city: result.city,
    source: result.source,
  });
}
