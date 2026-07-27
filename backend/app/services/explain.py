"""
Rule-based ADE factor lists for the UI.

Mirrors the synthetic label generators — guidance for the demo, not SHAP/Captum.
"""

from __future__ import annotations

from app.schemas.patient import PatientInput, Sex


def _age_older(patient: PatientInput) -> bool:
    return patient.age >= 65


def explain_patient(patient: PatientInput, egfr: float) -> dict[str, list[str]]:
    factors: dict[str, list[str]] = {
        "aki": [],
        "hyperkalemia": [],
        "qt_prolongation": [],
        "liver_toxicity": [],
        "bleeding_risk": [],
        "hypoglycemia": [],
    }

    if egfr < 60 or patient.ckd:
        factors["aki"].append("Reduced kidney function (low eGFR / CKD)")
    if patient.on_nsaid:
        factors["aki"].append("NSAID use")
    if _age_older(patient):
        factors["aki"].append("Older age")
    if patient.on_ace_inhibitor:
        factors["aki"].append("ACE inhibitor")
    if patient.heart_failure:
        factors["aki"].append("Heart failure")
    if patient.sbp < 100:
        factors["aki"].append("Low blood pressure")

    if patient.ckd or egfr < 60:
        factors["hyperkalemia"].append("Chronic kidney disease")
    if patient.on_ace_inhibitor:
        factors["hyperkalemia"].append("ACE inhibitor")
    if patient.potassium >= 4.8:
        factors["hyperkalemia"].append("Elevated baseline potassium")
    if _age_older(patient):
        factors["hyperkalemia"].append("Older age")
    if patient.diabetes:
        factors["hyperkalemia"].append("Diabetes")

    if _age_older(patient):
        factors["qt_prolongation"].append("Older age")
    if patient.heart_failure:
        factors["qt_prolongation"].append("Heart failure")
    if patient.num_concurrent_meds >= 6:
        factors["qt_prolongation"].append("Polypharmacy (many concurrent medications)")
    if patient.sodium < 135:
        factors["qt_prolongation"].append("Low sodium")
    if patient.on_anticoagulant:
        factors["qt_prolongation"].append("High cardiac comorbidity burden")

    if patient.liver_disease:
        factors["liver_toxicity"].append("Pre-existing liver disease")
    if patient.ast > 40 or patient.alt > 40:
        factors["liver_toxicity"].append("Elevated liver enzymes (AST/ALT)")
    if patient.medication_class.value == "antibiotic":
        factors["liver_toxicity"].append("Antibiotic medication class")
    if _age_older(patient):
        factors["liver_toxicity"].append("Older age")
    if patient.bmi > 35:
        factors["liver_toxicity"].append("Obesity (BMI > 35)")

    if patient.on_anticoagulant:
        factors["bleeding_risk"].append("Anticoagulant use")
    if patient.on_nsaid:
        factors["bleeding_risk"].append("NSAID use")
    if patient.hemoglobin < 12 if patient.sex == Sex.female else patient.hemoglobin < 13:
        factors["bleeding_risk"].append("Low hemoglobin")
    if patient.platelets < 150:
        factors["bleeding_risk"].append("Low platelets")
    if patient.liver_disease:
        factors["bleeding_risk"].append("Liver disease")
    if _age_older(patient):
        factors["bleeding_risk"].append("Older age")

    if patient.on_insulin:
        factors["hypoglycemia"].append("Insulin therapy")
    if patient.diabetes:
        factors["hypoglycemia"].append("Diabetes")
    if patient.glucose < 90:
        factors["hypoglycemia"].append("Low / borderline glucose")
    if patient.ckd or egfr < 60:
        factors["hypoglycemia"].append("Reduced kidney clearance (CKD)")
    if patient.medication_class.value == "antidiabetic":
        factors["hypoglycemia"].append("Antidiabetic medication class")
    if _age_older(patient):
        factors["hypoglycemia"].append("Older age")

    # Cap length so the results panel stays readable.
    return {k: v[:4] for k, v in factors.items()}


def overall_risk_level(risks: dict[str, float]) -> str:
    peak = max(risks.values()) if risks else 0.0
    if peak < 0.33:
        return "low"
    if peak < 0.66:
        return "moderate"
    return "high"


DISCLAIMER = "Not for clinical use. Prototype only."
