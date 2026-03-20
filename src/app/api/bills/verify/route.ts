import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { db } from '@/lib/db';

// Bill verification - Customer verifies bill details
// Two modes:
// 1. Customer verifies shopkeeper-generated bill (confirms items)
// 2. Customer uploads bill image and verifies with OCR

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const user = await getUserFromToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { billId, verified, editedItems, totalAmount } = body;

    if (!billId) {
      return NextResponse.json(
        { success: false, error: 'Bill ID is required' },
        { status: 400 }
      );
    }

    // Get bill
    const bill = await db.bill.findUnique({
      where: { id: billId },
      include: { shop: true },
    });

    if (!bill) {
      return NextResponse.json(
        { success: false, error: 'Bill not found' },
        { status: 404 }
      );
    }

    // Check if bill belongs to this customer (by ID or phone/email)
    const isOwner = 
      bill.customerId === user.id ||
      bill.customerPhone === user.phone ||
      bill.customerEmail === user.email;

    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: 'This bill does not belong to you' },
        { status: 403 }
      );
    }

    // Check if bill is already verified/used
    if (bill.status === 'VERIFIED' || bill.status === 'USED') {
      return NextResponse.json(
        { success: false, error: 'This bill has already been verified' },
        { status: 400 }
      );
    }

    if (verified) {
      // Customer confirmed the bill details
      const updateData: Record<string, unknown> = {
        status: 'VERIFIED',
        verifiedAt: new Date(),
        customerId: user.id, // Link to registered user
      };

      // If customer edited items, update them
      if (editedItems && Array.isArray(editedItems)) {
        updateData.items = JSON.stringify(editedItems);
        updateData.isEdited = true;
      }

      if (totalAmount && totalAmount > 0) {
        updateData.totalAmount = totalAmount;
      }

      const updatedBill = await db.bill.update({
        where: { id: billId },
        data: updateData,
      });

      return NextResponse.json({
        success: true,
        verified: true,
        message: 'Bill verified successfully. You can now submit a review.',
        bill: {
          id: updatedBill.id,
          billNumber: updatedBill.billNumber,
          shopId: updatedBill.shopId,
          shopName: bill.shop.name,
          items: updatedBill.items ? JSON.parse(updatedBill.items) : [],
          totalAmount: updatedBill.totalAmount,
          status: updatedBill.status,
        },
      });
    } else {
      // Customer rejected the bill
      await db.bill.update({
        where: { id: billId },
        data: {
          status: 'REJECTED',
          rejectionReason: 'Customer rejected the bill details',
        },
      });

      return NextResponse.json({
        success: true,
        verified: false,
        message: 'Bill rejected. Please contact the shopkeeper.',
      });
    }
  } catch (error) {
    console.error('Verify bill error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify bill' },
      { status: 500 }
    );
  }
}
