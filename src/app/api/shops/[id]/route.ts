import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';
import { decryptShopFields, decryptUserFields, encryptValue } from '@/lib/data-protection';
import { buildShopGeocodeQuery, geocodeAddress } from '@/lib/geocoding';

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
        ...decryptShopFields({
          ...shop,
          owner: shop.owner ? decryptUserFields(shop.owner) : shop.owner,
        }),
        trustScore: shop.trustScores[0]?.score || 50,
        reviewCount: shop._count.reviews,
        billCount: shop._count.bills,
        recentReviews: recentReviews.map((review) => ({
          ...review,
          customer: review.customer ? decryptUserFields(review.customer) : null,
        })),
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
    const nextName = body.name ?? shop.name;
    const nextAddress = body.address ?? shop.address;
    const nextCity = body.city ?? shop.city;
    const nextPincode = body.pincode ?? shop.pincode;
    const submittedLatitude =
      typeof body.latitude === 'number' && Number.isFinite(body.latitude)
        ? body.latitude
        : null;
    const submittedLongitude =
      typeof body.longitude === 'number' && Number.isFinite(body.longitude)
        ? body.longitude
        : null;

    const geocodeResult =
      submittedLatitude !== null && submittedLongitude !== null
        ? { coordinates: { lat: submittedLatitude, lon: submittedLongitude } }
        : await geocodeAddress(
            buildShopGeocodeQuery({
              name: nextName,
              address: nextAddress,
              city: nextCity,
              pincode: nextPincode,
            }),
            nextCity
          );

    const updatedShop = await db.shop.update({
      where: { id },
      data: {
        name: nextName,
        description: body.description,
        category: body.category,
        address: nextAddress,
        city: nextCity,
        pincode: nextPincode,
        latitude: geocodeResult.coordinates?.lat ?? null,
        longitude: geocodeResult.coordinates?.lon ?? null,
        phone: body.phone !== undefined ? encryptValue(body.phone) : undefined,
        email: body.email !== undefined ? encryptValue(body.email) : undefined,
        gstNumber: body.gstNumber,
        logoUrl: body.logoUrl,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Shop updated successfully',
      shop: decryptShopFields(updatedShop),
    });
  } catch (error) {
    console.error('Update shop error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update shop' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
        { success: false, error: 'You can only delete your own shop' },
        { status: 403 }
      );
    }

    await db.alert.deleteMany({
      where: { shopId: id },
    });

    await db.trustScore.deleteMany({
      where: { shopId: id },
    });

    await db.review.deleteMany({
      where: { shopId: id },
    });

    await db.bill.deleteMany({
      where: { shopId: id },
    });

    await db.shop.delete({
      where: { id },
    });

    if (shop.ownerId === user.id && user.role === 'SHOPKEEPER') {
      await db.user.delete({
        where: { id: user.id },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Shop and shopkeeper account deleted successfully',
      accountDeleted: shop.ownerId === user.id && user.role === 'SHOPKEEPER',
    });
  } catch (error) {
    console.error('Delete shop error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete shop' },
      { status: 500 }
    );
  }
}
