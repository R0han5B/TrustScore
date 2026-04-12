export type SentimentLabel = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function getHybridSentimentLabel(score: number): SentimentLabel {
  if (score >= 0.15) return 'POSITIVE';
  if (score <= -0.15) return 'NEGATIVE';
  return 'NEUTRAL';
}

export function getAverageRatingOutOfTen(ratings: {
  priceRating: number;
  qualityRating: number;
  behaviorRating: number;
  serviceRating: number;
}) {
  return (
    (ratings.priceRating + ratings.qualityRating + ratings.behaviorRating + ratings.serviceRating) / 4
  );
}

export function structuredRatingToPolarity(averageRating: number) {
  // 5/10 is neutral, 10/10 is strongly positive, 1/10 is strongly negative.
  return clamp((averageRating - 5) / 5, -1, 1);
}

export function calculateHybridReviewSentiment(params: {
  priceRating: number;
  qualityRating: number;
  behaviorRating: number;
  serviceRating: number;
  textPolarity: number;
}) {
  const ratingAverage = getAverageRatingOutOfTen(params);
  const structuredPolarity = structuredRatingToPolarity(ratingAverage);
  const textPolarity = clamp(params.textPolarity, -1, 1);

  // Ratings should carry more weight than short review text.
  const hybridPolarity = clamp(structuredPolarity * 0.8 + textPolarity * 0.2, -1, 1);
  const hybridLabel = getHybridSentimentLabel(hybridPolarity);

  return {
    ratingAverage,
    structuredPolarity,
    textPolarity,
    hybridPolarity,
    hybridLabel,
  };
}

export function hybridReviewToTrustScore(review: {
  priceRating: number;
  qualityRating: number;
  behaviorRating: number;
  serviceRating: number;
  sentimentScore: number;
}) {
  const ratingAverage = getAverageRatingOutOfTen(review);
  const structuredScore = (ratingAverage / 10) * 100;
  const textScore = ((clamp(review.sentimentScore, -1, 1) + 1) / 2) * 100;

  // Ratings dominate trust improvement, text still adds nuance.
  return clamp(structuredScore * 0.85 + textScore * 0.15, 0, 100);
}
