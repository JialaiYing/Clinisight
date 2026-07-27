"""Dataset / DataLoader wrappers around processed CSVs."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import torch
from sklearn.preprocessing import StandardScaler
from torch.utils.data import DataLoader, Dataset

from ml.preprocess import load_split, transform


class PatientDataset(Dataset):
    def __init__(self, features: np.ndarray, labels: np.ndarray) -> None:
        self.features = torch.from_numpy(np.asarray(features, dtype=np.float32))
        self.labels = torch.from_numpy(np.asarray(labels, dtype=np.float32))

    def __len__(self) -> int:
        return self.features.shape[0]

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, torch.Tensor]:
        return self.features[idx], self.labels[idx]


def make_loader(
    csv_path: Path | str,
    scaler: StandardScaler,
    batch_size: int = 64,
    shuffle: bool = False,
) -> DataLoader:
    x, y = load_split(csv_path)
    x = transform(scaler, x)
    dataset = PatientDataset(x, y)
    return DataLoader(dataset, batch_size=batch_size, shuffle=shuffle)
