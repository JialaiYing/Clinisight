"""Guideline-style factor lists and next actions for the report UI.

Separate from Captum attributions. See docs/clinical-basis.md for sources.
Demo guidance only, not a treatment protocol.
"""

from __future__ import annotations

from app.schemas.patient import PatientInput, Sex
from ml.drugs import active_interactions, derived_flags, drug_label

# Aligns with frontend card bands (30% / 60%).
ELEVATED_RISK_THRESHOLD = 0.30


def _age_older(patient: PatientInput) -> bool:
    return patient.age >= 65


def _low_hemoglobin(patient: PatientInput) -> bool:
    threshold = 12.0 if patient.sex == Sex.female else 13.0
    return patient.hemoglobin < threshold


def _reduced_kidney(patient: PatientInput, egfr: float) -> bool:
    return patient.ckd or egfr < 60


def explain_patient(patient: PatientInput, egfr: float) -> dict[str, list[str]]:
    flags = derived_flags(patient.medications)
    factors: dict[str, list[str]] = {
        "aki": [],
        "hyperkalemia": [],
        "qt_prolongation": [],
        "liver_toxicity": [],
        "bleeding_risk": [],
        "hypoglycemia": [],
    }

    if _reduced_kidney(patient, egfr):
        factors["aki"].append("Reduced kidney function (low eGFR / CKD)")
    if flags["on_nsaid"]:
        factors["aki"].append("NSAID on regimen")
    if _age_older(patient):
        factors["aki"].append("Older age")
    if flags["on_ace_inhibitor"]:
        factors["aki"].append("ACE inhibitor / ARB")
    if patient.heart_failure:
        factors["aki"].append("Heart failure")
    if patient.sbp < 100:
        factors["aki"].append("Low blood pressure")

    if _reduced_kidney(patient, egfr):
        factors["hyperkalemia"].append("Reduced kidney function (low eGFR / CKD)")
    if flags["on_ace_inhibitor"]:
        factors["hyperkalemia"].append("ACE inhibitor / ARB")
    if flags["on_k_sparing"]:
        factors["hyperkalemia"].append("Potassium-sparing diuretic (spironolactone)")
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
    if patient.num_concurrent_meds >= 6 or len(patient.medications) >= 6:
        factors["qt_prolongation"].append("Polypharmacy (many concurrent medications)")
    if patient.sodium < 135:
        factors["qt_prolongation"].append("Low sodium")
    if flags["on_qt_risk"]:
        factors["qt_prolongation"].append("QT-prolonging medication on regimen")

    if patient.liver_disease:
        factors["liver_toxicity"].append("Pre-existing liver disease")
    if patient.ast > 40 or patient.alt > 40:
        factors["liver_toxicity"].append("Elevated liver enzymes (AST/ALT)")
    if flags["on_hepatotoxic_abx"]:
        factors["liver_toxicity"].append("Hepatotoxic antibiotic (e.g. amox-clav)")
    elif flags["on_antibiotic"]:
        factors["liver_toxicity"].append("Antibiotic on regimen")
    if _age_older(patient):
        factors["liver_toxicity"].append("Older age")
    if patient.bmi > 35:
        factors["liver_toxicity"].append("Obesity (BMI > 35)")

    if flags["on_anticoagulant"]:
        factors["bleeding_risk"].append("Anticoagulant on regimen")
    if flags["on_nsaid"]:
        factors["bleeding_risk"].append("NSAID on regimen")
    if "aspirin" in patient.medications:
        factors["bleeding_risk"].append("Aspirin (antiplatelet)")
    if _low_hemoglobin(patient):
        factors["bleeding_risk"].append("Low hemoglobin")
    if patient.platelets < 150:
        factors["bleeding_risk"].append("Low platelets")
    if patient.liver_disease:
        factors["bleeding_risk"].append("Liver disease")
    if _age_older(patient):
        factors["bleeding_risk"].append("Older age")

    if flags["on_insulin"]:
        factors["hypoglycemia"].append("Insulin therapy")
    if patient.diabetes:
        factors["hypoglycemia"].append("Diabetes")
    if patient.glucose < 90:
        factors["hypoglycemia"].append("Low / borderline glucose")
    if _reduced_kidney(patient, egfr):
        factors["hypoglycemia"].append("Reduced kidney clearance (CKD)")
    if flags["on_antidiabetic"]:
        factors["hypoglycemia"].append(
            "Antidiabetic medication: "
            + ", ".join(drug_label(m) for m in patient.medications if m in {
                "insulin", "metformin", "glipizide"
            })
        )
    if _age_older(patient):
        factors["hypoglycemia"].append("Older age")

    # Surface active interaction themes as factors too.
    for alert in active_interactions(patient.medications):
        outcome = alert["outcome"]
        if outcome in factors and alert["message"] not in factors[outcome]:
            factors[outcome].insert(0, alert["message"])

    return {k: v[:4] for k, v in factors.items()}


def recommend_patient(
    patient: PatientInput,
    egfr: float,
    risks: dict[str, float],
    *,
    elevated_threshold: float = ELEVATED_RISK_THRESHOLD,
) -> dict[str, list[str]]:
    """Guideline-tagged CDS-style next actions for elevated ADE risks."""
    flags = derived_flags(patient.medications)
    actions: dict[str, list[str]] = {
        "aki": [],
        "hyperkalemia": [],
        "qt_prolongation": [],
        "liver_toxicity": [],
        "bleeding_risk": [],
        "hypoglycemia": [],
    }

    def elevated(key: str) -> bool:
        return (risks.get(key) or 0.0) >= elevated_threshold

    kidney = _reduced_kidney(patient, egfr)

    if elevated("aki"):
        if flags["on_nsaid"] and flags["on_ace_inhibitor"]:
            actions["aki"].append(
                "Per KDIGO nephrotoxin caution: avoid stacking NSAID + ACE/ARB; hold NSAID and reassess ACE-I"
            )
        elif flags["on_nsaid"]:
            actions["aki"].append(
                "Per KDIGO AKI risk framing: hold or avoid NSAID; prefer acetaminophen when possible"
            )
        elif flags["on_ace_inhibitor"] and kidney:
            actions["aki"].append(
                "Per KDIGO CKD monitoring: review ACE/ARB dose; recheck creatinine and potassium in 48–72h"
            )
        elif flags["on_ace_inhibitor"]:
            actions["aki"].append(
                "Per KDIGO: reassess ACE/ARB if volume depleted or creatinine is rising"
            )
        if patient.sbp < 100:
            actions["aki"].append(
                "Address hypotension / volume status before continuing nephrotoxic meds (KDIGO AKI)"
            )
        actions["aki"].append(
            "Per KDIGO-style surveillance: recheck creatinine and monitor urine output within 24–48h"
        )

    if elevated("hyperkalemia"):
        if flags["on_ace_inhibitor"] and flags["on_k_sparing"]:
            actions["hyperkalemia"].append(
                "Per KDIGO CKD: ACE/ARB + spironolactone; hold one agent and recheck K within 24h"
            )
        elif flags["on_ace_inhibitor"]:
            actions["hyperkalemia"].append(
                "Per KDIGO CKD RAAS guidance: consider holding ACE/ARB temporarily; recheck potassium within 24h"
            )
        elif flags["on_k_sparing"]:
            actions["hyperkalemia"].append(
                "Review spironolactone dose; recheck potassium promptly"
            )
        if patient.potassium >= 4.8:
            actions["hyperkalemia"].append(
                "Avoid potassium supplements and salt substitutes; review diet"
            )
        actions["hyperkalemia"].append(
            "Per KDIGO monitoring theme: repeat basic metabolic panel (BMP) promptly"
        )

    if elevated("qt_prolongation"):
        actions["qt_prolongation"].append(
            "Per Tisdale/CredibleMeds-style QT risk: review QT-prolonging meds; correct low K/Mg if present"
        )
        if flags["on_qt_risk"]:
            actions["qt_prolongation"].append(
                "Deprescribe or avoid adding a second QT-risk agent when feasible"
            )
        elif patient.num_concurrent_meds >= 6:
            actions["qt_prolongation"].append(
                "Deprescribe nonessential agents that add QT risk when feasible (polypharmacy)"
            )
        actions["qt_prolongation"].append(
            "Obtain ECG before starting or escalating high QT-risk drugs"
        )

    if elevated("liver_toxicity"):
        if flags["on_hepatotoxic_abx"] or flags["on_antibiotic"]:
            actions["liver_toxicity"].append(
                "Per ACG DILI themes: prefer antibiotics with lower hepatotoxicity risk when clinically appropriate"
            )
        if patient.ast > 40 or patient.alt > 40 or patient.liver_disease:
            actions["liver_toxicity"].append(
                "Recheck LFTs; avoid alcohol and excess acetaminophen (ACG DILI caution)"
            )
        if patient.liver_disease:
            actions["liver_toxicity"].append(
                "Dose-adjust hepatically cleared medications given known liver disease"
            )
        if not actions["liver_toxicity"]:
            actions["liver_toxicity"].append(
                "Monitor LFTs if continuing potentially hepatotoxic therapy"
            )

    if elevated("bleeding_risk"):
        if flags["on_nsaid"] and flags["on_anticoagulant"]:
            actions["bleeding_risk"].append(
                "Per HAS-BLED drug-interaction risk: avoid NSAID with anticoagulant; use alternative analgesia"
            )
        elif flags["on_anticoagulant"]:
            actions["bleeding_risk"].append(
                "Confirm anticoagulant indication and current intensity (INR / anti-Xa as applicable)"
            )
        elif flags["on_nsaid"]:
            actions["bleeding_risk"].append(
                "Limit NSAID duration/dose; consider gastroprotection if bleeding risk persists"
            )
        if _low_hemoglobin(patient) or patient.platelets < 150:
            actions["bleeding_risk"].append(
                "Recheck CBC and investigate occult bleeding if indicated"
            )
        if (
            flags["on_anticoagulant"]
            and (flags["on_nsaid"] or _age_older(patient))
            and len(actions["bleeding_risk"]) < 3
        ):
            actions["bleeding_risk"].append(
                "Per HAS-BLED: consider PPI gastroprotection while dual bleeding risk factors are present"
            )

    if elevated("hypoglycemia"):
        if flags["on_insulin"]:
            actions["hypoglycemia"].append(
                "Per ADA Standards of Care: review insulin dose/timing; ensure meal coverage and hypo education"
            )
        if flags["on_antidiabetic"]:
            actions["hypoglycemia"].append(
                "Reassess oral antidiabetic intensity, especially sulfonylureas (ADA)"
            )
        if kidney:
            actions["hypoglycemia"].append(
                "Reduce renally cleared hypoglycemic agents given impaired clearance (ADA/CKD dosing)"
            )
        if _age_older(patient) and len(actions["hypoglycemia"]) < 3:
            actions["hypoglycemia"].append(
                "Per Beers/ADA older-adult caution: avoid overly intensive glycemic targets"
            )
        if len(actions["hypoglycemia"]) < 3:
            actions["hypoglycemia"].append(
                "Recheck capillary glucose and document recent hypo symptoms"
            )

    return {k: v[:3] for k, v in actions.items() if v}


def overall_risk_level(risks: dict[str, float]) -> str:
    # Same cutoffs as frontend cardRiskTier (30% / 60%).
    peak = max(risks.values()) if risks else 0.0
    if peak < 0.30:
        return "low"
    if peak < 0.60:
        return "moderate"
    return "high"


DISCLAIMER = "Not for clinical use. Prototype only."
