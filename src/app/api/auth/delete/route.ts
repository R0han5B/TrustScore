import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';
import { clamp, hybridReviewToTrustScore } from '@/lib/review-scoring';
import { decryptUserFields, hashEmailForLookup, hashPhoneForLookup } from '@/lib/data-protection';

async function recalculateTrustScore(shopId: string) {
  const reviews = await db.review.findMany({
    where: { shopId },
    select: {
      sentimentScore: true,
      sentimentLabel: true,
      priceRating: true,
      qualityRating: true,
      behaviorRating: true,
      serviceRating: true,
    },
  });

  const currentTrustScore = await db.trustScore.findFirst({
    where: { shopId },
    orderBy: { calculatedAt: 'desc' },
  });

  const currentScore = currentTrustScore?.score || 50;
  const averageCompositeScore =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + hybridReviewToTrustScore(review), 0) / reviews.length
      : 50;

  const finalScore = clamp(averageCompositeScore * 0.8 + currentScore * 0.2, 0, 100);
  const trend =
    finalScore - currentScore > 2 ? 'up' : finalScore - currentScore < -2 ? 'down' : 'stable';

  const breakdown = {
    positive: reviews.filter((review) => review.sentimentLabel === 'POSITIVE').length,
    neutral: reviews.filter((review) => review.sentimentLabel === 'NEUTRAL').length,
    negative: reviews.filter((review) => review.sentimentLabel === 'NEGATIVE').length,
  };

  await db.trustScore.create({
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
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const currentUser = await getUserFromToken(authHeader);

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (currentUser.role !== 'CUSTOMER') {
      return NextResponse.json(
        { success: false, error: 'Only customer accounts can be deleted here' },
        { status: 403 }
      );
    }

    const storedUser = await db.user.findUnique({
      where: { id: currentUser.id },
      select: {
        id: true,
        email: true,
        phone: true,
      },
    });

    if (!storedUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const user = decryptUserFields(storedUser);

    const userReviews = await db.review.findMany({
      where: { customerId: user.id },
      select: { shopId: true },
    });

    const affectedShopIds = [...new Set(userReviews.map((review) => review.shopId))];

    const billDeletionClauses = [
      { customerId: user.id },
      ...(hashEmailForLookup(user.email) ? [{ customerEmailHash: hashEmailForLookup(user.email)! }] : []),
      { customerEmail: user.email },
    ];

    if (user.phone) {
      if (hashPhoneForLookup(user.phone)) {
        billDeletionClauses.push({ customerPhoneHash: hashPhoneForLookup(user.phone)! });
      }
      billDeletionClauses.push({ customerPhone: user.phone });
    }

    await db.alert.deleteMany({
      where: { userId: user.id },
    });

    await db.review.deleteMany({
      where: { customerId: user.id },
    });

    await db.bill.deleteMany({
      where: {
        OR: billDeletionClauses,
      },
    });

    await db.user.delete({
      where: { id: user.id },
    });

    for (const shopId of affectedShopIds) {
      await recalculateTrustScore(shopId);
    }

    return NextResponse.json({
      success: true,
      message: 'Account and customer data deleted successfully',
    });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
