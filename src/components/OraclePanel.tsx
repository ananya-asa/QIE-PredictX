"use client";

import React, { useState } from "react";
import { ethers } from "ethers";

type OraclePanelProps = {
  signer: ethers.Signer | null;
};

const ORACLE_ADDRESS = "0x26e7C8a46C89404375ef53D8b6FD4748675e3897";

const ORACLE_ABI = [
  "function setAssetTrueValue(string assetId, uint256 value) external",
  "function assetTrueValue(string assetId) view returns (uint256)",
];

const OraclePanel: React.FC<OraclePanelProps> = ({ signer }) => {
  const [assetId, setAssetId] = useState("Apartment Downtown #5");
  const [trueValue, setTrueValue] = useState("1250000");
  const [currentOnChain, setCurrentOnChain] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"blockchain" | "simulation">("blockchain");

  const handleSetTrueValue = async () => {
    if (!signer) {
      alert("Connect your wallet first");
      return;
    }

    setLoading(true);
    const num = Number(trueValue);
    const valueStr = Math.floor(num).toString();

    try {
      if (mode === "simulation") throw new Error("Simulating");

      const contract = new ethers.Contract(ORACLE_ADDRESS, ORACLE_ABI, signer);
      const parsed = ethers.parseUnits(valueStr, 18);

      const tx = await contract.setAssetTrueValue(assetId, parsed, {
        gasLimit: 2500000,
      });
      await tx.wait();
      alert("✅ Oracle updated on QIE Testnet");
    } catch {
      setMode("simulation");
      await new Promise((r) => setTimeout(r, 1200));
      alert("⚠️ Using simulation mode for demo");
    }

    setCurrentOnChain(valueStr);
    setLoading(false);
  };

  return (
    <div className="qie-card-glass qie-animate-slide-up">
      <div className="qie-card-header">
        <h3 className="qie-card-title">📡 Oracle Admin</h3>
        <span className="qie-badge qie-badge-soft">
          {mode === "simulation" ? "Simulated" : "On-chain"}
        </span>
      </div>

      <p className="qie-text-muted">
        Define “true value” for assets — used to grade AI predictions.
      </p>

      {/* Asset ID */}
      <div className="qie-mt-md">
        <label className="qie-field-label">Asset ID</label>
        <input
          type="text"
          className="qie-input"
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
        />
      </div>

      {/* True Value */}
      <div className="qie-mt-md">
        <label className="qie-field-label">True Value (USD)</label>
        <input
          type="number"
          className="qie-input"
          value={trueValue}
          onChange={(e) => setTrueValue(e.target.value)}
        />
      </div>

      <button
        onClick={handleSetTrueValue}
        disabled={loading}
        className="qie-btn qie-btn-primary qie-btn-full qie-mt-md"
      >
        {loading ? "Broadcasting…" : "📡 Set True Value"}
      </button>

      {currentOnChain && (
        <div className="qie-card-glass qie-animate-fade-in qie-mt-md" style={{ textAlign: "center", padding: "12px" }}>
          <p className="qie-text-muted">Active Oracle Price</p>
          <p style={{ fontSize: "1.6rem", fontWeight: 700 }}>
            ${Number(currentOnChain).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
};

export default OraclePanel;
