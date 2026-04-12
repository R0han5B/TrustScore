/**
 * AI Service Helper
 * Calls the Python FastAPI AI sentiment microservice
 */

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

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

function fallbackSentiment(reviewText: string): SentimentResponse {
  const normalized = reviewText.toLowerCase();
  const positiveWords = ['good', 'great', 'excellent', 'fresh', 'nice', 'best', 'amazing', 'love', 'happy', 'clean'];
  const negativeWords = ['bad', 'worst', 'poor', 'stale', 'dirty', 'hate', 'awful', 'terrible', 'slow', 'rude'];

  let score = 0;
  for (const word of positiveWords) {
    if (normalized.includes(word)) score += 0.15;
  }
  for (const word of negativeWords) {
    if (normalized.includes(word)) score -= 0.15;
  }

  const polarity = Math.max(-1, Math.min(1, score));
  const sentiment_label =
    polarity > 0.1 ? 'POSITIVE' : polarity < -0.1 ? 'NEGATIVE' : 'NEUTRAL';

  return {
    polarity,
    subjectivity: 0.5,
    sentiment_label,
    confidence: 0.25,
    aspects: {},
  };
}

function fallbackTrustScore(
  reviews: Array<{
    sentimentScore: number;
    createdAt: string | Date;
  }>,
  currentScore: number
): TrustScoreResponse {
  if (reviews.length === 0) {
    return {
      score: currentScore,
      weighted_score: currentScore,
      trend: 'stable',
      breakdown: { positive: 0, neutral: 0, negative: 0 },
      confidence: 0.25,
    };
  }

  const average = reviews.reduce((sum, review) => sum + review.sentimentScore, 0) / reviews.length;
  const adjustedScore = Math.max(0, Math.min(100, currentScore + average * 20));

  return {
    score: adjustedScore,
    weighted_score: adjustedScore,
    trend: average > 0.05 ? 'up' : average < -0.05 ? 'down' : 'stable',
    breakdown: {
      positive: reviews.filter((review) => review.sentimentScore > 0.1).length,
      neutral: reviews.filter((review) => review.sentimentScore >= -0.1 && review.sentimentScore <= 0.1).length,
      negative: reviews.filter((review) => review.sentimentScore < -0.1).length,
    },
    confidence: 0.25,
  };
}

/**
 * Analyze sentiment of review text
 */
export async function analyzeSentiment(reviewText: string): Promise<SentimentResponse> {
  try {
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
  } catch (error) {
    console.error('AI sentiment service unavailable, using fallback sentiment:', error);
    return fallbackSentiment(reviewText);
  }
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
  try {
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
  } catch (error) {
    console.error('AI trust score service unavailable, using fallback trust score:', error);
    return fallbackTrustScore(reviews, currentScore);
  }
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
