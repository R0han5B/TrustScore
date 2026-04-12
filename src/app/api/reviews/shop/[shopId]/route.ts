import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateHybridReviewSentiment } from '@/lib/review-scoring';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { shopId } = await params;
    const { searchParams } = new URL(request.url);
    const sentiment = searchParams.get('sentiment') || '';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, unknown> = { shopId };

    if (sentiment && ['POSITIVE', 'NEUTRAL', 'NEGATIVE'].includes(sentiment)) {
      where.sentimentLabel = sentiment;
    }

    const [reviews, total] = await Promise.all([
      db.review.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
          bill: {
            select: {
              id: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.review.count({ where }),
    ]);

    // Get purchase counts for each unique customer
    const customerIds = [...new Set(reviews.map((r) => r.customerId).filter(Boolean))];
    const customerPurchaseCounts: Record<string, number> = {};

    for (const customerId of customerIds) {
      const count = await db.bill.count({
        where: {
          OR: [
            { customerId },
            { customerPhone: null }, // Don't count walk-ins
          ].filter(Boolean),
          status: { in: ['VERIFIED', 'USED'] },
        },
      });
      customerPurchaseCounts[customerId] = count;
    }

    // Mask customer names for privacy and add verification status
    const maskedReviews = reviews.map((review) => {
      const purchaseCount = review.customerId ? customerPurchaseCounts[review.customerId] || 0 : 0;
      const isVerifiedCustomer = purchaseCount >= 3;
      
      return {
        ...review,
        sentimentScore: calculateHybridReviewSentiment({
          priceRating: review.priceRating,
          qualityRating: review.qualityRating,
          behaviorRating: review.behaviorRating,
          serviceRating: review.serviceRating,
          textPolarity: review.sentimentScore,
        }).hybridPolarity,
        sentimentLabel: calculateHybridReviewSentiment({
          priceRating: review.priceRating,
          qualityRating: review.qualityRating,
          behaviorRating: review.behaviorRating,
          serviceRating: review.serviceRating,
          textPolarity: review.sentimentScore,
        }).hybridLabel,
        customer: {
          id: review.customer?.id || '',
          name: maskName(review.customer?.name || null),
          purchaseCount,
          isVerified: isVerifiedCustomer,
        },
        aspects: review.aspects ? JSON.parse(review.aspects) : null,
        isVerifiedPurchase: true, // All reviews are from verified purchases (bill verification)
      };
    });

    return NextResponse.json({
      success: true,
      reviews: maskedReviews,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get shop reviews error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get reviews' },
      { status: 500 }
    );
  }
}

function maskName(name: string | null): string {
  if (!name) return 'Anonymous';
  const parts = name.split(' ');
  return parts
    .map((part) => (part.length > 2 ? part[0] + '*'.repeat(part.length - 1) : part))
    .join(' ');
}
