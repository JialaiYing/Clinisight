"""Curated inpatient drug catalog + ADE interaction rules for Clinisight."""

from __future__ import annotations

from typing import Any

import numpy as np

# Stable IDs used in feature columns (drug_<id>) and API payloads.
DRUG_CATALOG: dict[str, dict[str, Any]] = {
    "lisinopril": {"label": "Lisinopril", "tags": ["ace_inhibitor"]},
    "losartan": {"label": "Losartan", "tags": ["ace_inhibitor"]},
    "spironolactone": {"label": "Spironolactone", "tags": ["k_sparing_diuretic"]},
    "furosemide": {"label": "Furosemide", "tags": ["loop_diuretic"]},
    "ibuprofen": {"label": "Ibuprofen", "tags": ["nsaid"]},
    "ketorolac": {"label": "Ketorolac", "tags": ["nsaid"]},
    "warfarin": {"label": "Warfarin", "tags": ["anticoagulant"]},
    "heparin": {"label": "Heparin", "tags": ["anticoagulant"]},
    "apixaban": {"label": "Apixaban", "tags": ["anticoagulant"]},
    "aspirin": {"label": "Aspirin", "tags": ["antiplatelet"]},
    "insulin": {"label": "Insulin", "tags": ["insulin", "antidiabetic"]},
    "metformin": {"label": "Metformin", "tags": ["antidiabetic"]},
    "glipizide": {"label": "Glipizide", "tags": ["antidiabetic", "sulfonylurea"]},
    "amoxicillin_clavulanate": {
        "label": "Amoxicillin-clavulanate",
        "tags": ["antibiotic", "hepatotoxic"],
    },
    "azithromycin": {"label": "Azithromycin", "tags": ["antibiotic", "qt_risk"]},
    "amiodarone": {"label": "Amiodarone", "tags": ["qt_risk"]},
    "ondansetron": {"label": "Ondansetron", "tags": ["qt_risk"]},
    "acetaminophen": {"label": "Acetaminophen", "tags": ["analgesic"]},
}

DRUG_IDS: list[str] = list(DRUG_CATALOG.keys())
DRUG_FEATURE_COLS: list[str] = [f"drug_{d}" for d in DRUG_IDS]

# Pairwise tag interactions → ADE weight bump + UI message.
INTERACTIONS: list[dict[str, Any]] = [
    {
        "tags": ("ace_inhibitor", "nsaid"),
        "outcome": "aki",
        "weight": 0.55,
        "message": "ACE inhibitor/ARB + NSAID: stacked nephrotoxin risk (KDIGO triple-whammy theme)",
    },
    {
        "tags": ("ace_inhibitor", "k_sparing_diuretic"),
        "outcome": "hyperkalemia",
        "weight": 0.75,
        "message": "ACE inhibitor/ARB + spironolactone: high hyperkalemia risk",
    },
    {
        "tags": ("nsaid", "anticoagulant"),
        "outcome": "bleeding_risk",
        "weight": 0.65,
        "message": "NSAID + anticoagulant: HAS-BLED drug-interaction bleeding risk",
    },
    {
        "tags": ("antiplatelet", "anticoagulant"),
        "outcome": "bleeding_risk",
        "weight": 0.55,
        "message": "Antiplatelet + anticoagulant: dual antithrombotic bleeding risk",
    },
    {
        "tags": ("nsaid", "antiplatelet"),
        "outcome": "bleeding_risk",
        "weight": 0.35,
        "message": "NSAID + aspirin: additive GI/bleeding risk",
    },
    {
        "tags": ("insulin", "sulfonylurea"),
        "outcome": "hypoglycemia",
        "weight": 0.45,
        "message": "Insulin + sulfonylurea: stacked hypoglycemia risk (ADA)",
    },
]


def drug_label(drug_id: str) -> str:
    return str(DRUG_CATALOG.get(drug_id, {}).get("label", drug_id))


def tags_for_medications(medications: list[str] | set[str]) -> set[str]:
    tags: set[str] = set()
    for mid in medications:
        meta = DRUG_CATALOG.get(mid)
        if meta:
            tags.update(meta["tags"])
    return tags


def derived_flags(medications: list[str] | set[str]) -> dict[str, bool]:
    """Boolean flags derived from curated drugs (for explain/recommend rules)."""
    tags = tags_for_medications(medications)
    return {
        "on_nsaid": "nsaid" in tags,
        "on_ace_inhibitor": "ace_inhibitor" in tags,
        "on_anticoagulant": "anticoagulant" in tags,
        "on_insulin": "insulin" in tags,
        "on_antibiotic": "antibiotic" in tags,
        "on_antidiabetic": "antidiabetic" in tags,
        "on_hepatotoxic_abx": "hepatotoxic" in tags,
        "on_qt_risk": "qt_risk" in tags,
        "on_k_sparing": "k_sparing_diuretic" in tags,
    }


def medication_feature_vector(medications: list[str] | set[str]) -> dict[str, float]:
    active = set(medications)
    return {f"drug_{d}": 1.0 if d in active else 0.0 for d in DRUG_IDS}


def active_interactions(medications: list[str]) -> list[dict[str, str]]:
    """Return fired interaction alerts for the UI / API."""
    tags = tags_for_medications(medications)
    alerts: list[dict[str, str]] = []
    for rule in INTERACTIONS:
        t0, t1 = rule["tags"]
        if t0 in tags and t1 in tags:
            alerts.append({"outcome": rule["outcome"], "message": rule["message"]})

    qt_drugs = [
        d for d in medications if "qt_risk" in DRUG_CATALOG.get(d, {}).get("tags", [])
    ]
    if len(qt_drugs) >= 2:
        alerts.append(
            {
                "outcome": "qt_prolongation",
                "message": (
                    f"Multiple QT-risk drugs ({', '.join(drug_label(d) for d in qt_drugs)}): "
                    "Tisdale/CredibleMeds-style stacking risk"
                ),
            }
        )
    return alerts


def interaction_logit_bonuses(
    drug_cols: dict[str, np.ndarray], n: int
) -> dict[str, np.ndarray]:
    """Vectorized interaction bonuses for synthetic label generation."""
    tag_mats: dict[str, np.ndarray] = {}
    for drug_id, meta in DRUG_CATALOG.items():
        col = drug_cols[f"drug_{drug_id}"]
        for tag in meta["tags"]:
            if tag not in tag_mats:
                tag_mats[tag] = np.zeros(n, dtype=np.float64)
            tag_mats[tag] = np.maximum(tag_mats[tag], col)

    outcomes = (
        "aki",
        "hyperkalemia",
        "qt_prolongation",
        "liver_toxicity",
        "bleeding_risk",
        "hypoglycemia",
    )
    bonuses = {o: np.zeros(n, dtype=np.float64) for o in outcomes}
    for rule in INTERACTIONS:
        t0, t1 = rule["tags"]
        if t0 not in tag_mats or t1 not in tag_mats:
            continue
        both = tag_mats[t0] * tag_mats[t1]
        bonuses[rule["outcome"]] += float(rule["weight"]) * both

    qt_count = np.zeros(n, dtype=np.float64)
    for drug_id, meta in DRUG_CATALOG.items():
        if "qt_risk" in meta["tags"]:
            qt_count += drug_cols[f"drug_{drug_id}"]
    bonuses["qt_prolongation"] += 0.5 * (qt_count >= 2).astype(np.float64)
    return bonuses
