import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  decryptBillFields,
  encryptValue,
  hashEmailForLookup,
  hashPhoneForLookup,
} from '@/lib/data-protection';

// Generate a new bill (Shopkeeper only)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const user = await getUserFromToken(authHeader);

    if (!user || user.role !== 'SHOPKEEPER') {
      return NextResponse.json(
        { success: false, error: 'Only shopkeepers can generate bills' },
        { status: 403 }
      );
    }

    // Get shop for this shopkeeper
    const shop = await db.shop.findUnique({
      where: { ownerId: user.id },
    });

    if (!shop) {
      return NextResponse.json(
        { success: false, error: 'Shop not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { customerName, customerPhone, customerEmail, items, totalAmount } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Items are required' },
        { status: 400 }
      );
    }

    if (!totalAmount || totalAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid total amount is required' },
        { status: 400 }
      );
    }

    // Generate bill number
    const billNumber = `BILL-${shop.registrationNo}-${Date.now()}`;

    // Try to find existing customer by phone or email
    let existingCustomer = null;
    if (customerPhone) {
      existingCustomer = await db.user.findFirst({
        where: {
          OR: [
            ...(hashPhoneForLookup(customerPhone) ? [{ phoneHash: hashPhoneForLookup(customerPhone)! }] : []),
            { phone: customerPhone },
          ],
        },
      });
    }
    if (!existingCustomer && customerEmail) {
      existingCustomer = await db.user.findFirst({
        where: {
          OR: [
            ...(hashEmailForLookup(customerEmail) ? [{ emailHash: hashEmailForLookup(customerEmail)! }] : []),
            { email: customerEmail.toLowerCase() },
          ],
        },
      });
    }

    // Create bill
    const bill = await db.bill.create({
      data: {
        billNumber,
        shopId: shop.id,
        customerId: existingCustomer?.id || null,
        customerName: encryptValue(customerName || 'Walk-in Customer'),
        customerPhone: encryptValue(customerPhone || null),
        customerPhoneHash: hashPhoneForLookup(customerPhone),
        customerEmail: encryptValue(customerEmail || null),
        customerEmailHash: hashEmailForLookup(customerEmail),
        billDate: new Date(),
        totalAmount,
        items: JSON.stringify(items),
        status: 'PENDING',
      },
    });

    const generatedBillUrl = `/api/bills/${bill.id}/pdf`;

    await db.bill.update({
      where: { id: bill.id },
      data: { generatedBillUrl },
    });

    const publicBill = decryptBillFields(bill);

    return NextResponse.json({
      success: true,
      message: 'Bill generated successfully',
      bill: {
        id: bill.id,
        billNumber: bill.billNumber,
        customerName: publicBill.customerName,
        customerPhone: publicBill.customerPhone,
        customerEmail: publicBill.customerEmail,
        items: items,
        totalAmount: bill.totalAmount,
        billDate: bill.billDate,
        status: bill.status,
        generatedBillUrl,
        isExistingCustomer: !!existingCustomer,
      },
    });
  } catch (error) {
    console.error('Generate bill error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate bill' },
      { status: 500 }
    );
  }
}

// Get bills for shopkeeper's shop
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const user = await getUserFromToken(authHeader);

    if (!user || user.role !== 'SHOPKEEPER') {
      return NextResponse.json(
        { success: false, error: 'Only shopkeepers can view their bills' },
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
    const status = searchParams.get('status') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, unknown> = { shopId: shop.id };
    if (status && ['PENDING', 'VERIFIED', 'REJECTED', 'USED'].includes(status)) {
      where.status = status;
    }

    const [bills, total] = await Promise.all([
      db.bill.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.bill.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      bills: bills.map((bill) => ({
        ...decryptBillFields(bill),
        items: bill.items ? JSON.parse(bill.items) : [],
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get bills error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get bills' },
      { status: 500 }
    );
  }
}
