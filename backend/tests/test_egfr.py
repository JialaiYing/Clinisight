"""Unit tests for CKD-EPI 2021 eGFR helper."""

from __future__ import annotations

import numpy as np
import pytest

from ml.generate_data import ckd_epi_2021_egfr


def test_egfr_higher_when_creatinine_lower() -> None:
    age = np.array([65.0, 65.0])
    sex = np.array([1.0, 1.0])  # male
    creat = np.array([0.9, 1.8])
    egfr = ckd_epi_2021_egfr(creat, age, sex)
    assert egfr[0] > egfr[1]


def test_egfr_female_adjustment_vs_male_same_labs() -> None:
    # Same age/creatinine: sex-specific kappa/alpha/multiplier change the result.
    age = np.array([60.0, 60.0])
    creat = np.array([1.0, 1.0])
    female = ckd_epi_2021_egfr(creat[:1], age[:1], np.array([0.0]))[0]
    male = ckd_epi_2021_egfr(creat[1:], age[1:], np.array([1.0]))[0]
    assert female != pytest.approx(male)


def test_egfr_known_range_typical_adult() -> None:
    # Rough sanity: middle-aged male with normal Cr ~0.9 should be in 80–110 range.
    egfr = float(
        ckd_epi_2021_egfr(np.array([0.9]), np.array([50.0]), np.array([1.0]))[0]
    )
    assert 80.0 <= egfr <= 110.0


def test_egfr_declines_with_age() -> None:
    creat = np.array([1.0, 1.0])
    sex = np.array([0.0, 0.0])
    young = ckd_epi_2021_egfr(creat[:1], np.array([30.0]), sex[:1])[0]
    older = ckd_epi_2021_egfr(creat[1:], np.array([80.0]), sex[1:])[0]
    assert young > older
