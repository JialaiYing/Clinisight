# Clinical basis for Clinisight’s synthetic ADE labels

Clinisight trains on **synthetic** patients. Labels are *not* real hospital
outcomes. Instead, each adverse drug event (ADE) is drawn from a noisy risk
score whose factors follow published clinical associations and guideline themes.

This document maps **outcome → encoded risk factors → source**. Coefficient
magnitudes in `backend/ml/generate_data.py` encode *direction* of risk, not
fitted odds ratios from a single study.

**Not for clinical use.** Prototype / educational framing only.

---

## Shared labs

| Concept | How encoded | Source |
|---------|-------------|--------|
| Kidney function | eGFR from creatinine, age, sex via **CKD-EPI 2021** (race-free) | Inker LA et al. *N Engl J Med*. 2021. |
| CKD / reduced GFR | `ckd` flag and/or eGFR &lt; 60 | KDIGO CKD / AKI frameworks |

---

## 1. Acute kidney injury (AKI)

**Encoded factors:** low eGFR / CKD, NSAID, ACE inhibitor, older age, heart failure, hypotension (SBP &lt; 100).

| Factor | Clinical rationale | Source |
|--------|--------------------|--------|
| Reduced eGFR / CKD | Vulnerable kidneys; less reserve for nephrotoxic stress | KDIGO Clinical Practice Guideline for AKI (2012) |
| NSAID ± ACE inhibitor | Combination nephrotoxicity; classic “triple whammy” when diuretics co-prescribed | Lapi F et al. *BMJ*. 2013 (ACE-I/ARB + diuretic + NSAID) |
| Age, HF, low BP | Higher AKI susceptibility in frail / hypoperfused patients | KDIGO AKI risk context |

**Guideline-tied demo actions:** hold/avoid stacked nephrotoxins; recheck creatinine (KDIGO-style monitoring).

---

## 2. Hyperkalemia

**Encoded factors:** CKD, ACE inhibitor, elevated baseline potassium, older age, diabetes.

| Factor | Clinical rationale | Source |
|--------|--------------------|--------|
| ACE inhibitor (RAAS blockade) | Reduces aldosterone → potassium retention | Well-established; monitoring emphasized in CKD care |
| CKD / diabetes | Impaired K handling | KDIGO CKD guidance on RAAS inhibitor monitoring |
| High baseline K | Lab precursor to clinically important hyperkalemia | Routine BMP surveillance practice |

**Guideline-tied demo actions:** temporary hold / review of ACE-I; prompt BMP (KDIGO CKD monitoring theme).

---

## 3. QT prolongation

**Encoded factors:** older age, heart failure, polypharmacy (≥6 meds), hyponatremia, cardiac comorbidity stand-in (anticoagulant flag).

| Factor | Clinical rationale | Source |
|--------|--------------------|--------|
| Age, HF, many concurrent drugs, electrolytes | Validated risk domains for drug-associated QTc prolongation | Tisdale JE et al. *Circ Arrhythm Electrophysiol*. 2013 (risk score) |
| Polypharmacy | More chance of QT-prolonging combinations | CredibleMeds / Tisdale-style risk framing |

**Guideline-tied demo actions:** review QT-risk drugs; correct electrolytes; ECG before high-risk starts.

---

## 4. Liver toxicity (drug-induced liver injury)

**Encoded factors:** prior liver disease, elevated AST/ALT, antibiotic class, older age, obesity (BMI &gt; 35).

| Factor | Clinical rationale | Source |
|--------|--------------------|--------|
| Prior liver disease / elevated enzymes | Higher vulnerability and detection of hepatotoxicity | ACG Clinical Guideline: Diagnosis and Management of Idiosyncratic DILI (Chalasani et al.) |
| Antibiotics | Among leading drug classes implicated in DILI | Same ACG DILI literature |
| Obesity / age | Associated with steatosis and higher DILI risk in some cohorts | DILI epidemiology reviews |

**Guideline-tied demo actions:** prefer lower-hepatotoxicity options when appropriate; recheck LFTs; dose-adjust in known liver disease.

---

## 5. Bleeding risk

**Encoded factors:** anticoagulant, NSAID, low hemoglobin, low platelets, liver disease, older age.

| Factor | Clinical rationale | Source |
|--------|--------------------|--------|
| Anticoagulant, age, NSAID / antiplatelet, liver disease | Core HAS-BLED domains for bleeding on anticoagulation | Pisters R et al. *Chest*. 2010 (HAS-BLED) |
| Low Hgb / platelets | Lab proxies for anemia / thrombocytopenia and bleeding vulnerability | Clinical practice / HAS-BLED adjacent labs |
| Anticoagulant + NSAID | Well-known synergistic GI / bleeding risk | Antithrombotic therapy guidance; HAS-BLED “drugs” domain |

**Guideline-tied demo actions:** avoid NSAID+anticoagulant stack; confirm intensity; consider PPI gastroprotection when dual risk present.

---

## 6. Hypoglycemia

**Encoded factors:** insulin, diabetes, low/borderline glucose, CKD, antidiabetic class, older age.

| Factor | Clinical rationale | Source |
|--------|--------------------|--------|
| Insulin / antidiabetic agents | Primary iatrogenic drivers of hypoglycemia | ADA Standards of Care in Diabetes |
| CKD | Reduced clearance of many hypoglycemic agents → prolonged effect | ADA / nephrology dosing guidance |
| Older age | Higher hypo risk; caution with intensive regimens | ADA older-adults section; AGS Beers Criteria (hypoglycemia risk with certain agents) |

**Guideline-tied demo actions:** review insulin/oral intensity; reduce renally cleared agents in CKD; recheck glucose (ADA safety framing).

---

## How this relates to the UI

- **Risk scores** come from the trained neural net (learned from these synthetic labels).
- **Model drivers** come from Captum Integrated Gradients on that network (per prediction).
- **Clinical factor lists** in the API (`explain.py`) mirror guideline themes for readability.
- **Suggested actions** are demo CDS-style text tagged to guideline families (KDIGO, HAS-BLED, ADA, Beers, ACG/Tisdale themes), not individualized orders.

## Limitations (read before pitching)

1. Synthetic labels ≠ real ADE incidence or calibration in a hospital.
2. Coefficients are illustrative, not meta-analytic pooled ORs.
3. Medication detail uses a curated inpatient drug list with interaction rules,
   not a full RxNorm / drug-drug interaction checker.
4. Model drivers in the UI use Captum Integrated Gradients on the trained network;
   clinical factor lists remain guideline checklists and may not always match attributions.
