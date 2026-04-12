# TrustScore

TrustScore is a verified local-shop review platform where customers upload real bills, verify purchases, rate shops, and leave AI-analyzed reviews. Shopkeepers get trust analytics, weekly improvement reports, complaint visibility, map discovery, and location-aware shop profiles. The project combines a Next.js app, MongoDB with Prisma, a Python sentiment microservice, OCR-based bill parsing, OTP email authentication, and map-based exploration.

## What The Project Does

TrustScore is built around one core idea: reviews should come from real purchases. A customer uploads a bill, the platform verifies it, then unlocks review submission. Reviews include both structured ratings and text sentiment analysis, which together affect the shop's trust score.

Main use cases:

- Customers discover trusted nearby shops
- Customers upload bills and submit verified reviews
- Shopkeepers register and manage shop information
- Shopkeepers monitor trust score, complaints, and shop visibility
- Admins monitor platform-wide activity and statistics

## Core Features

### Customer Features

- Discover shops by search, category, city, and `Near Me`
- Explore shops on a Leaflet + OpenStreetMap map
- Open turn-by-turn directions in Google Maps
- Upload a bill image and extract details with OCR.space
- Verify bills before reviewing
- Submit structured ratings out of 10 for:
  - Price
  - Quality
  - Behaviour
  - Service
- Add a text review for sentiment analysis
- View verified purchase history and submitted reviews

### Shopkeeper Features

- Register a shop with text-based address input
- Automatically geocode the shop address to latitude/longitude
- Edit shop name, description, address, city, and pincode
- Delete a shop from the database
- View trust score and review volume
- See complaint-related reviews and respond to them
- View a generated weekly improvement report with:
  - strengths
  - weak areas
  - complaints count
  - trust score movement
  - action points for the next week

### Admin Features

- Platform statistics dashboard
- User and shop activity overview
- Trust-score and sentiment visibility across the platform

## How Trust Score Works

Trust score is not based only on review text anymore. It combines structured ratings and sentiment analysis with rating-heavy hybrid logic:

- `85%` from structured ratings:
  - Price
  - Quality
  - Behaviour
  - Service
- `15%` from text sentiment analysis

Review sentiment badges also use hybrid logic so clearly good ratings are not wrongly shown as neutral just because the review text is short.

## Services Used

### 1. MongoDB

Used as the main database for users, shops, bills, reviews, trust scores, alerts, and reports.

### 2. Prisma ORM

Used for:

- schema management
- database access
- Prisma Client generation
- seeding sample data

### 3. Python AI Service

Located in:

- `backend/ai-sentiment-service/main.py`

Used for:

- fine-tuned multilingual sentiment analysis
- polarity and subjectivity calculation
- batch inference
- aspect extraction support
- trust score helper endpoints
- OCR text parsing helpers

Current NLP stack:

- FastAPI
- Hugging Face Transformers
- `cardiffnlp/twitter-xlm-roberta-base-sentiment`
- PyTorch
- TextBlob fallback
- NLTK

### 4. OCR.space

Used for bill OCR extraction during bill upload.

Used for:

- extracting bill number
- extracting bill date
- extracting raw bill text
- helping identify shop and item lines

### 5. Nodemailer + Gmail App Password

Used for OTP email verification during login and signup.

Used for:

- sending OTP emails
- mandatory OTP verification before signup completes
- email-based login verification flow

### 6. OpenStreetMap Nominatim

Used as the geocoding service.

Used for:

- converting text addresses to latitude/longitude
- storing coordinates for new and updated shops
- helping map features show shop locations

### 7. Leaflet + OpenStreetMap

Used for in-app map rendering.

Used for:

- map preview on homepage
- customer discovery map
- shop detail page map preview

### 8. Google Maps

Used only for navigation handoff.

Used for:

- `Get Directions`
- `Ride`
- turn-by-turn navigation in a new tab/app

This keeps map rendering free while still offering a familiar navigation experience.

## Tech Stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Radix UI
- Framer Motion
- Zustand
- Lucide React
- Leaflet

### Backend

- Next.js App Router API routes
- Prisma
- MongoDB
- JWT authentication
- bcryptjs
- Nodemailer
- weekly report generation

### AI / ML

- Python
- FastAPI
- PyTorch
- Hugging Face Transformers
- XLM-R sentiment model
- dataset preparation from live reviews
- Trainer API fine-tuning pipeline
- TextBlob fallback
- NLTK

### OCR / Maps / External Services

- OCR.space
- OpenStreetMap Nominatim
- OpenStreetMap tiles
- Google Maps deep links

## Project Structure

```text
trustscore/
├── backend/
│   └── ai-sentiment-service/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/
│   ├── components/
│   └── lib/
├── public/
├── .env
└── package.json
```

Important locations:

- `src/app` - pages and API routes
- `src/components` - reusable UI components
- `src/lib` - auth, API helpers, geocoding, AI integration, DB helpers
- `prisma/schema.prisma` - Prisma models
- `prisma/seed.ts` - seed data
- `backend/ai-sentiment-service` - Python sentiment microservice

## Important Application Flows

### 1. Signup With Mandatory OTP

1. User enters signup details
2. OTP is sent to email
3. User verifies OTP
4. Only then can account registration complete

### 2. Bill Verification Flow

1. Customer uploads a bill image
2. OCR.space extracts bill text
3. The bill is matched to a shop
4. Duplicate bills are handled safely
5. Verified bill unlocks review submission

### 3. Review And Trust Score Flow

1. Customer gives 4 category ratings out of 10
2. Customer writes a text review
3. Text is sent to the AI sentiment service
4. Review sentiment is finalized using hybrid logic
5. Review is stored
6. Trust score is recalculated from structured ratings + sentiment

### 4. Weekly Shopkeeper Report Flow

1. Shopkeeper opens analytics
2. Backend analyzes the current week’s reviews
3. It compares trust movement, complaints, and category ratings
4. A weekly summary and improvement points are generated
5. A snapshot is stored in `WeeklyReport`

### 5. Map Flow

1. Shopkeeper enters a normal text address
2. Backend geocodes it using OpenStreetMap Nominatim
3. Latitude and longitude are saved in the database
4. Maps prefer DB coordinates first
5. If directions are needed, the app opens Google Maps

## Environment Variables

Create a `.env` file in the project root and configure the required values.

```env
DATABASE_URL=
JWT_SECRET=
AI_SERVICE_URL=http://localhost:8000
OCR_SPACE_API_KEY=

EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM=TrustScore Platform

HF_MODEL_DIR=
HF_DATASET_DIR=
TRAIN_EPOCHS=4
TRAIN_BATCH_SIZE=8
EVAL_BATCH_SIZE=16
TRAIN_LEARNING_RATE=2e-5
TORCH_NUM_THREADS=1
TORCH_INTEROP_THREADS=1
```

### Environment Variable Notes

- `DATABASE_URL`: your MongoDB connection string
- `JWT_SECRET`: secret for JWT auth
- `AI_SERVICE_URL`: URL for the Python sentiment service
- `OCR_SPACE_API_KEY`: OCR.space API key
- `EMAIL_USER`: Gmail address used to send OTP emails
- `EMAIL_PASSWORD`: Gmail app password, not your regular Gmail password
- `EMAIL_FROM`: sender name used in OTP emails
- `HF_MODEL_DIR`: optional path to the fine-tuned model directory
- `HF_DATASET_DIR`: optional path for generated Hugging Face dataset artifacts
- `TRAIN_EPOCHS`, `TRAIN_BATCH_SIZE`, `EVAL_BATCH_SIZE`, `TRAIN_LEARNING_RATE`: optional training overrides
- `TORCH_NUM_THREADS`, `TORCH_INTEROP_THREADS`: inference/training thread tuning for CPU

## Gmail OTP Setup

To enable OTP emails for signup and login:

1. Go to your Google Account security settings
2. Enable 2-Step Verification
3. Generate a Gmail App Password
4. Put the values in `.env`:

```env
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_16_character_app_password
EMAIL_FROM=TrustScore Platform
```

## Installation And Setup

### 1. Install Node Dependencies

Using npm:

```bash
npm install
```

Or using Bun:

```bash
bun install
```

### 2. Install Python Dependencies

```bash
cd backend/ai-sentiment-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cd ..\..
```

### 3. Generate Prisma Client

```bash
npm run db:generate
```

### 4. Push Prisma Schema To MongoDB

```bash
npm run db:push
```

### 5. Seed Sample Data

```bash
npm run db:seed
```

Important:

- the seed script recreates the sample dataset
- if you want to preserve current data, skip `db:seed`

### 6. Start The AI Service

From the project root:

```bash
cd backend/ai-sentiment-service
venv\Scripts\activate
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 6A. Prepare And Fine-Tune The Sentiment Model

From `backend/ai-sentiment-service`:

```bash
python prepare_dataset.py
python train.py
```

This will:

- read existing reviews from MongoDB
- derive labels from structured ratings
- build a train/validation dataset
- fine-tune the XLM-R sentiment model
- save the trained model under `backend/ai-sentiment-service/models/`

### 7. Start The Next.js App

From the project root:

```bash
npm run dev
```

Open:

- `http://localhost:3000`

## Useful Commands

```bash
npm run dev
npm run lint
npm run db:generate
npm run db:push
npm run db:seed
```

## Seed Test Accounts

If you run the seed script, you can use the sample accounts created there.

Typical seeded roles include:

- Admin
- Shopkeeper
- Customer

Check `prisma/seed.ts` for the latest seeded emails and passwords.

## Current Highlights In This Project

- OTP-required signup flow
- Gmail-based OTP email verification
- OCR-based bill upload and extraction
- duplicate bill handling
- structured review ratings
- hybrid review sentiment scoring
- fine-tuned multilingual sentiment service
- trust-score recalculation
- shopkeeper weekly improvement reports
- shopkeeper shop management
- automatic shop geocoding
- homepage discovery map
- shop detail map preview
- Google Maps directions handoff

## Notes

- New shops are geocoded from text address input automatically
- Existing seeded shops use hardcoded coordinates in the seed data
- Maps prefer stored coordinates from the database
- If the AI service is unavailable, sentiment falls back safely so the review flow does not crash
- With a very small dataset, training metrics can look unrealistically perfect, so more review data will improve model reliability
- OCR quality depends on the uploaded bill image quality and OCR.space output

## Summary

TrustScore is a full-stack verified review platform for local shops. It combines bill verification, OTP authentication, map-based discovery, hybrid review scoring, AI sentiment analysis, weekly shopkeeper reporting, and shop trust analytics into one workflow designed for real-world local business discovery.
