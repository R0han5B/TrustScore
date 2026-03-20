/**
 * AI Service Helper
 * Calls the Python FastAPI AI sentiment microservice
 */

const AI_SERVICE_URL = 'http://localhost:5001';

interface SentimentResponse {
  polarity: number;
  subjectivity: number;
  sentiment_label: string;
  confidence: number;
  aspects: Record<string, number>;
}

interface TrustScoreResponse {
  score: number;
  weighted_score: number;
  trend: string;
  breakdown: Record<string, number>;
  confidence: number;
}

interface BillOCRResponse {
  bill_number: string | null;
  shop_name: string | null;
  date: string | null;
  total_amount: number | null;
  items: string[];
  confidence: number;
}

/**
 * Analyze sentiment of review text
 */
export async function analyzeSentiment(reviewText: string): Promise<SentimentResponse> {
  const response = await fetch(`${AI_SERVICE_URL}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ review_text: reviewText }),
  });

  if (!response.ok) {
    throw new Error(`Sentiment analysis failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Calculate trust score from reviews
 */
export async function calculateTrustScore(
  reviews: Array<{
    sentimentScore: number;
    createdAt: string | Date;
  }>,
  currentScore: number = 50
): Promise<TrustScoreResponse> {
  const response = await fetch(`${AI_SERVICE_URL}/api/trust-score`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reviews: reviews.map((r) => ({
        sentiment_score: r.sentimentScore,
        created_at: typeof r.createdAt === 'string' ? r.createdAt : r.createdAt.toISOString(),
      })),
      current_score: currentScore,
    }),
  });

  if (!response.ok) {
    throw new Error(`Trust score calculation failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Parse OCR text from bill
 */
export async function parseBillOCR(text: string): Promise<BillOCRResponse> {
  const response = await fetch(`${AI_SERVICE_URL}/api/ocr/parse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`OCR parsing failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Batch analyze multiple reviews
 */
export async function batchAnalyzeSentiment(
  reviews: Array<{ id: string; text: string }>
): Promise<Array<{ id: string; polarity: number; sentiment_label: string; aspects: Record<string, number> }>> {
  const response = await fetch(`${AI_SERVICE_URL}/api/analyze/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reviews: reviews.map((r) => ({ id: r.id, review_text: r.text })),
    }),
  });

  if (!response.ok) {
    throw new Error(`Batch sentiment analysis failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results;
}
