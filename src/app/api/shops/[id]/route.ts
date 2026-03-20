import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const shop = await db.shop.findUnique({
      where: { id },
      include: {
        trustScores: {
          orderBy: { calculatedAt: 'desc' },
          take: 5,
        },
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: { reviews: true, bills: true },
        },
      },
    });

    if (!shop) {
      return NextResponse.json(
        { success: false, error: 'Shop not found' },
        { status: 404 }
      );
    }

    // Get recent reviews
    const recentReviews = await db.review.findMany({
      where: { shopId: id },
      include: {
        customer: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Get sentiment breakdown
    const sentimentBreakdown = await db.review.groupBy({
      by: ['sentimentLabel'],
      where: { shopId: id },
      _count: true,
    });

    return NextResponse.json({
      success: true,
      shop: {
        ...shop,
        trustScore: shop.trustScores[0]?.score || 50,
        reviewCount: shop._count.reviews,
        billCount: shop._count.bills,
        recentReviews,
        sentimentBreakdown: sentimentBreakdown.reduce(
          (acc, item) => {
            acc[item.sentimentLabel] = item._count;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
    });
  } catch (error) {
    console.error('Get shop error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get shop' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    const user = await getUserFromToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const shop = await db.shop.findUnique({
      where: { id },
    });

    if (!shop) {
      return NextResponse.json(
        { success: false, error: 'Shop not found' },
        { status: 404 }
      );
    }

    if (shop.ownerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'You can only update your own shop' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updatedShop = await db.shop.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        category: body.category,
        address: body.address,
        city: body.city,
        pincode: body.pincode,
        phone: body.phone,
        email: body.email,
        gstNumber: body.gstNumber,
        logoUrl: body.logoUrl,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Shop updated successfully',
      shop: updatedShop,
    });
  } catch (error) {
    console.error('Update shop error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update shop' },
      { status: 500 }
    );
  }
}
