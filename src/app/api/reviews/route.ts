import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { analyzeSentiment } from '@/lib/ai-service';
import { calculateHybridReviewSentiment, clamp, hybridReviewToTrustScore } from '@/lib/review-scoring';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const user = await getUserFromToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { billId, reviewText, priceRating, qualityRating, behaviorRating, serviceRating } = body;

    if (!billId || !reviewText || reviewText.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Bill ID and review text (min 10 characters) are required' },
        { status: 400 }
      );
    }

    const ratingEntries = [
      ['price', priceRating],
      ['quality', qualityRating],
      ['behavior', behaviorRating],
      ['service', serviceRating],
    ] as const;

    const invalidRating = ratingEntries.find(([, value]) => !Number.isInteger(value) || value < 1 || value > 10);
    if (invalidRating) {
      return NextResponse.json(
        { success: false, error: 'All ratings must be whole numbers between 1 and 10' },
        { status: 400 }
      );
    }

    // Get bill and verify it's verified
    const bill = await db.bill.findUnique({
      where: { id: billId },
      include: { shop: true },
    });

    if (!bill) {
      return NextResponse.json(
        { success: false, error: 'Bill not found' },
        { status: 404 }
      );
    }

    // Check if bill belongs to this customer (by ID or phone/email)
    const isOwner = 
      bill.customerId === user.id ||
      bill.customerPhone === user.phone ||
      bill.customerEmail === user.email;

    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: 'This bill does not belong to you' },
        { status: 403 }
      );
    }

    if (bill.status !== 'VERIFIED') {
      return NextResponse.json(
        { success: false, error: 'Bill must be verified before submitting review' },
        { status: 400 }
      );
    }

    // Check if review already exists
    const existingReview = await db.review.findUnique({
      where: { billId },
    });

    if (existingReview) {
      return NextResponse.json(
        { success: false, error: 'Review already submitted for this bill' },
        { status: 400 }
      );
    }

    // Analyze sentiment using AI service
    const sentimentResult = await analyzeSentiment(reviewText);
    const hybridSentiment = calculateHybridReviewSentiment({
      priceRating,
      qualityRating,
      behaviorRating,
      serviceRating,
      textPolarity: sentimentResult.polarity,
    });

    // Determine if it's a complaint using the final hybrid review sentiment.
    const isComplaint = hybridSentiment.hybridLabel === 'NEGATIVE';

    // Create review
    const review = await db.review.create({
      data: {
        billId,
        shopId: bill.shopId,
        customerId: user.id,
        priceRating,
        qualityRating,
        behaviorRating,
        serviceRating,
        reviewText,
        sentimentScore: hybridSentiment.hybridPolarity,
        sentimentLabel: hybridSentiment.hybridLabel,
        aspects: JSON.stringify(sentimentResult.aspects),
        isComplaint,
        complaintStatus: isComplaint ? 'pending' : null,
      },
    });

    // Update bill status to USED
    await db.bill.update({
      where: { id: billId },
      data: { status: 'USED' },
    });

    // Recalculate trust score
    await updateTrustScore(bill.shopId);

    // Create alert for negative reviews
    if (isComplaint) {
      await createNegativeReviewAlert(bill.shopId, review.id, hybridSentiment.hybridPolarity);
    }

    return NextResponse.json({
      success: true,
      message: 'Review submitted successfully',
      review: {
        id: review.id,
        priceRating: review.priceRating,
        qualityRating: review.qualityRating,
        behaviorRating: review.behaviorRating,
        serviceRating: review.serviceRating,
        sentimentScore: review.sentimentScore,
        sentimentLabel: review.sentimentLabel,
        isComplaint: review.isComplaint,
        aspects: sentimentResult.aspects,
        textSentiment: {
          polarity: sentimentResult.polarity,
          label: sentimentResult.sentiment_label,
          confidence: sentimentResult.confidence,
        },
      },
    });
  } catch (error) {
    console.error('Submit review error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit review' },
      { status: 500 }
    );
  }
}

async function updateTrustScore(shopId: string) {
  try {
    // Get all reviews for shop
    const reviews = await db.review.findMany({
      where: { shopId },
      select: {
        priceRating: true,
        qualityRating: true,
        behaviorRating: true,
        serviceRating: true,
        sentimentScore: true,
        createdAt: true,
      },
    });

    // Get current trust score
    const currentTS = await db.trustScore.findFirst({
      where: { shopId },
      orderBy: { calculatedAt: 'desc' },
    });

    const currentScore = currentTS?.score || 50;

    if (!reviews.length) {
      return;
    }

    const averageRatingsOutOfTen =
      reviews.reduce((sum, review) => {
        return sum + (review.priceRating + review.qualityRating + review.behaviorRating + review.serviceRating) / 4;
      }, 0) / reviews.length;

    const averageCompositeScore =
      reviews.reduce((sum, review) => sum + hybridReviewToTrustScore(review), 0) / reviews.length;

    // Let strong new ratings move the trust score upward more clearly instead of staying too sticky.
    const finalScore = clamp(averageCompositeScore * 0.8 + currentScore * 0.2, 0, 100);
    const scoreDelta = finalScore - currentScore;
    const trend = scoreDelta > 2 ? 'up' : scoreDelta < -2 ? 'down' : 'stable';

    // Count by sentiment
    const breakdown = {
      positive: await db.review.count({ where: { shopId, sentimentLabel: 'POSITIVE' } }),
      neutral: await db.review.count({ where: { shopId, sentimentLabel: 'NEUTRAL' } }),
      negative: await db.review.count({ where: { shopId, sentimentLabel: 'NEGATIVE' } }),
    };

    // Create new trust score record
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
  } catch (error) {
    console.error('Update trust score error:', error);
  }
}

async function createNegativeReviewAlert(shopId: string, reviewId: string, polarity: number) {
  try {
    const shop = await db.shop.findUnique({
      where: { id: shopId },
      include: { owner: true },
    });

    if (!shop?.owner) return;

    // Create alert for highly negative reviews (polarity < -0.5)
    const isHighlyNegative = polarity < -0.5;

    await db.alert.create({
      data: {
        shopId,
        userId: shop.ownerId,
        type: isHighlyNegative ? 'NEGATIVE_REVIEW' : 'COMPLAINT_PENDING',
        title: isHighlyNegative
          ? '⚠️ Highly Negative Review Alert'
          : 'New Complaint Received',
        message: isHighlyNegative
          ? `A highly negative review (score: ${polarity.toFixed(2)}) has been submitted. Please respond promptly.`
          : `A new complaint has been registered. Please address it to maintain your trust score.`,
        reviewId,
      },
    });
  } catch (error) {
    console.error('Create alert error:', error);
  }
}
