"use client";

import React, { useMemo, useState } from "react";

type RiskLevel = "low" | "medium" | "high";

const PortfolioSimulator: React.FC = () => {
  const [amount, setAmount] = useState<number>(1000);
  const [risk, setRisk] = useState<RiskLevel>("medium");
  const [horizonYears, setHorizonYears] = useState<number>(1);

  const metrics = useMemo(() => {
    const baseYield = risk === "low" ? 6 : risk === "medium" ? 12 : 24;
    const vol = risk === "low" ? 8 : risk === "medium" ? 18 : 35;
    const aiEdge = risk === "low" ? 1.5 : risk === "medium" ? 3 : 4.5;

    const expectedRate = (baseYield + aiEdge) / 100;
    const worstRate = (baseYield - vol / 2) / 100;
    const bestRate = (baseYield + vol / 2) / 100;

    return {
      baseYield,
      vol,
      aiEdge,
      expected: amount * Math.pow(1 + expectedRate, horizonYears),
      worst: amount * Math.pow(1 + worstRate, horizonYears),
      best: amount * Math.pow(1 + bestRate, horizonYears),
    };
  }, [amount, risk, horizonYears]);

  return (
    <div className="qie-card-glass qie-animate-slide-up">
      <div className="qie-card-header">
        <h3 className="qie-card-title">📊 QIE Portfolio Simulator</h3>
        <span className="qie-badge qie-badge-soft">Demo Mode</span>
      </div>

      {/* Controls */}
      <div
        className="grid qie-mt-md"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}
      >
        {/* Amount */}
        <div>
          <label className="qie-field-label">Investment Amount (QIE)</label>
          <input
            type="number"
            className="qie-input"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value || 0))}
            min={100}
          />
        </div>

        {/* Horizon */}
        <div>
          <label className="qie-field-label">Time Horizon (Years)</label>
          <input
            type="number"
            className="qie-input"
            value={horizonYears}
            min={1}
            max={5}
            onChange={(e) => setHorizonYears(Number(e.target.value || 0))}
          />
        </div>

        {/* Risk */}
        <div>
          <label className="qie-field-label">Risk Preference</label>
          <div style={{ display: "flex", gap: "8px" }}>
            {(["low", "medium", "high"] as RiskLevel[]).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setRisk(lvl)}
                className={`qie-btn qie-btn-sm ${
                  risk === lvl
                    ? "qie-btn-primary"
                    : "qie-btn-ghost"
                }`}
                style={{ flex: 1 }}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid qie-mt-lg" style={{ gap: "14px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div className="qie-card-glass" style={{ padding: "12px" }}>
          <div className="qie-text-muted">Base DeFi Yield</div>
          <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>
            {metrics.baseYield.toFixed(1)}% APR
          </div>
          <p className="qie-text-muted">Volatility ~ {metrics.vol.toFixed(1)}%</p>
        </div>

        <div className="qie-card-glass" style={{ padding: "12px" }}>
          <div className="qie-text-muted">AI Allocation Edge</div>
          <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>
            +{metrics.aiEdge.toFixed(1)}% APR
          </div>
          <p className="qie-text-muted">
            PredictX optimizes pool weighting dynamically.
          </p>
        </div>

        <div className="qie-card-glass" style={{ padding: "12px" }}>
          <div className="qie-text-muted">Expected Value</div>
          <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>
            {metrics.expected.toFixed(0)} QIE
          </div>
          <p className="qie-text-muted">
            From {amount.toLocaleString()} initial.
          </p>
        </div>
      </div>

      {/* Scenario cards */}
      <div className="qie-card-glass qie-mt-lg" style={{ padding: "14px" }}>
        <p className="qie-text-muted">Scenario Range</p>

        <div
          className="grid"
          style={{ gap: "12px", marginTop: "8px", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
        >
          <div className="qie-card-glass" style={{ padding: "12px" }}>
            <p className="qie-text-muted">Bearish</p>
            <p style={{ fontWeight: 700 }}>{metrics.worst.toFixed(0)} QIE</p>
          </div>

          <div className="qie-card-glass" style={{ padding: "12px" }}>
            <p className="qie-text-muted">Expected</p>
            <p style={{ fontWeight: 700 }}>{metrics.expected.toFixed(0)} QIE</p>
          </div>

          <div className="qie-card-glass" style={{ padding: "12px" }}>
            <p className="qie-text-muted">Bullish</p>
            <p style={{ fontWeight: 700 }}>{metrics.best.toFixed(0)} QIE</p>
          </div>
        </div>
      </div>

      <p className="qie-text-muted qie-mt-md">
        💡 “Today: demo math. Tomorrow: real QIE DeFi + live prediction-weighted portfolios.”
      </p>
    </div>
  );
};

export default PortfolioSimulator;
