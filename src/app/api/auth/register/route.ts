import { NextRequest, NextResponse } from 'next/server';
import { completeVerifiedRegistration, generateToken } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { db } from '@/lib/db';
import { decryptUserFields, encryptValue, hashEmailForLookup, normalizeEmail } from '@/lib/data-protection';
import { buildShopGeocodeQuery, geocodeAddress } from '@/lib/geocoding';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role, phone, shopDetails } = body;

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check current user state for verified-signup flow
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          ...(hashEmailForLookup(email) ? [{ emailHash: hashEmailForLookup(email)! }] : []),
          { email: normalizeEmail(email) },
        ],
      },
    });

    if (existingUser?.passwordHash) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 400 }
      );
    }

    if (!existingUser || !existingUser.isVerified) {
      return NextResponse.json(
        { success: false, error: 'Please verify your email with OTP before registering' },
        { status: 400 }
      );
    }

    // Validate role
    const userRole: UserRole = role === 'SHOPKEEPER' ? 'SHOPKEEPER' : 'CUSTOMER';

    // For shopkeeper, validate shop details
    if (userRole === 'SHOPKEEPER' && !shopDetails) {
      return NextResponse.json(
        { success: false, error: 'Shop details are required for shopkeeper registration' },
        { status: 400 }
      );
    }

    if (userRole === 'SHOPKEEPER' && !shopDetails?.phone && !phone) {
      return NextResponse.json(
        { success: false, error: 'Shop phone is required for shopkeeper registration' },
        { status: 400 }
      );
    }

    // Complete verified registration
    const registration = await completeVerifiedRegistration(email, password, name, userRole, phone);

    if (!registration.user) {
      return NextResponse.json(
        { success: false, error: registration.error || 'Failed to register user' },
        { status: 400 }
      );
    }

    const user = registration.user;
    const publicUser = decryptUserFields(user);

    // Create shop if shopkeeper
    if (userRole === 'SHOPKEEPER' && shopDetails) {
      const submittedLatitude =
        typeof shopDetails.latitude === 'number' && Number.isFinite(shopDetails.latitude)
          ? shopDetails.latitude
          : null;
      const submittedLongitude =
        typeof shopDetails.longitude === 'number' && Number.isFinite(shopDetails.longitude)
          ? shopDetails.longitude
          : null;
      const geocodeResult =
        submittedLatitude !== null && submittedLongitude !== null
          ? { coordinates: { lat: submittedLatitude, lon: submittedLongitude } }
          : await geocodeAddress(
              buildShopGeocodeQuery({
                name: shopDetails.name,
                address: shopDetails.address,
                city: shopDetails.city,
                pincode: shopDetails.pincode,
              }),
              shopDetails.city
            );

      await db.shop.create({
        data: {
          name: shopDetails.name,
          description: shopDetails.description,
          category: shopDetails.category || 'OTHER',
          address: shopDetails.address,
          city: shopDetails.city,
          pincode: shopDetails.pincode,
          latitude: geocodeResult.coordinates?.lat ?? null,
          longitude: geocodeResult.coordinates?.lon ?? null,
          phone: encryptValue(shopDetails.phone || phone || null),
          email: encryptValue(shopDetails.email || publicUser.email),
          registrationNo: shopDetails.registrationNo,
          gstNumber: shopDetails.gstNumber,
          owner: {
            connect: {
              id: user.id,
            },
          },
        },
      });
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: publicUser.email,
      role: user.role,
    });

    return NextResponse.json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: user.id,
        email: publicUser.email,
        name: publicUser.name,
        role: user.role,
        phone: publicUser.phone,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to register user' },
      { status: 500 }
    );
  }
}
