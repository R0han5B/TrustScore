import { NextRequest, NextResponse } from 'next/server';
import { createOrUpdateUserWithOTP } from '@/lib/auth';
import { sendOtpEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, phone, name } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create or update user with OTP
    const { user, otp } = await createOrUpdateUserWithOTP(email, phone, name);

    await sendOtpEmail(email, otp, name);

    console.log(`[OTP] Email: ${email}, OTP: ${otp}`);

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      ...(process.env.NODE_ENV !== 'production' && { otp }),
      userId: user.id,
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send OTP' },
      { status: 500 }
    );
  }
}
