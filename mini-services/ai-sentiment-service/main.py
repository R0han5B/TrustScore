"""
AI Sentiment Analysis Microservice
Trust Scoring Platform - FastAPI Backend

This service provides:
1. Sentiment analysis using TextBlob/NLTK
2. Aspect-based sentiment extraction
3. Trust score calculation endpoints
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
from textblob import TextBlob
import nltk
import re
import math
from datetime import datetime
from collections import defaultdict

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
    text_lower = text.lower()
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
            blob = TextBlob(combined_text)
            aspects[aspect] = round(blob.sentiment.polarity, 3)
    
    # If no aspects found, return overall sentiment for all aspects
    if not aspects:
        overall = TextBlob(text).sentiment.polarity
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
        "timestamp": datetime.utcnow().isoformat()
    }

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
        text = request.review_text.strip()
        
        if not text:
            raise HTTPException(status_code=400, detail="Review text cannot be empty")
        
        # Analyze using TextBlob
        blob = TextBlob(text)
        polarity = round(blob.sentiment.polarity, 4)
        subjectivity = round(blob.sentiment.subjectivity, 4)
        
        # Get sentiment label
        sentiment_label = get_sentiment_label(polarity)
        
        # Calculate confidence
        confidence = round(get_confidence(polarity, subjectivity), 4)
        
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
    
    for review in request.reviews:
        text = review.get("review_text", review.get("text", ""))
        if text:
            blob = TextBlob(text)
            polarity = round(blob.sentiment.polarity, 4)
            
            results.append({
                "review_id": review.get("id"),
                "polarity": polarity,
                "sentiment_label": get_sentiment_label(polarity),
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
    uvicorn.run(app, host="0.0.0.0", port=5001)
