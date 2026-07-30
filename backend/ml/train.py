"""Training loop: AdamW + BCEWithLogitsLoss + early stopping on val loss."""

from __future__ import annotations

import json
from pathlib import Path

import torch
from torch import nn
from torch.optim import AdamW
from tqdm import tqdm

from ml.dataset import make_loader
from ml.generate_data import FEATURE_COLS
from ml.model import ADEPredictor, INPUT_DIM, OUTPUT_DIM
from ml.preprocess import fit_scaler, load_split, save_scaler

ROOT = Path(__file__).resolve().parents[1]
PROCESSED = ROOT / "data" / "processed"
ARTIFACTS = ROOT / "artifacts"

MAX_EPOCHS = 100
PATIENCE = 10
BATCH_SIZE = 64
LR = 1e-3
WEIGHT_DECAY = 1e-4  # L2 via AdamW
SEED = 42


def set_seed(seed: int = SEED) -> None:
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def batch_accuracy(logits: torch.Tensor, y: torch.Tensor) -> tuple[float, int]:
    # Element-wise multi-label accuracy @ 0.5 (not exact-match across all 6 labels).
    preds = (torch.sigmoid(logits) >= 0.5).float()
    correct = (preds == y).sum().item()
    total = y.numel()
    return correct, total


@torch.no_grad()
def evaluate(
    model: nn.Module, loader, criterion, device: torch.device
) -> tuple[float, float]:
    model.eval()
    total_loss = 0.0
    n = 0
    correct = 0.0
    total_elements = 0
    for x, y in tqdm(loader, desc="val", leave=False, ncols=100):
        x, y = x.to(device), y.to(device)
        logits = model(x)
        loss = criterion(logits, y)
        total_loss += loss.item() * x.size(0)
        n += x.size(0)
        c, t = batch_accuracy(logits, y)
        correct += c
        total_elements += t
    avg_loss = total_loss / max(n, 1)
    avg_acc = correct / max(total_elements, 1)
    return avg_loss, avg_acc


def train_one_epoch(model, loader, criterion, optimizer, device) -> tuple[float, float]:
    model.train()
    total_loss = 0.0
    n = 0
    correct = 0.0
    total_elements = 0
    for x, y in tqdm(loader, desc="train", leave=False, ncols=100):
        x, y = x.to(device), y.to(device)
        optimizer.zero_grad(set_to_none=True)
        logits = model(x)
        loss = criterion(logits, y)
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * x.size(0)
        n += x.size(0)
        with torch.no_grad():
            c, t = batch_accuracy(logits, y)
            correct += c
            total_elements += t
    avg_loss = total_loss / max(n, 1)
    avg_acc = correct / max(total_elements, 1)
    return avg_loss, avg_acc


def main() -> None:
    set_seed()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    ARTIFACTS.mkdir(parents=True, exist_ok=True)

    train_csv = PROCESSED / "train.csv"
    val_csv = PROCESSED / "val.csv"
    if not train_csv.exists() or not val_csv.exists():
        raise FileNotFoundError(
            f"Missing splits under {PROCESSED}. Run: python -m ml.generate_data"
        )

    x_train, _ = load_split(train_csv)
    scaler = fit_scaler(x_train)
    save_scaler(scaler, ARTIFACTS / "scaler.joblib")

    train_loader = make_loader(train_csv, scaler, batch_size=BATCH_SIZE, shuffle=True)
    val_loader = make_loader(val_csv, scaler, batch_size=BATCH_SIZE, shuffle=False)

    model = ADEPredictor().to(device)
    criterion = nn.BCEWithLogitsLoss()
    optimizer = AdamW(model.parameters(), lr=LR, weight_decay=WEIGHT_DECAY)

    best_val = float("inf")
    best_epoch = 0
    best_state = None
    epochs_without_improve = 0
    history: list[dict] = []

    if device.type == "cuda":
        gpu_name = torch.cuda.get_device_name(0)
        print(f"Device: {device} ({gpu_name})")
    else:
        print(f"Device: {device}  [WARNING: CUDA not available, training on CPU]")
    print(
        f"Training up to {MAX_EPOCHS} epochs | "
        f"AdamW lr={LR} weight_decay={WEIGHT_DECAY} | early stop patience={PATIENCE}"
    )

    print("Accuracy = element-wise multi-label match at sigmoid >= 0.5")
    epoch_bar = tqdm(range(1, MAX_EPOCHS + 1), desc="epochs", ncols=100)
    for epoch in epoch_bar:
        train_loss, train_acc = train_one_epoch(
            model, train_loader, criterion, optimizer, device
        )
        val_loss, val_acc = evaluate(model, val_loader, criterion, device)
        history.append(
            {
                "epoch": epoch,
                "train_loss": train_loss,
                "val_loss": val_loss,
                "train_acc": train_acc,
                "val_acc": val_acc,
            }
        )
        tqdm.write(
            f"Epoch {epoch:3d}/{MAX_EPOCHS}  "
            f"train_loss={train_loss:.4f}  train_acc={train_acc * 100:5.1f}%  "
            f"val_loss={val_loss:.4f}  val_acc={val_acc * 100:5.1f}%"
        )

        if val_loss < best_val - 1e-6:
            best_val = val_loss
            best_epoch = epoch
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
            epochs_without_improve = 0
        else:
            epochs_without_improve += 1
            if epochs_without_improve >= PATIENCE:
                tqdm.write(f"Early stopping at epoch {epoch} (best epoch {best_epoch})")
                break

        epoch_bar.set_postfix(
            tr_loss=f"{train_loss:.4f}",
            tr_acc=f"{train_acc * 100:.1f}%",
            va_loss=f"{val_loss:.4f}",
            va_acc=f"{val_acc * 100:.1f}%",
        )

    if best_state is None:
        raise RuntimeError("Training produced no checkpoint")

    model.load_state_dict(best_state)
    ckpt_path = ARTIFACTS / "model.pt"
    torch.save(
        {
            "model_state_dict": best_state,
            "best_epoch": best_epoch,
            "best_val_loss": best_val,
            "input_dim": INPUT_DIM,
            "output_dim": OUTPUT_DIM,
            "n_features": len(FEATURE_COLS),
            "weight_decay": WEIGHT_DECAY,
            "patience": PATIENCE,
        },
        ckpt_path,
    )

    metrics = {
        "best_epoch": best_epoch,
        "best_val_loss": best_val,
        "epochs_ran": history[-1]["epoch"],
        "history": history,
    }
    with open(ARTIFACTS / "train_metrics.json", "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print(f"Saved best model (epoch {best_epoch}, val_loss={best_val:.4f}) -> {ckpt_path}")
    print(f"Saved scaler -> {ARTIFACTS / 'scaler.joblib'}")


if __name__ == "__main__":
    main()
