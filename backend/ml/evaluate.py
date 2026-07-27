"""Test-set metrics (per-label AUROC/AUPRC). Prefer these over accuracy for rare ADEs."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import torch
from sklearn.metrics import average_precision_score, roc_auc_score
from torch import nn

from ml.dataset import make_loader
from ml.generate_data import OUTCOME_COLS
from ml.model import ADEPredictor
from ml.preprocess import load_scaler

ROOT = Path(__file__).resolve().parents[1]
PROCESSED = ROOT / "data" / "processed"
ARTIFACTS = ROOT / "artifacts"


@torch.no_grad()
def collect_predictions(
    model: nn.Module, loader, device: torch.device
) -> tuple[np.ndarray, np.ndarray]:
    model.eval()
    probs_list: list[np.ndarray] = []
    labels_list: list[np.ndarray] = []
    for x, y in loader:
        x = x.to(device)
        logits = model(x)
        probs = torch.sigmoid(logits).cpu().numpy()
        probs_list.append(probs)
        labels_list.append(y.numpy())
    return np.vstack(probs_list), np.vstack(labels_list)


def per_label_metrics(y_true: np.ndarray, y_prob: np.ndarray) -> dict:
    metrics: dict = {"labels": {}}
    aurocs = []
    auprcs = []
    for i, name in enumerate(OUTCOME_COLS):
        yt = y_true[:, i]
        yp = y_prob[:, i]
        # roc_auc_score blows up if a split has only one class
        if yt.min() == yt.max():
            auroc = float("nan")
            auprc = float("nan")
        else:
            auroc = float(roc_auc_score(yt, yp))
            auprc = float(average_precision_score(yt, yp))
        prevalence = float(yt.mean())
        acc = float(((yp >= 0.5).astype(np.float64) == yt).mean())
        metrics["labels"][name] = {
            "auroc": auroc,
            "auprc": auprc,
            "accuracy@0.5": acc,
            "prevalence": prevalence,
        }
        if not np.isnan(auroc):
            aurocs.append(auroc)
        if not np.isnan(auprc):
            auprcs.append(auprc)

    metrics["macro_auroc"] = float(np.mean(aurocs)) if aurocs else float("nan")
    metrics["macro_auprc"] = float(np.mean(auprcs)) if auprcs else float("nan")
    metrics["element_accuracy@0.5"] = float(
        ((y_prob >= 0.5).astype(np.float64) == y_true).mean()
    )
    return metrics


def main() -> None:
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    ckpt_path = ARTIFACTS / "model.pt"
    scaler_path = ARTIFACTS / "scaler.joblib"
    test_csv = PROCESSED / "test.csv"

    if not ckpt_path.exists():
        raise FileNotFoundError(f"Missing {ckpt_path}. Run: python -m ml.train")
    if not scaler_path.exists():
        raise FileNotFoundError(f"Missing {scaler_path}. Run: python -m ml.train")
    if not test_csv.exists():
        raise FileNotFoundError(f"Missing {test_csv}. Run: python -m ml.generate_data")

    scaler = load_scaler(scaler_path)
    test_loader = make_loader(test_csv, scaler, batch_size=256, shuffle=False)

    ckpt = torch.load(ckpt_path, map_location=device, weights_only=False)
    model = ADEPredictor().to(device)
    model.load_state_dict(ckpt["model_state_dict"])

    y_prob, y_true = collect_predictions(model, test_loader, device)
    metrics = per_label_metrics(y_true, y_prob)
    metrics["best_epoch"] = ckpt.get("best_epoch")
    metrics["best_val_loss"] = ckpt.get("best_val_loss")

    out_path = ARTIFACTS / "metrics.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print(f"Device: {device}")
    print(f"Test set element accuracy@0.5: {metrics['element_accuracy@0.5'] * 100:.1f}%")
    print(f"Macro AUROC: {metrics['macro_auroc']:.3f}")
    print(f"Macro AUPRC: {metrics['macro_auprc']:.3f}")
    print()
    print(f"{'label':16s}  {'AUROC':>7s}  {'AUPRC':>7s}  {'acc@0.5':>7s}  {'prev':>6s}")
    for name, m in metrics["labels"].items():
        print(
            f"{name:16s}  {m['auroc']:7.3f}  {m['auprc']:7.3f}  "
            f"{m['accuracy@0.5'] * 100:6.1f}%  {m['prevalence'] * 100:5.1f}%"
        )
    print(f"\nWrote {out_path}")


if __name__ == "__main__":
    main()
