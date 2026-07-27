"""
ADE multi-label MLP.

Outputs raw logits (no sigmoid) so we can train with BCEWithLogitsLoss.
"""

from __future__ import annotations

import torch
from torch import nn

INPUT_DIM = 32
OUTPUT_DIM = 6
HIDDEN_1 = 64
HIDDEN_2 = 32
DEFAULT_DROPOUT = 0.2


class ADEPredictor(nn.Module):
    def __init__(
        self,
        input_dim: int = INPUT_DIM,
        output_dim: int = OUTPUT_DIM,
        dropout: float = DEFAULT_DROPOUT,
    ) -> None:
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, HIDDEN_1),
            nn.BatchNorm1d(HIDDEN_1),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(HIDDEN_1, HIDDEN_2),
            nn.BatchNorm1d(HIDDEN_2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(HIDDEN_2, output_dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.network(x)


if __name__ == "__main__":
    model = ADEPredictor()
    x = torch.randn(8, INPUT_DIM)
    y = model(x)
    assert y.shape == (8, OUTPUT_DIM), f"Expected (8, {OUTPUT_DIM}), got {tuple(y.shape)}"
    print(f"ADEPredictor OK — input {tuple(x.shape)} → logits {tuple(y.shape)}")
