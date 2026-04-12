import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateTrustScore } from '@/lib/ai-service';
import { clamp, hybridReviewToTrustScore } from '@/lib/review-scoring';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { shopId } = await params;

    // Get latest trust score
    const trustScore = await db.trustScore.findFirst({
      where: { shopId },
      orderBy: { calculatedAt: 'desc' },
    });

    // Get trust score history (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const history = await db.trustScore.findMany({
      where: {
        shopId,
        calculatedAt: { gte: thirtyDaysAgo },
      },
      orderBy: { calculatedAt: 'asc' },
      take: 30,
    });

    // Get sentiment breakdown
    const sentimentBreakdown = await db.review.groupBy({
      by: ['sentimentLabel'],
      where: { shopId },
      _count: true,
    });

    // Get aspect analysis
    const reviews = await db.review.findMany({
      where: { shopId },
      select: { aspects: true },
    });

    const aspectAverages: Record<string, number[]> = {};
    reviews.forEach((review) => {
      if (review.aspects) {
        const aspects = JSON.parse(review.aspects) as Record<string, number>;
        Object.entries(aspects).forEach(([key, value]) => {
          if (!aspectAverages[key]) aspectAverages[key] = [];
          aspectAverages[key].push(value);
        });
      }
    });

    const aspectAnalysis = Object.fromEntries(
      Object.entries(aspectAverages).map(([key, values]) => [
        key,
        values.reduce((a, b) => a + b, 0) / values.length,
      ])
    );

    return NextResponse.json({
      success: true,
      trustScore: trustScore || {
        score: 50,
        weightedScore: 50,
        totalReviews: 0,
        trend: 'stable',
      },
      history,
      sentimentBreakdown: sentimentBreakdown.reduce(
        (acc, item) => {
          acc[item.sentimentLabel] = item._count;
          return acc;
        },
        {} as Record<string, number>
      ),
      aspectAnalysis,
    });
  } catch (error) {
    console.error('Get trust score error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get trust score' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { shopId } = await params;

    // Get all reviews
    const reviews = await db.review.findMany({
      where: { shopId },
      select: {
        sentimentScore: true,
        createdAt: true,
        priceRating: true,
        qualityRating: true,
        behaviorRating: true,
        serviceRating: true,
      },
    });

    // Get current score
    const currentTS = await db.trustScore.findFirst({
      where: { shopId },
      orderBy: { calculatedAt: 'desc' },
    });

    const currentScore = currentTS?.score || 50;
    const averageCompositeScore =
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + hybridReviewToTrustScore(review), 0) / reviews.length
        : currentScore;
    const finalScore = clamp(averageCompositeScore * 0.8 + currentScore * 0.2, 0, 100);
    const trend = finalScore - currentScore > 2 ? 'up' : finalScore - currentScore < -2 ? 'down' : 'stable';

    // Get breakdown
    const breakdown = {
      positive: await db.review.count({ where: { shopId, sentimentLabel: 'POSITIVE' } }),
      neutral: await db.review.count({ where: { shopId, sentimentLabel: 'NEUTRAL' } }),
      negative: await db.review.count({ where: { shopId, sentimentLabel: 'NEGATIVE' } }),
    };

    // Create new trust score
    const trustScore = await db.trustScore.create({
      data: {
        shopId,
        score: finalScore,
        weightedScore: finalScore,
        totalReviews: reviews.length,
        positiveCount: breakdown.positive,
        neutralCount: breakdown.neutral,
        negativeCount: breakdown.negative,
        trend,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Trust score recalculated',
      trustScore,
    });
  } catch (error) {
    console.error('Calculate trust score error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate trust score' },
      { status: 500 }
    );
  }
}
