"""
Prepare a Hugging Face dataset for multilingual sentiment fine-tuning.

This script reads existing reviews from MongoDB, derives sentiment labels from
structured ratings, applies light multilingual-safe normalization, and writes a
train/validation dataset to disk.
"""

from __future__ import annotations

import json
import os
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional
from urllib.parse import urlparse

from datasets import Dataset, DatasetDict
from dotenv import load_dotenv
from pymongo import MongoClient

LABEL_TO_ID = {"NEGATIVE": 0, "NEUTRAL": 1, "POSITIVE": 2}
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent / "artifacts" / "review_dataset"


@dataclass
class PreparedReview:
    text: str
    label: str
    label_id: int
    rating_average: float
    language_hint: str


def normalize_review_text(text: str) -> str:
    """Apply light cleaning without damaging multilingual text."""
    text = unicodedata.normalize("NFKC", text or "")
    text = re.sub(r"https?://\S+|www\.\S+", " ", text)
    text = re.sub(r"[@#]+", " ", text)
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()


def detect_language_hint(text: str) -> str:
    """Very lightweight hint used only for dataset inspection/debugging."""
    if re.search(r"[\u0900-\u097F]", text):
        return "hindi_or_mixed"
    if re.search(r"[a-zA-Z]", text):
        return "english_or_hinglish"
    return "unknown"


def derive_label_from_average(rating_average: float) -> str:
    """Map averaged structured ratings to sentiment labels."""
    if rating_average >= 8:
        return "POSITIVE"
    if rating_average >= 4:
        return "NEUTRAL"
    return "NEGATIVE"


def parse_database_name(database_url: str) -> Optional[str]:
    parsed = urlparse(database_url)
    if parsed.path and parsed.path != "/":
        return parsed.path.lstrip("/")
    return None


def load_reviews_from_mongo(database_url: str) -> List[Dict]:
    client = MongoClient(database_url)
    database_name = parse_database_name(database_url)
    db = client.get_default_database() if database_name else client["trustscore"]
    try:
        return list(
            db["Review"].find(
                {},
                {
                    "reviewText": 1,
                    "priceRating": 1,
                    "qualityRating": 1,
                    "behaviorRating": 1,
                    "serviceRating": 1,
                    "sentimentLabel": 1,
                },
            )
        )
    finally:
        client.close()


def transform_reviews(raw_reviews: List[Dict]) -> List[PreparedReview]:
    prepared: List[PreparedReview] = []

    for review in raw_reviews:
        text = normalize_review_text(review.get("reviewText", ""))
        if len(text) < 8:
            continue

        ratings = [
            int(review.get("priceRating", 5) or 5),
            int(review.get("qualityRating", 5) or 5),
            int(review.get("behaviorRating", 5) or 5),
            int(review.get("serviceRating", 5) or 5),
        ]

        rating_average = sum(ratings) / len(ratings)
        label = derive_label_from_average(rating_average)

        prepared.append(
            PreparedReview(
                text=text,
                label=label,
                label_id=LABEL_TO_ID[label],
                rating_average=rating_average,
                language_hint=detect_language_hint(text),
            )
        )

    return prepared


def build_dataset_dict(prepared_reviews: List[PreparedReview]) -> DatasetDict:
    if len(prepared_reviews) < 10:
        raise ValueError(
            "Not enough reviews to build a train/validation split. "
            "Add more reviews before fine-tuning."
        )

    data = {
        "text": [review.text for review in prepared_reviews],
        "label": [review.label_id for review in prepared_reviews],
        "label_name": [review.label for review in prepared_reviews],
        "rating_average": [review.rating_average for review in prepared_reviews],
        "language_hint": [review.language_hint for review in prepared_reviews],
    }

    dataset = Dataset.from_dict(data)
    split = dataset.train_test_split(test_size=0.15, seed=42, shuffle=True)
    return DatasetDict(train=split["train"], validation=split["test"])


def save_dataset(dataset: DatasetDict, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    dataset.save_to_disk(str(output_dir))

    metadata = {
        "train_size": len(dataset["train"]),
        "validation_size": len(dataset["validation"]),
        "labels": LABEL_TO_ID,
    }
    (output_dir / "metadata.json").write_text(
        json.dumps(metadata, indent=2),
        encoding="utf-8",
    )


def main() -> None:
    load_dotenv(Path(__file__).resolve().parents[2] / ".env")

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is required to prepare the dataset.")

    output_dir = Path(os.getenv("HF_DATASET_DIR", str(DEFAULT_OUTPUT_DIR)))

    raw_reviews = load_reviews_from_mongo(database_url)
    prepared_reviews = transform_reviews(raw_reviews)
    dataset = build_dataset_dict(prepared_reviews)
    save_dataset(dataset, output_dir)

    print(
        json.dumps(
            {
                "status": "ok",
                "output_dir": str(output_dir),
                "train_examples": len(dataset["train"]),
                "validation_examples": len(dataset["validation"]),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
