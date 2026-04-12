import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress } from '@/lib/geocoding';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();
  const city = searchParams.get('city')?.trim() || '';

  if (!q) {
    return NextResponse.json(
      { success: false, error: 'Address query is required' },
      { status: 400 }
    );
  }

  const result = await geocodeAddress(q, city);

  return NextResponse.json({
    success: true,
    coordinates: result.coordinates,
    source: result.source,
  });
}
