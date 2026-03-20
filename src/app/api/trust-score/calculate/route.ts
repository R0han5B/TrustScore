import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { calculateTrustScoreParams } from '@/lib/ai-service';

// POST /api/trust-score/calculate - Recalculate trust score
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { shopId } = body;

    if (!shopId) {
      return NextResponse.json(
        { error: 'Shop ID is required' },
        { status: 400 }
      );
    }

    // Check if shop exists
    const shop = await db.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      );
    }

    // Check authorization (shop owner or admin)
    const isShopOwner = shop.ownerId === user.id;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isShopOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'You are not authorized to recalculate trust score for this shop' },
        { status: 403 }
      );
    }

    // Get all reviews for the shop
    const reviews = await db.review.findMany({
      where: { shopId },
      select: { sentimentScore: true, sentimentLabel: true },
    });

    // Calculate new trust score
    const trustScoreParams = calculateTrustScoreParams(
      reviews.map((r) => ({
        sentimentScore: r.sentimentScore,
        sentimentLabel: r.sentimentLabel,
      }))
    );

    // Get previous trust score for trend calculation
    const previousTrustScore = await db.trustScore.findFirst({
      where: { shopId },
      orderBy: { calculatedAt: 'desc' },
    });

    // Determine trend
    let trend = 'stable';
    if (previousTrustScore) {
      if (trustScoreParams.score > previousTrustScore.score + 2) {
        trend = 'up';
      } else if (trustScoreParams.score < previousTrustScore.score - 2) {
        trend = 'down';
      }
    }

    // Create new trust score record
    const newTrustScore = await db.trustScore.create({
      data: {
        shopId,
        score: trustScoreParams.score,
        totalReviews: trustScoreParams.totalReviews,
        positiveCount: trustScoreParams.positiveCount,
        neutralCount: trustScoreParams.neutralCount,
        negativeCount: trustScoreParams.negativeCount,
        weightedScore: trustScoreParams.weightedScore,
        trend,
      },
    });

    // Create alert for low trust score
    if (trustScoreParams.score < 30 && isShopOwner) {
      await db.alert.create({
        data: {
          shopId,
          userId: user.id,
          type: 'LOW_TRUST_SCORE',
          title: 'Low Trust Score Alert',
          message: `Your shop's trust score has dropped to ${trustScoreParams.score}. Consider addressing customer complaints to improve your score.`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Trust score recalculated successfully',
      trustScore: {
        id: newTrustScore.id,
        score: newTrustScore.score,
        totalReviews: newTrustScore.totalReviews,
        positiveCount: newTrustScore.positiveCount,
        neutralCount: newTrustScore.neutralCount,
        negativeCount: newTrustScore.negativeCount,
        weightedScore: newTrustScore.weightedScore,
        trend: newTrustScore.trend,
        calculatedAt: newTrustScore.calculatedAt,
      },
      previousScore: previousTrustScore?.score || 50,
      change: trustScoreParams.score - (previousTrustScore?.score || 50),
    });
  } catch (error) {
    console.error('Calculate trust score error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate trust score' },
      { status: 500 }
    );
  }
}
