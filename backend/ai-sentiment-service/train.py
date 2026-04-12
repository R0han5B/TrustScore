"""
Fine-tune a multilingual transformer model for review sentiment analysis.

Expected flow:
1. Prepare the dataset from MongoDB reviews.
2. Fine-tune the model with Hugging Face Trainer.
3. Save the best model and tokenizer for FastAPI inference.
"""

from __future__ import annotations

import inspect
import os
from pathlib import Path
from typing import Dict

import numpy as np
from datasets import DatasetDict, load_from_disk
from sklearn.metrics import accuracy_score, f1_score
from transformers import (
    AutoModelForSequenceClassification,
    DataCollatorWithPadding,
    Trainer,
    TrainingArguments,
    XLMRobertaTokenizer,
)

from prepare_dataset import DEFAULT_OUTPUT_DIR, LABEL_TO_ID, main as prepare_dataset_main

BASE_MODEL = "cardiffnlp/twitter-xlm-roberta-base-sentiment"
ID_TO_LABEL = {value: key for key, value in LABEL_TO_ID.items()}
DEFAULT_MODEL_DIR = Path(__file__).resolve().parent / "models" / "sentiment-xlm-roberta"


def load_dataset() -> DatasetDict:
    dataset_dir = Path(os.getenv("HF_DATASET_DIR", str(DEFAULT_OUTPUT_DIR)))
    if not dataset_dir.exists():
        prepare_dataset_main()
    return load_from_disk(str(dataset_dir))


def tokenize_dataset(dataset: DatasetDict, tokenizer) -> DatasetDict:
    def tokenize_batch(batch: Dict[str, list]) -> Dict[str, list]:
        return tokenizer(
            batch["text"],
            truncation=True,
            max_length=256,
        )

    return dataset.map(tokenize_batch, batched=True)


def compute_metrics(eval_pred) -> Dict[str, float]:
    logits, labels = eval_pred
    predictions = np.argmax(logits, axis=-1)
    return {
        "accuracy": accuracy_score(labels, predictions),
        "weighted_f1": f1_score(labels, predictions, average="weighted"),
        "macro_f1": f1_score(labels, predictions, average="macro"),
    }


def main() -> None:
    dataset = load_dataset()
    tokenizer = XLMRobertaTokenizer.from_pretrained(BASE_MODEL)
    tokenized_dataset = tokenize_dataset(dataset, tokenizer)

    model = AutoModelForSequenceClassification.from_pretrained(
        BASE_MODEL,
        num_labels=3,
        id2label=ID_TO_LABEL,
        label2id=LABEL_TO_ID,
    )

    output_dir = Path(os.getenv("HF_MODEL_DIR", str(DEFAULT_MODEL_DIR)))
    output_dir.mkdir(parents=True, exist_ok=True)

    training_kwargs = {
        "output_dir": str(output_dir),
        "num_train_epochs": float(os.getenv("TRAIN_EPOCHS", "4")),
        "per_device_train_batch_size": int(os.getenv("TRAIN_BATCH_SIZE", "8")),
        "per_device_eval_batch_size": int(os.getenv("EVAL_BATCH_SIZE", "16")),
        "learning_rate": float(os.getenv("TRAIN_LEARNING_RATE", "2e-5")),
        "save_strategy": "epoch",
        "load_best_model_at_end": True,
        "metric_for_best_model": "eval_weighted_f1",
        "greater_is_better": True,
        "logging_strategy": "steps",
        "logging_steps": 10,
        "save_total_limit": 2,
        "weight_decay": 0.01,
        "report_to": "none",
        "fp16": False,
    }

    training_signature = inspect.signature(TrainingArguments.__init__)
    if "evaluation_strategy" in training_signature.parameters:
        training_kwargs["evaluation_strategy"] = "epoch"
    elif "eval_strategy" in training_signature.parameters:
        training_kwargs["eval_strategy"] = "epoch"

    training_args = TrainingArguments(**training_kwargs)

    trainer_kwargs = {
        "model": model,
        "args": training_args,
        "train_dataset": tokenized_dataset["train"],
        "eval_dataset": tokenized_dataset["validation"],
        "data_collator": DataCollatorWithPadding(tokenizer=tokenizer),
        "compute_metrics": compute_metrics,
    }

    trainer_signature = inspect.signature(Trainer.__init__)
    if "tokenizer" in trainer_signature.parameters:
        trainer_kwargs["tokenizer"] = tokenizer
    elif "processing_class" in trainer_signature.parameters:
        trainer_kwargs["processing_class"] = tokenizer

    trainer = Trainer(**trainer_kwargs)

    trainer.train()
    trainer.save_model(str(output_dir))
    tokenizer.save_pretrained(str(output_dir))

    print(f"Saved fine-tuned model to: {output_dir}")


if __name__ == "__main__":
    main()
