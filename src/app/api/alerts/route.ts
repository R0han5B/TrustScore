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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, unknown> = { userId: user.id };

    if (status && ['PENDING', 'READ', 'RESOLVED'].includes(status)) {
      where.status = status;
    }

    const alerts = await db.alert.findMany({
      where,
      include: {
        shop: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const unreadCount = await db.alert.count({
      where: { userId: user.id, status: 'PENDING' },
    });

    return NextResponse.json({
      success: true,
      alerts,
      unreadCount,
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get alerts' },
      { status: 500 }
    );
  }
}
