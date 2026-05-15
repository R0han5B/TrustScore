import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';
import { decryptShopFields, encryptValue } from '@/lib/data-protection';
import { buildShopGeocodeQuery, geocodeAddress } from '@/lib/geocoding';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const city = searchParams.get('city') || '';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (city) {
      where.city = { contains: city };
    }

    const [shops, total] = await Promise.all([
      db.shop.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.shop.count({ where }),
    ]);

    const shopsWithScore = await Promise.all(
      shops.map(async (shop) => {
        const [latestTrustScore, reviewCount] = await Promise.all([
          db.trustScore.findFirst({
            where: { shopId: shop.id },
            orderBy: { calculatedAt: 'desc' },
          }),
          db.review.count({
            where: { shopId: shop.id },
          }),
        ]);

        return {
          ...decryptShopFields(shop),
          trustScore: latestTrustScore?.score || 50,
          reviewCount,
        };
      })
    );

    return NextResponse.json({
      success: true,
      shops: shopsWithScore,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get shops error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get shops' },
      { status: 500 }
    );
  }
}

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

    if (user.role !== 'SHOPKEEPER') {
      return NextResponse.json(
        { success: false, error: 'Only shopkeepers can create shops' },
        { status: 403 }
      );
    }

    // Check if user already has a shop
    const existingShop = await db.shop.findUnique({
      where: { ownerId: user.id },
    });

    if (existingShop) {
      return NextResponse.json(
        { success: false, error: 'You already have a registered shop' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      category,
      address,
      city,
      pincode,
      latitude,
      longitude,
      phone,
      email,
      registrationNo,
      gstNumber,
    } = body;

    if (!name || !address || !city || !pincode || !registrationNo || !phone) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if registration number is unique
    const existingReg = await db.shop.findUnique({
      where: { registrationNo },
    });

    if (existingReg) {
      return NextResponse.json(
        { success: false, error: 'Registration number already registered' },
        { status: 400 }
      );
    }

    const shop = await db.shop.create({
      data: {
        name,
        description,
        category: category || 'OTHER',
        address,
        city,
        pincode,
        latitude: null,
        longitude: null,
        phone: encryptValue(phone),
        email: encryptValue(email),
        registrationNo,
        gstNumber,
        owner: {
          connect: {
            id: user.id,
          },
        },
      },
    });

    const submittedLatitude =
      typeof latitude === 'number' && Number.isFinite(latitude) ? latitude : null;
    const submittedLongitude =
      typeof longitude === 'number' && Number.isFinite(longitude) ? longitude : null;

    const geocodeResult =
      submittedLatitude !== null && submittedLongitude !== null
        ? { coordinates: { lat: submittedLatitude, lon: submittedLongitude } }
        : await geocodeAddress(
            buildShopGeocodeQuery({ name, address, city, pincode }),
            city
          );

    const shopWithCoordinates = geocodeResult.coordinates
      ? await db.shop.update({
          where: { id: shop.id },
          data: {
            latitude: geocodeResult.coordinates.lat,
            longitude: geocodeResult.coordinates.lon,
          },
        })
      : shop;

    // Create initial trust score
    await db.trustScore.create({
      data: {
        shopId: shop.id,
        score: 50,
        weightedScore: 50,
        totalReviews: 0,
        positiveCount: 0,
        neutralCount: 0,
        negativeCount: 0,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Shop created successfully',
      shop: decryptShopFields(shopWithCoordinates),
    });
  } catch (error) {
    console.error('Create shop error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create shop' },
      { status: 500 }
    );
  }
}
