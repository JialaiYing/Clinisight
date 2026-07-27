"""
Synthetic ADE dataset for Clinisight.

~10k patients with medically plausible features. eGFR is derived from
creatinine/age/sex (CKD-EPI 2021) so labs stay physiologically coherent.
Labels are noisy Bernoulli draws from clinical risk logits — not hard rules.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

N_PATIENTS = 10_000
RANDOM_SEED = 42

OUTCOME_COLS = [
    "aki",
    "hyperkalemia",
    "qt_prolongation",
    "liver_toxicity",
    "bleeding_risk",
    "hypoglycemia",
]

MED_CLASSES = [
    "none",
    "antihypertensive",
    "antidiabetic",
    "antibiotic",
    "analgesic",
]

# Order must match training / inference feature vectors.
FEATURE_COLS = [
    "age",
    "sex",  # 0 = female, 1 = male
    "bmi",
    "heart_rate",
    "sbp",
    "dbp",
    "temperature",
    "creatinine",
    "egfr",
    "potassium",
    "sodium",
    "ast",
    "alt",
    "hemoglobin",
    "wbc",
    "platelets",
    "glucose",
    "diabetes",
    "hypertension",
    "ckd",
    "liver_disease",
    "heart_failure",
    "num_concurrent_meds",
    "on_nsaid",
    "on_ace_inhibitor",
    "on_anticoagulant",
    "on_insulin",
    *[f"med_class_{c}" for c in MED_CLASSES],
]


def ckd_epi_2021_egfr(creatinine: np.ndarray, age: np.ndarray, sex: np.ndarray) -> np.ndarray:
    """CKD-EPI 2021 creatinine eGFR (mL/min/1.73m^2). sex: 0=F, 1=M; creat in mg/dL."""
    kappa = np.where(sex == 0, 0.7, 0.9)
    alpha = np.where(sex == 0, -0.241, -0.302)
    scr_over_k = creatinine / kappa
    egfr = (
        142.0
        * np.minimum(scr_over_k, 1.0) ** alpha
        * np.maximum(scr_over_k, 1.0) ** (-1.200)
        * (0.9938 ** age)
        * np.where(sex == 0, 1.012, 1.0)
    )
    return egfr.astype(np.float64)


def sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-np.clip(x, -50, 50)))


def sample_patients(n: int, rng: np.random.Generator) -> pd.DataFrame:
    age = rng.integers(18, 91, size=n).astype(np.float64)
    sex = rng.integers(0, 2, size=n).astype(np.float64)  # 0F / 1M
    bmi = rng.normal(28.0, 6.0, size=n).clip(16.0, 55.0)

    # Age-linked comorbidity rates (logistic).
    age_z = (age - 50.0) / 15.0
    diabetes = rng.random(n) < sigmoid(-1.2 + 0.55 * age_z)
    hypertension = rng.random(n) < sigmoid(-0.4 + 0.7 * age_z)
    ckd = rng.random(n) < sigmoid(-2.0 + 0.8 * age_z + 0.9 * diabetes)
    liver_disease = rng.random(n) < sigmoid(-2.8 + 0.25 * age_z)
    heart_failure = rng.random(n) < sigmoid(
        -2.5 + 0.6 * age_z + 0.5 * hypertension + 0.4 * diabetes
    )

    # Sample creatinine, then derive eGFR — don't sample both independently.
    creat_mu = 0.9 + 0.35 * ckd + 0.15 * (age > 70) + 0.1 * sex
    creatinine = rng.lognormal(mean=np.log(np.maximum(creat_mu, 0.5)), sigma=0.25, size=n)
    creatinine = creatinine.clip(0.4, 8.0)
    egfr = ckd_epi_2021_egfr(creatinine, age, sex).clip(5.0, 140.0)

    # Force CKD=1 when eGFR < 60 so the flag matches the lab.
    ckd = np.where(egfr < 60.0, np.maximum(ckd.astype(np.float64), 1.0), ckd.astype(np.float64))

    potassium = rng.normal(4.2 + 0.25 * ckd, 0.45, size=n).clip(2.5, 6.8)
    sodium = rng.normal(139.0, 3.0, size=n).clip(125.0, 155.0)
    ast = rng.lognormal(mean=np.log(25 + 40 * liver_disease), sigma=0.45, size=n).clip(8, 500)
    alt = rng.lognormal(mean=np.log(22 + 45 * liver_disease), sigma=0.45, size=n).clip(7, 500)
    # Sex-specific Hgb baselines; CKD/HF pull them down.
    hemoglobin = rng.normal(
        13.5 - 1.5 * (1.0 - sex) - 0.6 * ckd - 0.3 * heart_failure,
        1.2,
        size=n,
    ).clip(7.0, 18.5)

    wbc = rng.lognormal(mean=np.log(7.0), sigma=0.3, size=n).clip(2.0, 25.0)
    platelets = rng.normal(240.0 - 40.0 * liver_disease, 55.0, size=n).clip(40.0, 550.0)
    glucose = rng.normal(100.0 + 45.0 * diabetes, 25.0 + 20.0 * diabetes, size=n).clip(55.0, 400.0)

    heart_rate = rng.normal(78.0 + 5.0 * heart_failure, 12.0, size=n).clip(45.0, 140.0)
    sbp = rng.normal(128.0 + 18.0 * hypertension - 8.0 * heart_failure, 16.0, size=n).clip(85.0, 210.0)
    dbp = rng.normal(78.0 + 8.0 * hypertension, 10.0, size=n).clip(45.0, 120.0)
    dbp = np.minimum(dbp, sbp - 15.0)  # keep pulse pressure sane
    temperature = rng.normal(98.4, 0.5, size=n).clip(96.5, 103.0)

    # Meds biased toward matching diagnoses.
    on_insulin = ((diabetes == 1) & (rng.random(n) < 0.35)).astype(np.float64)
    on_ace_inhibitor = (
        ((hypertension == 1) | (ckd == 1) | (heart_failure == 1)) & (rng.random(n) < 0.55)
    ).astype(np.float64)
    on_anticoagulant = (
        ((heart_failure == 1) | (age > 70)) & (rng.random(n) < 0.25)
    ).astype(np.float64)
    on_nsaid = (rng.random(n) < 0.22).astype(np.float64)

    med_class = np.full(n, "none", dtype=object)
    for i in range(n):
        r = rng.random()
        if on_insulin[i] or (diabetes[i] and r < 0.5):
            med_class[i] = "antidiabetic"
        elif on_ace_inhibitor[i] or (hypertension[i] and r < 0.55):
            med_class[i] = "antihypertensive"
        elif on_nsaid[i] and r < 0.6:
            med_class[i] = "analgesic"
        elif r < 0.12:
            med_class[i] = "antibiotic"
        elif r < 0.35:
            med_class[i] = rng.choice(["none", "analgesic", "antibiotic"])
        else:
            med_class[i] = "none"

    num_concurrent_meds = (
        rng.poisson(2.0 + 1.5 * (age > 65) + diabetes + hypertension + ckd + heart_failure, size=n)
        + on_nsaid
        + on_ace_inhibitor
        + on_anticoagulant
        + on_insulin
    ).clip(0, 18)

    data: dict[str, np.ndarray] = {
        "age": age,
        "sex": sex,
        "bmi": bmi,
        "heart_rate": heart_rate,
        "sbp": sbp,
        "dbp": dbp,
        "temperature": temperature,
        "creatinine": creatinine,
        "egfr": egfr,
        "potassium": potassium,
        "sodium": sodium,
        "ast": ast,
        "alt": alt,
        "hemoglobin": hemoglobin,
        "wbc": wbc,
        "platelets": platelets,
        "glucose": glucose,
        "diabetes": diabetes.astype(np.float64),
        "hypertension": hypertension.astype(np.float64),
        "ckd": ckd.astype(np.float64),
        "liver_disease": liver_disease.astype(np.float64),
        "heart_failure": heart_failure.astype(np.float64),
        "num_concurrent_meds": num_concurrent_meds.astype(np.float64),
        "on_nsaid": on_nsaid,
        "on_ace_inhibitor": on_ace_inhibitor,
        "on_anticoagulant": on_anticoagulant,
        "on_insulin": on_insulin,
    }

    for cls in MED_CLASSES:
        data[f"med_class_{cls}"] = (med_class == cls).astype(np.float64)

    # Readable label for raw CSV inspection only — not fed to the model.
    data["medication_class"] = med_class

    return pd.DataFrame(data)


def generate_labels(df: pd.DataFrame, rng: np.random.Generator) -> pd.DataFrame:
    """Logistic clinical risk + noise → Bernoulli labels (avoids deterministic memorization)."""
    age = df["age"].to_numpy()
    egfr = df["egfr"].to_numpy()
    potassium = df["potassium"].to_numpy()
    ast = df["ast"].to_numpy()
    alt = df["alt"].to_numpy()
    hemoglobin = df["hemoglobin"].to_numpy()
    platelets = df["platelets"].to_numpy()
    glucose = df["glucose"].to_numpy()
    sbp = df["sbp"].to_numpy()

    age_old = (age - 65.0) / 10.0
    low_egfr = (60.0 - egfr) / 25.0
    high_k = (potassium - 4.5) / 0.5
    high_lfts = ((ast - 40.0) / 40.0 + (alt - 40.0) / 40.0) / 2.0
    low_hgb = (12.0 - hemoglobin) / 2.0
    low_plt = (150.0 - platelets) / 50.0
    high_glu = (glucose - 140.0) / 60.0

    noise = lambda scale=1.0: rng.normal(0.0, scale, size=len(df))

    logit_aki = (
        -2.2
        + 1.1 * np.maximum(low_egfr, 0)
        + 0.9 * df["on_nsaid"].to_numpy()
        + 0.55 * np.maximum(age_old, 0)
        + 0.45 * df["on_ace_inhibitor"].to_numpy()
        + 0.7 * df["ckd"].to_numpy()
        + 0.35 * df["heart_failure"].to_numpy()
        + 0.25 * ((sbp < 100).astype(np.float64))
        + noise(0.65)
    )

    logit_hk = (
        -2.4
        + 1.0 * df["ckd"].to_numpy()
        + 0.95 * df["on_ace_inhibitor"].to_numpy()
        + 1.1 * np.maximum(high_k, 0)
        + 0.4 * np.maximum(age_old, 0)
        + 0.35 * df["diabetes"].to_numpy()
        + noise(0.6)
    )

    logit_qt = (
        -3.0
        + 0.7 * np.maximum(age_old, 0)
        + 0.8 * df["heart_failure"].to_numpy()
        + 0.45 * ((df["num_concurrent_meds"].to_numpy() >= 6).astype(np.float64))
        + 0.35 * ((df["sodium"].to_numpy() < 135).astype(np.float64))
        + 0.3 * df["on_anticoagulant"].to_numpy()  # stand-in for cardiac comorbidity load
        + noise(0.7)
    )

    logit_liv = (
        -2.6
        + 1.2 * df["liver_disease"].to_numpy()
        + 1.0 * np.maximum(high_lfts, 0)
        + 0.55 * df["med_class_antibiotic"].to_numpy()
        + 0.35 * np.maximum(age_old, 0)
        + 0.25 * ((df["bmi"].to_numpy() > 35).astype(np.float64))
        + noise(0.65)
    )

    logit_bleed = (
        -2.5
        + 1.3 * df["on_anticoagulant"].to_numpy()
        + 0.7 * df["on_nsaid"].to_numpy()
        + 0.8 * np.maximum(low_hgb, 0)
        + 0.7 * np.maximum(low_plt, 0)
        + 0.55 * df["liver_disease"].to_numpy()
        + 0.45 * np.maximum(age_old, 0)
        + noise(0.6)
    )

    logit_hypo = (
        -2.7
        + 1.4 * df["on_insulin"].to_numpy()
        + 0.7 * df["diabetes"].to_numpy()
        + 0.9 * np.maximum(-high_glu, 0)  # lower glucose → higher hypo risk
        + 0.45 * df["ckd"].to_numpy()
        + 0.35 * np.maximum(age_old, 0)
        + 0.4 * df["med_class_antidiabetic"].to_numpy()
        + noise(0.65)
    )

    labels = pd.DataFrame(
        {
            "aki": (rng.random(len(df)) < sigmoid(logit_aki)).astype(np.float64),
            "hyperkalemia": (rng.random(len(df)) < sigmoid(logit_hk)).astype(np.float64),
            "qt_prolongation": (rng.random(len(df)) < sigmoid(logit_qt)).astype(np.float64),
            "liver_toxicity": (rng.random(len(df)) < sigmoid(logit_liv)).astype(np.float64),
            "bleeding_risk": (rng.random(len(df)) < sigmoid(logit_bleed)).astype(np.float64),
            "hypoglycemia": (rng.random(len(df)) < sigmoid(logit_hypo)).astype(np.float64),
        }
    )
    return labels


def split_dataframe(
    df: pd.DataFrame,
    rng: np.random.Generator,
    train_frac: float = 0.7,
    val_frac: float = 0.15,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    idx = rng.permutation(len(df))
    n_train = int(len(df) * train_frac)
    n_val = int(len(df) * val_frac)
    train_idx = idx[:n_train]
    val_idx = idx[n_train : n_train + n_val]
    test_idx = idx[n_train + n_val :]
    return (
        df.iloc[train_idx].reset_index(drop=True),
        df.iloc[val_idx].reset_index(drop=True),
        df.iloc[test_idx].reset_index(drop=True),
    )


def main() -> None:
    rng = np.random.default_rng(RANDOM_SEED)

    root = Path(__file__).resolve().parents[1]  # backend/
    raw_dir = root / "data" / "raw"
    processed_dir = root / "data" / "processed"
    raw_dir.mkdir(parents=True, exist_ok=True)
    processed_dir.mkdir(parents=True, exist_ok=True)

    print(f"Generating {N_PATIENTS:,} synthetic patients (seed={RANDOM_SEED})...")
    features = sample_patients(N_PATIENTS, rng)
    labels = generate_labels(features, rng)

    full = pd.concat([features, labels], axis=1)
    full.insert(0, "patient_id", np.arange(1, N_PATIENTS + 1))

    raw_path = raw_dir / "patients.csv"
    full.to_csv(raw_path, index=False)
    print(f"Wrote full dataset → {raw_path}")

    # Drops patient_id + string medication_class; keeps numeric FEATURE_COLS + labels.
    model_cols = FEATURE_COLS + OUTCOME_COLS
    model_df = full[model_cols].copy()

    train_df, val_df, test_df = split_dataframe(model_df, rng)
    train_df.to_csv(processed_dir / "train.csv", index=False)
    val_df.to_csv(processed_dir / "val.csv", index=False)
    test_df.to_csv(processed_dir / "test.csv", index=False)

    print(f"Wrote splits → {processed_dir}")
    print(f"  train: {len(train_df):,} | val: {len(val_df):,} | test: {len(test_df):,}")
    print()
    print(f"NN input features (FEATURE_COLS): {len(FEATURE_COLS)}")
    for i, col in enumerate(FEATURE_COLS, start=1):
        print(f"  {i:2d}. {col}")
    print()
    print("Label prevalence:")
    for col in OUTCOME_COLS:
        prev = full[col].mean() * 100
        print(f"  {col:16s} {prev:5.1f}%")


if __name__ == "__main__":
    main()
