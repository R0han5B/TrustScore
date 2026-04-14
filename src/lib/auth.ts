/**
 * Authentication Library
 * JWT-based authentication with OTP support
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { User, UserRole } from '@prisma/client';
import {
  decryptUserFields,
  encryptValue,
  hashEmailForLookup,
  hashOtpForStorage,
  hashPhoneForLookup,
  normalizeEmail,
} from '@/lib/data-protection';

const JWT_SECRET = process.env.JWT_SECRET || 'trust-scoring-platform-secret-key-2024';
const OTP_EXPIRY_MINUTES = 10;
const SALT_ROUNDS = 10;

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  phone: string | null;
  isVerified: boolean;
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Generate OTP code
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function findUserByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const emailHash = hashEmailForLookup(normalizedEmail);

  return db.user.findFirst({
    where: {
      OR: [
        ...(emailHash ? [{ emailHash }] : []),
        { email: normalizedEmail },
      ],
    },
  });
}

async function findUserByPhone(phone: string) {
  const phoneHash = hashPhoneForLookup(phone);

  return db.user.findFirst({
    where: {
      OR: [
        ...(phoneHash ? [{ phoneHash }] : []),
        { phone },
      ],
    },
  });
}

/**
 * Generate OTP expiry time
 */
export function getOTPExpiry(): Date {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
}

/**
 * Create or update user with OTP
 */
export async function createOrUpdateUserWithOTP(
  email: string,
  phone?: string,
  name?: string
): Promise<{ user: User; otp: string }> {
  const otp = generateOTP();
  const otpExpiresAt = getOTPExpiry();
  const existingUser = await findUserByEmail(email);

  const encryptedEmail = encryptValue(normalizeEmail(email))!;
  const encryptedPhone = encryptValue(phone || null);
  const encryptedName = encryptValue(name || null);

  const user = existingUser
    ? await db.user.update({
        where: { id: existingUser.id },
        data: {
          email: encryptedEmail,
          emailHash: hashEmailForLookup(email),
          otpCode: hashOtpForStorage(otp),
          otpExpiresAt,
          ...(phone && {
            phone: encryptedPhone,
            phoneHash: hashPhoneForLookup(phone),
          }),
          ...(name && { name: encryptedName }),
        },
      })
    : await db.user.create({
        data: {
          email: encryptedEmail,
          emailHash: hashEmailForLookup(email),
          phone: encryptedPhone,
          phoneHash: hashPhoneForLookup(phone),
          name: encryptedName,
          otpCode: hashOtpForStorage(otp),
          otpExpiresAt,
          role: 'CUSTOMER',
        },
      });

  return { user, otp };
}

/**
 * Verify OTP code
 */
export async function verifyOTP(
  email: string,
  otpCode: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  const user = await findUserByEmail(email);

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  if (!user.otpCode || !user.otpExpiresAt) {
    return { success: false, error: 'No OTP requested. Please request a new OTP.' };
  }

  if (user.otpExpiresAt < new Date()) {
    return { success: false, error: 'OTP has expired. Please request a new OTP.' };
  }

  const hashedOtp = hashOtpForStorage(otpCode);

  if (user.otpCode !== hashedOtp && user.otpCode !== otpCode) {
    return { success: false, error: 'Invalid OTP code' };
  }

  // Clear OTP and mark as verified
  await db.user.update({
    where: { id: user.id },
    data: {
      otpCode: null,
      otpExpiresAt: null,
      isVerified: true,
    },
  });

  return { success: true, user: decryptUserFields(user) };
}

/**
 * Get user from authorization header
 */
export async function getUserFromToken(authHeader: string | null): Promise<AuthUser | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      isVerified: true,
    },
  });

  return user ? decryptUserFields(user) : null;
}

/**
 * Register new user with password
 */
export async function registerUser(
  email: string,
  password: string,
  name: string,
  role: UserRole = 'CUSTOMER',
  phone?: string
): Promise<User> {
  const hashedPassword = await hashPassword(password);

  return db.user.create({
    data: {
      email: encryptValue(normalizeEmail(email))!,
      emailHash: hashEmailForLookup(email),
      passwordHash: hashedPassword,
      name: encryptValue(name),
      role,
      phone: encryptValue(phone || null),
      phoneHash: hashPhoneForLookup(phone),
      isVerified: true,
    },
  });
}

/**
 * Complete signup for an email that has already passed OTP verification
 */
export async function completeVerifiedRegistration(
  email: string,
  password: string,
  name: string,
  role: UserRole = 'CUSTOMER',
  phone?: string
): Promise<{ user?: User; error?: string }> {
  const existingUser = await findUserByEmail(email);

  if (!existingUser) {
    return { error: 'Please verify your email with OTP before registering' };
  }

  if (!existingUser.isVerified) {
    return { error: 'Please complete OTP verification before registering' };
  }

  if (existingUser.passwordHash) {
    return { error: 'Email already registered' };
  }

  const hashedPassword = await hashPassword(password);

  const user = await db.user.update({
    where: { id: existingUser.id },
    data: {
      email: encryptValue(normalizeEmail(email))!,
      emailHash: hashEmailForLookup(email),
      passwordHash: hashedPassword,
      name: encryptValue(name),
      role,
      phone: encryptValue(phone || decryptUserFields(existingUser).phone || null),
      phoneHash: hashPhoneForLookup(phone || decryptUserFields(existingUser).phone || null),
      isVerified: true,
    },
  });

  return { user: decryptUserFields(user) };
}

/**
 * Login with email and password
 */
export async function loginWithEmailPassword(
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
  const user = await findUserByEmail(email);

  if (!user || !user.passwordHash) {
    return { success: false, error: 'Invalid email or password' };
  }

  const isValid = await comparePassword(password, user.passwordHash);

  if (!isValid) {
    return { success: false, error: 'Invalid email or password' };
  }

  const token = generateToken({
    userId: user.id,
    email: decryptUserFields(user).email,
    role: user.role,
  });

  return { success: true, user: decryptUserFields(user), token };
}
