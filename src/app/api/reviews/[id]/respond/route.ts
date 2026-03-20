import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { db } from '@/lib/db';

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

    const body = await request.json();
    const { response: complaintResponse } = body;

    if (!complaintResponse || complaintResponse.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Response must be at least 10 characters' },
        { status: 400 }
      );
    }

    // Get review with shop info
    const review = await db.review.findUnique({
      where: { id },
      include: { shop: true },
    });

    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }

    // Check if user owns the shop
    if (review.shop.ownerId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You can only respond to reviews for your own shop' },
        { status: 403 }
      );
    }

    // Update review with response
    const updatedReview = await db.review.update({
      where: { id },
      data: {
        complaintResponse,
        complaintStatus: 'resolved',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Response submitted successfully',
      review: updatedReview,
    });
  } catch (error) {
    console.error('Respond to review error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to respond to review' },
      { status: 500 }
    );
  }
}
