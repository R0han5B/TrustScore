import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';

function getWeekStart(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function getWeekEnd(weekStart: Date) {
  const result = new Date(weekStart);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const user = await getUserFromToken(authHeader);

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'SHOPKEEPER') {
      return NextResponse.json({ success: false, error: 'Only shopkeepers can access weekly reports' }, { status: 403 });
    }

    const shop = await db.shop.findUnique({
      where: { ownerId: user.id },
      select: { id: true, name: true },
    });

    if (!shop) {
      return NextResponse.json({ success: false, error: 'No shop found' }, { status: 404 });
    }

    const now = new Date();
    const weekStart = getWeekStart(now);
    const weekEnd = getWeekEnd(weekStart);
    const previousWeekStart = new Date(weekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    const previousWeekEnd = new Date(weekStart);
    previousWeekEnd.setMilliseconds(previousWeekEnd.getMilliseconds() - 1);

    const [recentReviews, previousReviews, latestTrustScore, previousTrustScore] = await Promise.all([
      db.review.findMany({
        where: {
          shopId: shop.id,
          createdAt: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
        select: {
          sentimentScore: true,
          sentimentLabel: true,
          isComplaint: true,
          complaintResponse: true,
          priceRating: true,
          qualityRating: true,
          behaviorRating: true,
          serviceRating: true,
        },
      }),
      db.review.findMany({
        where: {
          shopId: shop.id,
          createdAt: {
            gte: previousWeekStart,
            lte: previousWeekEnd,
          },
        },
        select: {
          sentimentScore: true,
          priceRating: true,
          qualityRating: true,
          behaviorRating: true,
          serviceRating: true,
        },
      }),
      db.trustScore.findFirst({
        where: { shopId: shop.id },
        orderBy: { calculatedAt: 'desc' },
      }),
      db.trustScore.findFirst({
        where: {
          shopId: shop.id,
          calculatedAt: {
            lt: weekStart,
          },
        },
        orderBy: { calculatedAt: 'desc' },
      }),
    ]);

    const count = recentReviews.length || 1;
    const metrics = {
      price: recentReviews.reduce((sum, review) => sum + review.priceRating, 0) / count,
      quality: recentReviews.reduce((sum, review) => sum + review.qualityRating, 0) / count,
      behavior: recentReviews.reduce((sum, review) => sum + review.behaviorRating, 0) / count,
      service: recentReviews.reduce((sum, review) => sum + review.serviceRating, 0) / count,
    };

    const previousCount = previousReviews.length || 1;
    const previousMetrics = {
      price: previousReviews.reduce((sum, review) => sum + review.priceRating, 0) / previousCount,
      quality: previousReviews.reduce((sum, review) => sum + review.qualityRating, 0) / previousCount,
      behavior: previousReviews.reduce((sum, review) => sum + review.behaviorRating, 0) / previousCount,
      service: previousReviews.reduce((sum, review) => sum + review.serviceRating, 0) / previousCount,
    };

    const avgSentiment = recentReviews.length
      ? recentReviews.reduce((sum, review) => sum + review.sentimentScore, 0) / recentReviews.length
      : 0;

    const positiveCount = recentReviews.filter((review) => review.sentimentLabel === 'POSITIVE').length;
    const neutralCount = recentReviews.filter((review) => review.sentimentLabel === 'NEUTRAL').length;
    const negativeCount = recentReviews.filter((review) => review.sentimentLabel === 'NEGATIVE').length;
    const complaints = recentReviews.filter((review) => review.isComplaint).length;
    const resolved = recentReviews.filter((review) => review.complaintResponse).length;

    const trustScoreStart = previousTrustScore?.score ?? latestTrustScore?.score ?? 50;
    const trustScoreEnd = latestTrustScore?.score ?? trustScoreStart;
    const trustDelta = trustScoreEnd - trustScoreStart;
    const totalSentimentReviews = recentReviews.length || 1;
    const negativeShare = negativeCount / totalSentimentReviews;
    const positiveShare = positiveCount / totalSentimentReviews;

    const improvements: string[] = [];
    const strengths: string[] = [];

    if (metrics.service < 7) {
      improvements.push('Improve service speed and consistency. Customers are rating service lower than the ideal range this week.');
    }
    if (metrics.behavior < 7) {
      improvements.push('Focus on staff behaviour and customer interaction. Better greeting, patience, and support should lift trust quickly.');
    }
    if (metrics.quality < 7) {
      improvements.push('Review product or delivery quality. Quality ratings suggest customers expect better reliability and freshness.');
    }
    if (metrics.price < 7) {
      improvements.push('Revisit pricing perception. Customers may need clearer value, better offers, or more visible price fairness.');
    }
    if (complaints > 0) {
      improvements.push(`Resolve ${complaints} complaint${complaints > 1 ? 's' : ''} promptly and respond publicly where possible to rebuild trust.`);
    }
    if (negativeShare >= 0.3) {
      improvements.push('Negative review share is elevated this week. Prioritize the recurring pain points mentioned in recent reviews.');
    }
    if (trustDelta < 0) {
      improvements.push(`Trust score fell by ${Math.abs(trustDelta).toFixed(1)} points this week. A quick response plan could prevent further decline.`);
    }

    if (metrics.service >= 8) strengths.push('Customers are consistently happy with service this week.');
    if (metrics.behavior >= 8) strengths.push('Staff behaviour is a visible strength in recent reviews.');
    if (metrics.quality >= 8) strengths.push('Product or service quality is being rated strongly.');
    if (metrics.price >= 8) strengths.push('Price perception is healthy and customers see good value.');
    if (positiveShare >= 0.6) strengths.push('Most recent reviews are positive, which supports strong local trust.');

    if (!improvements.length) {
      improvements.push('No major weak area stood out this week. Keep response times fast and maintain your strongest-rated areas.');
    }
    if (!strengths.length) {
      strengths.push('Your shop has room to build stronger review momentum next week with a focus on service and customer experience.');
    }

    const bestArea = Object.entries(metrics).sort((a, b) => b[1] - a[1])[0];
    const weakestArea = Object.entries(metrics).sort((a, b) => a[1] - b[1])[0];

    const summary = [
      `${shop.name} received ${recentReviews.length} review${recentReviews.length === 1 ? '' : 's'} this week.`,
      `Trust score ${trustDelta >= 0 ? 'improved' : 'moved down'} from ${trustScoreStart.toFixed(1)} to ${trustScoreEnd.toFixed(1)}.`,
      `Best-rated area: ${bestArea ? `${bestArea[0]} (${bestArea[1].toFixed(1)}/10)` : 'not enough data'}.`,
      `Main area to improve: ${weakestArea ? `${weakestArea[0]} (${weakestArea[1].toFixed(1)}/10)` : 'not enough data'}.`,
    ].join(' ');

    const serializedSummary = JSON.stringify({
      summary,
      strengths,
      improvements,
      metrics: {
        price: clamp(metrics.price || 0, 0, 10),
        quality: clamp(metrics.quality || 0, 0, 10),
        behavior: clamp(metrics.behavior || 0, 0, 10),
        service: clamp(metrics.service || 0, 0, 10),
      },
    });

    const existingReport = await db.weeklyReport.findFirst({
      where: {
        shopId: shop.id,
        weekStart,
      },
    });

    const report = existingReport
      ? await db.weeklyReport.update({
          where: { id: existingReport.id },
          data: {
            weekEnd,
            newReviews: recentReviews.length,
            avgSentiment,
            trustScoreStart,
            trustScoreEnd,
            complaints,
            resolved,
            summary: serializedSummary,
          },
        })
      : await db.weeklyReport.create({
          data: {
            shopId: shop.id,
            weekStart,
            weekEnd,
            newReviews: recentReviews.length,
            avgSentiment,
            trustScoreStart,
            trustScoreEnd,
            complaints,
            resolved,
            summary: serializedSummary,
          },
        });

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        weekStart: report.weekStart,
        weekEnd: report.weekEnd,
        newReviews: report.newReviews,
        avgSentiment: report.avgSentiment,
        trustScoreStart: report.trustScoreStart,
        trustScoreEnd: report.trustScoreEnd,
        complaints: report.complaints,
        resolved: report.resolved,
        summary,
        strengths,
        improvements,
        metrics: {
          price: Number((metrics.price || 0).toFixed(1)),
          quality: Number((metrics.quality || 0).toFixed(1)),
          behavior: Number((metrics.behavior || 0).toFixed(1)),
          service: Number((metrics.service || 0).toFixed(1)),
        },
        previousMetrics: {
          price: Number((previousMetrics.price || 0).toFixed(1)),
          quality: Number((previousMetrics.quality || 0).toFixed(1)),
          behavior: Number((previousMetrics.behavior || 0).toFixed(1)),
          service: Number((previousMetrics.service || 0).toFixed(1)),
        },
        breakdown: {
          positive: positiveCount,
          neutral: neutralCount,
          negative: negativeCount,
        },
      },
    });
  } catch (error) {
    console.error('Get weekly report error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate weekly report' },
      { status: 500 }
    );
  }
}
