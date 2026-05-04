import { NextRequest, NextResponse } from 'next/server';
import { searchLocationSuggestions } from '@/lib/geocoding';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();

    if (!q) {
      return NextResponse.json(
        { success: false, error: 'Search query is required' },
        { status: 400 }
      );
    }

    const suggestions = await searchLocationSuggestions(q, 5);

    return NextResponse.json({
      success: true,
      suggestions,
    });
  } catch (error) {
    console.error('Location search error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search locations' },
      { status: 500 }
    );
  }
}
