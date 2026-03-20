import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const user = await getUserFromToken(authHeader);

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get platform statistics
    const [
      totalUsers,
      totalShops,
      totalBills,
      totalReviews,
      pendingVerifications,
      pendingComplaints,
      avgTrustScore,
    ] = await Promise.all([
      db.user.count(),
      db.shop.count(),
      db.bill.count(),
      db.review.count(),
      db.shop.count({ where: { isVerified: false } }),
      db.review.count({ where: { isComplaint: true, complaintStatus: 'pending' } }),
      db.trustScore.aggregate({
        _avg: { score: true },
        where: {
          calculatedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // Get sentiment distribution
    const sentimentDistribution = await db.review.groupBy({
      by: ['sentimentLabel'],
      _count: true,
    });

    // Get user role distribution
    const userRoleDistribution = await db.user.groupBy({
      by: ['role'],
      _count: true,
    });

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentActivity = await Promise.all([
      db.review.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      db.bill.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      db.user.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
    ]);

    // Get top shops by trust score
    const topShops = await db.trustScore.findMany({
      where: {
        calculatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            category: true,
            city: true,
          },
        },
      },
      orderBy: { score: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        totalShops,
        totalBills,
        totalReviews,
        pendingVerifications,
        pendingComplaints,
        avgTrustScore: avgTrustScore._avg.score || 50,
        sentimentDistribution: sentimentDistribution.reduce(
          (acc, item) => {
            acc[item.sentimentLabel] = item._count;
            return acc;
          },
          {} as Record<string, number>
        ),
        userRoleDistribution: userRoleDistribution.reduce(
          (acc, item) => {
            acc[item.role] = item._count;
            return acc;
          },
          {} as Record<string, number>
        ),
        recentActivity: {
          reviews: recentActivity[0],
          bills: recentActivity[1],
          users: recentActivity[2],
        },
        topShops: topShops.map((ts) => ({
          ...ts.shop,
          trustScore: ts.score,
          reviewCount: ts.totalReviews,
        })),
      },
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get statistics' },
      { status: 500 }
    );
  }
}
