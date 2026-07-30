"""Test-set metrics + temperature calibration fitted on validation logits."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import torch
from sklearn.metrics import average_precision_score, roc_auc_score
from torch import nn

from ml.calibration import (
    apply_temperature,
    brier_score,
    expected_calibration_error,
    fit_temperatures,
    save_calibrator,
)
from ml.dataset import make_loader
from ml.generate_data import FEATURE_COLS, OUTCOME_COLS
from ml.model import ADEPredictor, INPUT_DIM
from ml.preprocess import load_scaler

ROOT = Path(__file__).resolve().parents[1]
PROCESSED = ROOT / "data" / "processed"
ARTIFACTS = ROOT / "artifacts"


@torch.no_grad()
def collect_logits(
    model: nn.Module, loader, device: torch.device
) -> tuple[np.ndarray, np.ndarray]:
    model.eval()
    logits_list: list[np.ndarray] = []
    labels_list: list[np.ndarray] = []
    for x, y in loader:
        x = x.to(device)
        logits = model(x)
        logits_list.append(logits.cpu().numpy())
        labels_list.append(y.numpy())
    return np.vstack(logits_list), np.vstack(labels_list)


def per_label_metrics(y_true: np.ndarray, y_prob: np.ndarray) -> dict:
    metrics: dict = {"labels": {}}
    aurocs = []
    auprcs = []
    briers = []
    eces = []
    for i, name in enumerate(OUTCOME_COLS):
        yt = y_true[:, i]
        yp = y_prob[:, i]
        if yt.min() == yt.max():
            auroc = float("nan")
            auprc = float("nan")
        else:
            auroc = float(roc_auc_score(yt, yp))
            auprc = float(average_precision_score(yt, yp))
        prevalence = float(yt.mean())
        acc = float(((yp >= 0.5).astype(np.float64) == yt).mean())
        brier = brier_score(yt, yp)
        ece = expected_calibration_error(yt, yp)
        metrics["labels"][name] = {
            "auroc": auroc,
            "auprc": auprc,
            "accuracy@0.5": acc,
            "prevalence": prevalence,
            "brier": brier,
            "ece": ece,
        }
        if not np.isnan(auroc):
            aurocs.append(auroc)
        if not np.isnan(auprc):
            auprcs.append(auprc)
        briers.append(brier)
        if not np.isnan(ece):
            eces.append(ece)

    metrics["macro_auroc"] = float(np.mean(aurocs)) if aurocs else float("nan")
    metrics["macro_auprc"] = float(np.mean(auprcs)) if auprcs else float("nan")
    metrics["macro_brier"] = float(np.mean(briers)) if briers else float("nan")
    metrics["macro_ece"] = float(np.mean(eces)) if eces else float("nan")
    metrics["element_accuracy@0.5"] = float(
        ((y_prob >= 0.5).astype(np.float64) == y_true).mean()
    )
    return metrics


def main() -> None:
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    ckpt_path = ARTIFACTS / "model.pt"
    scaler_path = ARTIFACTS / "scaler.joblib"
    val_csv = PROCESSED / "val.csv"
    test_csv = PROCESSED / "test.csv"

    if not ckpt_path.exists():
        raise FileNotFoundError(f"Missing {ckpt_path}. Run: python -m ml.train")
    if not scaler_path.exists():
        raise FileNotFoundError(f"Missing {scaler_path}. Run: python -m ml.train")
    if not val_csv.exists() or not test_csv.exists():
        raise FileNotFoundError(
            f"Missing splits under {PROCESSED}. Run: python -m ml.generate_data"
        )

    scaler = load_scaler(scaler_path)
    val_loader = make_loader(val_csv, scaler, batch_size=256, shuffle=False)
    test_loader = make_loader(test_csv, scaler, batch_size=256, shuffle=False)

    ckpt = torch.load(ckpt_path, map_location=device, weights_only=False)
    model = ADEPredictor().to(device)
    model.load_state_dict(ckpt["model_state_dict"])

    val_logits, val_true = collect_logits(model, val_loader, device)
    test_logits, test_true = collect_logits(model, test_loader, device)

    temperatures = fit_temperatures(val_logits, val_true)
    save_calibrator(temperatures, ARTIFACTS / "calibrator.joblib")

    raw_prob = 1.0 / (1.0 + np.exp(-np.clip(test_logits, -50, 50)))
    cal_prob = apply_temperature(test_logits, temperatures)

    metrics = per_label_metrics(test_true, cal_prob)
    metrics_raw = per_label_metrics(test_true, raw_prob)

    metrics["best_epoch"] = ckpt.get("best_epoch")
    metrics["best_val_loss"] = ckpt.get("best_val_loss")
    metrics["calibration"] = {
        "method": "temperature_scaling",
        "fitted_on": "validation",
        "temperatures": {
            name: float(temperatures[i]) for i, name in enumerate(OUTCOME_COLS)
        },
        "macro_brier_before": metrics_raw["macro_brier"],
        "macro_brier_after": metrics["macro_brier"],
        "macro_ece_before": metrics_raw["macro_ece"],
        "macro_ece_after": metrics["macro_ece"],
    }
    metrics["training"] = {
        "architecture": f"MLP {INPUT_DIM}->64->32->6 (BatchNorm, ReLU, Dropout)",
        "loss": "BCEWithLogitsLoss",
        "optimizer": "AdamW",
        "data": "synthetic_literature_derived",
        "n_features": len(FEATURE_COLS),
        "n_outcomes": 6,
        "disclaimer": "Synthetic test metrics only - not clinically validated.",
    }

    # Split sizes for the model card.
    metrics["splits"] = {
        "train": int(sum(1 for _ in open(PROCESSED / "train.csv", encoding="utf-8")) - 1),
        "val": int(val_true.shape[0]),
        "test": int(test_true.shape[0]),
    }

    out_path = ARTIFACTS / "metrics.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print(f"Device: {device}")
    print(
        f"Temperatures: "
        + ", ".join(f"{n}={temperatures[i]:.3f}" for i, n in enumerate(OUTCOME_COLS))
    )
    print(
        f"Macro Brier {metrics_raw['macro_brier']:.4f} -> {metrics['macro_brier']:.4f} "
        f"| Macro ECE {metrics_raw['macro_ece']:.4f} -> {metrics['macro_ece']:.4f}"
    )
    print(f"Test set element accuracy@0.5: {metrics['element_accuracy@0.5'] * 100:.1f}%")
    print(f"Macro AUROC: {metrics['macro_auroc']:.3f}")
    print(f"Macro AUPRC: {metrics['macro_auprc']:.3f}")
    print()
    print(
        f"{'label':16s}  {'AUROC':>7s}  {'AUPRC':>7s}  {'Brier':>7s}  {'ECE':>7s}  {'prev':>6s}"
    )
    for name, m in metrics["labels"].items():
        print(
            f"{name:16s}  {m['auroc']:7.3f}  {m['auprc']:7.3f}  "
            f"{m['brier']:7.4f}  {m['ece']:7.4f}  {m['prevalence'] * 100:5.1f}%"
        )
    print(f"\nWrote calibrator -> {ARTIFACTS / 'calibrator.joblib'}")
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
