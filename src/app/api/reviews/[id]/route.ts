import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { analyzeSentiment } from '@/lib/ai-service';

// Edit a review
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const user = await getUserFromToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { reviewText } = body;

    if (!reviewText || reviewText.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Review text (min 10 characters) is required' },
        { status: 400 }
      );
    }

    // Get the review
    const review = await db.review.findUnique({
      where: { id },
    });

    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }

    // Check if user owns this review
    if (review.customerId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You can only edit your own reviews' },
        { status: 403 }
      );
    }

    // Re-analyze sentiment
    const sentimentResult = await analyzeSentiment(reviewText);
    const isComplaint = sentimentResult.sentiment_label === 'NEGATIVE';

    // Update review
    const updatedReview = await db.review.update({
      where: { id },
      data: {
        reviewText,
        sentimentScore: sentimentResult.polarity,
        sentimentLabel: sentimentResult.sentiment_label as 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE',
        aspects: JSON.stringify(sentimentResult.aspects),
        isComplaint,
        complaintStatus: isComplaint ? 'pending' : null,
      },
    });

    // Recalculate trust score for the shop
    await updateTrustScore(review.shopId);

    return NextResponse.json({
      success: true,
      message: 'Review updated successfully',
      review: {
        id: updatedReview.id,
        sentimentScore: updatedReview.sentimentScore,
        sentimentLabel: updatedReview.sentimentLabel,
        isComplaint: updatedReview.isComplaint,
        aspects: sentimentResult.aspects,
      },
    });
  } catch (error) {
    console.error('Edit review error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to edit review' },
      { status: 500 }
    );
  }
}

// Delete a review
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const user = await getUserFromToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get the review
    const review = await db.review.findUnique({
      where: { id },
      include: { bill: true },
    });

    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }

    // Check if user owns this review
    if (review.customerId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own reviews' },
        { status: 403 }
      );
    }

    const shopId = review.shopId;
    const billId = review.billId;

    // Delete review
    await db.review.delete({
      where: { id },
    });

    // Update bill status back to VERIFIED so customer can review again
    await db.bill.update({
      where: { id: billId },
      data: { status: 'VERIFIED' },
    });

    // Recalculate trust score for the shop
    await updateTrustScore(shopId);

    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    console.error('Delete review error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete review' },
      { status: 500 }
    );
  }
}

async function updateTrustScore(shopId: string) {
  try {
    const reviews = await db.review.findMany({
      where: { shopId },
      select: {
        sentimentScore: true,
        createdAt: true,
      },
    });

    if (reviews.length === 0) {
      // Reset trust score if no reviews
      await db.trustScore.create({
        data: {
          shopId,
          score: 50,
          weightedScore: 50,
          totalReviews: 0,
          positiveCount: 0,
          neutralCount: 0,
          negativeCount: 0,
          trend: 'stable',
        },
      });
      return;
    }

    // Simple trust score calculation
    const avgSentiment = reviews.reduce((sum, r) => sum + r.sentimentScore, 0) / reviews.length;
    const trustScore = Math.max(0, Math.min(100, 50 + avgSentiment * 50));

    const breakdown = {
      positive: await db.review.count({ where: { shopId, sentimentLabel: 'POSITIVE' } }),
      neutral: await db.review.count({ where: { shopId, sentimentLabel: 'NEUTRAL' } }),
      negative: await db.review.count({ where: { shopId, sentimentLabel: 'NEGATIVE' } }),
    };

    await db.trustScore.create({
      data: {
        shopId,
        score: trustScore,
        weightedScore: trustScore,
        totalReviews: reviews.length,
        positiveCount: breakdown.positive,
        neutralCount: breakdown.neutral,
        negativeCount: breakdown.negative,
        trend: trustScore > 60 ? 'up' : trustScore < 40 ? 'down' : 'stable',
      },
    });
  } catch (error) {
    console.error('Update trust score error:', error);
  }
}
