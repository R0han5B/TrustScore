import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { db } from '@/lib/db';

// Get customer purchase history by phone (Shopkeeper only)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const user = await getUserFromToken(authHeader);

    if (!user || user.role !== 'SHOPKEEPER') {
      return NextResponse.json(
        { success: false, error: 'Only shopkeepers can view customer history' },
        { status: 403 }
      );
    }

    const shop = await db.shop.findUnique({
      where: { ownerId: user.id },
    });

    if (!shop) {
      return NextResponse.json(
        { success: false, error: 'Shop not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone') || '';
    const email = searchParams.get('email') || '';

    if (!phone && !email) {
      return NextResponse.json(
        { success: false, error: 'Phone or email is required' },
        { status: 400 }
      );
    }

    // Find bills for this customer at this shop
    const where: Record<string, unknown> = { shopId: shop.id };
    if (phone) {
      where.customerPhone = phone;
    } else if (email) {
      where.customerEmail = email;
    }

    const bills = await db.bill.findMany({
      where,
      orderBy: { billDate: 'desc' },
      take: 20,
      include: {
        review: {
          select: {
            reviewText: true,
            sentimentScore: true,
            sentimentLabel: true,
            createdAt: true,
          },
        },
      },
    });

    // Calculate stats
    const totalPurchases = bills.length;
    const totalSpent = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const reviewsGiven = bills.filter((b) => b.review).length;
    const avgSentiment = bills
      .filter((b) => b.review)
      .reduce((sum, b) => sum + (b.review?.sentimentScore || 0), 0) / (reviewsGiven || 1);

    return NextResponse.json({
      success: true,
      customer: {
        phone: phone || bills[0]?.customerPhone,
        email: email || bills[0]?.customerEmail,
        name: bills[0]?.customerName || 'Customer',
        isRegular: totalPurchases >= 3,
      },
      stats: {
        totalPurchases,
        totalSpent,
        reviewsGiven,
        avgSentiment: avgSentiment || 0,
      },
      history: bills.map((bill) => ({
        id: bill.id,
        billNumber: bill.billNumber,
        billDate: bill.billDate,
        totalAmount: bill.totalAmount,
        items: bill.items ? JSON.parse(bill.items) : [],
        status: bill.status,
        review: bill.review,
      })),
    });
  } catch (error) {
    console.error('Get customer history error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get customer history' },
      { status: 500 }
    );
  }
}
