import json
from pathlib import Path

from fastapi import APIRouter

from services import nlp
from services.fusion import build_grid_fusion

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent.parent
INCIDENTS_FILE = BASE_DIR / "data" / "incidents.json"
MESSAGES_FILE = BASE_DIR / "data" / "messages.json"
SENSORS_FILE = BASE_DIR / "data" / "sensors.json"


def _load(path):
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


@router.get("/")
def get_fusion_data():
    """Ranked multimodal fusion heat map with per-cell XAI rationale."""
    incidents = _load(INCIDENTS_FILE)
    raw_messages = _load(MESSAGES_FILE)
    sensors = _load(SENSORS_FILE)

    # Run the code-mixed NLP extractor over every crisis report so the
    # fusion engine can read real urgency levels instead of defaults.
    messages = [
        {
            **message,
            "analysis": nlp.analyze_message(
                message.get("text", ""),
                fallback_state=message.get("state"),
                fallback_location=message.get("location"),
            ),
        }
        for message in raw_messages
    ]

    cells = build_grid_fusion(incidents, messages, sensors)

    return {
        "status": "success",
        "formula": "Priority = 0.40 * Vision + 0.35 * NLP + 0.25 * Sensor",
        "weights": {"vision": 0.40, "nlp": 0.35, "sensor": 0.25},
        "cell_count": len(cells),
        "cells": cells,
        "top": cells[0] if cells else None,
    }
