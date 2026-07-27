"use client";

import { motion } from "framer-motion";
import { RiskCard } from "@/components/results/RiskCard";
import { OUTCOME_LABELS, OUTCOME_ORDER } from "@/lib/risk";
import type { PredictionResponse } from "@/lib/types";

export function ResultsGrid({ result }: { result: PredictionResponse }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {OUTCOME_ORDER.map((key, index) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: index * 0.04 }}
          className="h-full"
        >
          <RiskCard
            label={OUTCOME_LABELS[key] ?? key}
            probability={result.risks[key] ?? 0}
            factors={result.explanations[key] ?? []}
          />
        </motion.div>
      ))}
    </div>
  );
}
