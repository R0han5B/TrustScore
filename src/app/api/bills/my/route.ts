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

    // Find bills by customer ID OR by phone/email (for walk-in customers who later registered)
    const bills = await db.bill.findMany({
      where: {
        OR: [
          { customerId: user.id },
          { customerPhone: user.phone },
          { customerEmail: user.email },
        ].filter(Boolean),
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            category: true,
          },
        },
        review: {
          select: {
            id: true,
            reviewText: true,
            sentimentLabel: true,
            sentimentScore: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      bills: bills.map((bill) => ({
        ...bill,
        items: bill.items ? JSON.parse(bill.items) : [],
      })),
    });
  } catch (error) {
    console.error('Get my bills error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get bills' },
      { status: 500 }
    );
  }
}
