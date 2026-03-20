import { NextRequest, NextResponse } from 'next/server';
import { registerUser, generateToken } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { db } from '@/lib/db';

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

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
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

    // Register user
    const user = await registerUser(email, password, name, userRole, phone);

    // Create shop if shopkeeper
    if (userRole === 'SHOPKEEPER' && shopDetails) {
      await db.shop.create({
        data: {
          name: shopDetails.name,
          description: shopDetails.description,
          category: shopDetails.category || 'OTHER',
          address: shopDetails.address,
          city: shopDetails.city,
          pincode: shopDetails.pincode,
          phone: shopDetails.phone || phone,
          email: shopDetails.email || email,
          registrationNo: shopDetails.registrationNo,
          gstNumber: shopDetails.gstNumber,
          ownerId: user.id,
        },
      });
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
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
