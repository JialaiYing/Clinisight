"""PatientInput schema validation."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.schemas.patient import PatientInput, Sex
from tests.conftest import sample_patient


def test_valid_patient_parses() -> None:
    patient = PatientInput(**sample_patient())
    assert patient.age == 68
    assert patient.sex == Sex.female
    assert "ibuprofen" in patient.medications
    assert "lisinopril" in patient.medications


def test_age_out_of_range_rejected() -> None:
    with pytest.raises(ValidationError):
        PatientInput(**sample_patient(age=17))
    with pytest.raises(ValidationError):
        PatientInput(**sample_patient(age=121))


def test_creatinine_bounds() -> None:
    with pytest.raises(ValidationError):
        PatientInput(**sample_patient(creatinine=0.05))
    with pytest.raises(ValidationError):
        PatientInput(**sample_patient(creatinine=25.0))


def test_invalid_sex_rejected() -> None:
    with pytest.raises(ValidationError):
        PatientInput(**sample_patient(sex="other"))


def test_invalid_medication_rejected() -> None:
    with pytest.raises(ValidationError):
        PatientInput(**sample_patient(medications=["not_a_real_drug"]))


def test_medications_deduped() -> None:
    patient = PatientInput(**sample_patient(medications=["lisinopril", "lisinopril", "ibuprofen"]))
    assert patient.medications == ["lisinopril", "ibuprofen"]
