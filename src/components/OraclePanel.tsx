"use client";

import React, { useState } from "react";
import { ethers } from "ethers";

type OraclePanelProps = {
  signer: ethers.Signer | null;
};

/* -------------------------------------------------------------
   IMPORTANT: USE THE SAME CONTRACT AS AIValuation.tsx
-------------------------------------------------------------- */

const SETTLEMENT_ADDRESS = "0x4A2B8014a6933F108D917CEBEA6D6455D3D234Ab";

const ORACLE_ABI = [
  "function setOracleValue(string assetId, uint256 value) external",
  "function oracleValue(string assetId) view returns (uint256)",
];

const OraclePanel: React.FC<OraclePanelProps> = ({ signer }) => {
  const [assetId, setAssetId] = useState("Apartment Downtown #5");
  const [trueValue, setTrueValue] = useState("1250000");
  const [onChainValue, setOnChainValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /* -------------------------------------------------------------
     SET TRUE VALUE ON-CHAIN
  -------------------------------------------------------------- */
  const handleSetTrueValue = async () => {
    if (!signer) {
      alert("Connect your wallet first.");
      return;
    }

    const num = Number(trueValue);
    if (isNaN(num) || num <= 0) {
      alert("Enter a valid true value.");
      return;
    }

    try {
      setLoading(true);

      const contract = new ethers.Contract(
        SETTLEMENT_ADDRESS,
        ORACLE_ABI,
        signer
      );

      // convert to 18-decimals
      const parsedValue = ethers.parseUnits(num.toString(), 18);

      // submit on-chain tx
      const tx = await contract.setOracleValue(assetId, parsedValue);
      await tx.wait();

      alert("✅ Oracle updated successfully!");

      // refresh the value
      const chainValue = await contract.oracleValue(assetId);
      setOnChainValue(ethers.formatUnits(chainValue, 18));

    } catch (err) {
      console.error("Oracle update error:", err);
      alert("❌ Failed to update oracle value");
    }

    setLoading(false);
  };

  /* -------------------------------------------------------------
     FETCH ACTIVE VALUE
  -------------------------------------------------------------- */
  const fetchCurrentValue = async () => {
    if (!signer) return;

    try {
      const contract = new ethers.Contract(
        SETTLEMENT_ADDRESS,
        ORACLE_ABI,
        signer
      );

      const chainValue = await contract.oracleValue(assetId);
      setOnChainValue(ethers.formatUnits(chainValue, 18));
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  return (
    <div className="qie-card-glass qie-animate-slide-up">
      <div className="qie-card-header">
        <h3 className="qie-card-title">📡 Oracle Admin · True Value Setter</h3>
        <span className="qie-badge qie-badge-soft">On-chain</span>
      </div>

      <p className="qie-text-muted">
        Set the blockchain “true value” used to settle predictions & calculate accuracy.
      </p>

      {/* Asset */}
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

      {/* Submit button */}
      <button
        onClick={handleSetTrueValue}
        disabled={loading}
        className="qie-btn qie-btn-primary qie-btn-full qie-mt-md"
      >
        {loading ? "Broadcasting…" : "📡 Set True Value"}
      </button>

      {/* Fetch button */}
      <button
        onClick={fetchCurrentValue}
        disabled={loading}
        className="qie-btn qie-btn-ghost qie-btn-full qie-mt-md"
      >
        🔄 Refresh On-Chain Value
      </button>

      {/* Display active oracle value */}
      {onChainValue !== null && (
        <div
          className="qie-card-glass qie-animate-fade-in qie-mt-md"
          style={{ textAlign: "center", padding: "12px" }}
        >
          <p className="qie-text-muted">Current Oracle Value</p>
          <p style={{ fontSize: "1.6rem", fontWeight: 700 }}>
            ${Number(onChainValue).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
};

export default OraclePanel;
