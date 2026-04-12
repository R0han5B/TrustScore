"""
AI Sentiment Analysis Microservice
Trust Scoring Platform - FastAPI Backend

This service provides:
1. Transformer-based multilingual sentiment analysis
2. Fine-tuned model integration with low-latency singleton loading
3. TextBlob fallback safety
4. Aspect-based sentiment extraction
5. Trust score calculation endpoints
"""

from __future__ import annotations

import math
import os
import re
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Sequence

import nltk
import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from textblob import TextBlob
from transformers import AutoModelForSequenceClassification, XLMRobertaTokenizer

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords', quiet=True)

try:
    nltk.data.find('taggers/averaged_perceptron_tagger')
except LookupError:
    nltk.download('averaged_perceptron_tagger', quiet=True)

app = FastAPI(
    title="AI Sentiment Analysis Service",
    description="Microservice for sentiment analysis and trust scoring",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# PYDANTIC MODELS
# ============================================

class ReviewRequest(BaseModel):
    review_text: str
    shop_id: Optional[str] = None

class BatchReviewRequest(BaseModel):
    reviews: List[Dict]

class SentimentResponse(BaseModel):
    polarity: float
    subjectivity: float
    sentiment_label: str
    confidence: float
    aspects: Dict[str, float]

class TrustScoreRequest(BaseModel):
    reviews: List[Dict]
    current_score: Optional[float] = 50.0

class TrustScoreResponse(BaseModel):
    score: float
    weighted_score: float
    trend: str
    breakdown: Dict[str, int]
    confidence: float

class BillOCRRequest(BaseModel):
    text: str

class BillOCRResponse(BaseModel):
    bill_number: Optional[str]
    shop_name: Optional[str]
    date: Optional[str]
    total_amount: Optional[float]
    items: List[str]
    confidence: float

# ============================================
# ASPECT KEYWORDS
# ============================================

ASPECT_KEYWORDS = {
    "price": [
        "price", "cost", "expensive", "cheap", "affordable", "value", "money",
        "worth", "rate", "pricing", "budget", "economical", "overpriced",
        "reasonable", "discount", "offer", "deal", "bargain"
    ],
    "quality": [
        "quality", "product", "item", "fresh", "stale", "defective", "durable",
        "broken", "good", "bad", "excellent", "poor", "superior", "inferior",
        "premium", "standard", "grade", "condition", "freshness"
    ],
    "behavior": [
        "behavior", "rude", "polite", "friendly", "staff", "owner", "manager",
        "helpful", "courteous", "respectful", "attitude", "service", "greeting",
        "welcoming", "hostile", "kind", "patient", "professional"
    ],
    "service": [
        "service", "delivery", "fast", "slow", "waiting", "queue", "time",
        "quick", "efficient", "speed", "response", "support", "assistance",
        "availability", "convenience", "hours", "accessible"
    ]
}

MODEL_BASE_NAME = "cardiffnlp/twitter-xlm-roberta-base-sentiment"
MODEL_DIR = Path(
    os.getenv(
        "HF_MODEL_DIR",
        str(Path(__file__).resolve().parent / "models" / "sentiment-xlm-roberta"),
    )
)
LABEL_TO_ID = {"NEGATIVE": 0, "NEUTRAL": 1, "POSITIVE": 2}
ID_TO_LABEL = {value: key for key, value in LABEL_TO_ID.items()}

torch.set_num_threads(max(1, int(os.getenv("TORCH_NUM_THREADS", "1"))))
torch.set_num_interop_threads(max(1, int(os.getenv("TORCH_INTEROP_THREADS", "1"))))


def normalize_review_text(text: str) -> str:
    """Light cleanup that keeps multilingual text intact."""
    text = unicodedata.normalize("NFKC", text or "")
    text = re.sub(r"https?://\S+|www\.\S+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def textblob_sentiment(text: str) -> Dict[str, float | str]:
    """Centralized TextBlob fallback used for resilience and aspect scoring."""
    blob = TextBlob(text)
    polarity = round(blob.sentiment.polarity, 4)
    subjectivity = round(blob.sentiment.subjectivity, 4)
    return {
        "polarity": polarity,
        "subjectivity": subjectivity,
        "sentiment_label": get_sentiment_label(polarity),
        "confidence": round(get_confidence(polarity, subjectivity), 4),
    }


class SentimentInferenceEngine:
    """Singleton transformer inference engine loaded once at startup."""

    def __init__(self) -> None:
        self.tokenizer = None
        self.model = None
        self.device = torch.device("cpu")
        self.model_source = "textblob-fallback"
        self.ready = False
        self.last_error: Optional[str] = None

    def load(self) -> None:
        """Load fine-tuned model first, then fall back to base model."""
        model_path: str | Path = MODEL_DIR if MODEL_DIR.exists() else MODEL_BASE_NAME

        try:
            self.tokenizer = XLMRobertaTokenizer.from_pretrained(model_path)
            self.model = AutoModelForSequenceClassification.from_pretrained(model_path)
            self.model.to(self.device)
            self.model.eval()
            self.ready = True
            self.model_source = str(model_path)
            self.last_error = None
        except Exception as exc:
            self.ready = False
            self.model = None
            self.tokenizer = None
            self.model_source = "textblob-fallback"
            self.last_error = str(exc)

    def _resolve_label(self, predicted_index: int) -> str:
        if self.model is not None and getattr(self.model.config, "id2label", None):
            label = self.model.config.id2label.get(predicted_index, ID_TO_LABEL.get(predicted_index, "NEUTRAL"))
            label_upper = str(label).upper()
            if "POS" in label_upper:
                return "POSITIVE"
            if "NEG" in label_upper:
                return "NEGATIVE"
            if "NEU" in label_upper:
                return "NEUTRAL"
        return ID_TO_LABEL.get(predicted_index, "NEUTRAL")

    def _probabilities_to_scores(
        self,
        label: str,
        probabilities: Sequence[float],
    ) -> Dict[str, float | str]:
        negative_probability, neutral_probability, positive_probability = probabilities
        confidence = round(float(max(probabilities)), 4)

        if label == "POSITIVE":
            polarity = round(0.7 + 0.3 * positive_probability, 4)
        elif label == "NEGATIVE":
            polarity = round(-(0.7 + 0.3 * negative_probability), 4)
        else:
            polarity = round((positive_probability - negative_probability) * 0.2, 4)

        subjectivity = round(min(1.0, 0.25 + confidence * 0.75), 4)

        return {
            "polarity": max(-1.0, min(1.0, polarity)),
            "subjectivity": subjectivity,
            "sentiment_label": label,
            "confidence": confidence,
        }

    def predict_batch(self, texts: Sequence[str]) -> List[Dict[str, float | str]]:
        cleaned_texts = [normalize_review_text(text) for text in texts]

        if not self.ready or self.tokenizer is None or self.model is None:
            return [textblob_sentiment(text) for text in cleaned_texts]

        try:
            encoded = self.tokenizer(
                list(cleaned_texts),
                padding=True,
                truncation=True,
                max_length=256,
                return_tensors="pt",
            )
            encoded = {key: value.to(self.device) for key, value in encoded.items()}

            with torch.no_grad():
                logits = self.model(**encoded).logits
                probabilities = torch.softmax(logits, dim=-1).cpu().tolist()

            results: List[Dict[str, float | str]] = []
            for row in probabilities:
                predicted_index = int(max(range(len(row)), key=lambda idx: row[idx]))
                label = self._resolve_label(predicted_index)
                results.append(self._probabilities_to_scores(label, row))
            return results
        except Exception as exc:
            self.ready = False
            self.last_error = str(exc)
            return [textblob_sentiment(text) for text in cleaned_texts]


INFERENCE_ENGINE = SentimentInferenceEngine()

# ============================================
# HELPER FUNCTIONS
# ============================================

def get_sentiment_label(polarity: float) -> str:
    """Convert polarity score to sentiment label"""
    if polarity >= 0.1:
        return "POSITIVE"
    elif polarity <= -0.1:
        return "NEGATIVE"
    else:
        return "NEUTRAL"

def get_confidence(polarity: float, subjectivity: float) -> float:
    """Calculate confidence score based on polarity and subjectivity"""
    # Higher subjectivity and extreme polarity = higher confidence
    confidence = (abs(polarity) * 0.7 + subjectivity * 0.3)
    return min(confidence, 1.0)

def extract_aspects(text: str) -> Dict[str, float]:
    """Extract aspect-based sentiment scores"""
    text_lower = normalize_review_text(text).lower()
    aspects = {}
    
    for aspect, keywords in ASPECT_KEYWORDS.items():
        aspect_sentences = []
        
        # Find sentences containing aspect keywords
        sentences = re.split(r'[.!?]+', text_lower)
        for sentence in sentences:
            for keyword in keywords:
                if keyword in sentence:
                    aspect_sentences.append(sentence.strip())
                    break
        
        if aspect_sentences:
            # Calculate sentiment for aspect-specific sentences
            combined_text = ' '.join(aspect_sentences)
            aspects[aspect] = round(TextBlob(combined_text).sentiment.polarity, 3)
    
    # If no aspects found, return overall sentiment for all aspects
    if not aspects:
        overall = TextBlob(text_lower).sentiment.polarity
        for aspect in ASPECT_KEYWORDS.keys():
            aspects[aspect] = round(overall, 3)
    
    return aspects

def calculate_time_weight(days_ago: int) -> float:
    """Calculate time-based weight for reviews"""
    # Exponential decay with half-life of 30 days
    # Recent reviews have higher weight
    if days_ago <= 0:
        return 1.0
    return math.exp(-days_ago / 30) * 0.5 + 0.5

# ============================================
# API ENDPOINTS
# ============================================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "AI Sentiment Analysis Service",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "nltk_ready": True,
        "textblob_ready": True,
        "transformer_ready": INFERENCE_ENGINE.ready,
        "model_source": INFERENCE_ENGINE.model_source,
        "timestamp": datetime.utcnow().isoformat()
    }


@app.on_event("startup")
async def startup_event():
    """Load inference resources once when the service starts."""
    INFERENCE_ENGINE.load()

@app.post("/api/analyze", response_model=SentimentResponse)
async def analyze_sentiment(request: ReviewRequest):
    """
    Analyze sentiment of a single review
    
    Returns:
    - Polarity score (-1 to +1)
    - Subjectivity score (0 to 1)
    - Sentiment label (POSITIVE/NEUTRAL/NEGATIVE)
    - Confidence score
    - Aspect-based sentiment scores
    """
    try:
        text = normalize_review_text(request.review_text)
        
        if not text:
            raise HTTPException(status_code=400, detail="Review text cannot be empty")
        
        sentiment_result = INFERENCE_ENGINE.predict_batch([text])[0]
        polarity = float(sentiment_result["polarity"])
        subjectivity = float(sentiment_result["subjectivity"])
        sentiment_label = str(sentiment_result["sentiment_label"])
        confidence = float(sentiment_result["confidence"])
        
        # Extract aspect-based sentiment
        aspects = extract_aspects(text)
        
        return SentimentResponse(
            polarity=polarity,
            subjectivity=subjectivity,
            sentiment_label=sentiment_label,
            confidence=confidence,
            aspects=aspects
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze/batch")
async def analyze_batch(request: BatchReviewRequest):
    """Analyze sentiment for multiple reviews"""
    results = []

    valid_reviews = []
    valid_texts = []
    for review in request.reviews:
        text = normalize_review_text(review.get("review_text", review.get("text", "")))
        if text:
            valid_reviews.append(review)
            valid_texts.append(text)

    sentiment_results = INFERENCE_ENGINE.predict_batch(valid_texts) if valid_texts else []

    for review, text, sentiment_result in zip(valid_reviews, valid_texts, sentiment_results):
        results.append({
            "review_id": review.get("id"),
            "polarity": round(float(sentiment_result["polarity"]), 4),
            "sentiment_label": str(sentiment_result["sentiment_label"]),
            "aspects": extract_aspects(text)
        })
    
    return {"results": results, "count": len(results)}

@app.post("/api/trust-score", response_model=TrustScoreResponse)
async def calculate_trust_score(request: TrustScoreRequest):
    """
    Calculate Trust Score based on reviews
    
    Trust Score Algorithm:
    1. Weight each review by sentiment polarity
    2. Apply time decay (recent reviews weighted higher)
    3. Normalize to 0-100 scale
    4. Apply smoothing with current score
    """
    try:
        if not request.reviews:
            return TrustScoreResponse(
                score=request.current_score,
                weighted_score=request.current_score,
                trend="stable",
                breakdown={"positive": 0, "neutral": 0, "negative": 0},
                confidence=0.0
            )
        
        total_weight = 0
        weighted_sum = 0
        breakdown = {"POSITIVE": 0, "NEUTRAL": 0, "NEGATIVE": 0}
        
        now = datetime.utcnow()
        
        for review in request.reviews:
            # Get review data
            sentiment_score = review.get("sentimentScore", review.get("sentiment_score", 0))
            created_at = review.get("createdAt", review.get("created_at", now.isoformat()))
            
            # Parse date
            if isinstance(created_at, str):
                try:
                    review_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    days_ago = (now - review_date.replace(tzinfo=None)).days
                except:
                    days_ago = 0
            else:
                days_ago = 0
            
            # Calculate time weight
            time_weight = calculate_time_weight(days_ago)
            
            # Combined weight
            weight = time_weight
            total_weight += weight
            
            # Convert sentiment to 0-100 scale
            # Polarity -1 to +1 maps to 0 to 100
            normalized_score = (sentiment_score + 1) * 50
            weighted_sum += normalized_score * weight
            
            # Count by label
            if sentiment_score >= 0.1:
                breakdown["POSITIVE"] += 1
            elif sentiment_score <= -0.1:
                breakdown["NEGATIVE"] += 1
            else:
                breakdown["NEUTRAL"] += 1
        
        # Calculate final score
        if total_weight > 0:
            raw_score = weighted_sum / total_weight
        else:
            raw_score = 50.0
        
        # Apply smoothing with current score (30% weight to history)
        smoothed_score = (raw_score * 0.7 + request.current_score * 0.3)
        
        # Clamp to 0-100
        final_score = max(0, min(100, round(smoothed_score, 2)))
        
        # Determine trend
        score_diff = final_score - request.current_score
        if score_diff > 2:
            trend = "up"
        elif score_diff < -2:
            trend = "down"
        else:
            trend = "stable"
        
        # Calculate confidence based on number of reviews
        confidence = min(len(request.reviews) / 20, 1.0)  # Max confidence at 20+ reviews
        
        return TrustScoreResponse(
            score=final_score,
            weighted_score=round(raw_score, 2),
            trend=trend,
            breakdown=breakdown,
            confidence=round(confidence, 2)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ocr/parse", response_model=BillOCRResponse)
async def parse_bill_ocr(request: BillOCRRequest):
    """
    Parse OCR text from bill image
    Extracts: bill number, shop name, date, total amount, items
    """
    try:
        text = request.text
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        # Extract bill number
        bill_number = None
        bill_patterns = [
            r'(?:bill|invoice|receipt)[\s#:]*([A-Z0-9-]+)',
            r'(?:no|number)[\s#:]*([A-Z0-9-]+)',
            r'([A-Z]{2,3}[-]?\d{4,})'
        ]
        for pattern in bill_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                bill_number = match.group(1)
                break
        
        # Extract date
        date = None
        date_patterns = [
            r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',
            r'(\d{4}[-/]\d{1,2}[-/]\d{1,2})',
            r'((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4})'
        ]
        for pattern in date_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                date = match.group(1)
                break
        
        # Extract total amount
        total_amount = None
        amount_patterns = [
            r'(?:total|grand\s*total|amount)[\s:]*[₹$]?\s*(\d+\.?\d*)',
            r'[₹$]\s*(\d+\.?\d{2})\s*$'
        ]
        for pattern in amount_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    total_amount = float(match.group(1))
                except:
                    pass
                break
        
        # Extract shop name (usually first non-empty line)
        shop_name = None
        for line in lines[:3]:
            if len(line) > 3 and not any(c.isdigit() for c in line[:4]):
                shop_name = line.title()
                break
        
        # Extract items (lines with price patterns)
        items = []
        item_pattern = r'([A-Za-z\s]+)\s+(\d+\.?\d*)'
        for line in lines:
            match = re.search(item_pattern, line)
            if match:
                item_name = match.group(1).strip()
                if len(item_name) > 2 and item_name.lower() not in ['total', 'subtotal', 'tax', 'discount']:
                    items.append(item_name)
        
        return BillOCRResponse(
            bill_number=bill_number,
            shop_name=shop_name,
            date=date,
            total_amount=total_amount,
            items=items[:10],  # Limit to 10 items
            confidence=0.85 if bill_number and total_amount else 0.5
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/aspects")
async def get_aspects():
    """Get list of supported aspects for sentiment analysis"""
    return {
        "aspects": list(ASPECT_KEYWORDS.keys()),
        "keywords": ASPECT_KEYWORDS
    }

# ============================================
# MAIN
# ============================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
