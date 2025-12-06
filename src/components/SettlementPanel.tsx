"use client";

import React, { useState } from "react";
import { ethers } from "ethers";

type SettlementPanelProps = {
  signer: ethers.Signer | null;
};

const REWARD_SYSTEM_ADDRESS = "0x49CDAc96F7e4E41A78C44ebe06802f0E4D9352F1"; // replace with deployed address
const REWARD_SYSTEM_ABI = [
  "function settlePrediction(address predictor, uint256 confidence, bool isCorrect) external",
  "function getAccuracy(address predictor) view returns (uint256)",
];

export default function SettlementPanel({ signer }: SettlementPanelProps) {
  const [predictorAddr, setPredictorAddr] = useState("");
  const [confidence, setConfidence] = useState("80");
  const [isCorrect, setIsCorrect] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSettle = async () => {
    if (!signer) return;
    try {
      const contract = new ethers.Contract(
        REWARD_SYSTEM_ADDRESS,
        REWARD_SYSTEM_ABI,
        signer
      );
      setLoading(true);
      const tx = await contract.settlePrediction(
        predictorAddr,
        Number(confidence),
        isCorrect
      );
      await tx.wait();
      alert("✅ Prediction settled + rewards/slashing applied!");
    } catch (err) {
      console.error(err);
      alert("❌ Settlement failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="qie-card-glass">
      <h3 className="qie-card-title">⚖️ Settlement (Demo Owner Only)</h3>
      <p className="qie-text-muted">Settle predictions and apply rewards/slashing</p>

      <div className="qie-mt-md">
        <input
          type="text"
          placeholder="Predictor address"
          value={predictorAddr}
          onChange={(e) => setPredictorAddr(e.target.value)}
          className="qie-input"
        />
        <input
          type="number"
          placeholder="Confidence (0-100)"
          value={confidence}
          onChange={(e) => setConfidence(e.target.value)}
          className="qie-input qie-mt-sm"
          min="0"
          max="100"
        />
        <label className="qie-field-label qie-mt-sm">
          <input
            type="checkbox"
            checked={isCorrect}
            onChange={(e) => setIsCorrect(e.target.checked)}
          />
          Prediction was correct
        </label>

        <button
          onClick={handleSettle}
          disabled={loading || !signer}
          className="qie-btn qie-btn-primary qie-btn-full qie-mt-md"
        >
          {loading ? "Settling..." : "Settle Prediction"}
        </button>
      </div>
    </div>
  );
}
