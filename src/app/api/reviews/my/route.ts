import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { decryptShopFields } from '@/lib/data-protection';

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

    const reviews = await db.review.findMany({
      where: { customerId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    const shopIds = [...new Set(reviews.map((review) => review.shopId))];
    const billIds = [...new Set(reviews.map((review) => review.billId))];

    const [shops, bills] = await Promise.all([
      shopIds.length
        ? db.shop.findMany({
            where: { id: { in: shopIds } },
            select: {
              id: true,
              name: true,
              address: true,
              city: true,
              category: true,
            },
          })
        : Promise.resolve([]),
      billIds.length
        ? db.bill.findMany({
            where: { id: { in: billIds } },
            select: {
              id: true,
              billNumber: true,
              billDate: true,
              totalAmount: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const shopById = new Map(shops.map((shop) => [shop.id, shop]));
    const billById = new Map(bills.map((bill) => [bill.id, bill]));

    return NextResponse.json({
      success: true,
      reviews: reviews.map((review) => ({
        ...review,
        shop: shopById.get(review.shopId) ? decryptShopFields(shopById.get(review.shopId)!) : null,
        bill: billById.get(review.billId) || null,
        customer: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        aspects: review.aspects ? JSON.parse(review.aspects) : null,
      })),
    });
  } catch (error) {
    console.error('Get my reviews error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get reviews' },
      { status: 500 }
    );
  }
}
