# Demo script (~3 minutes)

A walkthrough for judges or a recorded video. Times are approximate; the goal
is to hit problem, prediction, explanation, and what-if without rushing any
one of them.

## 0:00–0:30: The problem

"Hospitals hand out 380,000 to 450,000 preventable adverse drug events every
year, and the alerting systems built to catch them get overridden so often
that they mostly just add noise. Clinisight is a different approach: instead
of a popup that says two drugs interact, it gives a specific risk score for
this patient, explains what's driving it, and lets you test a fix before you
sign the order."

## 0:30–1:00: Load a persona and predict

Open the app, click **Margaret Chen** (72F, CKD, lisinopril, ibuprofen just
added for pain). Point out the fields filling in, then hit **Predict**.

"Margaret is on an ACE inhibitor for her kidneys, and someone just ordered
ibuprofen for back pain. That's a known bad combination for the kidneys."

The risk report loads. Call out the AKI and hyperkalemia cards near the top,
both elevated.

## 1:00–1:45: Explain the prediction

Open the AKI card. Point at the two explanation blocks:

- **Model drivers**: real attributions from the trained network for this
  patient, not a canned list. Note that creatinine/eGFR and the NSAID flag
  should show up near the top.
- **Clinical factors**: the guideline checklist (KDIGO here) backing the same
  risk, kept visually separate from the model drivers because they come from
  two different systems and won't always agree.

Scroll to **Suggested next actions** and read the KDIGO-tagged recommendation
out loud.

## 1:45–2:30: What-if

Scroll to the what-if panel. Uncheck ibuprofen, check acetaminophen.

"Same patient, same everything else, just swap the pain medication."

Point at the AKI and hyperkalemia percentages dropping live, and the
suggested action for AKI disappearing once it's below the action threshold.
This is the core differentiator: a live simulation, not a static rule firing.

## 2:30–2:50: Model card

Scroll to the About / Model Card section. Point at the metrics table (AUROC,
AUPRC, Brier, ECE per outcome) and the one-line disclaimer that this is a
synthetic, literature-derived model, not a clinically validated one.

"None of this is real patient data; it's grounded in the guidelines linked in
the clinical basis doc, not just made up. Honest metrics, honest
limitations."

## 2:50–3:00: Close

"Enter labs and meds, get a risk score with a real reason behind it, and test
a safer regimen before the order goes in. That's Clinisight."

## If you have extra time

- Load **James Okonkwo** (heart failure, warfarin, new azithromycin +
  ondansetron) to show QT and bleeding risk stacking, and remove one QT-risk
  drug in what-if.
- Show the interaction alert banner (e.g. ACE inhibitor + spironolactone)
  firing directly from the curated drug list, separate from the model
  prediction.
- Open the clinician handoff export to show the printable/copyable summary.
