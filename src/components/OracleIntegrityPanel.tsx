"use client";

import React from "react";

interface OracleIntegrityPanelProps {
  oracleFreshnessSeconds?: number;
  feedAgreementPct?: number;
  validatorTrustAvg?: number;
}

const OracleIntegrityPanel: React.FC<OracleIntegrityPanelProps> = ({
  oracleFreshnessSeconds = 14,
  feedAgreementPct = 98.7,
  validatorTrustAvg = 8.3,
}) => {
  const freshnessLabel =
    oracleFreshnessSeconds <= 15
      ? "Realtime-grade"
      : oracleFreshnessSeconds <= 60
      ? "Fresh"
      : "Stale";

  const integrityScore = Math.round(
    (feedAgreementPct / 100) * 0.55 + (validatorTrustAvg / 10) * 0.45
  );

  return (
    <div className="qie-card-glass qie-animate-slide-up">
      <div className="qie-card-header">
        <h3 className="qie-card-title">🛰️ Oracle Integrity Snapshot</h3>
        <span className="qie-badge qie-badge-soft">
          Integrity: {integrityScore}/10
        </span>
      </div>

      <p className="qie-text-muted">
        Measures how trustworthy the oracle and validator signals are.
      </p>

      <div className="grid gap-3 qie-mt-md" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <div className="qie-card-glass" style={{ padding: "12px" }}>
          <div className="qie-text-muted">Oracle Freshness</div>
          <div style={{ fontWeight: 700, fontSize: "1rem" }}>
            {oracleFreshnessSeconds}s
          </div>
          <span className="qie-badge" style={{ marginTop: "6px" }}>
            ● {freshnessLabel}
          </span>
        </div>

        <div className="qie-card-glass" style={{ padding: "12px" }}>
          <div className="qie-text-muted">Feed Agreement</div>
          <div style={{ fontWeight: 700, fontSize: "1rem" }}>
            {feedAgreementPct.toFixed(1)}%
          </div>
          <p className="qie-text-muted">Sources aligned within 0.5%</p>
        </div>

        <div className="qie-card-glass" style={{ padding: "12px" }}>
          <div className="qie-text-muted">Validator Trust</div>
          <div style={{ fontWeight: 700, fontSize: "1rem" }}>
            {validatorTrustAvg.toFixed(1)} / 10
          </div>
          <p className="qie-text-muted">From validator analytics</p>
        </div>
      </div>

      {/* Risk bar */}
      <div className="qie-mt-md">
        <p className="qie-text-muted">Data Risk Level</p>
        <div style={{ height: "6px", borderRadius: "999px", background: "#1e2535", overflow: "hidden", marginTop: "4px" }}>
          <div
            style={{
              height: "100%",
              width: `${Math.min(100, Math.max(0, 110 - integrityScore * 10))}%`,
              background:
                "linear-gradient(to right, #4ade80, #facc15, #ef4444)",
              transition: "width 0.4s ease"
            }}
          ></div>
        </div>
      </div>

      <p className="qie-text-muted qie-mt-md">
        🎯 “Every prediction is backed by measurable oracle integrity — freshness, feed alignment and validator trust.”
      </p>
    </div>
  );
};

export default OracleIntegrityPanel;
