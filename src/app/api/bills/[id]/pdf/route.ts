import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateBillPdfBuffer } from '@/lib/bill-pdf';

type BillItem = {
  name: string;
  quantity: number;
  price: number;
};

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
            name: true,
            address: true,
            city: true,
            phone: true,
            email: true,
            gstNumber: true,
            ownerId: true,
          },
        },
      },
    });

    if (!bill) {
      return NextResponse.json(
        { success: false, error: 'Bill not found' },
        { status: 404 }
      );
    }

    const hasAccess =
      user.role === 'ADMIN' ||
      bill.shop.ownerId === user.id ||
      bill.customerId === user.id ||
      (!!user.phone && bill.customerPhone === user.phone) ||
      bill.customerEmail === user.email;

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const items: BillItem[] = bill.items ? JSON.parse(bill.items) : [];
    const pdfBuffer = generateBillPdfBuffer({
      billNumber: bill.billNumber,
      billDate: bill.billDate,
      customerName: bill.customerName,
      customerPhone: bill.customerPhone,
      customerEmail: bill.customerEmail,
      items,
      totalAmount: bill.totalAmount,
      shop: bill.shop,
    });

    const filename = `${bill.billNumber.replace(/[^A-Za-z0-9-_]/g, '_')}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Bill PDF generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate bill PDF' },
      { status: 500 }
    );
  }
}
