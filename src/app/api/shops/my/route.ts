import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';

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

    if (user.role !== 'SHOPKEEPER') {
      return NextResponse.json(
        { success: false, error: 'Only shopkeepers can access their shop' },
        { status: 403 }
      );
    }

    const shop = await db.shop.findUnique({
      where: { ownerId: user.id },
      include: {
        trustScores: {
          orderBy: { calculatedAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            reviews: true,
            bills: true,
          },
        },
      },
    });

    if (!shop) {
      return NextResponse.json(
        { success: false, error: 'No shop found' },
        { status: 404 }
      );
    }

    // Get sentiment breakdown
    const sentimentBreakdown = await db.review.groupBy({
      by: ['sentimentLabel'],
      where: { shopId: shop.id },
      _count: true,
    });

    return NextResponse.json({
      success: true,
      shop: {
        ...shop,
        trustScore: shop.trustScores[0]?.score || 50,
        trustScoreData: shop.trustScores[0] || null,
        reviewCount: shop._count.reviews,
        billCount: shop._count.bills,
        sentimentBreakdown: sentimentBreakdown.reduce(
          (acc, item) => {
            acc[item.sentimentLabel] = item._count;
            return acc;
          },
          {} as Record<string, number>
        ),
        trustScores: undefined,
        _count: undefined,
      },
    });
  } catch (error) {
    console.error('Get my shop error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get shop' },
      { status: 500 }
    );
  }
}
