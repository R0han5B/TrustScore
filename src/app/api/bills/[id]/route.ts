import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { decryptBillFields, decryptShopFields, decryptUserFields } from '@/lib/data-protection';

export async function GET(
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

    const bill = await db.bill.findUnique({
      where: { id },
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
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        review: true,
      },
    });

    if (!bill) {
      return NextResponse.json(
        { success: false, error: 'Bill not found' },
        { status: 404 }
      );
    }

    // Check access
    if (bill.customerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      bill: decryptBillFields({
        ...bill,
        shop: decryptShopFields(bill.shop),
        customer: bill.customer ? decryptUserFields(bill.customer) : bill.customer,
      }),
    });
  } catch (error) {
    console.error('Get bill error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get bill' },
      { status: 500 }
    );
  }
}
