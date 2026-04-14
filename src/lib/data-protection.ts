import crypto from 'crypto';

const ENCRYPTION_PREFIX = 'enc:v1:';
const DEFAULT_ENCRYPTION_SECRET =
  process.env.DATA_ENCRYPTION_KEY ||
  process.env.JWT_SECRET ||
  'trustscore-dev-data-encryption-key';

function getEncryptionKey() {
  return crypto.createHash('sha256').update(DEFAULT_ENCRYPTION_SECRET).digest();
}

function encodePart(buffer: Buffer) {
  return buffer.toString('base64url');
}

function decodePart(value: string) {
  return Buffer.from(value, 'base64url');
}

export function isEncryptedValue(value?: string | null) {
  return !!value && value.startsWith(ENCRYPTION_PREFIX);
}

export function encryptValue(value?: string | null) {
  if (!value) return value ?? null;
  if (isEncryptedValue(value)) return value;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${ENCRYPTION_PREFIX}${encodePart(iv)}.${encodePart(tag)}.${encodePart(encrypted)}`;
}

export function decryptValue(value?: string | null) {
  if (!value) return value ?? null;
  if (!isEncryptedValue(value)) return value;

  try {
    const payload = value.slice(ENCRYPTION_PREFIX.length);
    const [ivPart, tagPart, encryptedPart] = payload.split('.');
    if (!ivPart || !tagPart || !encryptedPart) return value;

    const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), decodePart(ivPart));
    decipher.setAuthTag(decodePart(tagPart));

    const decrypted = Buffer.concat([
      decipher.update(decodePart(encryptedPart)),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Failed to decrypt protected value:', error);
    return value;
  }
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '');
}

function hashLookup(prefix: string, value: string) {
  return crypto.createHash('sha256').update(`${prefix}:${value}`).digest('hex');
}

export function hashEmailForLookup(email?: string | null) {
  if (!email) return null;
  return hashLookup('email', normalizeEmail(email));
}

export function hashPhoneForLookup(phone?: string | null) {
  if (!phone) return null;
  const normalized = normalizePhone(phone);
  return normalized ? hashLookup('phone', normalized) : null;
}

export function hashOtpForStorage(otp: string) {
  return hashLookup('otp', otp);
}

export function encryptJson(value: unknown) {
  return encryptValue(JSON.stringify(value));
}

export function decryptJson<T>(value?: string | null): T | null {
  const decrypted = decryptValue(value);
  if (!decrypted) return null;

  try {
    return JSON.parse(decrypted) as T;
  } catch {
    return null;
  }
}

export function decryptUserFields<T extends { email: string; name?: string | null; phone?: string | null }>(
  user: T
) {
  return {
    ...user,
    email: decryptValue(user.email) || '',
    name: decryptValue(user.name),
    phone: decryptValue(user.phone),
  };
}

export function decryptShopFields<
  T extends { phone?: string | null; email?: string | null }
>(shop: T) {
  return {
    ...shop,
    phone: decryptValue(shop.phone),
    email: decryptValue(shop.email),
  };
}

export function decryptBillFields<
  T extends {
    customerName?: string | null;
    customerPhone?: string | null;
    customerEmail?: string | null;
    imageUrl?: string | null;
    ocrData?: string | null;
  }
>(bill: T) {
  return {
    ...bill,
    customerName: decryptValue(bill.customerName),
    customerPhone: decryptValue(bill.customerPhone),
    customerEmail: decryptValue(bill.customerEmail),
    imageUrl: decryptValue(bill.imageUrl),
    ocrData: decryptValue(bill.ocrData),
  };
}

export function valuesMatchEmail(left?: string | null, right?: string | null) {
  if (!left || !right) return false;
  return normalizeEmail(left) === normalizeEmail(right);
}

export function valuesMatchPhone(left?: string | null, right?: string | null) {
  if (!left || !right) return false;
  return normalizePhone(left) === normalizePhone(right);
}
