# Trust Scoring Platform - Work Log

---
Task ID: 1
Agent: Main Agent
Task: Build complete Trust Scoring Platform

Work Log:
- Designed comprehensive database schema with Prisma (User, Shop, Bill, Review, TrustScore, Alert, WeeklyReport)
- Created Python FastAPI AI microservice for sentiment analysis with TextBlob/NLTK
- Built complete authentication system with JWT and OTP support
- Implemented bill upload with VLM-powered OCR for document scanning
- Created bill verification engine with validation rules (shop registration, bill age ≤60 days, one-time usage)
- Implemented AI sentiment analysis integration with aspect extraction
- Built trust score calculation algorithm with time-weighted decay
- Created real-time alert system for negative reviews
- Built complete frontend with Customer, Shopkeeper, and Admin dashboards
- Seeded database with sample test data

Stage Summary:
- Complete Trust Scoring Platform built with Next.js 16, Prisma, and FastAPI
- AI Sentiment Analysis microservice running on port 5001
- All API endpoints functional and tested
- Responsive UI with Tailwind CSS and shadcn/ui components
- Sample data with 5 shops, 86 reviews, and test accounts ready

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     TRUST SCORING PLATFORM                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     │
│  │   Frontend   │     │   Backend    │     │  AI Service  │     │
│  │  (Next.js)   │────▶│  (Next API)  │────▶│  (FastAPI)   │     │
│  │   Port 3000  │     │   Port 3000  │     │   Port 5001  │     │
│  └──────────────┘     └──────────────┘     └──────────────┘     │
│         │                    │                    │              │
│         │                    ▼                    │              │
│         │            ┌──────────────┐             │              │
│         └───────────▶│   Database   │◀────────────┘              │
│                      │  (SQLite)    │                            │
│                      └──────────────┘                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

### Frontend
- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 with shadcn/ui
- **State Management**: Zustand

### Backend
- **Framework**: Next.js API Routes
- **Database**: Prisma ORM with SQLite
- **Authentication**: JWT with bcrypt

### AI Service
- **Framework**: Python FastAPI
- **NLP**: TextBlob with NLTK
- **Features**: Sentiment analysis, aspect extraction, OCR parsing

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/send-otp | Send OTP to email |
| POST | /api/auth/verify-otp | Verify OTP and login |
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login with password |
| GET | /api/auth/me | Get current user |

### Shops
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/shops | List all shops |
| GET | /api/shops/:id | Get shop details |
| POST | /api/shops | Create new shop |
| GET | /api/shops/my | Get shopkeeper's shop |

### Bills
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/bills/upload | Upload bill image (OCR) |
| POST | /api/bills/verify | Verify bill |
| GET | /api/bills/my | Get user's bills |

### Reviews
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/reviews | Submit review |
| GET | /api/reviews/shop/:id | Get shop reviews |
| PUT | /api/reviews/:id/respond | Respond to complaint |

### Trust Score
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/trust-score/:id | Get trust score |
| POST | /api/trust-score/:id | Recalculate score |

### Alerts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/alerts | Get user alerts |
| PUT | /api/alerts/:id/read | Mark as read |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/stats | Get platform stats |

## Trust Score Algorithm

```
Trust Score = Weighted Sentiment × Time Decay

1. Convert sentiment polarity (-1 to +1) to score (0 to 100)
2. Apply exponential time decay (half-life: 30 days)
3. Apply smoothing with historical score (30% weight)
4. Clamp result to 0-100 range

Time Weight = e^(-days_ago/30) × 0.5 + 0.5
```

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@trustscore.com | admin123 |
| Shopkeeper | rahul@shop.com | shopkeeper123 |
| Customer | john@email.com | customer123 |

## Setup Instructions

1. Install dependencies:
   ```bash
   bun install
   ```

2. Set up database:
   ```bash
   bun run db:push
   npx tsx prisma/seed.ts
   ```

3. Start AI service:
   ```bash
   cd mini-services/ai-sentiment-service
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   bun run dev
   ```

4. Start main application:
   ```bash
   bun run dev
   ```

5. Open browser and navigate to the Preview Panel

## Features Implemented

### Customer Module
✅ OTP-based login/signup
✅ Bill upload with OCR
✅ Bill validation (shop, date, uniqueness)
✅ Review form (unlocked after verification)
✅ Shop search and trust score display
✅ Verified reviews viewing

### Shopkeeper Dashboard
✅ Secure login
✅ Live Trust Score gauge
✅ Sentiment breakdown visualization
✅ Complaint list with response system
✅ Analytics dashboard

### Admin Panel
✅ Platform statistics
✅ User distribution charts
✅ Sentiment analysis overview
✅ Top performing shops

### AI Sentiment Analysis
✅ Polarity score (-1 to +1)
✅ Sentiment label classification
✅ Aspect extraction (Price, Quality, Behavior, Service)
✅ Trust score calculation
✅ OCR text parsing
