import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { db } from '@/lib/db';

const OCR_SPACE_API_URL = 'https://api.ocr.space/parse/image';

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

    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const shopId = formData.get('shopId') as string;
    const ocrApiKey = process.env.OCR_SPACE_API_KEY;

    if (!imageFile) {
      return NextResponse.json(
        { success: false, error: 'Image is required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const mimeType = imageFile.type || 'image/jpeg';
    if (!allowedTypes.includes(mimeType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid image type. Use JPEG, PNG, GIF, or WEBP.' },
        { status: 400 }
      );
    }

    if (!ocrApiKey) {
      return NextResponse.json(
        { success: false, error: 'OCR API key is missing. Set OCR_SPACE_API_KEY in .env.' },
        { status: 500 }
      );
    }

    // Convert image to base64 data URI for storage and OCR fallback parsing
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    const dataUri = `data:${mimeType};base64,${base64Image}`;

    // Send image to OCR.space using multipart upload
    const ocrFormData = new FormData();
    ocrFormData.append('file', imageFile, imageFile.name || 'bill-image');
    ocrFormData.append('language', 'eng');
    ocrFormData.append('isOverlayRequired', 'false');
    ocrFormData.append('isTable', 'true');
    ocrFormData.append('OCREngine', '2');

    const ocrResponse = await fetch(OCR_SPACE_API_URL, {
      method: 'POST',
      headers: {
        apikey: ocrApiKey,
      },
      body: ocrFormData,
    });

    const ocrResult = await ocrResponse.json();

    if (!ocrResponse.ok || ocrResult.IsErroredOnProcessing) {
      const errorMessage =
        ocrResult?.ErrorMessage?.join?.(', ') ||
        ocrResult?.ErrorMessage ||
        ocrResult?.ErrorDetails ||
        'OCR processing failed';

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 502 }
      );
    }

    const rawText = (ocrResult.ParsedResults || [])
      .map((result: { ParsedText?: string }) => result.ParsedText || '')
      .join('\n')
      .trim();

    // Parse structured fields from raw OCR text
    const ocrData = parseOcrText(rawText);

    // Safely parse date — fall back to now if invalid or missing
    let billDate = new Date();
    if (ocrData.date) {
      const parsed = new Date(ocrData.date);
      if (!isNaN(parsed.getTime())) {
        billDate = parsed;
      }
    }

    // Resolve shop: prefer explicit shopId, then match by extracted name
    let matchedShop = null;
    if (shopId) {
      matchedShop = await db.shop.findUnique({
        where: { id: shopId },
      });
    } else if (ocrData.shopName) {
      matchedShop = await db.shop.findFirst({
        where: {
          name: { contains: ocrData.shopName, mode: 'insensitive' },
        },
      });
    }

    const resolvedShopId = matchedShop?.id || shopId || '';
    const resolvedBillNumber = ocrData.billNumber || `BILL-${Date.now()}`;

    if (!resolvedShopId) {
      return NextResponse.json(
        { success: false, error: 'Could not match this bill to a shop. Please select the shop manually.' },
        { status: 400 }
      );
    }

    const existingBill = await db.bill.findFirst({
      where: {
        billNumber: resolvedBillNumber,
        shopId: resolvedShopId,
      },
    });

    if (existingBill) {
      return NextResponse.json({
        success: true,
        message: 'This bill was already uploaded earlier.',
        duplicate: true,
        bill: {
          id: existingBill.id,
          billNumber: existingBill.billNumber,
          shopId: existingBill.shopId,
          shopName: matchedShop?.name || ocrData.shopName,
          billDate: existingBill.billDate,
          totalAmount: existingBill.totalAmount,
          status: existingBill.status,
          ocrData: existingBill.ocrData ? JSON.parse(existingBill.ocrData) : ocrData,
        },
        matchedShop: matchedShop
          ? { id: matchedShop.id, name: matchedShop.name }
          : null,
      });
    }

    // Safely coerce totalAmount
    const totalAmount =
      typeof ocrData.totalAmount === 'number' && !isNaN(ocrData.totalAmount)
        ? ocrData.totalAmount
        : 0;

    // Create bill record in database
    const bill = await db.bill.create({
      data: {
        billNumber: resolvedBillNumber,
        shopId: resolvedShopId,
        customerId: user.id,
        billDate,
        totalAmount,
        imageUrl: dataUri, // store base64; swap with cloud URL (S3/Cloudinary) when ready
        ocrData: JSON.stringify(ocrData),
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Bill uploaded successfully',
      bill: {
        id: bill.id,
        billNumber: bill.billNumber,
        shopId: bill.shopId,
        shopName: matchedShop?.name || ocrData.shopName,
        billDate: bill.billDate,
        totalAmount: bill.totalAmount,
        status: bill.status,
        ocrData,
      },
      matchedShop: matchedShop
        ? { id: matchedShop.id, name: matchedShop.name }
        : null,
    });
  } catch (error) {
    console.error('Upload bill error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload bill' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Parses structured fields from raw OCR text using regex heuristics.
// OCR.space returns plain text, so we extract fields manually.
// ---------------------------------------------------------------------------
function parseOcrText(text: string): {
  billNumber?: string;
  shopName?: string;
  date?: string;
  totalAmount?: number;
  items?: string[];
  rawText: string;
} {
  const result: {
    billNumber?: string;
    shopName?: string;
    date?: string;
    totalAmount?: number;
    items?: string[];
    rawText: string;
  } = { rawText: text };

  // Bill / invoice number — e.g. "Bill No: 1234", "Invoice #AB-99", "Ref: TXN-001"
  const billMatch = text.match(
    /(?:bill\s*(?:no|number|#)|invoice\s*(?:no|number|#)?|receipt\s*(?:no|#)|ref(?:erence)?)[:\s#]*([A-Z0-9\-\/]+)/i
  );
  if (billMatch) result.billNumber = billMatch[1].trim();

  // Date — handles DD/MM/YYYY, MM-DD-YYYY, YYYY-MM-DD, "Jan 5, 2024", "5 January 2024"
  const dateMatch = text.match(
    /\b(\d{4}[-\/]\d{2}[-\/]\d{2}|\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\w{3,9}\s+\d{1,2},?\s*\d{4}|\d{1,2}\s+\w{3,9}\s+\d{4})\b/
  );
  if (dateMatch) result.date = dateMatch[1].trim();

  // Total amount — e.g. "Total: $45.00", "Grand Total 1,200.50", "Amount Due: ₹500"
  const totalMatch = text.match(
    /(?:grand\s*total|total\s*amount|amount\s*due|total)[:\s]*[₹$€£¥]?\s*([\d,]+(?:\.\d{1,2})?)/i
  );
  if (totalMatch) {
    result.totalAmount = parseFloat(totalMatch[1].replace(/,/g, ''));
  }

  // Shop name — first non-empty line is usually the business name on a receipt
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length > 0) result.shopName = lines[0];

  // Items — lines that end with a price (heuristic: "Coffee     2.50")
  const itemLines = lines.filter(
    (line) => /[₹$€£¥]?\s*\d+(?:\.\d{1,2})?$/.test(line) && line.length > 4
  );
  if (itemLines.length > 0) result.items = itemLines;

  return result;
}
