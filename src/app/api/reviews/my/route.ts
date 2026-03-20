import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const user = await getUserFromToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const reviews = await db.review.findMany({
      where: { customerId: user.id },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            category: true,
          },
        },
        bill: {
          select: {
            billNumber: true,
            billDate: true,
            totalAmount: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      reviews: reviews.map((review) => ({
        ...review,
        aspects: review.aspects ? JSON.parse(review.aspects) : null,
      })),
    });
  } catch (error) {
    console.error('Get my reviews error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get reviews' },
      { status: 500 }
    );
  }
}
